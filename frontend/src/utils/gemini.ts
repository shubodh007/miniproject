import { GoogleGenAI } from '@google/genai';
import { logger } from './logger';
import mammoth from 'mammoth';

export const MODEL = "gemini-3.5-flash";

export const GEMINI_FALLBACK_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it"
];

export function adaptConfigForModel(modelName: string, originalConfig: any): any {
  if (!originalConfig) return originalConfig;
  try {
    const config = JSON.parse(safeStringify(originalConfig));
    const isGemma = modelName.toLowerCase().includes('gemma');
    if (isGemma) {
      if (config.tools) {
        delete config.tools;
      }
    }
    return config;
  } catch (error) {
    logger.warn(`Failed to adapt config for model ${modelName}:`, error);
    return originalConfig;
  }
}

// ESM compatibility for CommonJS modules
// Node-specific imports have been made lazy inside function bodies to prevent Vite bundling crashes in client-side builds.

const VISION_FALLBACK_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "moonshotai/kimi-k2.6:free",
  "nvidia/nemotron-nano-12b-v2-vl:free"
];

const FALLBACK_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "poolside/laguna-m.1:free",
  "moonshotai/kimi-k2.6:free",
  "openai/gpt-oss-120b:free"
];

export const LEGAL_FALLBACK_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-120b:free",
  "openrouter/owl-alpha"
];

const embeddingCache = new Map<string, number[]>();

// Added safe circular replacer to filter potential DOM elements, React structures, functions, and symbols
function getCircularReplacer() {
  const seen = new WeakSet(); // Track seen objects to detect circular references
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) { // Match object structures
      if (seen.has(value)) { // Prevent circular reference loops
        return '[Circular]';
      }
      seen.add(value); // Keep track of scanned objects
      if (value.nodeType && typeof value.nodeName === 'string') { // Check for browser DOM elements
        return '[DOM Element]';
      }
      if (value.$$typeof || value._reactName || (value.current !== undefined && 'current' in value)) { // Detect React components/refs
        return '[React Object]';
      }
    }
    if (typeof value === 'function') { // Filter function values safely
      return '[Function]';
    }
    if (typeof value === 'symbol') { // Filter symbol values safely
      return '[Symbol]';
    }
    return value; // Keep acceptable primitive values as is
  };
}

// Added: Helper function to determine if braces/brackets are balanced (excluding inside literal quotes) to prevent parsing partial chunks
export function isJsonBalanced(str: string): boolean {
  let openBraces = 0; // Tracks the count of unclosed brace pairs
  let inString = false; // Flag indicating if searching inside a literal double-quoted string
  let escaped = false; // Flag indicating if current character is escaped by backslash
  for (let i = 0; i < str.length; i++) { // Classic loop over input characters
    const char = str[i]; // Access character at current index
    if (char === '\\' && !escaped) { // Check for escaping control character
      escaped = true; // Mark escape state
      continue; // Skip further evaluations
    }
    if (char === '"' && !escaped) { // Check for unescaped quote bounds
      inString = !inString; // Toggle string literal detection boundary
    }
    escaped = false; // Reset escape state on non-escaped character
    if (!inString) { // Standard check if current scope is outside structural strings
      if (char === '{' || char === '[') { // Detect structure opening blocks
        openBraces++; // Increment open count
      } else if (char === '}' || char === ']') { // Detect structure closing blocks
        openBraces--; // Decrement open count
      }
    }
  }
  return openBraces === 0; // Return validation match outcome
}

// Added: Customized safe replacement handler implementing WeakSet to eliminate circular loops, DOM structure fields, and React classes
export function safeStringify(value: any, replacer?: any, space?: string | number): string {
  const seen = new WeakSet(); // Standard WeakSet tracker to skip visiting objects multiple times and avoid circularity issues
  const customReplacer = (key: string, val: any) => { // Custom replacer callback parameter
    if (typeof val === 'object' && val !== null) { // Identify non-primitive object/array structures
      if (seen.has(val)) { // Checks if object has been serialised in current graph traverse
        return '[Circular]'; // Render string placeholder for structural circular reference
      }
      seen.add(val); // Mark object reference as visited
      if (val.nodeType && typeof val.nodeName === 'string') { // Protect against native DOM node structures
        return '[DOM Element]'; // Render placeholder for DOM elements to avoid serializing vast visual node graphs
      }
      if (val.$$typeof || val._reactName || (val.current !== undefined && 'current' in val)) { // Avoid React references
        return '[React Object]'; // Strip react nodes/refs
      }
    }
    if (typeof val === 'function') { // Strip functions from serialization body safely
      return '[Function]'; // Convert functions to explicit descriptive placeholder
    }
    if (typeof val === 'symbol') { // Strip symbols from payload securely
      return '[Symbol]'; // Convert symbol values to descriptive label
    }
    if (replacer) { // Check for any custom secondary user replacer filters
      return replacer(key, val); // Return custom transformed output
    }
    return val; // Fallback to raw property value representation
  };
  return JSON.stringify(value, customReplacer, space); // Native serializer called safely with our customWeakSet-based interceptor rules
}

// Added partial JSON parsing and repairing utility to handle incomplete streaming chunks
export function parsePartialJson(jsonStr: string): any {
  let cleaned = jsonStr.trim(); // Trim leading/trailing whitespace
  if (!cleaned) return null; // Return null on empty strings

  try {
    return JSON.parse(cleaned); // Attempt standard parsing first
  } catch (e) {
    // Ignore and proceed to automatic repair logic
  }

  let openQuote = false; // Track unclosed string quotation marks
  let escaped = false; // Track escaped character sequences
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '\\' && !escaped) {
      escaped = true; // Mark next character as escaped
    } else {
      if (char === '"' && !escaped) {
        openQuote = !openQuote; // Toggle quote state
      }
      escaped = false; // Reset escaping state
    }
  }

  if (openQuote) {
    cleaned += '"'; // Self-repair unclosed string quotes
  }

  const stack: string[] = []; // Stack to match brackets and braces
  escaped = false; // Reset escape flag
  let inString = false; // Reset string tracking flag
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '\\' && !escaped) {
      escaped = true; // Mark escape
      continue;
    }
    if (char === '"' && !escaped) {
      inString = !inString; // Toggle string state
    }
    escaped = false; // Reset escape
    
    if (!inString) { // Only track brackets outside of literal strings
      if (char === '{' || char === '[') {
        stack.push(char); // Push opening characters onto stack
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop(); // Match structural brace
        }
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop(); // Match structural bracket
        }
      }
    }
  }

  while (stack.length > 0) {
    const item = stack.pop(); // Unwind opening structures
    if (item === '{') {
      cleaned += '}'; // Add missing closing brace
    } else if (item === '[') {
      cleaned += ']'; // Add missing closing bracket
    }
  }

  try {
    return JSON.parse(cleaned); // Attempt parsing the restored block
  } catch (e) {
    const tokenMatch = jsonStr.match(/"token"\s*:\s*"((?:[^"\\]|\\.)*)/); // Regular expression fallback to capture token value if structure is unparseable
    if (tokenMatch) {
      return { token: tokenMatch[1] }; // Return synthetic parsed mock format
    }
    return null; // Return null on complete failure
  }
}

let aiInstance: GoogleGenAI | null = null;

function getFileType(filename: string, mimetype: string) {
  if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) return 'pdf';
  if (mimetype.startsWith('image/')) return 'image';
  if (filename.endsWith('.docx')) return 'docx';
  if (filename.endsWith('.txt') || filename.endsWith('.csv') || filename.endsWith('.md')) return 'text';
  return 'unknown';
}

async function extractFileContent(fileBuffer: Buffer, fileType: string, mimetype: string): Promise<{ text?: string, dataUrl?: string }> {
  try {
    if (fileType === 'pdf') {
      const { createRequire } = await import('module'); // Dynamically loaded module package inside function body to bypass Vite client build-time check
      const require = createRequire(import.meta.url); // Set up native loader environment for commonjs modules
      const pdfParse = require('pdf-parse'); // Lazily resolve backend-only pdf parsing library
      const data = await pdfParse(fileBuffer);
      return { text: data.text.slice(0, 12000) };
    }
    if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return { text: result.value.slice(0, 12000) };
    }
    if (fileType === 'text') {
      return { text: fileBuffer.toString('utf-8').slice(0, 12000) };
    }
    if (fileType === 'image') {
      const base64 = fileBuffer.toString('base64');
      const dataUrl = `data:${mimetype};base64,${base64}`;
      return { dataUrl };
    }
  } catch (error) {
    logger.warn(`File extraction failed: ${error}`);
  }
  return {};
}

/**
 * Lazy initializer for Gemini client to prevent crashing on server startup.
 */
export function getGeminiClient(): GoogleGenAI | null {
  if (aiInstance) return aiInstance;

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    logger.info('No GEMINI_API_KEY environment variable found. Operating in local rule engine fallback mode.');
    return null;
  }

  try {
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    logger.info('Gemini AI successfully initialized server-side');
    return aiInstance;
  } catch (error) {
    logger.error('Failed to initialize Gemini Client', { error });
    return null;
  }
}

/**
 * Robust helper to execute Gemini requests with automatic model fallback and retries.
 */
export async function generateContentWithRetryAndFallback(params: {
  contents: unknown;
  config: Record<string, unknown> | unknown;
  fallbackModel?: string;
  preferredFallbackModels?: string[];
  isLegalAnalysis?: boolean;
}): Promise<unknown> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('Gemini AI is not initialized');
  }

  const baseModels = [
    'gemini-3.5-flash',
    ...GEMINI_FALLBACK_MODELS
  ];
  if (params.fallbackModel) {
    baseModels.push(params.fallbackModel);
  }
  const modelOptions = Array.from(new Set(baseModels));
  let lastError: any = null;

  for (const modelName of modelOptions) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        logger.info(`[Gemini] Attempting generation with model ${modelName} (attempt ${attempt}/2)`);
        
        const adaptedConfig = adaptConfigForModel(modelName, params.config);

        const requestPromise = ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: adaptedConfig,
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 50000);
        });

        const response = await Promise.race([requestPromise, timeoutPromise]);

        if (response && response.text) {
          logger.info(`[Gemini] Generation succeeded with model ${modelName}`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        logger.warn(`[Gemini] Error on model ${modelName} (attempt ${attempt}/2): ${errMessage}`);

        const isLastModel = modelName === modelOptions[modelOptions.length - 1];

        if (isLastModel) {
          if (params.isLegalAnalysis) {
            logger.warn(`[Gemini] Triggering legal fallback due to: ${errMessage}`);
            return await triggerLegalFallbackChain(params.contents, params.config);
          }
          logger.warn(`[Gemini] Triggering general fallback due to: ${errMessage}`);
          return await triggerGeneralFallbackChain(params.contents, params.config, params.preferredFallbackModels);
        }

        const isRetryable = 
          err?.status === 429 || err?.status === 500 || err?.status === 503 ||
          errMessage.includes('429') || errMessage.includes('500') || errMessage.includes('503') ||
          errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('limit') || 
          errMessage.toLowerCase().includes('exhausted') ||
          errMessage === 'TIMEOUT_EXCEEDED';

        if (attempt === 1 && isRetryable) {
          const delay = err?.status === 429 ? 2000 : 800;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.warn(`[Gemini] Skipping ${modelName} due to ${errMessage}, moving to next internal fallback model`);
          break; // break attempt loop, move to next model
        }
      }
    }
  }

  if (params.isLegalAnalysis) {
    logger.warn(`[Gemini] All Gemini attempts failed. Fallback to OpenRouter for legal analysis.`);
    return await triggerLegalFallbackChain(params.contents, params.config);
  }

  logger.warn(`[Gemini] All Gemini attempts failed. Fallback to OpenRouter for general analysis.`);
  return await triggerGeneralFallbackChain(params.contents, params.config, params.preferredFallbackModels);

  // throw lastError || new Error('All attempts to call Gemini failed.');
}

async function triggerGeneralFallbackChain(contents: unknown, config: any, preferredModels?: string[]): Promise<{ text: string; fallbackModelUsed?: string }> {
  logger.info('[FALLBACK] Gemini failed — starting general fallback chain');

  const errors: string[] = [];
  const systemInstruction = config?.systemInstruction || '';
  const prompt = typeof contents === 'string' ? contents : safeStringify(contents); // Changed: Cleaned legacy JSON.stringify(..., getCircularReplacer()) in favor of unified inline safeStringify helper to avoid circular referencing issues
  const formattedMessages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: prompt }
  ];

  const modelsToTry = preferredModels && preferredModels.length > 0 ? preferredModels : FALLBACK_MODELS;

  for (const model of modelsToTry) {
    try {
      logger.info(`[Fallback] Attempting OpenRouter model: ${model}`);
      const stepStart = Date.now();
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.APP_DOMAIN || "http://localhost:3000",
          "X-Title": process.env.APP_NAME || "YourAppName",
          "Content-Type": "application/json"
        },
        body: safeStringify({ // Changed: Substituted legacy standard JSON.stringify with safeStringify to guarantee crash-free payload transport during OpenRouter requests
          model, // Model Name definition
          messages: formattedMessages, // Content messages trace array values
          temperature: config?.temperature ?? 0.2 // User temperature override configuration
        }) // End of safeStringify argument signature block
      });

      if (response.status === 429) {
        logger.info(`[FALLBACK] model: ${model.split('/').pop()} skipped: 429`);
        errors.push(`${model} (HTTP 429)`);
        continue;
      }

      if (response.ok) {
        const resJson = await response.json();
        const text = resJson.choices?.[0]?.message?.content || '';
        if (text) {
          const latency = Date.now() - stepStart;
          logger.info(`[FALLBACK] resolved: ${model} | latency: ${latency}ms`);
          return { text, fallbackModelUsed: model };
        }
      } else {
        const errText = await response.text();
        errors.push(`${model} (HTTP ${response.status}: ${errText})`);
      }
    } catch (err: any) {
      logger.warn(`[Fallback] Failed for model ${model}: ${err?.message || err}`);
      errors.push(`${model} (${err?.message || err})`);
    }
  }

  logger.error('[FALLBACK] exhausted: all models failed');
  throw new Error(`All general fallback models failed: ${errors.join(', ')}`);
}

async function triggerLegalFallbackChain(contents: unknown, config: any): Promise<{ text: string; fallbackModelUsed?: string }> {
  logger.info('[LEGAL-FALLBACK] Gemini failed — starting fallback chain');
  logger.info('[LEGAL-FALLBACK] Trying model: google/gemma-4-31b-it:free');
  logger.info('[LEGAL-FALLBACK] Trying model: nvidia/nemotron-3-super-120b-a12b:free');
  logger.info('[LEGAL-FALLBACK] Trying model: openai/gpt-oss-120b:free');
  logger.info('[LEGAL-FALLBACK] Trying model: openrouter/owl-alpha');

  const errors: string[] = [];
  const systemInstruction = config?.systemInstruction || `You are LegalAI-Pro, an elite Indian contract law auditor
specializing in Andhra Pradesh and Telangana jurisdiction.
You analyze legal documents for hidden traps, unfair clauses,
and violations of Indian law. You protect common citizens
from exploitative contract terms. Output ONLY valid JSON.
No markdown. No explanation outside the JSON structure.
Be thorough, specific, and cite exact legal statutes.`;
  const prompt = typeof contents === 'string' ? contents : safeStringify(contents); // Changed: Replaced basic JSON.stringify with safeStringify here as well to avert potential crashes on legal payload circular structures
  const formattedMessages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: prompt }
  ];

  for (const model of LEGAL_FALLBACK_MODELS) {
    if (model === "google/gemma-4-31b-it:free" && (global as any).SIMULATE_GEMMA_429) {
      logger.info(`[LEGAL-FALLBACK] model: gemma-4-31b-it:free skipped: 429`);
      errors.push(`${model} (HTTP 429: Rate limited)`);
      continue;
    }
    try {
      logger.info(`[Legal Fallback] Attempting OpenRouter legal fallback model: ${model}`);
      const stepStart = Date.now();
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.APP_DOMAIN || "http://localhost:3000",
          "X-Title": process.env.APP_NAME || "YourAppName",
          "Content-Type": "application/json"
        },
        body: safeStringify({ // Changed: Substituted legacy standard JSON.stringify with safeStringify to guarantee crash-free payload transport during OpenRouter requests
          model, // Model Name definition
          messages: formattedMessages, // Content messages trace array values
          temperature: 0.0 // Strict precision override configuration
        }) // End of safeStringify argument signature block
      });

      if (response.status === 429) {
        logger.info(`[LEGAL-FALLBACK] model: ${model.split('/').pop()} skipped: 429`);
        errors.push(`${model} (HTTP 429)`);
        continue;
      }

      if (response.ok) {
        const resJson = await response.json();
        const text = resJson.choices?.[0]?.message?.content || '';
        if (text) {
          const latency = Date.now() - stepStart;
          logger.info(`[LEGAL-FALLBACK] resolved: ${model} | latency: ${latency}ms`);
          return { text, fallbackModelUsed: model };
        }
      } else {
        const errText = await response.text();
        errors.push(`${model} (HTTP ${response.status}: ${errText})`);
      }
    } catch (err: any) {
      logger.warn(`[Legal Fallback] Failed for model ${model}: ${err?.message || err}`);
      errors.push(`${model} (${err?.message || err})`);
    }
  }

  logger.error('[LEGAL-FALLBACK] exhausted: all models failed');
  throw new Error(`All legal fallback models failed: ${errors.join(', ')}`);
}

/**
 * Streamed version of Gemini content generation with high-performance model selection,
 * temperature overrides, and compact output monitoring.
 */
export async function generateContentStreamWithRetryAndFallback(params: {
  contents: unknown;
  config: Record<string, unknown>;
  preferredModel?: string;
  onChunk?: (text: string) => void;
  onSearchMetadata?: (metadata: { queries: string[]; sources: Array<{ title: string; url: string; snippet?: string }> }) => void;
}): Promise<{ text: string }> {
  let fullText = '';
  
  const geminiStream = async (): Promise<{ text: string }> => {
    const ai = getGeminiClient();
    if (!ai) {
      throw new Error('Gemini AI is not initialized');
    }

    const baseModels = [
      'gemini-3.5-flash',
      ...GEMINI_FALLBACK_MODELS
    ];
    if (params.preferredModel) {
      baseModels.unshift(params.preferredModel);
    }
    const modelOptions = Array.from(new Set(baseModels));
    let lastError: unknown = null;

    for (const modelName of modelOptions) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          logger.info(`[Gemini-Stream] Attempting generation with model ${modelName} (attempt ${attempt}/2)`);
          let localFullText = '';
          let lastGroundingMetadata: any | null = null;

          const adaptedConfig = adaptConfigForModel(modelName, params.config);

          const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: params.contents,
            config: adaptedConfig,
          });

          for await (const chunk of responseStream) {
            const text = chunk.text || '';
            localFullText += text;
            
            const meta = chunk.candidates?.[0]?.groundingMetadata;
            if (meta) {
              lastGroundingMetadata = meta;
              if (params.onSearchMetadata) {
                const queries: string[] = meta.webSearchQueries || [];
                const sources: Array<{ title: string; url: string; snippet?: string }> = 
                  meta.groundingChunks?.map((c: { web?: { title: string; uri: string; snippet?: string } }, i: number) => ({
                    title: c.web?.title || `Web Result ${i + 1}`,
                    url: c.web?.uri || 'https://google.com',
                    snippet: c.web?.snippet
                  })).filter((s: { url: string }) => s.url) || [];
                
                if (queries.length > 0 || sources.length > 0) {
                  params.onSearchMetadata({ queries, sources });
                }
              }
            }

            if (params.onChunk) {
              params.onChunk(text);
            }
          }

          if (lastGroundingMetadata && params.onSearchMetadata) {
            const queries: string[] = lastGroundingMetadata.webSearchQueries || [];
            const sources: Array<{ title: string; url: string; snippet?: string }> = 
              lastGroundingMetadata.groundingChunks?.map((c: { web?: { title: string; uri: string; snippet?: string } }, i: number) => ({
                title: c.web?.title || `Web Result ${i + 1}`,
                url: c.web?.uri || 'https://google.com',
                snippet: c.web?.snippet
              })).filter((s: { url: string }) => s.url) || [];
            
            params.onSearchMetadata({ queries, sources });
          }

          if (localFullText) {
            logger.info(`[Gemini-Stream] Generation stream succeeded with model ${modelName}`);
            fullText = localFullText;
            return { text: localFullText };
          }
        } catch (err: any) {
          lastError = err;
          const errMessage = err?.message || String(err);
          logger.warn(`[Gemini-Stream] Error on model ${modelName} (attempt ${attempt}/2): ${errMessage}`);
          
          const isRetryable = 
            err?.status === 429 || err?.status === 500 || err?.status === 503 ||
            errMessage.includes('429') || errMessage.includes('500') || errMessage.includes('503') ||
            errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('limit') || 
            errMessage.toLowerCase().includes('exhausted') ||
            errMessage === 'TIMEOUT_EXCEEDED';

          if (attempt === 1 && isRetryable) {
            const delay = err?.status === 429 ? 2000 : 300;
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            logger.warn(`[Gemini-Stream] Skipping stream model ${modelName} due to ${errMessage}, moving to next internal fallback model`);
            break; // Skip to next modelName in modelOptions
          }
        }
      }
    }

    throw lastError || new Error('All attempts to call Gemini stream failed.');
  };

  const tryFileFallbackChain = async (originalError: unknown, messages: any[]): Promise<{ text: string }> => {
    const errorMsg = originalError instanceof Error ? originalError.message : String(originalError);
    logger.warn(`[FILE FALLBACK] Triggered due to: ${errorMsg}`);
    
    let targetMimeType = '';
    let targetData = '';
    let targetFilename = 'uploaded_file';
    let userMessage = '';
    
    for (const msg of messages) {
       if (msg.role === 'user' && msg.parts) {
           for (const p of msg.parts) {
               if (p.inlineData && p.inlineData.data) {
                   targetMimeType = p.inlineData.mimeType || '';
                   targetData = p.inlineData.data;
                   if (p.metadata && p.metadata.name) targetFilename = p.metadata.name;
               }
               if (p.text) {
                   userMessage = p.text;
               }
           }
       }
    }
    
    const fileType = getFileType(targetFilename, targetMimeType);
    
    if (fileType === 'unknown') {
        if (params.onChunk) {
             params.onChunk(`\n\ndata: ${safeStringify({ type: "error", message: "Unsupported file type. Please upload PDF, DOCX, image, or text file." })}\n\n`); // Changed: replaced basic JSON.stringify with safeStringify to remain compliant with our WeakSet circular reference prevention mandate in client chunk callback formatting
        }
        throw new Error('Unsupported file type.');
    }
    
    if (params.onChunk) {
        params.onChunk(`\n\ndata: ${safeStringify({ type: "search_stage", message: "Extracting file content..." })}\n\n`); // Changed: upgraded from raw JSON.stringify to safeStringify utility to bypass circular reference exceptions when transmitting feedback status messages
    }
    
    const buffer = Buffer.from(targetData, 'base64');
    const { text: extractedText, dataUrl } = await extractFileContent(buffer, fileType, targetMimeType);
    
    if (!extractedText && !dataUrl) {
       if (params.onChunk) {
           params.onChunk(`\n\ndata: ${safeStringify({ type: "error", message: "Could not read file content. Please try a different format." })}\n\n`); // Changed: migrated JSON.stringify call to safeStringify to securely push error logs to listener hooks without serialisation crashes
       }
       throw new Error('Could not read file content.');
    }
    
    if (params.onChunk) {
        params.onChunk(`\n\ndata: ${safeStringify({ type: "search_stage", message: "Analyzing with fallback model..." })}\n\n`); // Changed: replaced legacy stringify with safeStringify callback helper to secure stream updates during progress emission
    }
    
    let fallbackMessages = [];
    let MODELS_TO_USE = FALLBACK_MODELS;
    
    if (fileType === 'image' && dataUrl) {
        MODELS_TO_USE = VISION_FALLBACK_MODELS;
        fallbackMessages = [
           {
              role: "user",
              content: [
                 { type: "image_url", image_url: { url: dataUrl } },
                 { type: "text", text: userMessage }
              ]
           }
        ];
    } else {
        const textToUse = extractedText || '';
        let warning = '';
        if (textToUse.length >= 12000) {
            warning = "\n[File truncated to fit context window. Showing first 12,000 characters.]\n";
        }
        fallbackMessages = [
           {
              role: "user",
              content: `You are analyzing an uploaded file.\nFile name: ${targetFilename}\nFile type: ${fileType}\n\nFile content:\n${textToUse}${warning}\n\nUser question: ${userMessage}`
           }
        ];
    }

    const errors: string[] = [];
    for (const model of MODELS_TO_USE) {
       try {
           const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
             method: "POST",
             headers: {
               "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
               "HTTP-Referer": process.env.APP_DOMAIN || "http://localhost:3000",
               "X-Title": process.env.APP_NAME || "YourAppName",
               "Content-Type": "application/json"
             },
             body: safeStringify({ // Changed: changed standard JSON.stringify to safeStringify to provide deep protection against circular structures within fallbackMessages body
               model,
               messages: fallbackMessages,
               stream: true
             }) // End of safeStringify argument signature block
           });

           if (!openRouterRes.ok) throw new Error(`HTTP ${openRouterRes.status}`);

           if (params.onChunk) {
               params.onChunk(`\n\ndata: ${safeStringify({ type: "fallback_notice", message: "File analyzed via fallback model", model: model })}\n\n`); // Changed: swapped JSON.stringify with safeStringify to format status headers cleanly
           }
           
           let fallbackFullText = '';
           const reader = openRouterRes.body?.getReader();
           if (reader) {
             const decoder = new TextDecoder();
             let done = false;
             let textBuf = '';
             let sseBuffer = ''; // Changed: Added custom sseBuffer to accumulate stream chunk parts and ensure complete parse
             let lastSuccessTime = Date.now(); // Changed: Added timestamp clock to reset or perform recovery if parse gets stuck
             let streamErrorState = false; // Changed: Initialized local error state flag for 10s recovery timeout scenarios
             
             while (!done) {
               const { value, done: doneReading } = await reader.read();
               done = doneReading;
               if (value) {
                 textBuf += decoder.decode(value, { stream: !done });
                 const lines = textBuf.split('\n');
                 textBuf = lines.pop() || '';
                 for (const line of lines) {
                   const trimmed = line.trim();
                   if (trimmed.startsWith('data: ')) {
                     const raw = trimmed.substring(6).trim();
                     if (raw === '[DONE]') continue;
                     
                     sseBuffer += raw; // Changed: Appended individual incoming stream chunks directly to our sseBuffer
                     
                     if (Date.now() - lastSuccessTime > 10000) { // Changed: Added recovery check to see if chunk accumulation is stuck beyond 10 seconds
                       logger.error('[STREAM ERROR] File Fallback Stream has been accumulating for more than 10 seconds without a successful parse. Resetting.'); // Changed: Log error stating recovery actions
                       sseBuffer = ''; // Changed: Clear the accumulating string buffer to restore normal operations
                       lastSuccessTime = Date.now(); // Changed: Reset clock marker to avoid infinite triggers
                       streamErrorState = true; // Changed: Transition block into an stream error status state
                     } // End of recovery timer block
                     
                     if (isJsonBalanced(sseBuffer)) { // Changed: Check if curly brace and bracket balancing conditions are met before trying to parse
                       try { // Changed: Wrap JSON.parse in try/catch to deal with invalid partial outputs safely
                         const data = JSON.parse(sseBuffer); // Changed: Parse complete structured JSON string directly inside try statement
                         sseBuffer = ''; // Changed: Successfully parsed data segment, clear sseBuffer back to empty
                         lastSuccessTime = Date.now(); // Changed: Update timestamp tracker since parsing was fully successful
                         const token = data?.choices?.[0]?.delta?.content || ''; // Parse token value cleanly
                         if (token && params.onChunk) {
                           params.onChunk(token);
                           fallbackFullText += token;
                         }
                       } catch (parseError: any) { // Changed: Handle parsing problems securely
                         logger.error(`[STREAM ERROR] Failed to parse balanced stream JSON: ${parseError?.message}. Continuing lines accumulation.`); // Changed: Error logging traceback safe message
                       } // End of try/catch
                     } // End of balancing validation check
                   }
                 }
               }
             }
           }
           return { text: fallbackFullText };
       } catch (e) {
           errors.push(`${model} (${(e as any).message})`);
       }
    }
    throw new Error('All file fallback models failed.');
  };

  const tryFallbackChain = async (originalError: unknown): Promise<{ text: string }> => {
    const errorMsg = originalError instanceof Error ? originalError.message : String(originalError);
    logger.warn(`[FALLBACK] trigger: ${errorMsg} | Starting OpenRouter chain`);
    
    type FormattedMessage = { role: string; content: string };
    const formattedMessages: FormattedMessage[] = [];
    
    // Using any for config structure matching since type definition doesn't exist locally
    const systemInst = (params.config as Record<string, unknown>)?.systemInstruction;
    if (systemInst) {
      const sysText = typeof systemInst === 'string' 
        ? systemInst 
        : ((systemInst as any).parts || []).map((p: { text: string }) => p.text).join('');
      if (sysText) formattedMessages.push({ role: 'system', content: sysText });
    }
    
    const messages = (params.contents as Array<{ role: string; text?: string; parts?: { text: string }[] }>) || [];
    for (const msg of messages) {
      const role = msg.role === 'model' ? 'assistant' : 'user';
      const content = msg.parts ? msg.parts.map((p: { text: string }) => p.text).join('') : (msg.text || '');
      if (content) formattedMessages.push({ role, content });
    }

    const hasSearch = ((params.config as Record<string, unknown>)?.tools as any[])?.some((t: Record<string, unknown>) => t.googleSearch !== undefined);
    type SearchResult = { title: string; url: string; snippet?: string };
    let searchResults: SearchResult[] | null = null;
    let fallbackSearchProvider = '';

    if (hasSearch) {
      const SEARCH_FALLBACK_PROVIDERS = [
        {
          name: "Tavily",
          endpoint: "https://api.tavily.com/search",
          key: process.env.TAVILY_API_KEY
        },
        {
          name: "Serper",
          endpoint: "https://google.serper.dev/search",
          key: process.env.SERPER_API_KEY
        }
      ];

      const lastMsgIndex = formattedMessages.map((m: { role: string; content: string }) => m.role).lastIndexOf('user');
      const userMessage = lastMsgIndex !== -1 ? formattedMessages[lastMsgIndex].content : '';

      for (const provider of SEARCH_FALLBACK_PROVIDERS) {
        try {
          if (!provider.key) continue;
          
          let resp;
          if (provider.name === 'Tavily') {
            resp = await fetch(provider.endpoint, {
              method: 'POST',
              headers: { "Content-Type": "application/json" },
              body: safeStringify({ // Changed: replaced basic JSON.stringify with safeStringify to guard payload from any nested circular elements securely
                api_key: provider.key,
                query: userMessage,
                search_depth: "basic",
                max_results: 5
              }) // End of safeStringify argument signature block
            });
            if (resp.ok) {
              const data = await resp.json();
              searchResults = (data.results || []).map((r: { title: string; url?: string; link?: string; snippet?: string; content?: string }) => ({
                title: r.title,
                url: r.url,
                snippet: r.content,
                favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}`
              }));
              fallbackSearchProvider = provider.name;
              break;
            }
          } else if (provider.name === 'Serper') {
            resp = await fetch(provider.endpoint, {
              method: 'POST',
              headers: { 
                "Content-Type": "application/json",
                "X-API-KEY": provider.key
              },
              body: safeStringify({ q: userMessage, num: 5 }) // Changed: substituted basic serialiser with safeStringify helper here as well to avert potential circular triggers in Serper requests
            });
            if (resp.ok) {
              const data = await resp.json();
              searchResults = (data.organic || []).map((r: { title: string; url?: string; link?: string; snippet?: string; content?: string }) => ({
                title: r.title,
                url: r.link,
                snippet: r.snippet,
                favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.link).hostname}`
              }));
              fallbackSearchProvider = provider.name;
              break;
            }
          }
        } catch (e) {
          logger.warn(`[FALLBACK] ${provider.name} search failed: ${e}`);
        }
      }

      if (searchResults && searchResults.length > 0) {
        if (params.onSearchMetadata) {
          params.onSearchMetadata({ queries: [userMessage], sources: searchResults.map(r => ({ title: r.title, url: r.url || "", snippet: r.snippet })) });
        }
        
        const injectedText = `Use these search results to answer:\n` + searchResults.map(r => `[${r.title}](${r.url}): ${r.snippet}`).join('\n') + `\n\nUser query: ${userMessage}`;
        if (lastMsgIndex !== -1) {
          formattedMessages[lastMsgIndex].content = injectedText;
        } else {
          formattedMessages.push({ role: 'user', content: injectedText });
        }
      }
    }

    const errors: string[] = [];
    let attempt = 0;
    const startTime = Date.now();

    for (const model of FALLBACK_MODELS) {
      attempt++;
      try {
        const fetchStartTime = Date.now();
        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": process.env.APP_DOMAIN || "http://localhost:3000",
            "X-Title": process.env.APP_NAME || "YourAppName",
            "Content-Type": "application/json"
          },
          body: safeStringify({ // Changed: migrated standard JSON.stringify to safeStringify to guarantee crash-free payload transport during OpenRouter requests
            model,
            messages: formattedMessages,
            stream: true
          }) // End of safeStringify argument signature block
        });

        if (openRouterRes.status === 429 || openRouterRes.status === 503) {
          logger.info(`[FALLBACK] model: ${model} skipped: ${openRouterRes.status}`);
          errors.push(`${model} (HTTP ${openRouterRes.status})`);
          continue; 
        }
        
        if (!openRouterRes.ok) {
          throw new Error(`HTTP ${openRouterRes.status}`);
        }

        logger.info(`[FALLBACK] model: ${model} | attempt: ${attempt}/5 | latency: ${Date.now() - fetchStartTime}ms`);

        // Emit synthetic events for search integration fallback UI
        if (params.onSearchMetadata) {
          params.onSearchMetadata({ queries: [], sources: [] }); // Clear groundingMetadata 
        }

        let fallbackFullText = '';
        const reader = openRouterRes.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let done = false;
          let textBuf = '';
          let sseBuffer = ''; // Changed: Added custom sseBuffer to collect incoming data stream chunks 
          let lastSuccessTime = Date.now(); // Changed: Created timestamp tracker to enforce recovery actions if streaming stalls
          let streamErrorState = false; // Changed: Initialized system error state tracking tracker
          
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              textBuf += decoder.decode(value, { stream: !done });
              const lines = textBuf.split('\n');
              textBuf = lines.pop() || '';
              
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  const raw = trimmed.substring(6).trim();
                  if (raw === '[DONE]') continue;
                  
                  sseBuffer += raw; // Changed: Accumulate raw packet text segment in stream buffer
                  
                  if (Date.now() - lastSuccessTime > 10000) { // Changed: Enforce timeout rule if parsing has been stuck (> 10s)
                    logger.error('[STREAM ERROR] General Fallback Stream has been accumulating for more than 10 seconds without a successful parse. Clearing.'); // Changed: Log recovery trigger details to system console
                    sseBuffer = ''; // Changed: Empty out accumulator buffer to initiate rescue pipeline
                    lastSuccessTime = Date.now(); // Changed: Reset timeout tracker reference time
                    streamErrorState = true; // Changed: Shift status to explicit error mode representation
                  } // End of timeout recovery check
                  
                  if (isJsonBalanced(sseBuffer)) { // Changed: Only attempt standard JSON parsing when structural brackets/braces balance
                    try { // Changed: Enclosed parser within protective try/catch to maintain system stability
                      const data = JSON.parse(sseBuffer); // Changed: Call standard JSON.parse utility on verified completed payload
                      sseBuffer = ''; // Changed: Successfully recovered full chunk, wipe sseBuffer tracker clean
                      lastSuccessTime = Date.now(); // Changed: Refresh timestamp variable since we successfully recovered a JSON node
                      const token = data?.choices?.[0]?.delta?.content || ''; // Access token safe choice
                      if (token && params.onChunk) {
                        params.onChunk(token);
                        fallbackFullText += token;
                      }
                    } catch (parseError: any) { // Changed: Gracefully trap parsing faults
                      logger.error(`[STREAM ERROR] Parse failed on balanced buffer: ${parseError?.message}. Maintaining buffer data.`); // Changed: Log exception traceback safely
                    } // End of catch Block
                  } // End of isJsonBalanced validation branch
                }
              }
            }
          }
        }
        
        logger.info(`[FALLBACK] resolved: ${model} | tokens: ${fallbackFullText.length} | total_latency: ${Date.now() - startTime}ms`);
        return { text: fallbackFullText };

      } catch (err: any) {
        logger.warn(`[FALLBACK] Error on model ${model}: ${err?.message || err}`);
        errors.push(`${model} (${err?.message || err})`);
      }
    }

    logger.error(`[FALLBACK] exhausted: all 5 models failed | errors: [${errors.join(', ')}]`);
    throw new Error('All fallback models are currently unavailable. Please retry.');
  };

  try {
    return await Promise.race([
      geminiStream(),
      new Promise<{ text: string }>((_, reject) =>
        setTimeout(() => reject(new Error("GEMINI_TIMEOUT")), 8000)
      )
    ]);
  } catch (error: unknown) {
    const messages = (params.contents as Array<{ role: string; text?: string; parts?: { text?: string, inlineData?: { mimeType: string, data: string } }[] }>) || [];
    let hasFiles = false;
    for (const msg of messages) {
       if (msg.role === 'user' && msg.parts) {
           for (const p of msg.parts) {
               if (p.inlineData && p.inlineData.data) {
                  hasFiles = true;
                  break;
               }
           }
       }
    }
    
    if (hasFiles) {
        return await tryFileFallbackChain(error, messages);
    } else {
        return await tryFallbackChain(error);
    }
  }
}

/**
 * Robust helper to retrieve 768-dimensional embeddings using gemini-embedding-2-preview.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (embeddingCache.has(trimmed)) {
    logger.info('[Gemini] Embedding Cache Hit!');
    return embeddingCache.get(trimmed)!;
  }

  const ai = getGeminiClient();
  if (!ai) {
    logger.info('[Gemini] Client not available for embedding generation. Returning blank vector.');
    return Array(768).fill(0);
  }
  try {
    const res = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: text,
      config: {
        outputDimensionality: 768
      }
    });
    const rawRes = res as any;
    if (rawRes) {
      let values: number[] | null = null;
      if (rawRes.embedding && Array.isArray(rawRes.embedding.values)) {
        values = rawRes.embedding.values;
      } else if (rawRes.embeddings && Array.isArray(rawRes.embeddings.values)) {
        values = rawRes.embeddings.values;
      } else if (rawRes.embedding && Array.isArray(rawRes.embedding)) {
        values = rawRes.embedding;
      } else if (rawRes.embeddings && Array.isArray(rawRes.embeddings)) {
        values = rawRes.embeddings;
      }
      if (values) {
        embeddingCache.set(trimmed, values);
        return values;
      }
    }
  } catch (err: any) {
    logger.error('[Gemini] Embedding retrieval failed:', { error: err?.message || err });
  }
  return Array(768).fill(0);
}

export { Type } from '@google/genai';
