async function run() {
  console.log("Fetching /api/health/test-rag from Port 3000...");
  try {
    const res = await fetch('http://127.0.0.1:3000/api/health/test-rag');
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response JSON:", text);
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}

run();
