import { execSync } from 'child_process';

try {
  console.log("Checking what's on port 8000...");
  const out = execSync("ss -lptn 'sport = :8000' || netstat -anp | grep 8000 || lsof -i :8000 || echo 'no port tool'", { encoding: 'utf-8' });
  console.log(out);
} catch (e: any) {
  console.error("Failed:", e.message);
}
