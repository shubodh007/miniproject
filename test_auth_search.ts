import { upsertGoogleUser, createSession } from './server/db';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Preparing QA session database entry...");
  const user = await upsertGoogleUser({
    sub: 'qa-engineer-sub-id-123456',
    name: 'RAG QA Principal Engineer',
    email: 'qa_engineer@schemeconnect.org',
    picture: ''
  });
  
  const session = await createSession(user);
  console.log("Session created successfully!");
  console.log("Token:", session.token);
  
  console.log("\nExecuting search via Port 3000 with session cookie...");
  try {
    const response = await fetch('http://127.0.0.1:3000/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sc_session_token=${session.token}`
      },
      body: JSON.stringify({
        query: 'Aarogyasri',
        top_k: 2
      })
    });
    
    console.log("Search HTTP Status:", response.status);
    const body = await response.text();
    console.log("Search Response:", body.slice(0, 500) + (body.length > 500 ? "..." : ""));
  } catch (err: any) {
    console.error("Fetch search failed:", err.message);
  }
}

run();
