import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemma-4-31b-it',
      contents: 'Hello',
    });
    console.log(res.text);
  } catch (err) {
    console.error(err);
  }
}
run();
