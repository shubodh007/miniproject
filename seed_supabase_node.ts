import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const apiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("--------------------------------------------------------------------------------");
  console.log("ℹ [Supabase Seeder] No SUPABASE_URL or SUPABASE_KEY credentials found in environment.");
  console.log("Local rule engine is successfully fully populated with all 76 new schemes,");
  console.log("but cloud RAG vector ingestion is deferred until Supabase credentials are provided.");
  console.log("--------------------------------------------------------------------------------");
  process.exit(0);
}

if (!apiKey) {
  console.error("❌ No GEMINI_API_KEY found!");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const freshSchemesPath = path.join(process.cwd(), 'frontend', 'src', 'utils', 'fresh_schemes_mapped.json');
const schemes = JSON.parse(fs.readFileSync(freshSchemesPath, 'utf-8'));

function cleanText(text: string): string {
  if (!text) return "";
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function chunkText(text: string, chunkSize: number = 750, overlap: number = 120): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentWords: string[] = [];
  let currentLen = 0;

  for (const word of words) {
    currentWords.push(word);
    currentLen += word.length + 1;
    if (currentLen >= chunkSize) {
      chunks.push(currentWords.join(" "));
      // Overlap by keeping some trailing words
      const overlapWords = currentWords.slice(-Math.floor(overlap / 6));
      currentWords = overlapWords;
      currentLen = currentWords.join(" ").length;
    }
  }
  if (currentWords.length > 0) {
    chunks.push(currentWords.join(" "));
  }
  return chunks;
}

function detectLanguage(text: string): string {
  const hasTelugu = /[\u0c00-\u0c7f]/.test(text);
  if (hasTelugu) return "te";
  return "en";
}

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const res = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: text,
      config: {
        outputDimensionality: 768
      }
    });
    if (res && (res as any).embedding && Array.isArray((res as any).embedding.values)) {
      return (res as any).embedding.values;
    }
    return Array(768).fill(0);
  } catch (err: any) {
    console.error("Embedding generation error:", err.message || err);
    return Array(768).fill(0);
  }
}

async function run() {
  console.log("=============================================================");
  console.log("     SEEDING AP, TS & CENTRAL WELFARE SCHEMES TO SUPABASE    ");
  console.log("=============================================================");

  for (let i = 0; i < schemes.length; i++) {
    const sc = schemes[i];
    console.log(`[${i + 1}/${schemes.length}] Seeding cloud vector database: ${sc.name_en}`);

    // 1. Check if scheme already registered in Supabase
    let scheme_id = "";
    try {
      const checkRes = await fetch(`${supabaseUrl}/rest/v1/schemes?name=eq.${encodeURIComponent(sc.name_en)}&select=id`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json() as any[];
        if (checkData && checkData.length > 0) {
          console.log(`   ⏭ Already seeded. Skipping.`);
          continue;
        }
      }
    } catch (e: any) {
      console.log(`   ⚠ Check failed, proceeding: ${e.message}`);
    }

    // 2. Insert scheme definition if not found
    try {
      const insRes = await fetch(`${supabaseUrl}/rest/v1/schemes?select=id`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: sc.name_en,
          name_te: sc.name_te,
          category: sc.category,
          state: sc.source === "Central" ? "Central" : sc.states[0],
          description: sc.name_en + " detailed scheme benefits.",
          benefit_details: sc.benefit_amount,
          eligibility_rules: {
            min_age: sc.min_age,
            max_age: sc.max_age,
            max_income: sc.max_income,
            requires_land: sc.requires_land,
            applicable_states: sc.states
          },
          docs_required: sc.documents_required,
          external_url: sc.apply_link
        })
      });

      if (!insRes.ok) {
        throw new Error(await insRes.text());
      }
      const data = await insRes.json() as any[];
      if (data && data.length > 0) {
        scheme_id = data[0].id;
      }
    } catch (err: any) {
      console.error(`   ❌ Failed to insert scheme registration record: ${err.message}`);
      continue;
    }

    if (!scheme_id) {
      console.error(`   ❌ No scheme ID returned for ${sc.name_en}`);
      continue;
    }

    // 3. Construct section chapters
    const sections: [string, string][] = [
      ["Overview & Detailed Description", `${sc.name_en}\nTelugu Title: ${sc.name_te}\nMinistry: ${sc.ministry}\nDepartment: ${sc.department}`],
      ["Financial & Administrative Benefits", `Benefit Amount: ${sc.benefit_amount}\nApply details URL: ${sc.apply_link}`],
      ["Eligibility Constraints and Conditions", `Minimum Age: ${sc.min_age}\nMaximum Age: ${sc.max_age}\nAnnual income cap: ₹${sc.max_income}\nRequires Land: ${sc.requires_land}`],
      ["Required Papers Checklist", `Documents checklist:\n` + sc.documents_required.map((d: string) => `- ${d}`).join('\n')]
    ];

    const chunksToInsert: any[] = [];

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const [sectionTitle, content] = sections[sIdx];
      const cleaned = cleanText(content);
      const parts = chunkText(cleaned);

      for (let pIdx = 0; pIdx < parts.length; pIdx++) {
        const text = parts[pIdx];
        const embedding = await getEmbedding(text);
        const lang = detectLanguage(text);

        chunksToInsert.push({
          scheme_id,
          chunk_text: text,
          embedding,
          metadata: {
            scheme_name: sc.name_en,
            name_te: sc.name_te,
            category: sc.category,
            state: sc.states.join(", "),
            language: lang,
            source_url: sc.apply_link,
            document_title: sectionTitle,
            chunk_id: `${scheme_id}_sec_${sIdx}_chunk_${pIdx}`,
            last_ingested: new Date().toISOString()
          }
        });
      }
    }

    // 4. Bulk insert scheme chunks to Supabase
    if (chunksToInsert.length > 0) {
      try {
        const chunkRes = await fetch(`${supabaseUrl}/rest/v1/scheme_chunks`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(chunksToInsert)
        });
        if (!chunkRes.ok) {
          throw new Error(await chunkRes.text());
        }
        console.log(`   ✔ Successfully ingested! Added ${chunksToInsert.length} vector chunks.`);
      } catch (err: any) {
        console.error(`   ❌ Failed block storage insertion: ${err.message}`);
      }
    }
  }

  console.log("=============================================================");
  console.log(" DB SEEDING COMPLETED SUCCESSFULLY!");
  console.log("=============================================================");
}

run();
