async function run() {
  console.log("Fetching health from Port 8000...");
  try {
    const res8000 = await fetch('http://127.0.0.1:8000/api/health');
    console.log("Port 8000 Status:", res8000.status);
    console.log("Port 8000 Text:", await res8000.text());
  } catch (err: any) {
    console.log("Port 8000 Error:", err.message);
  }

  console.log("\nFetching health from Port 3000...");
  try {
    const res3000 = await fetch('http://127.0.0.1:3000/api/health');
    console.log("Port 3000 Status:", res3000.status);
    console.log("Port 3000 Text:", await res3000.text());
  } catch (err: any) {
    console.log("Port 3000 Error:", err.message);
  }
}

run();
