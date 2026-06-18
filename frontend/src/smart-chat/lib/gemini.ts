// ===== FILE: src/lib/gemini.ts =====
import { GoogleGenAI } from '@google/genai';
import { Message, ChatResponse } from '../types/chat';

export const SYSTEM_PROMPT = `
You are a senior React + TypeScript developer chatbot.
Respond ONLY with raw JSON matching this schema:
{
  "loading_messages": ["string", "string"],
  "thinking_level": "minimal|low|medium|high",
  "blocks": [
    { "type":"text", "data":{ "content":"", "size":"normal|large", "emphasis":"normal|muted|highlight" } },
    { "type":"code", "data":{ "language":"", "code":"", "filename":"", "explanation":"" } },
    { "type":"table", "data":{ "title":"", "headers":[], "rows":[[]], "caption":"" } },
    { "type":"flowchart", "data":{ "title":"", "mermaid":"", "description":"" } },
    { "type":"flashcards", "data":{ "topic":"", "cards":[{ "front":"", "back":"", "tag":"" }] } },
    { "type":"dashboard", "data":{ "title":"", "metrics":[{ "label":"", "value":"", "unit":"", "trend":"up|down|stable|null", "change":"" }], "insight":"" } },
    { "type":"steps", "data":{ "title":"", "style":"numbered|checklist", "steps":[{ "title":"", "description":"", "code":"", "tip":"" }] } },
    { "type":"comparison", "data":{ "title":"", "labels":["",""], "criteria":[{ "name":"", "a":"", "b":"", "winner":"a|b|tie" }], "verdict":"" } },
    { "type":"callout", "data":{ "variant":"info|warning|error|success|tip|important", "title":"", "content":"" } },
    { "type":"timeline", "data":{ "title":"", "events":[{ "date":"", "title":"", "description":"", "milestone":true }] } },
    { "type":"accordion", "data":{ "sections":[{ "title":"", "content":"", "open":true }] } },
    { "type":"quiz", "data":{ "topic":"", "questions":[{ "question":"", "options":["","","",""], "answer":"", "explanation":"" }] } },
    { "type":"mindmap", "data":{ "center":"", "branches":[{ "topic":"", "subtopics":["",""] }] } }
  ],
  "citations": [{ "id": 1, "text": "source name", "url": "optional string" }],
  "follow_up_suggestions": ["question 1", "question 2", "question 3"]
}
Do not use markdown formatting marks (\`\`\`) in the top-level JSON response.
`;

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export function detectThinkingLevel(query: string): ThinkingLevel {
  const q = query.toLowerCase();
  if (q.includes('explain') || q.includes('why') || q.includes('how')) return 'medium';
  if (q.includes('compare') || q.includes('analyze') || q.includes('dashboard') || q.includes('eligibility')) return 'high';
  if (q.includes('hello') || q.includes('hi')) return 'minimal';
  return 'low';
}

// Added safe circular replacer to filter potential DOM elements, React refs/fibers, functions, and symbols
function getCircularReplacer() {
  const seen = new WeakSet(); // Track seen objects to prevent circular references
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) { // Handle objects
      if (seen.has(value)) { // If already seen, output placeholder
        return '[Circular]';
      }
      seen.add(value); // Remember seeing this object
      
      if (value.nodeType && typeof value.nodeName === 'string') { // Check if it's a DOM element
        return '[DOM Element]';
      }
      if (value.$$typeof || value._reactName || (value.current !== undefined && 'current' in value)) { // Check for React elements or refs
        return '[React Object]';
      }
    }
    if (typeof value === 'function') { // Filter function values
      return '[Function]';
    }
    if (typeof value === 'symbol') { // Filter symbol values
      return '[Symbol]';
    }
    return value; // Return normal values as is
  };
}

// Added sterilize helper to serialize payload cleanly before any stringification
export function safeSerialize(obj: any): any {
  return JSON.parse(JSON.stringify(obj, getCircularReplacer())); // Parse safely stringified clean object
}

export async function chatWithGemini(
  messages: Message[], 
  thinkingLevel: ThinkingLevel = 'low', 
  schemeContext?: any,
  profileSnapshot?: any
): Promise<ChatResponse> {
  try {
    const sterilizedMessages = safeSerialize(messages); // Sterilize message state payload before sending to prevent circular crash
    const res = await fetch('/api/smart-chat/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: sterilizedMessages, thinkingLevel, schemeContext, profileSnapshot }) // Stringify clean payload safely with schemeContext and profileSnapshot
    });

    if (!res.ok) {
      throw new Error(`API endpoint returned ${res.status}`);
    }

    const data = await res.json();
    return data as ChatResponse;
  } catch (error) {
    console.error("Gemini API Error", error);
    return {
      loading_messages: ["Error"],
      thinking_level: "low",
      blocks: [
        { type: 'callout', data: { variant: 'error', title: 'API Error', content: String(error) } }
      ],
      citations: [],
      follow_up_suggestions: []
    };
  }
}

