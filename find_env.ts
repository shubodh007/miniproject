import fs from 'fs';
import path from 'path';

try {
  const content = fs.readFileSync('/app/.dev.env.json', 'utf-8');
  const parsed = JSON.parse(content);
  console.log("Keys inside .dev.env.json:", Object.keys(parsed));
  // Safe-print keys and values
  for (const k of Object.keys(parsed)) {
    console.log(`${k}: length=${parsed[k].length}, startsWith=${parsed[k].substring(0, 10)}...`);
  }
} catch (err: any) {
  console.error("Failed to read JSON env:", err.message);
}

