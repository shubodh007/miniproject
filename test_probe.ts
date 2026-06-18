import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

async function probe() {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const embRes = await ai.models.embedContent({
    model: 'gemini-embedding-2-preview',
    contents: "What is PM-KISAN?",
    config: {
      outputDimensionality: 768
    }
  });
  console.log("Raw Response structure:", JSON.stringify(embRes).slice(0, 200));
  const rawEmb = embRes as any;
  const qEmb = rawEmb.embeddings?.[0]?.values || rawEmb.embedding?.values || rawEmb.embeddings || rawEmb.embedding || [];
  console.log("gemini-embedding-2-preview with outputDimensionality 768 length:", qEmb.length);
  console.log("First 10 values:", qEmb.slice(0, 10));
}

probe().catch(console.error);
