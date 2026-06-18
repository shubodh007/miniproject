import { GoogleGenAI } from '@google/genai';
import { logger } from './logger';

let aiInstance: GoogleGenAI | null = null;

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
  contents: any;
  config: any;
  fallbackModel?: string;
}): Promise<any> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('Gemini AI is not initialized');
  }

  const modelOptions = ['gemini-3.5-flash', params.fallbackModel || 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const modelName of modelOptions) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        logger.info(`[Gemini] Attempting generation with model ${modelName} (attempt ${attempt}/2)`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });

        if (response && response.text) {
          logger.info(`[Gemini] Generation succeeded with model ${modelName}`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        logger.warn(`[Gemini] Error on model ${modelName} (attempt ${attempt}/2): ${err?.message || err}`);
        
        // Since different keys and environments might trigger varying client/authorization errors for a specific model, 
        // we log the error and let it proceed to standard retry / fallback models instead of aborting the entire loop.
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }
  }

  throw lastError || new Error('All attempts to call Gemini failed.');
}
export { Type } from '@google/genai';
