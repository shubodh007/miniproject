import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

async function testEmbed() {
  console.log("Testing Node Gemini embed_content...");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY found!");
    return;
  }
  
  console.log("Found key: ...", apiKey.slice(-6));
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
  
  try {
    const t0 = Date.now();
    const result = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: 'Sample test text for RAG QA engineering validate check.'
    });
    console.log(`Success in ${Date.now() - t0}ms!`);
    console.log("Raw Result:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("Embedding API failed:", err.message || err);
  }
}

testEmbed();
