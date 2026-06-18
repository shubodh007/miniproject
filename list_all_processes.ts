import { execSync } from 'child_process';

try {
  console.log("Listing all running processes:");
  const out = execSync("ps aux", { encoding: 'utf-8' });
  console.log(out);
} catch (e: any) {
  console.error("Failed:", e.message);
}
