async function testHealth() {
  console.log("Testing health API on Port 3000...");
  try {
    const response = await fetch('http://127.0.0.1:3000/api/health', {
      method: 'GET'
    });
    
    if (!response.ok) {
      console.log(`Failed with status: ${response.status}`);
      const text = await response.text();
      console.log("Error body:", text);
      return;
    }
    
    const data = await response.json();
    console.log("Health returned successfully! Data:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

testHealth();

