console.log("PATH Environment Variable:", process.env.PATH);
console.log("Entire process.env:");
for (const key of Object.keys(process.env)) {
  console.log(`${key}=${process.env[key]}`);
}
