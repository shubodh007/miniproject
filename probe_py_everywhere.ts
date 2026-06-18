import { execSync } from 'child_process';

function runCmd(cmd: string) {
  console.log(`\n--- Running cmd: ${cmd} ---`);
  try {
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log(out);
  } catch (error: any) {
    console.error("Failed:", error.stdout || error.message);
  }
}

console.log("Searching for virtual environments or other python runtimes on the machine...");
runCmd("find / -name 'pip' -type f 2>/dev/null | grep -v 'node_modules' || echo 'none'");
runCmd("find / -name 'uvicorn' -type f 2>/dev/null | grep -v 'node_modules' || echo 'none'");
runCmd("find / -name 'python' -type f 2>/dev/null | grep -v 'node_modules' || echo 'none'");
