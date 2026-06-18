import { GoogleGenAI, Type } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemma-4-31b-it',
      contents: 'Analyze a user named John Doe who is 30 years old. Output a profile.',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            age: { type: Type.NUMBER }
          }
        }
      }
    });
    console.log("Success with JSON schema:", res.text);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
