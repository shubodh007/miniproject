import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function check() {
  console.log("Checking API health and process listings...");
  try {
    const { stdout: curlOut } = await execAsync("curl -s http://127.0.0.1:8000/api/health || echo 'offline'");
    console.log("FastAPI /api/health Response:", curlOut.trim());
  } catch (err: any) {
    console.warn("Curl failed:", err.message);
  }

  try {
    const { stdout: psOut } = await execAsync("ps aux | grep -i python || echo 'no python'");
    console.log("Python Processes:\n", psOut.trim());
  } catch (err: any) {
    console.warn("ps failed:", err.message);
  }
}

check();
