import { execSync } from 'child_process';

console.log("Running python script via Node tsx...");
try {
  const result = execSync('python3 test_rag_retrieve.py', {
    env: {
      ...process.env,
      PYTHONPATH: './backend'
    },
    encoding: 'utf-8'
  });
  console.log("Python Output:\n", result);
} catch (err: any) {
  console.error("Execution error:", err.message);
  console.error("Python Stderr/Stdout:", err.stdout || "", err.stderr || "");
}
