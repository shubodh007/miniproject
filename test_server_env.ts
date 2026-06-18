import { execSync } from 'child_process';

console.log("Checking environment and process lists...");
try {
  // Let's print the environment variables
  console.log("Process Env keys:", Object.keys(process.env));
  console.log("PATH:", process.env.PATH);
  
  // Let's check if there is an active virtualenv in python or pip
  const pipResult = execSync('pip3 list || pip list', { encoding: 'utf-8' });
  console.log("Pip list:", pipResult.slice(0, 500));
} catch (error: any) {
  console.log("Error:", error.message, error.stderr || "");
}
