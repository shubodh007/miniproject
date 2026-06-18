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

console.log("Probing Python environments...");
runCmd("python3 -c 'import sys; print(sys.executable); print(sys.path)'");
runCmd("pip --version || pip3 --version");
runCmd("python3 -m pip list --format=columns");
runCmd("find . -maxdepth 3 -name '*venv*' || echo 'none'");
