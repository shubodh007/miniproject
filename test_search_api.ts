import dotenv from 'dotenv';
dotenv.config();

async function testSearch() {
  console.log("Testing retrieval API on Port 3000...");
  try {
    const response = await fetch('http://127.0.0.1:3000/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'Amma Vodi',
        top_k: 2
      })
    });
    
    if (!response.ok) {
      console.log(`Failed with status: ${response.status}`);
      const text = await response.text();
      console.log("Error body:", text);
      return;
    }
    
    const hits = await response.json();
    console.log("Retrieved successfully! Hits count:", hits.length);
    console.log("Hits sample:", JSON.stringify(hits, null, 2));
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

testSearch();

