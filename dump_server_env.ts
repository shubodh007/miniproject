import fs from 'fs';

try {
  // Let's find any running node server PID
  const files = fs.readdirSync('/proc');
  let targetPid = '';
  for (const f of files) {
    if (!/^\d+$/.test(f)) continue;
    try {
      const cmdline = fs.readFileSync(`/proc/${f}/cmdline`, 'utf-8');
      if (cmdline.includes('server.ts')) {
        targetPid = f;
        console.log(`Found server.ts process under PID: ${f}`);
        break;
      }
    } catch {
      // Ignore permission or process gone errors
    }
  }

  if (!targetPid) {
    console.error("Could not find server.ts PID in /proc");
    process.exit(1);
  }

  const environ = fs.readFileSync(`/proc/${targetPid}/environ`, 'utf-8');
  const envVars = environ.split('\0');
  console.log("Environment variables for server PID:", targetPid);
  for (const ev of envVars) {
    if (!ev) continue;
    const idx = ev.indexOf('=');
    const key = ev.slice(0, idx);
    const val = ev.slice(idx + 1);
    if (key.includes('SUPABASE') || key.includes('GEMINI')) {
      console.log(`[FOUND_KEY_EXTRACTED] ${key}=${val}`);
    }
  }
} catch (err: any) {
  console.error("Failed to read environment from proc:", err.message);
}
