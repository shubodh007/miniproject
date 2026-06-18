import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

async function run() {
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials!");
    return;
  }
  
  console.log("Fetching schemes from Supabase Rest API...");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/scheme_chunks?select=*&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    console.log("Response Status:", res.status);
    if (!res.ok) {
      console.log("Error:", await res.text());
      return;
    }
    
    const chunks = await res.json() as any[];
    console.log(`Successfully fetched ${chunks.length} chunks!`);
    if (chunks.length > 0) {
      const c = chunks[0];
      console.log("Chunk keys:", Object.keys(c));
      console.log("chunk_text:", c.chunk_text ? c.chunk_text.slice(0, 100) + "..." : "EMPTY");
      console.log("embedding values count:", c.embedding ? (typeof c.embedding === 'string' ? 'String format' : Array.isArray(c.embedding) ? c.embedding.length : typeof c.embedding) : 'MISSING');
      if (Array.isArray(c.embedding)) {
        console.log("First 3 embedding dimensions:", c.embedding.slice(0, 3));
      }
    }
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

run();
