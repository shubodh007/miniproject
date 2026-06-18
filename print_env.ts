import dotenv from 'dotenv';
dotenv.config();

console.log("Reading .env keys...");
const keys = Object.keys(process.env);
for (const key of keys) {
  const val = process.env[key];
  if (val && (key.includes('SUPABASE') || key.includes('GEMINI'))) {
    console.log(`${key}: length=${val.length}, startsWith=${val.substring(0, 10)}...`);
  }
}
