import { execSync } from 'child_process';

try {
  console.log("Running python test script via subprocess...");
  const output = execSync('python3 backend/test_embedding.py', { encoding: 'utf-8' });
  console.log("Subprocess output:");
  console.log(output);
} catch (error: any) {
  console.error("Subprocess execution failed:");
  console.error(error.stdout || error.message);
}
