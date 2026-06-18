import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

async function run() {
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials!");
    return;
  }
  
  console.log("Fetching existing schemes from Supabase...");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/schemes?select=id,name,state,category`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!res.ok) {
      console.log("Error:", await res.text());
      return;
    }
    
    const schemes = await res.json() as any[];
    console.log(`Current schemes count: ${schemes.length}`);
    schemes.forEach((s, idx) => {
      console.log(`${idx + 1}. [${s.state}] ${s.name} (${s.category})`);
    });
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

run();
