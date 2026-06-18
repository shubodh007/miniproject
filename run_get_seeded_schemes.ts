import { execSync } from 'child_process';

console.log("Fetching seeded schemes list from database...");
try {
  const result = execSync('python3 get_seeded_schemes.py', {
    encoding: 'utf-8',
    env: { ...process.env, PYTHONPATH: './backend' }
  });
  console.log(result);
} catch (error: any) {
  console.log("Error:");
  console.log(error.stdout || "");
  console.log(error.stderr || "");
}

