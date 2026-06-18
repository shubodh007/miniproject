import fs from 'fs';
import path from 'path';

function findFile(dir: string, targetName: string) {
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      if (f === 'node_modules' || f === 'proc' || f === 'sys' || f === 'dev' || f === 'var' || f === 'etc' || f === 'usr/share' || f === 'usr/lib') continue;
      
      if (f === targetName) {
        console.log(`FOUND EXACT PATH: ${fullPath}`);
      }
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          findFile(fullPath, targetName);
        }
      } catch (e) {}
    }
  } catch (e) {}
}

console.log("Searching for exact file match: 'uvicorn'...");
findFile('/', 'uvicorn');

console.log("Searching for exact file match: 'pip'...");
findFile('/', 'pip');
