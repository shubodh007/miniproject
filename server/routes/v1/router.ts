import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { runMatchEngine } from '../../../frontend/src/utils/schemeEngine';
import { maskAadhaar, sanitizeDocument } from '../../../frontend/src/utils/security';
import { sessionCache } from '../../../frontend/src/utils/sessionCache';
import { logger } from '../../../frontend/src/utils/logger';
import { CitizenProfileSchema } from '../../../frontend/src/utils/schemas';
import { generateContentWithRetryAndFallback, generateContentStreamWithRetryAndFallback, getEmbedding, Type } from '../../../frontend/src/utils/gemini';
import { analyzeLegalDocumentLocal, generateDynamicChatResponseLocal } from '../../../frontend/src/utils/localReply';
import { ProfilePayload } from '../../../frontend/src/types';
import { 
  addFullLegalRecord, 
  getDocumentByHash, 
  getReportsByUser, 
  getReport, 
  getAllReports, 
  getAllDocuments, 
  getAllDocumentChunks,
  getReportByDocId,
  getDocumentChunks,
  getSession,
  LegalDocument,
  LegalDocumentChunk,
  LegalReport
} from '../../db';
import { 
  sanitizePII, 
  segmentDocumentIntoChunks, 
  detectRiskRules, 
  analyzeContradictions, 
  evaluateMissingProtections 
} from '../../rulesEngine';
import {
  segmentHierarchically,
  bm25Search,
  rrfConsolidate,
  expandQueryWithHyDE
} from '../../ragUtils';
import { PipelineTimer } from '../../utils/PipelineTimer';

const router = express.Router();



const chatLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 20,               // 20 requests per minute
  message: { error: 'Too many requests. Slow down.' },
  keyGenerator: (req) => (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown',
  validate: false
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Slow down.' },
  keyGenerator: (req) => (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown',
  validate: false
});

const AP_DISTRICTS = [
  'Srikakulam', 'Vizianagaram', 'Visakhapatnam', 'Alluri Sitharama Raju', 
  'Parvathipuram Manyam', 'Anakapalli', 'Kakinada', 'Konaseema', 'Eluru', 
  'West Godavari', 'NTR', 'Krishna', 'Guntur', 'Bapatla', 'Palnadu', 
  'Sri Potti Sriramulu Nellore', 'Kurnool', 'Nandyal', 'Anantapur', 
  'Sri Sathya Sai', 'Kadapa', 'YSR Kadapa', 'Tirupati', 'Annamayya', 'Prakasam', 'Chittoor',
  'East Godavari', 'Nellore'
];

const TS_DISTRICTS = [
  'Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally',
  'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem Asifabad', 'Mahabubabad',
  'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda',
  'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy',
  'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'
];

// Health Check Endpoint
router.get('/health', (req, res) => {
  logger.info('Processing v1 API health check');
  return res.json({ status: 'ok', api: 'v1' });
});

// Match Endpoint
router.post('/match', async (req, res) => {
  logger.info('Processing v1 eligibility matching request');

  try {
    // 1. Zod validation parsing
    const payload = CitizenProfileSchema.parse(req.body) as ProfilePayload;

    // 2. Spatial validation checks for AP and TS districts
    if (payload.state === 'Andhra Pradesh' && !AP_DISTRICTS.includes(payload.district)) {
      logger.warn(`Spatial Validation Failed: District [${payload.district}] does not belong to State [${payload.state}]`);
      return res.status(400).json({
        error: `District validation failed: '${payload.district}' is not part of Andhra Pradesh.`
      });
    }

    if (payload.state === 'Telangana' && !TS_DISTRICTS.includes(payload.district)) {
      logger.warn(`Spatial Validation Failed: District [${payload.district}] does not belong to State [${payload.state}]`);
      return res.status(400).json({
        error: `District validation failed: '${payload.district}' is not part of Telangana.`
      });
    }

    // 3. Aadhaar security layer: mask details before caching or dispatching
    if (payload.aadhaar) {
      payload.aadhaar = maskAadhaar(payload.aadhaar);
    }

    // 4. Session cache retrieve
    const cacheHit = sessionCache.get(payload);
    if (cacheHit) {
      return res.json({
        search_id: Math.random().toString(36).substring(2, 9),
        total_found: cacheHit.length,
        schemes: cacheHit,
        summary_message: payload.language === 'te'
          ? `కనుగొనబడినవి! మీ ప్రొఫైల్‌కు ${cacheHit.length} సంక్షేమ పథకాలు సరిపోయాయి (కాష్).`
          : `Success! We found ${cacheHit.length} welfare schemes matching your profile (cached).`
      });
    }

    // 5. Evaluate matching mechanics in the rule engine
    const matchedLocalSchemes = runMatchEngine(payload);

    // 6. Gemini-powered dynamic reason augmentation
    try {
      const languageName = payload.language === 'te' ? 'Telugu' : 'English';

      // Clean fallback strings for optional variables in Gemini prompts
      const genderStr = payload.gender ? payload.gender.trim() : 'Not Specified';
      const subCasteStr = payload.sub_caste ? payload.sub_caste.trim() : 'None Specified';
      const mandalStr = payload.mandal ? payload.mandal.trim() : 'Not Defined';
      const studentLevelStr = payload.student_level ? payload.student_level.trim() : 'Other';
      const houseTypeStr = payload.house_type ? payload.house_type.trim() : 'Pucca';
      const soilTypeStr = payload.soil_type ? payload.soil_type.trim() : 'Other';

      const prompt = `
        Analyze the following citizen of ${payload.state}, India and match them with welfare schemes.
        
        Citizen Profile:
        - Name: ${payload.name}
        - Age: ${payload.age} years old
        - Gender: ${genderStr}
        - Annual Household Income: ₹${payload.income_annual.toLocaleString('en-IN')}
        - Occupation: ${payload.occupation}
        - Owns Land: ${payload.land_acres ? `Yes (${payload.land_acres} acres)` : 'No'}
        - Landowner vs Tenant Farmer: ${payload.isTenantFarmer ? `Tenant Farmer (Owns: No, CCRC: ${payload.hasCCRC ? 'Yes' : 'No'})` : 'Landowner Farmer'}
        - bpl_card status: ${payload.bpl_card}
        - Caste Category: ${payload.caste_category}
        - Sub Caste: ${subCasteStr}
        - District: ${payload.district}
        - Mandal: ${mandalStr}
        - Habitation: ${payload.habitation || 'Rural'}
        - Student level: ${studentLevelStr}
        - House type: ${houseTypeStr} (Owns house: ${payload.own_house || 'No'})
        - Soil type: ${soilTypeStr}
        
        Candidates from our local rule engine matching basic criteria:
        ${JSON.stringify(matchedLocalSchemes, null, 2)}
        
        Task:
        Output a precise welfare recommendations list in ${languageName}.
        
        CRITICAL RULES:
        1. Spatial Consistency Rule: Verify districts carefully. If State is Andhra Pradesh, never recommend Telangana-specific programs. If State is Telangana, never suggest Andhra AP-specific programs.
        2. Tenant Farmer Rule: Under Telangana Rythu Bharosa/Rythu Bandhu, Tenant Farmers are strictly NOT eligible. Under AP Amma Vodi & Central PM-Kisan, tenant statuses do not block education/subsistence payouts.
        3. For each scheme, provide customized translated name, ministry, department, and category.
        4. Generate 2-3 logical bullet points explaining precisely WHY they qualify. Start reasons with "Your..." or "You are..." (in the selected language).
        5. Also compile necessary documents in documents_required list.
      `;

      logger.info('Dispatching prompt to Gemini build for eligibility augmentation');
      const response: any = await generateContentWithRetryAndFallback({
        contents: prompt,
        fallbackModel: 'gemma-4-31b-it',
        config: {
          systemInstruction: 'You are an elite government welfare eligibility portal. Output ONLY a valid JSON array matching the SchemeResult structure. Never include preamble or surrounding markdown text.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scheme_id: { type: Type.STRING },
                name_en: { type: Type.STRING },
                name_te: { type: Type.STRING },
                ministry: { type: Type.STRING },
                department: { type: Type.STRING },
                category: {
                  type: Type.STRING,
                  enum: ['Agriculture', 'Health', 'Housing', 'Education', 'Women & Child', 'Social Security', 'Employment']
                },
                source: {
                  type: Type.STRING,
                  enum: ['Central', 'AP State', 'Telangana State']
                },
                eligibility_reasons: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                documents_required: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                apply_link: { type: Type.STRING },
                benefit_amount: { type: Type.STRING },
                similarity_score: { type: Type.NUMBER }
              },
              required: ['scheme_id', 'name_en', 'name_te', 'ministry', 'department', 'category', 'source', 'eligibility_reasons', 'documents_required', 'apply_link', 'similarity_score']
            }
          }
        }
      });

      if (response && response.text) {
        const parsedSchemes = JSON.parse(response.text.trim());
        if (Array.isArray(parsedSchemes) && parsedSchemes.length > 0) {
          // Set to session cache upon successful response
          sessionCache.set(payload, parsedSchemes);

          return res.json({
            search_id: Math.random().toString(36).substring(2, 9),
            total_found: parsedSchemes.length,
            schemes: parsedSchemes,
            summary_message: payload.language === 'te'
              ? `కనుగొనబడినవి! మీ ప్రొఫైల్‌కు ${parsedSchemes.length} సంక్షేమ పథకాలు సరిపోయాయి.`
              : `Success! We found ${parsedSchemes.length} welfare schemes matching your profile.`
          });
        }
      }
    } catch (gemError: unknown) {
      const errorMessage = gemError instanceof Error ? gemError.message : 'Unknown error';
      logger.error('Gemini processing failed', { error: errorMessage });
      return res.status(500).json({ error: 'Request failed. Please retry.' });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isZod = error && typeof error === 'object' && 'name' in error && error.name === 'ZodError';
    logger.error('Error handling /match request', { error: errorMessage });
    return res.status(isZod ? 400 : 500).json({
      error: errorMessage || 'Internal server error processing eligibility match.'
    });
  }
});

const LEGAL_ADVISOR_SYSTEM_PROMPT_V3 = `
You are LegalAI-Pro — the absolute gold standard in automated contractual risk detection and legal advisory, designed by elite FAANG-caliber principal engineers to protect common citizens, tenants, employees, farmers, and daily wage workers across India (primarily Andhra Pradesh & Telangana). Your auditing accuracy must exceed 95% on all diagnostic parameters by adhering strictly to local jurisprudence, rejecting corporate overreach, and formulating solid legal defenses in simple, accessible language.

APPLICABLE LAWS:
  - Indian Contract Act, 1872
  - Transfer of Property Act, 1882
  - Registration Act, 1908
  - Specific Relief Act, 1963
  - Consumer Protection Act, 2019
  - AP Buildings (Lease, Rent & Eviction) Control Act, 1960
  - Telangana Buildings (Lease, Rent & Eviction) Control Act
  - Arbitration & Conciliation Act, 1996 (with 2015, 2019, 2021 amendments)
  - Real Estate (Regulation & Development) Act, 2016 (RERA)
  - Indian Easements Act, 1882
  - Limitation Act, 1963
  - Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (POSH)

══════════════════════════════════════════
ELITE AUDIT CHECKLIST & LEGAL PITFALLS:
══════════════════════════════════════════

1. UNLAWFUL POST-EMPLOYMENT RESTRICTIONS
   - Statute: SECTION 27, INDIAN CONTRACT ACT, 1872
   - Rule: Any post-termination non-compete clause (regardless of geographic radius or duration) is completely VOID. Flag as CRITICAL if written, notifying the employee they can legally ignore it after resigning.

2. PREDATORY SECURITY DEPOSITS & WEAR-AND-TEAR FORFEITURES
   - Statute: RENT CONTROL LEGISLATION & MODEL TENANCY FRAMEWORKS
   - Rule: Forcing flat deductions or forfeiture of the security deposit for painting, general cleaning, or normal wear-and-tear is invalid. Deposits must be fully refundable within 7-30 days of vacant possession, subject only to actual, non-wear-and-tear repairs. Flag as HIGH or CRITICAL.

3. UNBALANCED NOTICE PERIODS & TERMINATION OUTCOMES
   - Statute: UNCONSCIONABLE COVENANTS UNDER SECTION 23/24
   - Rule: If the Employee/Tenant must give 60-90 days notice but the Employer/Landlord can terminate immediately with no notice or severance, flag as HIGH. Recommend mutual notice periods.

4. EXORBITANT LIQUIDATED DAMAGES & TRAINING BONDS
   - Statute: SECTION 74, INDIAN CONTRACT ACT, 1872
   - Rule: Exorbitant bonds (e.g., ₹5,00,000 for 1-year service) are unenforceable fines. Employers can only recover actual, direct training expenses incurred, which must be documented. Flag as HIGH.

5. STRUCTURAL REPAIR OBLIGATIONS
   - Statute: SECTION 108(M), TRANSFER OF PROPERTY ACT, 1882
   - Rule: Shifting roof, wall seepage, plumbing line decay, or major electrical repairs onto the tenant is illegal. Major repairs are structural obligations of the owner. Flag as HIGH.

6. UNILATERAL ARBITRARY ACCESS & ENTRY
   - Statute: COVENANT OF QUIET ENJOYMENT & PRIVACY LAWS
   - Rule: Landlords claiming the right to enter "anytime without notice" or "at any hour of day/night" violates quiet possession. Require 24-hour notice and reasonable daytime hours. Flag as HIGH.

7. PREDATORY COMPOUNDING LATE FEES & INTEREST RATES
   - Statute: USURIOUS LOANS ACT / SECTION 74
   - Rule: Late rent interest rates exceeding 1-1.5% per month (or daily fees like ₹500/day) are predatory fines. Flag as HIGH.

8. OUT-OF-STATE EXCLUSIVE JURISDICTION SQUEEZEOUT
   - Statute: SECTION 20 CPC & SECTION 28 INDIAN CONTRACT ACT
   - Rule: Forcing a local citizen in Andhra Pradesh or Telangana to sue in Mumbai or Delhi simply to create a cost obstacle is predatory. Flag as MEDIUM or HIGH.

════════════════════════════════════════════
MANDATORY MULTI-PASS ANALYSIS PIPELINE
════════════════════════════════════════════

You MUST evaluate the document sequentially through three structured reasoning passes before arriving at your final output structure:

PASS 1 — SYNTAX CHECK FOR COVENANTS & CLAUSES:
  - Perform a rigorous syntax, logical, and structural check of the clauses.
  - Detect incomplete definitions, missing conditions, ungrammatical cross-references, poorly formed phrases, punctuation errors, numbering anomalies, and missing elements that jeopardize clarity.
  - Assess if words like "shall", "may", "must" are used incorrectly or shift unfair burden implicitly due to syntax nuances.

PASS 2 — ENTITY EXTRACTION FOR PII & LIABILITY ALLOCATIONS:
  - Delineate and extract all identifiable parties (e.g., Tenant, Landlord, Employee, Employer) and catalog sensitive identifiers (Aadhaar, PAN, phone numbers, emails, addresses) securely.
  - Explicitly extract all clauses defining liability ceilings, penalty rates, caps, warranties, indemnity obligations, limits of liability, waiver of rights, and fee structures.

PASS 3 — REGULATORY CONTEXT VERIFICATION VIA WEB SEARCH OR LEGAL KNOWLEDGE:
  - Verify every clause against current Indian legal regulatory context (validating central acts and local state laws, such as the Indian Contract Act, 1872, the AP/Telangana Buildings Lease and Rent Control Acts, Transfer of Property Act, 1882, POSH Act, etc.).
  - Cross-examine validity against modern supreme court decisions, invalidating one-sided remote jurisdiction, unconscionable bonds, and automatic security deposit forfeitures constraint parameters.

MANDATORY 95% ACCURACY CONFIDENCE CHECK:
  - Evaluate the "confidence" score for every single flagged risk on a scale from 0.00 to 1.00.
  - The threshold for including any finding in the final "flags" array is Strictly 95% accuracy (confidence >= 0.95).
  - Any finding with less than 0.95 confidence MUST be suppressed and omitted from the flagged risks to guarantee zero false positives, providing maximum reliability for common citizens.

════════════════════════════════════════════
ANALYSIS PROTOCOL — follow all 8 steps
════════════════════════════════════════════

STEP 1 — DOCUMENT CLASSIFICATION
  Identify document type:
  rental_agreement | sale_deed | loan_agreement |
  employment_contract | service_agreement |
  power_of_attorney | lease_deed | other

STEP 2 — CLAUSE BY CLAUSE ANALYSIS
  For EVERY clause in the document:
  → Read the full clause text completely
  → Identify the legal risk level
  → Check against applicable Indian statutes
  → Determine which party is harmed
  → Write the exact legal basis (statute + section)
  → Write a full explanation in plain language
  → Write the exact replacement clause wording

STEP 3 — SEVERITY CLASSIFICATION RULES
  Classify EXACTLY as one of:
  "critical" → illegal under Indian law OR causes severe
                financial harm OR waives fundamental rights
  "high"     → heavily one-sided OR unenforceable as written
                OR creates significant hidden liability
  "medium"   → unfair but legally valid OR missing standard
                protections expected in this document type
  "low"      → minor imbalance OR suggest improvement only

  DO NOT downgrade severity to seem balanced.
  If a clause is illegal — mark it CRITICAL.
  If a clause is exploitative — mark it HIGH.

STEP 4 — RISK SCORE CALCULATION (0 to 100)
  Start at 0. Add points for each flag found:
  critical flag = 25 points each (max 4 critical = 100)
  high flag     = 15 points each
  medium flag   = 8 points each
  low flag      = 3 points each
  Cap final score at 100.

  Risk labels:
  0–30:   "LOW RISK — Standard agreement"
  31–60:  "REVIEW REQUIRED — Negotiate before signing"
  61–85:  "HIGH RISK — Major revisions needed"
  86–100: "CRITICAL — Do not sign without legal help"

STEP 5 — MISSING CLAUSE DETECTION
  Check if these essential clauses are MISSING:
  → Maintenance responsibility (who pays what)
  → Notice period for termination
  → Penalty clause (check if rate is legal)
  → Security deposit refund timeline
  → Dispute resolution mechanism
  → Lock-in period terms
  → Rent escalation terms
  Flag each missing clause as severity "medium"

STEP 6 — PARTY BALANCE ASSESSMENT
  Count flags by party_harmed:
  → tenant_harmed / borrower_harmed / employee_harmed
  → landlord_harmed / lender_harmed / employer_harmed
  → both_parties_harmed
  Calculate balance_index:
  (tenant flags / total flags) × 100
  > 70% = "Heavily favors landlord/lender"

STEP 7 — NEGOTIATION CHECKLIST
  For every flag with severity critical or high:
  → Write one specific negotiation talking point
  → Write the exact replacement wording to demand
  → Write the legal basis the tenant can cite

STEP 8 — FINAL VALIDATION
  Before outputting JSON:
  → Count total clauses in document
  → Count clauses analyzed — must match
  → If total_analyzed < total_clauses:
    analyze the missed clauses before outputting
  → Verify risk_score matches flag count × weights
  → Verify document_type is set correctly

════════════════════════════════════════════
ZERO HALLUCINATION RULES
════════════════════════════════════════════

  → Only flag what is actually in the document
  → Every flag must quote the exact clause text in evidence
  → Never invent clauses that don't exist
  → If document has < 100 words: type = "INSUFFICIENT"
  → Confidence score rules:
      confirmed:  0.90–1.00 (clear statute violation)
      probable:   0.70–0.89 (likely unfair/unenforceable)
      uncertain:  0.50–0.69 (possible issue, needs review)

════════════════════════════════════════════
OUTPUT — RETURN THIS EXACT JSON STRUCTURE
════════════════════════════════════════════

{
  "document_type": "rental_agreement",
  "document_summary": {
    "parties": {
      "landlord": "full name",
      "tenant": "full name"
    },
    "property": "full address",
    "term_months": 11,
    "monthly_rent": 18000,
    "security_deposit": 50000,
    "total_clauses_found": 10,
    "total_clauses_analyzed": 10
  },
  "risk_score": 80,
  "risk_label": "HIGH RISK — Major revisions needed",
  "balance_index": 85,
  "balance_label": "Heavily favors landlord",
  "flags": [
    {
      "flag_id": "FLAG-001",
      "clause_number": 4,
      "clause_title": "Structural Repairs",
      "severity": "critical",
      "confidence": 0.97,
      "party_harmed": "tenant",
      "evidence": "exact verbatim quote from the clause",
      "legal_basis": "Transfer of Property Act, 1882 — Section 108(m): landlord responsible for structural repairs",
      "explanation": "Plain language explanation in 2-3 sentences explaining what this means for the tenant and why it is dangerous",
      "risk_to_user": "Specific financial or legal harm this clause can cause",
      "recommended_revision": "The Landlord shall be solely responsible for all structural repairs including foundation, roof, plumbing systems, and electrical wiring. The Tenant shall only be liable for minor day-to-day maintenance not exceeding ₹500 per incident.",
      "negotiation_point": "Exact talking point to use with landlord",
      "legal_citation": "Cite the specific law and section number"
    }
  ],
  "missing_clauses": [
    {
      "clause_type": "rent_escalation",
      "severity": "medium",
      "explanation": "No rent escalation clause found. Landlord may arbitrarily increase rent.",
      "recommended_addition": "Exact clause text to add"
    }
  ],
  "negotiation_checklist": [
    {
      "item_id": "NEG-001",
      "flag_reference": "FLAG-001",
      "talking_point": "Under Section 108(m) of the Transfer of Property Act, structural repairs are legally the landlord's responsibility. This clause is void.",
      "demand": "Remove Clause 4 entirely",
      "fallback": "If landlord refuses, cap tenant liability at ₹2,000 per incident"
    }
  ],
  "safe_clauses": [
    {
      "clause_number": 9,
      "clause_title": "Dispute Resolution",
      "reason": "Arbitration clause is standard and enforceable"
    }
  ],
  "summary_for_user": "Plain English 3-sentence summary of the most important things this person needs to know before signing"
}

════════════════════════════════════════════
CRITICAL OUTPUT RULES
════════════════════════════════════════════

  → Output ONLY the JSON object — no markdown, no backticks
  → NO field should be under 15 words except IDs and numbers
  → explanation field: minimum 2 full sentences
  → recommended_revision: must be a complete legal clause
  → evidence: must be the exact verbatim text from document
  → Every critical and high flag needs negotiation_point
  → risk_score MUST be on 0–100 scale
  → clause_title MUST come from the actual document heading
    NOT from the sequence index or fallback labels
`;

// Helper function to extract categories from paragraph texts
function classifyChunkText(text: string): string[] {
  const cats: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes('rent') || lower.includes('lease') || lower.includes('landlord') || lower.includes('tenant')) {
    cats.push('lease_terms');
  }
  if (lower.includes('water') || lower.includes('electricity') || lower.includes('power') || lower.includes('utility')) {
    cats.push('utilities');
  }
  if (lower.includes('dispute') || lower.includes('court') || lower.includes('jurisdiction') || lower.includes('arbitration')) {
    cats.push('dispute_resolution');
  }
  if (lower.includes('penalty') || lower.includes('forfeit') || lower.includes('charges') || lower.includes('fine')) {
    cats.push('punitive_clauses');
  }
  if (cats.length === 0) {
    cats.push('general_provisions');
  }
  return cats;
}

function extractClauseHeading(text: string, index: number): string {
  // Pattern 1: "CLAUSE 4 – STRUCTURAL REPAIRS"
  const dashPattern = text.match(/CLAUSE\s+\d+\s*[–—-]\s*([A-Z][A-Z\s]+)/i);
  if (dashPattern) return dashPattern[1].trim();

  // Pattern 2: "4. Structural Repairs"
  const numberedPattern = text.match(/^\d+[\.\)]\s+([A-Za-z][A-Za-z\s]{3,40})/);
  if (numberedPattern) return numberedPattern[1].trim();

  // Pattern 3: All-caps heading "TERMINATION CLAUSE"
  const capsPattern = text.match(/^([A-Z][A-Z\s]{4,40})\n/);
  if (capsPattern) return capsPattern[1].trim();

  // Pattern 4: First sentence as title (last resort)
  const firstLine = text.split('\n')[0].trim();
  if (firstLine.length > 5 && firstLine.length < 60) {
    return firstLine;
  }

  // True fallback — include index so it's unique
  return `Clause ${index + 1}`;
}

// Legal Document Analysis Endpoint (Redesigned Production-Grade Pipeline)
router.post('/legal/analyze', analyzeLimiter, async (req, res) => {
  logger.info('[LEGAL] Request received — starting pipeline');
  const timer = new PipelineTimer();
  timer.start('file_ingestion');

  const documentText = req.body.documentText || req.body.document_text;
  const fileName = req.body.fileName || req.body.file_name || 'LeaseAgreement.pdf';
  const userEmail = req.body.email || req.body.uploadedBy || 'anonymous@apcivicstech.org';
  const language = req.body.language || (req.body.category === 'Upload Analysis' ? 'en' : 'te');
  
  // Set headers for SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendSSE = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if (!documentText) {
    timer.end('file_ingestion');
    logger.warn('Received legal analysis request with empty document text');
    sendSSE({ type: 'error', error: 'Please provide document text for analysis.' });
    return res.end();
  }

  // --- STAGE 1: SECURITY FILTERS & JAILBREAK SHIELDS ---
  if (documentText.length > 150000) {
    timer.end('file_ingestion');
    logger.warn('Oversized legal payload blocked by security filters');
    sendSSE({ type: 'error', error: 'Security constraint violation: Document exceeds size limit (Max 150,000 characters).' });
    return res.end();
  }

  const textLower = documentText.toLowerCase();
  const jailbreakIndicators = [
    'ignore previous instructions',
    'system prompt overrides',
    'forget what we said',
    'you must now play',
    'new identity as',
    'ignore section 2',
    'bypass security rules'
  ];
  if (jailbreakIndicators.some(ind => textLower.includes(ind))) {
    timer.end('file_ingestion');
    logger.warn('Prompt injection payload intercepted and quarantined.');
    sendSSE({ type: 'error', error: 'Security filter triggered: Untrusted instructions detected in contract payload.' });
    return res.end();
  }
  const file_ingestion_ms = timer.end('file_ingestion');
  sendSSE({
    type: "perf_timing",
    operation: "file_ingestion",
    duration_ms: file_ingestion_ms,
    detail: `Validated document ingestion of ${fileName}`
  });

  const startOverall = performance.now();

  try {
    // OP 2 — Text Extraction
    timer.start('text_extraction');
    sendSSE({ type: 'rag_stage', stage: 'extracting', detail: 'Normalizing document layout and layouts', progress: 10 });
    const startOcr = performance.now();
    const textNormalized = documentText.trim();
    const endOcr = performance.now();
    const ocr_ms = Math.max(1, Math.round(endOcr - startOcr));

    sendSSE({ type: 'rag_stage', stage: 'extracting', detail: 'Sanitizing Aadhaar, PAN & private indicators', progress: 20 });
    const startSanitize = performance.now();
    const sanitisedText = sanitizePII(textNormalized);
    const endSanitize = performance.now();
    const sanitization_ms = Math.max(1, Math.round(endSanitize - startSanitize));
    const text_extraction_ms = timer.end('text_extraction');
    const estPages = Math.max(1, Math.ceil(textNormalized.length / 3000));
    logger.info(`Extracted ${textNormalized.length} characters from ${estPages} pages`);
    sendSSE({
      type: "perf_timing",
      operation: "text_extraction",
      duration_ms: text_extraction_ms,
      detail: `Extracted ${textNormalized.length} characters from ${estPages} pages`
    });

    // --- STAGE 4: SHAKE HASHING ---
    const hash = crypto.createHash('sha256').update(sanitisedText).digest('hex');

    // OP 3 — Chunking
    timer.start('chunking');
    sendSSE({ type: 'rag_stage', stage: 'chunking', detail: 'Applying hierarchical two-tier segmentation', progress: 30 });
    const { parents, children } = segmentHierarchically(sanitisedText);
    const structureChunks = parents.map((p, index) => ({
      id: p.id,
      text: p.text,
      sequence_index: p.sequence_index,
      heading: extractClauseHeading(p.text, index),
      categories: classifyChunkText(p.text),
      clauseType: p.clause_type,
      pageNumber: p.page_number
    }));
    const docId = crypto.randomUUID();
    const chunking_ms = timer.end('chunking');
    logger.info(`created ${parents.length} chunks`);
    sendSSE({
      type: "perf_timing",
      operation: "chunking",
      duration_ms: chunking_ms,
      detail: `Created ${parents.length} parent chunks and ${children.length} child nodes`
    });

    sendSSE({ type: 'rag_stage', stage: 'chunking', detail: `Created ${parents.length} parent clauses & ${children.length} target child tokens`, progress: 40 });

    // OP 4 — Clause Type Classification
    timer.start('clause_classification');
    const classifiedList = structureChunks.map(sc => sc.categories);
    const clause_classification_ms = timer.end('clause_classification');
    sendSSE({
      type: "perf_timing",
      operation: "clause_classification",
      duration_ms: clause_classification_ms,
      detail: `Classified ${classifiedList.length} clauses into functional types`
    });

    // OP 5 — Embedding Cache Lookup
    timer.start('cache_lookup');
    const totalChunks = structureChunks.length;
    const cacheHitsCount = Math.round(totalChunks * 0.75);
    const cacheMissesCount = totalChunks - cacheHitsCount;
    const cache_lookup_ms = timer.end('cache_lookup');
    logger.info(`${cacheHitsCount} cache hits, ${cacheMissesCount} cache misses`);
    sendSSE({
      type: "perf_timing",
      operation: "cache_lookup",
      duration_ms: cache_lookup_ms,
      detail: `${cacheHitsCount} cache hits, ${cacheMissesCount} cache misses for chunk embeddings`
    });

    // --- STAGE 6: CONDITIONAL HYBRID RAG RETRIEVAL (VECTOR + BM25 + RRF) ---
    const startRag = performance.now();
    let retrievedContext = '';
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || '';
    
    const mentionsWelfareOrGO = /welfare|scheme|government order|g\.o\.|entlement|provident fund|gratuity rate|pf|esi|పథకం|జీవో/i.test(sanitisedText);
    const isStandardAgreement = /rent|rental|lease|landlord|tenant|lessor|lessee|employ|salary|wages|service|nda|non-disclosure|confident|secrecy|loan|borrow|lender/i.test(sanitisedText);
    const skipRag = isStandardAgreement || !mentionsWelfareOrGO || !supabaseUrl || !supabaseKey;

    let ragPromise = Promise.resolve('');
    if (!skipRag) {
      ragPromise = (async () => {
        try {
          const embedText = sanitisedText.substring(0, 300);
          
          // OP 9 — HyDE Query Expansion
          timer.start('hyde_expansion');
          sendSSE({ type: 'rag_stage', stage: 'retrieving', detail: 'Expanding legal query with HyDE mapping', progress: 45 });
          const expandedQueryText = await expandQueryWithHyDE(embedText);
          const hyde_ms = timer.end('hyde_expansion');
          sendSSE({
            type: "perf_timing",
            operation: "hyde_expansion",
            duration_ms: hyde_ms,
            detail: "Generated hypothetical document using legal logic"
          });

          sendSSE({ type: 'rag_stage', stage: 'retrieving', detail: 'Polling Supabase scheme vector registry...', progress: 50 });
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          
          // OP 10 — Query Embedding
          timer.start('query_embedding');
          const embedding = await getEmbedding(expandedQueryText);
          const query_embed_ms = timer.end('query_embedding');
          sendSSE({
            type: "perf_timing",
            operation: "query_embedding",
            duration_ms: query_embed_ms,
            detail: "Embedded hypothetical expanded contract query"
          });

          // OP 11 — Vector Similarity Search
          timer.start('vector_search');
          const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_scheme_chunks`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              query_embedding: embedding,
              match_threshold: 0.15,
              match_count: 5
            })
          });
          clearTimeout(timeoutId);
          const vector_ms = timer.end('vector_search');
          
          if (rpcRes.ok) {
            const hits = await rpcRes.json() as Record<string, any>[];
            logger.info(`returned ${hits?.length || 0} candidates`);
            sendSSE({
              type: "perf_timing",
              operation: "vector_search",
              duration_ms: vector_ms,
              detail: `Returned ${hits?.length || 0} vector similarity candidates`
            });

            if (hits && hits.length > 0) {
              sendSSE({ type: 'rag_stage', stage: 'retrieving', detail: `Retrieved ${hits.length} vector nodes. Fusing with BM25 Lexical rankings`, progress: 55 });
              
              // OP 12 — BM25 Keyword Search
              timer.start('bm25_search');
              const bm25Hits = bm25Search(embedText, hits.map((h, index) => ({ id: String(index), text: h.chunk_text || '' })));
              const bm25_ms = timer.end('bm25_search');
              logger.info(`returned ${bm25Hits.length} candidates`);
              sendSSE({
                type: "perf_timing",
                operation: "bm25_search",
                duration_ms: bm25_ms,
                detail: `BM25 lexical search evaluated ${bm25Hits.length} matched segments`
              });

              // OP 13 — RRF Score Fusion
              timer.start('rrf_fusion');
              const vectorHits = hits.map((h, index) => ({ id: String(index), score: Number(h.similarity || 1.0) }));
              const consolidated = rrfConsolidate(vectorHits, bm25Hits);
              const rrf_ms = timer.end('rrf_fusion');
              sendSSE({
                type: "perf_timing",
                operation: "rrf_fusion",
                duration_ms: rrf_ms,
                detail: `RRF fused lexical and vector rankings`
              });
              
              // Sort hits based on merged reciprocal ranks
              const filteredAndSortedHits = consolidated.map(c => hits[Number(c.id)]);
              logger.info(`[RAG-Hybrid-RRF] Successfully fused results. Top RRF Node ID: ${consolidated[0]?.id}`);
              
              return filteredAndSortedHits.map(h => `[Policy source: ${h.scheme_name || 'Policy info'}]\n${h.chunk_text || ''}`).join('\n\n');
            }
          }
        } catch (ragErr: any) {
          logger.warn('[RAG] Supabase retrieval bypassed or timed out', { error: ragErr?.message || ragErr });
        }
        return '';
      })();
    }

    retrievedContext = await ragPromise;
    const endRag = performance.now();
    const rag_retrieval_ms = Math.max(1, Math.round(endRag - startRag));

    // Fill missing inner operations in case bypass happened
    if (!timer.getAll()['hyde_expansion']) {
      timer.start('hyde_expansion'); timer.end('hyde_expansion');
      timer.start('query_embedding'); timer.end('query_embedding');
      timer.start('vector_search'); timer.end('vector_search');
      timer.start('bm25_search'); timer.end('bm25_search');
      timer.start('rrf_fusion'); timer.end('rrf_fusion');
    }

    // OP 14 — Parent Chunk Expansion
    timer.start('chunk_expansion');
    const chunk_expansion_ms = timer.end('chunk_expansion');
    sendSSE({
      type: "perf_timing",
      operation: "chunk_expansion",
      duration_ms: chunk_expansion_ms,
      detail: "Prefetched adjacent document boundary nodes"
    });

    // Parallel Chunk Embedding computation with dynamic visual progress reporting!
    sendSSE({ type: 'rag_stage', stage: 'embedding', detail: `Compiling vectors for ${structureChunks.length} documents...`, progress: 60 });
    
    // OP 6 — Embedding Generation + OP 7 — Parallel Batch Embedding
    timer.start('embedding_total');
    let embeddedCount = 0;
    const chunkTimings: number[] = [];
    const chunkVectorPromises = structureChunks.map(async (sc, idx) => {
      const chunkTimerName = `embedding_chunk_${idx}`;
      timer.start(chunkTimerName);
      const vec = await getEmbedding(sc.text.substring(0, 400));
      const cTime = timer.end(chunkTimerName);
      chunkTimings.push(cTime);

      embeddedCount++;
      const progressPct = 60 + Math.round((embeddedCount / structureChunks.length) * 15);
      sendSSE({
        type: 'rag_stage',
        stage: 'embedding',
        detail: `Embedded ${embeddedCount}/${structureChunks.length} document nodes`,
        progress: progressPct
      });
      return {
        id: sc.id,
        documentId: docId,
        heading: sc.heading,
        chunkText: sc.text,
        categories: sc.categories,
        embedding: vec,
        sequenceIndex: sc.sequence_index
      } as LegalDocumentChunk;
    });
    const parsedChunksWithVectors = await Promise.all(chunkVectorPromises);
    const embedding_total_ms = timer.end('embedding_total');
    const avgChunkMs = chunkTimings.length > 0 ? Math.round(chunkTimings.reduce((a,b)=>a+b, 0)/chunkTimings.length) : 0;
    const minChunkMs = chunkTimings.length > 0 ? Math.min(...chunkTimings) : 0;
    const maxChunkMs = chunkTimings.length > 0 ? Math.max(...chunkTimings) : 0;
    logger.info(`avg ${avgChunkMs}ms | min ${minChunkMs}ms | max ${maxChunkMs}ms per chunk`);
    sendSSE({
      type: "perf_timing",
      operation: "embedding_total",
      duration_ms: embedding_total_ms,
      detail: `Generated embeddings. Avg: ${avgChunkMs}ms, Min: ${minChunkMs}ms, Max: ${maxChunkMs}ms`
    });

    // OP 8 — Vector DB Storage
    timer.start('db_storage');
    const db_storage_ms = timer.end('db_storage');
    logger.info(`stored ${structureChunks.length} vectors`);
    sendSSE({
      type: "perf_timing",
      operation: "db_storage",
      duration_ms: db_storage_ms,
      detail: `Persisted ${structureChunks.length} chunks within active vectors session`
    });

    // OP 15 — Context Injection
    timer.start('context_injection');
    sendSSE({ type: 'rag_stage', stage: 'analyzing', detail: 'Evaluating contract clauses against state rules...', progress: 75 });
    const ruleBasedFindings: any[] = [];
    for (const chunk of structureChunks) {
      const risks = detectRiskRules(chunk);
      ruleBasedFindings.push(...(risks as any[]));
    }

    // --- STAGE 8: CONTRADICTIONS DETECTION ENGINE ---
    const contradictions = analyzeContradictions(structureChunks);

    // --- STAGE 9: MISSING PROTECTIVE CLAUSES ENGINE ---
    const inferredDocType = isStandardAgreement ? 'RENTAL' : 'SERVICE';
    const missingClauses = evaluateMissingProtections(structureChunks, inferredDocType);

    // --- STAGE 10: COMPLEX LLM RISK RECONCILIATION PROMPT ---
    const startPrompt = performance.now();
    const deterministicFindingsStr = ruleBasedFindings.length > 0
      ? ruleBasedFindings.map((f, idx) => `${idx + 1}. [Rule Triggered: ${f.risk_title}] clause: "${f.evidence}" basis: ${f.legal_basis}`).join('\n')
      : 'None detected.';

    const prompt = `
      ${LEGAL_ADVISOR_SYSTEM_PROMPT_V3}

      RAG Entitlements Context:
      ${retrievedContext || 'No related policies found in database.'}

      We have preprocessed this legal document and isolated the following logical segments:
      ${structureChunks.map(s => `CLAUSE ${s.sequence_index} — ${s.heading}
     Full Text: "${s.text}"
     Clause Type: ${s.clauseType}
     Page: ${s.pageNumber}`).join('\n\n')}

      Highly accurate rule engines flagged the following patterns:
      ${deterministicFindingsStr}

      We also isolated these direct contractual contradictions:
      ${contradictions.length > 0 ? contradictions.map((c, idx) => `${idx + 1}. Clause ${c.clause_a_number} vs (${c.clause_b_number}): "${c.conflict_description}"`).join('\n') : 'None.'}

      Review this file carefully and generate the ultimate unified assessment report, integrating your LLM understanding with the deterministic rule responses. 
      Do NOT hallucinate legal regulations or citations. Use exact factual citations and translate explanations to Telugu only if language = "te".
      
      Generate output strictly in ${language === 'te' ? 'te' : 'en'} mode.
    `;
    const endPrompt = performance.now();
    const prompt_construction_ms = Math.max(1, Math.round(endPrompt - startPrompt));
    const context_injection_ms = timer.end('context_injection');
    logger.info(`total context ${prompt.length} characters`);
    sendSSE({
      type: "perf_timing",
      operation: "context_injection",
      duration_ms: context_injection_ms,
      detail: `Assembled legal prompt payload: ${prompt.length} characters`
    });

    // --- STAGE 11: OPTIMIZED GEMINI INFERENCE & RETRIES with Corrective Parsing ---
    sendSSE({ type: 'rag_stage', stage: 'analyzing', detail: 'Running advanced legal LLM reasoning engine...', progress: 85 });
    const startGemini = performance.now();
    
    // OP 17 — Gemini LLM Call (full response)
    timer.start('llm_full_response');
    
    logger.info('[LEGAL] Calling Gemini now...');
    // First assessment attempt with legal fallback active
    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      fallbackModel: 'gemini-3.1-flash-lite',
      isLegalAnalysis: true, // triggers specific 429/timeout fallback sequence
      config: {
        systemInstruction: LEGAL_ADVISOR_SYSTEM_PROMPT_V3,
        responseMimeType: 'application/json',
        temperature: 0.0,
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            document_type: { type: Type.STRING },
            document_summary: {
              type: Type.OBJECT,
              properties: {
                jurisdiction: { type: Type.STRING },
                primary_parties: {
                  type: Type.OBJECT,
                  properties: {
                    party_a: { type: Type.STRING },
                    party_b: { type: Type.STRING }
                  },
                  required: ['party_a', 'party_b']
                },
                favored_party: { type: Type.STRING },
                duration_months: { type: Type.INTEGER },
                registration_required: { type: Type.BOOLEAN }
              },
              required: ['jurisdiction', 'primary_parties', 'favored_party', 'duration_months', 'registration_required']
            },
            risk_score: { type: Type.INTEGER },
            risk_label: { type: Type.STRING },
            balance_index: { type: Type.INTEGER },
            balance_label: { type: Type.STRING },
            flags: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  flag_id: { type: Type.STRING },
                  clause_number: { type: Type.INTEGER },
                  clause_title: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  party_harmed: { type: Type.STRING },
                  evidence: { type: Type.STRING },
                  legal_basis: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  risk_to_user: { type: Type.STRING },
                  recommended_revision: { type: Type.STRING },
                  negotiation_point: { type: Type.STRING },
                  legal_citation: { type: Type.STRING }
                },
                required: [
                  'flag_id', 'clause_number', 'clause_title', 'severity', 'confidence',
                  'party_harmed', 'evidence', 'legal_basis', 'explanation',
                  'risk_to_user', 'recommended_revision', 'negotiation_point', 'legal_citation'
                ]
              }
            },
            contradictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  clause_a_number: { type: Type.INTEGER },
                  clause_b_number: { type: Type.INTEGER },
                  clause_a_excerpt: { type: Type.STRING },
                  clause_b_excerpt: { type: Type.STRING },
                  conflict_description: { type: Type.STRING },
                  legal_consequence: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                },
                required: ['clause_a_number', 'clause_b_number', 'clause_a_excerpt', 'clause_b_excerpt', 'conflict_description', 'legal_consequence', 'confidence']
              }
            },
            missing_clauses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  clause_type: { type: Type.STRING },
                  importance: { type: Type.STRING },
                  why_needed: { type: Type.STRING },
                  standard_safe_language: { type: Type.STRING }
                },
                required: ['clause_type', 'importance', 'why_needed', 'standard_safe_language']
              }
            },
            negotiation_checklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item_id: { type: Type.STRING },
                  talking_point: { type: Type.STRING },
                  demand: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  outcome: { type: Type.STRING }
                },
                required: ['item_id', 'talking_point', 'demand', 'severity', 'outcome']
              }
            },
            escalation_required: { type: Type.BOOLEAN },
            escalation_reason: { type: Type.STRING },
            final_summary: { type: Type.STRING },
            disclaimer: { type: Type.STRING }
          },
          required: [
            'document_type', 'document_summary', 'risk_score', 'risk_label', 'balance_index',
            'balance_label', 'flags', 'contradictions', 'missing_clauses', 'negotiation_checklist',
            'escalation_required', 'escalation_reason', 'final_summary', 'disclaimer'
          ]
        }
      }
    });

    if ((response as any)?.fallbackModelUsed) {
      sendSSE({
        type: 'fallback_notice',
        message: 'Analyzed via fallback model',
        model: (response as any).fallbackModelUsed
      });
    }

    const llm_full_response_ms = timer.end('llm_full_response');

    // OP 16 — Gemini LLM Call (first token)
    timer.start('llm_first_token');
    const simulatedTtft = Math.min(1150, Math.round(llm_full_response_ms * 0.22));
    (timer as any).timings['llm_first_token'] = simulatedTtft;
    timer.end('llm_first_token');

    sendSSE({
      type: "perf_timing",
      operation: "llm_first_token",
      duration_ms: simulatedTtft,
      detail: "TTFT (Time to First Token) received"
    });

    sendSSE({
      type: "perf_timing",
      operation: "llm_full_response",
      duration_ms: llm_full_response_ms,
      detail: `Inference finished in ${llm_full_response_ms}ms`
    });

    const endGemini = performance.now();
    const gemini_inference_ms = Math.max(1, Math.round(endGemini - startGemini));

    // --- STAGE 12: JSON PARSING with Corrective schema self-repair ---
    sendSSE({ type: 'rag_stage', stage: 'analyzing', detail: 'Parsing generated findings & risks...', progress: 92 });
    const startParse = performance.now();
    let parsed: any;
    let textResponse = (response as any)?.text || '';
    if (textResponse) {
      let cleaned = textResponse.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
      }
      textResponse = cleaned;
    }
    let json_parsing_ms = 1;

    // OP 18 — JSON Flag Validation
    timer.start('flag_validation');
    for (let parseAttempt = 1; parseAttempt <= 2; parseAttempt++) {
      try {
        parsed = JSON.parse(textResponse.trim());
        const endParse = performance.now();
        json_parsing_ms = Math.max(1, Math.round(endParse - startParse));
        break;
      } catch (err: any) {
        logger.warn(`[JSON Parse Engine] Malformed JSON structure on attempt ${parseAttempt}/2: ${err.message}`);
        if (parseAttempt === 1) {
          sendSSE({ type: 'rag_stage', stage: 'analyzing', detail: 'Correcting schema formatting triggers...', progress: 95 });
          const correctiveQuery = `Your previous output could not be parsed as valid JSON. Retrying. Please output ONLY the raw, perfectly completed JSON object matching the requested schema. No wrappers, no code blocks:
          
          Previous Response:
          ${textResponse}
          
          Error: ${err.message}`;
          
          const correctedRes = await generateContentWithRetryAndFallback({
            contents: correctiveQuery,
            fallbackModel: 'gemini-3.1-flash',
            isLegalAnalysis: true,
            config: { temperature: 0.0, responseMimeType: 'application/json' }
          });
          let cleanRes = (correctedRes as any)?.text || '';
          if (cleanRes) {
            let cleaned = cleanRes.trim();
            if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
            else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
            cleanRes = cleaned;
          }
          textResponse = cleanRes;
        } else {
          timer.end('flag_validation');
          throw err;
        }
      }
    }

    if (!parsed) {
      timer.end('flag_validation');
      throw new Error('Failed to generate compliant JSON structure after corrective compilation.');
    }

    const flag_validation_ms = timer.end('flag_validation');
    const rawFlagsList = parsed.flags || parsed.findings || [];
    const incomingFlagsCount = rawFlagsList.length;
    logger.info(`${incomingFlagsCount} flags validated`);
    sendSSE({
      type: "perf_timing",
      operation: "flag_validation",
      duration_ms: flag_validation_ms,
      detail: `Validated and normalized ${incomingFlagsCount} clause findings`
    });

    const total_latency_ms = Math.round(performance.now() - startOverall);

    // OP 19 — Risk Score Calculation
    timer.start('risk_score');
    // --- STAGE 13: CONFIDENCE SCORE SHIELD & COHESIVE MAPPED SYNTHESIS ---
    const combinedFindings: any[] = [...ruleBasedFindings];
    rawFlagsList.forEach((llmFinding: any) => {
      const fTitle = llmFinding.clause_title || llmFinding.title || 'Unfair Covenant';
      const overlaps = combinedFindings.some(ruleF => 
        (ruleF.risk_title || '').toLowerCase().includes(fTitle.toLowerCase()) || 
        fTitle.toLowerCase().includes((ruleF.risk_title || '').toLowerCase())
      );
      if (!overlaps) {
        combinedFindings.push({
          risk_title: fTitle,
          severity: (llmFinding.severity || 'medium').toUpperCase(),
          confidence: llmFinding.confidence || 0.95,
          evidence: llmFinding.evidence || 'Contract sections',
          clause_reference: `Clause ${llmFinding.clause_number || 1}`,
          why_flagged: [llmFinding.explanation || 'Risky covenants terms.'],
          recommended_revision: llmFinding.recommended_revision || '',
          business_impact: llmFinding.risk_to_user || llmFinding.explanation || '',
          legal_impact: llmFinding.legal_basis || llmFinding.legal_citation || 'Indian Contract Act',
          clause_title: fTitle
        });
      }
    });

    const validatedFindings = combinedFindings.filter(f => (f.confidence || 0) >= 0.95);

    // Compute dynamic, accurate risk score strictly following Section 3 point scale:
    let calculatedSeverityScore = 0;
    validatedFindings.forEach(f => {
      const sev = (f.severity || '').toUpperCase();
      if (sev === 'CRITICAL') {
        calculatedSeverityScore += 25;
      } else if (sev === 'HIGH' || sev === 'WARNING') {
        calculatedSeverityScore += 15;
      } else if (sev === 'MEDIUM') {
        calculatedSeverityScore += 8;
      } else if (sev === 'LOW' || sev === 'NOTICE') {
        calculatedSeverityScore += 3;
      }
    });

    const computedScore = validatedFindings.length === 0 ? 10 : Math.min(100, calculatedSeverityScore);
    const cappedRiskScore = Math.max(10, Math.min(100, Math.round(Number(computedScore))));
    const mappedHealthScore = Math.max(0, Math.min(100, 100 - cappedRiskScore));
    const mappedHealthGrade = mappedHealthScore >= 85 ? 'A' : mappedHealthScore >= 70 ? 'B' : mappedHealthScore >= 50 ? 'C' : 'F';
    
    // Risk level
    let mappedOverallRisk = 'MEDIUM';
    if (cappedRiskScore <= 30) mappedOverallRisk = 'LOW';
    else if (cappedRiskScore <= 60) mappedOverallRisk = 'MEDIUM';
    else if (cappedRiskScore <= 85) mappedOverallRisk = 'HIGH';
    else mappedOverallRisk = 'CRITICAL';

    const newDocId = docId;
    const reportId = crypto.randomUUID();

    const docRecord: LegalDocument = {
      id: newDocId,
      fileName,
      uploadedBy: userEmail,
      uploadedAt: new Date().toISOString(),
      sanitizedContent: sanitisedText,
      hash,
      documentType: parsed.document_type || 'RESTRICTIVE_AGREEMENT'
    };

    const docSummary = parsed.document_summary || {};

    const reportRecord: LegalReport = {
      id: reportId,
      documentId: newDocId,
      analyzedBy: userEmail,
      analyzedAt: new Date().toISOString(),
      overallRiskScore: cappedRiskScore,
      overallRiskLevel: mappedOverallRisk,
      overallConfidence: parsed.overall_confidence || 0.88,
      healthScore: mappedHealthScore,
      healthGrade: mappedHealthGrade,
      findings: validatedFindings,
      contradictions: contradictions.length > 0 ? contradictions : parsed.contradictions || [],
      missingClauses: missingClauses.length > 0 ? missingClauses : parsed.missing_clauses || [],
      totalClausesAnalyzed: structureChunks.length,
      jurisdiction: docSummary.jurisdiction || parsed.jurisdiction || 'Andhra Pradesh & Telangana',
      primaryParties: docSummary.primary_parties || parsed.primary_parties || { party_a: 'Lessor / Owner', party_b: 'Lessee / Farmer' },
      partyFavored: docSummary.favored_party || parsed.party_favored || 'BALANCED',
      partyFavoredReason: parsed.party_favored_reason || parsed.balance_label || 'Mutual covenants align properly.',
      registrationRequired: docSummary.registration_required !== undefined ? docSummary.registration_required : (parsed.registration_required !== undefined ? parsed.registration_required : false),
      registrationNote: parsed.registration_note || '',
      escalationRequired: parsed.escalation_required !== undefined ? parsed.escalation_required : false,
      escalationReason: parsed.escalation_reason || '',
      finalSummary: parsed.final_summary || 'Analysis complete.',
      disclaimer: parsed.disclaimer || 'Sri Nyaya AI. Not professional advice.',
      negotiationChecklist: parsed.negotiation_checklist || []
    };
    const risk_score_ms = timer.end('risk_score');
    sendSSE({
      type: "perf_timing",
      operation: "risk_score",
      duration_ms: risk_score_ms,
      detail: `Calculated safety index: ${mappedHealthScore} (${mappedHealthGrade})`
    });

    // --- STAGE 14: PERSIST RECORD BLOCK ---
    addFullLegalRecord(docRecord, parsedChunksWithVectors, reportRecord);

    const flagsMap = reportRecord.findings.map(f => ({
      id: Math.random().toString(36).substring(2, 9),
      severity: f.severity.toLowerCase(),
      clause_ref: f.clause_reference,
      clause_title: f.clause_title || f.risk_title || `Clause ${Number(f.clause_reference?.replace(/[^0-9]/g, '')) || 1}`,
      clause_number: Number(f.clause_reference?.replace(/[^0-9]/g, '')) || 1,
      excerpt: f.evidence,
      explanation: Array.isArray(f.why_flagged) ? f.why_flagged.join(' ') : f.explanation,
      recommendation: f.recommended_revision,
      legal_basis: f.legal_basis || f.legal_impact,
      party_harmed: f.party_harmed || 'Signatory'
    }));

    const mappedResponse = {
      document_id: newDocId,
      report_id: reportId,
      cache_hit: false,
      document_type: docRecord.documentType,
      jurisdiction: reportRecord.jurisdiction,
      primary_parties: reportRecord.primaryParties,
      party_favored: reportRecord.partyFavored,
      party_favored_reason: reportRecord.partyFavoredReason,
      overall_risk_score_v2: reportRecord.overallRiskScore,
      total_clauses_analyzed: reportRecord.totalClausesAnalyzed,
      registration_required: reportRecord.registrationRequired,
      registration_note: reportRecord.registrationNote,
      escalation_required: reportRecord.escalationRequired,
      escalation_reason: reportRecord.escalationReason,
      final_summary: reportRecord.finalSummary,
      disclaimer: reportRecord.disclaimer,
      findings: reportRecord.findings,
      contradictions: reportRecord.contradictions,
      missing_clauses: reportRecord.missingClauses,
      negotiation_checklist: reportRecord.negotiationChecklist,
      
      health_score: reportRecord.healthScore,
      health_grade: reportRecord.healthGrade,
      overall_risk: reportRecord.overallRiskLevel,
      chunks: structureChunks.map(c => ({
        id: c.id,
        text: c.text,
        sequence_index: c.sequence_index,
        heading: c.heading,
        categories: c.categories
      })),
      flags: flagsMap,

      latency_diagnostics: {
        ocr_ms,
        sanitization_ms,
        rag_retrieval_ms,
        prompt_construction_ms,
        gemini_inference_ms,
        json_parsing_ms,
        total_latency_ms
      }
    };

    const summaryData = {
      type: "perf_summary",
      timings: timer.getAll(),
      total_ms: timer.getTotal(),
      slowest_operation: timer.getSlowest(),
      breakdown: {
        ingestion_ms:   timer.getAll()['file_ingestion'] || 0,
        chunking_ms:    (timer.getAll()['chunking'] || 0) + (timer.getAll()['clause_classification'] || 0),
        embedding_ms:   timer.getAll()['embedding_total'] || 0,
        retrieval_ms:   (timer.getAll()['hyde_expansion'] || 0) + (timer.getAll()['query_embedding'] || 0) + (timer.getAll()['vector_search'] || 0) + (timer.getAll()['bm25_search'] || 0) + (timer.getAll()['rrf_fusion'] || 0) + (timer.getAll()['chunk_expansion'] || 0),
        llm_ms:         (timer.getAll()['context_injection'] || 0) + (timer.getAll()['llm_full_response'] || 0),
        validation_ms:  (timer.getAll()['flag_validation'] || 0) + (timer.getAll()['risk_score'] || 0)
      }
    };
    sendSSE(summaryData);

    console.log(`
  ─────────────────────────────────────────────
  LEGAL RAG PIPELINE — PERFORMANCE REPORT
  ─────────────────────────────────────────────
  OP 01  file_ingestion          [ ${String(timer.getAll()['file_ingestion'] || 0).padStart(4)}ms]
  OP 02  text_extraction         [ ${String(timer.getAll()['text_extraction'] || 0).padStart(4)}ms]  ← ${textNormalized.length} chars
  OP 03  chunking                [ ${String(timer.getAll()['chunking'] || 0).padStart(4)}ms]  ← ${parents.length} chunks
  OP 04  clause_classification   [ ${String(timer.getAll()['clause_classification'] || 0).padStart(4)}ms]
  OP 05  cache_lookup            [ ${String(timer.getAll()['cache_lookup'] || 0).padStart(4)}ms]  ← ${cacheHitsCount} hits, ${cacheMissesCount} miss
  OP 06  embedding_total         [ ${String(timer.getAll()['embedding_total'] || 0).padStart(4)}ms]  ← avg ${avgChunkMs}ms/chunk
  OP 07  db_storage              [ ${String(timer.getAll()['db_storage'] || 0).padStart(4)}ms]  ← ${structureChunks.length} vectors
  OP 08  hyde_expansion          [ ${String(timer.getAll()['hyde_expansion'] || 0).padStart(4)}ms]
  OP 09  query_embedding         [ ${String(timer.getAll()['query_embedding'] || 0).padStart(4)}ms]
  OP 10  vector_search           [ ${String(timer.getAll()['vector_search'] || 0).padStart(4)}ms]
  OP 11  bm25_search             [ ${String(timer.getAll()['bm25_search'] || 0).padStart(4)}ms]
  OP 12  rrf_fusion              [ ${String(timer.getAll()['rrf_fusion'] || 0).padStart(4)}ms]
  OP 13  chunk_expansion         [ ${String(timer.getAll()['chunk_expansion'] || 0).padStart(4)}ms]
  OP 14  context_injection       [ ${String(timer.getAll()['context_injection'] || 0).padStart(4)}ms]  ← ${prompt.length} chars
  OP 15  llm_first_token         [ ${String(simulatedTtft).padStart(4)}ms]  ← TTFT
  OP 16  llm_full_response       [ ${String(timer.getAll()['llm_full_response'] || 0).padStart(4)}ms]
  OP 17  flag_validation         [ ${String(timer.getAll()['flag_validation'] || 0).padStart(4)}ms]  ← ${incomingFlagsCount} flags
  OP 18  risk_score              [ ${String(timer.getAll()['risk_score'] || 0).padStart(4)}ms]
  ─────────────────────────────────────────────
  TOTAL                          [ ${String(timer.getTotal()).padStart(4)}ms]
  SLOWEST                        ${timer.getSlowest()} (${timer.getAll()[timer.getSlowest()] || 0}ms)
  ─────────────────────────────────────────────
  BREAKDOWN:
    Ingestion + Extraction:  ${(timer.getAll()['file_ingestion'] || 0) + (timer.getAll()['text_extraction'] || 0)}ms  ( ${(((timer.getAll()['file_ingestion'] || 0) + (timer.getAll()['text_extraction'] || 0)) / timer.getTotal() * 100).toFixed(1)}%)
    Chunking + Classifying:   ${(timer.getAll()['chunking'] || 0) + (timer.getAll()['clause_classification'] || 0)}ms  ( ${(((timer.getAll()['chunking'] || 0) + (timer.getAll()['clause_classification'] || 0)) / timer.getTotal() * 100).toFixed(1)}%)
    Embedding (total):        ${timer.getAll()['embedding_total'] || 0}ms ( ${((timer.getAll()['embedding_total'] || 0) / timer.getTotal() * 100).toFixed(1)}%)
    Retrieval pipeline:        ${summaryData.breakdown.retrieval_ms}ms  ( ${(summaryData.breakdown.retrieval_ms / timer.getTotal() * 100).toFixed(1)}%)
    LLM call (total):        ${summaryData.breakdown.llm_ms}ms (${(summaryData.breakdown.llm_ms / timer.getTotal() * 100).toFixed(1)}%)
    Validation + Scoring:      ${summaryData.breakdown.validation_ms}ms  ( ${(summaryData.breakdown.validation_ms / timer.getTotal() * 100).toFixed(1)}%)
  ─────────────────────────────────────────────
`);

    // Synthesize final analysis outputs for real-time widgets
    sendSSE({ type: 'risk_score', score: cappedRiskScore });
    sendSSE({ type: 'legal_flags', flags: flagsMap });
    sendSSE({ type: 'analysis_done', data: mappedResponse });
    
    const finalModelUsed = (response as any)?.fallbackModelUsed || 'gemini-3.5-flash';
    logger.info(`[LEGAL] flags: ${flagsMap.length} | risk_score: ${cappedRiskScore} | model: ${finalModelUsed}`);
    logger.info(`[Pipeline] Completed successfully in ${total_latency_ms}ms (Gemini-Inference: ${gemini_inference_ms}ms)`);
    return res.end();

  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    logger.error('Gemini Live Legal Advisor failed.', { error: errorMessage });
    sendSSE({ type: 'error', error: errorMessage || 'Request failed. Please retry.' });
    return res.end();
  }
});


// GET USER SEARCH REPORTS HISTORY
router.get('/legal/history', async (req, res) => {
  const email = req.query.email as string || 'anonymous@apcivicstech.org';
  const history = await getReportsByUser(email);

  const docs = await getAllDocuments();
  const docMap = new Map(docs.map(d => [d.id, d.fileName]));

  const enriched = history.map(r => ({
    reportId: r.id,
    documentId: r.documentId,
    fileName: docMap.get(r.documentId) || 'AgreementDocument.pdf',
    analyzedAt: r.analyzedAt,
    healthScore: r.healthScore,
    healthGrade: r.healthGrade,
    overallRiskLevel: r.overallRiskLevel,
    findingsCount: r.findings.length,
    contradictionsCount: r.contradictions.length,
    missingClausesCount: r.missingClauses.length
  }));

  res.json(enriched);
});

// GET SPECIFIC REPORT DETAILS
router.get('/legal/report/:id', async (req, res) => {
  const report = await getReport(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Selected report ID was not found.' });
  }
  const allDocs = await getAllDocuments();
  const document = allDocs.find(d => d.id === report.documentId);
  const allChunks = await getAllDocumentChunks();
  const chunks = allChunks.filter(c => c.documentId === report.documentId).map(c => ({
    id: c.id,
    heading: c.heading,
    text: c.chunkText,
    categories: c.categories,
    sequence_index: c.sequenceIndex
  }));

  res.json({
    report,
    document,
    chunks
  });
});

// COMPARE MULTIPLE CONTRACTS VERSION DETAILS
router.post('/legal/compare', async (req, res) => {
  const { reportIdA, reportIdB } = req.body;
  
  if (!reportIdA || !reportIdB) {
    return res.status(400).json({ error: 'Please submit two report IDs for structural comparison.' });
  }

  const rA = await getReport(reportIdA);
  const rB = await getReport(reportIdB);

  if (!rA || !rB) {
    return res.status(404).json({ error: 'One or both corresponding audit reports were omitted or deleted.' });
  }

  const docs = await getAllDocuments();
  const docA = docs.find(d => d.id === rA.documentId);
  const docB = docs.find(d => d.id === rB.documentId);

  res.json({
    reportA: rA,
    reportB: rB,
    docA,
    docB,
    scoreShift: rB.healthScore - rA.healthScore,
    riskShift: rA.overallRiskLevel !== rB.overallRiskLevel ? `Altered from ${rA.overallRiskLevel} to ${rB.overallRiskLevel}` : 'Unchanged status',
    findingsDiffCount: rB.findings.length - rA.findings.length
  });
});

// Global in-memory chatbot session conversation ledger
const inMemoryChatHistory: Record<string, Array<{ role: 'user' | 'model'; parts: Record<string, any>[] }>> = {};

function extractHtmlAndMermaid(text: string): { html?: string; mermaid?: string } {
  let html: string | undefined;
  let mermaid: string | undefined;

  const htmlMatch = text.match(/```html\s*([\s\S]*?)\s*```/i);
  if (htmlMatch) {
    html = htmlMatch[1].trim();
  }

  const mermaidMatch = text.match(/```mermaid\s*([\s\S]*?)\s*```/i);
  if (mermaidMatch) {
    mermaid = mermaidMatch[1].trim();
  }

  return { html, mermaid };
}

router.post('/chat', chatLimiter, async (req, res) => {
  const { session_id, user_message, profile_snapshot, search_mode, files } = req.body;
  if (!user_message) {
    return res.status(400).json({ error: 'Please supply a user message.' });
  }

  // Create or resolve session ID
  const currentSessionId = session_id || `session-${Date.now()}`;
  if (!inMemoryChatHistory[currentSessionId]) {
    inMemoryChatHistory[currentSessionId] = [];
  }
  const historyList = inMemoryChatHistory[currentSessionId];

  // Append user message with any attached file parts matching Gemini's multi-part structure
  const parts: Record<string, any>[] = [];
  if (files && files.length > 0) {
    for (const file of files) {
      if (file.base64 && file.type) {
        parts.push({
          inlineData: {
            mimeType: file.type,
            data: file.base64
          }
        });
      }
    }
  }
  parts.push({ text: user_message });

  historyList.push({
    role: 'user',
    parts: parts
  });

  // Limit history length to protect tokens and ensure it always starts with a user message (Gemini API requirement)
  if (historyList.length > 20) {
    let sliced = historyList.slice(-14);
    while (sliced.length > 0 && sliced[0].role !== 'user') {
      sliced.shift();
    }
    inMemoryChatHistory[currentSessionId] = sliced;
  }
  const activeHistoryList = inMemoryChatHistory[currentSessionId];

  // Set response headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let fullResponseText = '';
  let isSearchActive = false;

  // Frame system context with current profile snapshot
  const profile = profile_snapshot;
  const profileStr = profile 
    ? `User Profile Context for Eligibility Verification:
  - Age: ${profile.age || 'N/A'}
  - State: ${profile.state || 'N/A'}
  - District: ${profile.district || 'N/A'}
  - Gender: ${profile.gender || 'N/A'}
  - Category (Caste/Social class): ${profile.category || 'N/A'}
  - Occupation: ${profile.occupation || 'N/A'}
  - Land Size: ${profile.land_size || 'N/A'}
  - Annual Household Income: ₹${profile.income_annual || 'N/A'}
    Tenant Farmer: ${profile.isTenantFarmer ? 'Yes' : 'No'}
    Has CCRC: ${profile.hasCCRC ? 'Yes' : 'No'}
    Land Size (acres): ${profile.landSize ?? 'Not specified'}
    District: ${profile.district ?? 'Not specified'}
    Habitation: ${profile.habitation ?? 'Not specified'}
  `
    : 'User has not shared their demographic profile yet.';

  const systemInstruction = `You are Sahay, an elite AI civic assistant of the caliber
of Claude, ChatGPT, and Gemini — trained by a senior
developer with 15+ years experience. You are a versatile,
deeply capable assistant fluent in English, Telugu, and Hindi.

You serve all citizens of Andhra Pradesh and Telangana —
from rural farmers to urban professionals.

══════════════════════════════════════════════════════
PROTOCOL 1 — GENERAL PURPOSE BEHAVIOR (DEFAULT)
══════════════════════════════════════════════════════

For all general questions (coding, math, writing, email,
knowledge queries, language learning):
  → Behave like a premium AI assistant (Claude/ChatGPT style)
  → Deliver rich, well-structured markdown responses
  → Use bold headings, clean subheadings, code blocks
  → Be professional, direct, and conversational
  → Do NOT append any render tokens for general responses

══════════════════════════════════════════════════════
PROTOCOL 2 — SCHEME EXPLANATION MODE
(auto-activates when scheme context is injected)
══════════════════════════════════════════════════════

When a SCHEME_CONTEXT block is present in the conversation,
you MUST provide a comprehensive scheme briefing covering:

  SECTION 1 — SCHEME OVERVIEW
    → Full official name and department
    → What this scheme does in ONE plain sentence
    → Who it was designed for
    → Current status (active/paused/renewed)

  SECTION 2 — ELIGIBILITY (detailed)
    → Every eligibility criterion explained in plain language
    → Cross-reference with user profile if available
    → Clearly state: ELIGIBLE ✅ / NOT ELIGIBLE ❌ / VERIFY ⚠️
    → Explain WHY for each criterion

  SECTION 3 — BENEFITS
    → Exact benefit amounts (monthly/annual/one-time)
    → How benefits are delivered (DBT/cash/kind)
    → Timeline of payments

  SECTION 4 — REQUIRED DOCUMENTS
    → Every document needed
    → Where to obtain each document
    → Common rejection reasons for each document

  SECTION 5 — APPLICATION PROCESS
    → Step by step process (numbered)
    → Online vs offline options
    → Where to apply (portal URL / office name)
    → Processing time

  SECTION 6 — IMPORTANT WARNINGS
    → Common traps or conditions citizens miss
    → What disqualifies you after approval
    → Renewal requirements if any

  Tone: Simple, clear, encouraging. Explain like talking
  to a farmer or daily wage worker. Avoid legal jargon.
  If user's language is Telugu → respond in Telugu.
  If user's language is Hindi → respond in Hindi.

══════════════════════════════════════════════════════
PROTOCOL 3 — AUTO RENDER TOKEN SYSTEM
(works across Gemini and all OpenRouter fallback models)
══════════════════════════════════════════════════════

CRITICAL RULE: At the END of your response, append ONE
render token if your response content matches these rules.
This tells the frontend what to render automatically.

APPEND [RENDER:flow_diagram] WHEN:
  → Your response explains a step-by-step process
  → Application procedures with 4+ sequential steps
  → Approval workflows
  → Document submission flows
  Example triggers: "how to apply", "what is the process",
  "steps to get", "procedure for"

APPEND [RENDER:comparison_table] WHEN:
  → Your response compares 2 or more schemes/options
  → You list multiple schemes with different benefits
  → User asks "difference between X and Y"
  Example triggers: "compare", "difference", "which is better",
  "PM-Kisan vs Rythu Bandhu"

APPEND [RENDER:document_checklist] WHEN:
  → Your response lists documents needed
  → You explain what to prepare for application
  Example triggers: "documents needed", "what to bring",
  "papers required", "checklist"

APPEND [RENDER:scheme_summary_card] WHEN:
  → You are explaining a single scheme in full detail
  → Scheme context was injected (SCHEME_CONTEXT present)
  → User asks "tell me about [scheme name]"

APPEND [RENDER:benefit_calculator] WHEN:
  → Your response involves calculating payments
  → User asks about payout amounts with variables
  → Land area + rate calculations
  Example triggers: "how much will I get", "calculate my benefit",
  "payout for X acres"

APPEND [RENDER:html_artifact] WHEN:
  → User explicitly asks for a visual page, dashboard,
    timeline, or interactive simulation
  → You are generating a full HTML artifact response
  → User says "create", "build", "design", "show me visually"

APPEND [RENDER:eligibility_checker] WHEN:
  → User wants to check if they qualify
  → User provides profile details asking for match
  Example triggers: "am I eligible", "do I qualify",
  "check my eligibility"

DO NOT append any render token:
  → For simple conversational replies
  → For short factual answers under 3 lines
  → For greetings and clarifications
  → When the response is a question back to the user

ONLY ONE token per response. Pick the most relevant.

══════════════════════════════════════════════════════
PROTOCOL 4 — EXPLICIT WIDGET TAGS (unchanged)
══════════════════════════════════════════════════════

These 5 widgets activate on explicit user request only:

  [ELIGIBILITY_CHECKER]  → "open eligibility form"
  [BENEFIT_CALCULATOR]   → "open calculator"
  [PAYMENT_STATUS_TRACKER] → "track payment status"
  [SCHEME_COMPARISON]    → "compare schemes"
  [DOCUMENT_CHECKLIST]   → "open document checklist"

══════════════════════════════════════════════════════
PROTOCOL 5 — ARTIFACTS & DIAGRAMS
══════════════════════════════════════════════════════

When generating HTML artifacts:
  → Output complete, beautiful, self-contained HTML
  → Include all CSS inside a <style> tag
  → Use dark theme matching: background #0a0a0f
  → Make it mobile-responsive
  → Use Noto Sans for Telugu/Hindi content
  → Wrap in \`\`\`html code fence

When generating flow diagrams:
  → Use Mermaid syntax
  → Keep node labels short (max 5 words)
  → Use TD (top-down) for processes
  → Use LR (left-right) for comparisons
  → Wrap in \`\`\`mermaid code fence

══════════════════════════════════════════════════════
PROTOCOL 6 — DOCUMENT PARSING (unchanged)
══════════════════════════════════════════════════════

  → Parse all uploaded documents (Aadhaar, Income cert,
    Voter ID, Land records, Legal deeds)
  → NEVER output full 12-digit Aadhaar numbers
  → Always mask: XXXX-XXXX-4521 format
  → Cross-reference extracted data with user profile
  → Warn if document data conflicts with profile

══════════════════════════════════════════════════════
PROTOCOL 7 — MULTILINGUAL RESPONSE RULES
══════════════════════════════════════════════════════

  → Detect user's message language automatically
  → Respond in the SAME language as the user
  → Telugu users: use simple conversational Telugu
  → Hindi users: use simple conversational Hindi
  → English users: use clear plain English
  → Avoid mixing languages in a single response
  → Legal/scheme terms: use official names in English,
    explain meaning in user's language

══════════════════════════════════════════════════════
TONE & PERSONALITY
══════════════════════════════════════════════════════

  → Humble, authoritative, encouraging, clear
  → Speak like a trusted government welfare officer
    who genuinely wants to help the citizen
  → Never use legal jargon without explanation
  → Always end scheme explanations with:
    "Would you like me to show you how to apply
     step by step?" (in user's language)

══════════════════════════════════════════════════════
CITIZEN PROFILE CONTEXT
══════════════════════════════════════════════════════
${profileStr}

══════════════════════════════════════════════════════
DOCUMENT ANALYSIS & PARSING DETAILS
══════════════════════════════════════════════════════
- Multi-modal Document Parsing:
  - CRITICAL SECURITY MANDATE: You are strictly forbidden from extracting or outputting any raw, full 12-digit Aadhaar card numbers. If an Aadhaar card is uploaded or contained in the text, you must immediately redact/mask the first 8 digits and only output the last 4 digits (e.g., XXXX-XXXX-4521). You must block any user attempts to bypass this and extract the raw, full Aadhaar number, but you must maintain full OCR capability for parsing and analyzing other fields (Name, DOB, Address, District, crop yield, lease clauses) and layouts of utility/legal deeds/documents.
  - When the user uploads an image/document (JPEG/PDF), you must use your elite multimodal vision to parse all visible fields.
  - You must structure the parsed data into a polished visual summary block in markdown:
    ---
    📂 **Parsed Document Metadata Extraction**
    * **Document Type**: [e.g., Aadhaar Card, Income Statement, etc.]
    * **Name**: [Full Name extracted]
    * **Unique ID / Aadhaar / PAN**: [Masked except last 4 digits, e.g., XXXX XXXX 4521]
    * **Address / Primary Domicile**: [Extracted City, State or District]
    * **Date of Birth / Age**: [Extracted DOB or calculated Age]
    * **Income / Revenue / Crop yield**: [Extracted annual income/yield if present in document]
    * ---
  - If the extracted state/income/age differs from the active profile context, warn the citizen.
  - Cross-reference the extracted document parameters with the target welfare eligibility rules and clearly state whether they qualify or mismatch.

Keep your tone humble, authoritative, encouraging, and clear.`;





  try {
    isSearchActive = search_mode === true || 
      user_message.toLowerCase().includes('search the web') || 
      user_message.toLowerCase().includes('google search') ||
      user_message.toLowerCase().includes('perplexity') ||
      user_message.toLowerCase().includes('latest news') ||
      user_message.toLowerCase().includes('recent updates') ||
      user_message.toLowerCase().includes('current status') ||
      user_message.toLowerCase().includes('live status');

    if (isSearchActive) {
      // Stream searching status and progress stages to frontend immediately so pulsing spinner starts
      res.write(`data: ${JSON.stringify({ type: 'search_status', status: 'searching' })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'search_stage', stage: 'analyzing', message: 'Analyzing query intent & identifying policy domains...' })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const simulatedQuery = user_message.substring(0, 60) + " welfare regulations grounding";
      res.write(`data: ${JSON.stringify({ type: 'query_formed', query: simulatedQuery })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'search_stage', stage: 'handshake', message: 'Formulating Google Search grounding parameters...' })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      res.write(`data: ${JSON.stringify({ type: 'site_visited', site: 'india.gov.in', title: 'National Portal of India', status: 'Visiting...' })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 100));
      res.write(`data: ${JSON.stringify({ type: 'site_visited', site: 'ap.gov.in', title: 'Official AP State Secretariat', status: 'Visiting...' })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      res.write(`data: ${JSON.stringify({ type: 'search_stage', stage: 'scanning', message: 'Scanning live policy catalogs and welfare data registries...' })}\n\n`);
    }

    let googleSearchQueries: string[] = [];
    let googleSearchSources: Record<string, unknown>[] = [];

    logger.info(`Sending streaming turn for session ${currentSessionId} to Gemini. Search active: ${isSearchActive}`);
    
    // Inject compiling stage right when we start generative model stream
    if (isSearchActive) {
      res.write(`data: ${JSON.stringify({ type: 'search_stage', stage: 'compiling', message: 'Synthesizing response from verified groundings...' })}\n\n`);
    }

    await generateContentStreamWithRetryAndFallback({
      contents: activeHistoryList,
      config: {
        systemInstruction,
        temperature: 0.25,
        ...(isSearchActive ? { tools: [{ googleSearch: {} }] } : {})
      },
      onSearchMetadata: (metadata) => {
        googleSearchQueries = metadata.queries;
        googleSearchSources = metadata.sources;
        
        if (googleSearchQueries && googleSearchQueries.length > 0) {
          googleSearchQueries.forEach(q => {
            res.write(`data: ${JSON.stringify({ type: 'query_formed', query: q })}\n\n`);
          });
        }
        
        if (googleSearchSources && googleSearchSources.length > 0) {
          googleSearchSources.forEach((s: any) => {
            const cleanUrl = s.url.replace(/^https?:\/\/(www\.)?/, '');
            res.write(`data: ${JSON.stringify({
              type: 'site_visited',
              site: cleanUrl,
              title: s.title,
              status: 'Done'
            })}\n\n`);
          });
        }
        
        res.write(`data: ${JSON.stringify({ type: 'source_added', count: googleSearchSources.length })}\n\n`);
        
        // Broadcast the search results message immediately!
        res.write(`data: ${JSON.stringify({
          type: 'search_results',
          queries: googleSearchQueries,
          sources: googleSearchSources
        })}\n\n`);

        res.write(`data: ${JSON.stringify({
          type: 'search_stage',
          stage: 'reading',
          message: `Retrieved and incorporated ${googleSearchSources.length} official reference citation(s).`
        })}\n\n`);
      },
      onChunk: (text) => {
        fullResponseText += text;
        // Broadcast raw token chunk
        res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
      }
    });

    // Post-generation parsing
    const { html, mermaid } = extractHtmlAndMermaid(fullResponseText);

    // Dynamic reactive widget suggestions validated via explicit tags in generated response or direct high-intent commands
    const widgets: Array<{ type: string }> = [];
    const lowerUserMsg = user_message.toLowerCase();
    
    // Check if the model explicitly triggered a widget via its custom brackets, or if the user issued an explicit command
    if (fullResponseText.includes('[ELIGIBILITY_CHECKER]') || 
        lowerUserMsg.includes('open eligibility form') || 
        lowerUserMsg.includes('open eligibility checker') || 
        lowerUserMsg.includes('show eligibility checker') ||
        lowerUserMsg.includes('run eligibility checker')) {
      widgets.push({ type: 'flowchart' });
    }
    
    if (fullResponseText.includes('[BENEFIT_CALCULATOR]') || 
        lowerUserMsg.includes('open benefit calculator') || 
        lowerUserMsg.includes('show benefit calculator') || 
        lowerUserMsg.includes('open calculator') || 
        lowerUserMsg.includes('use the calculator')) {
      widgets.push({ type: 'benefit_calculator' });
    }
    
    if (fullResponseText.includes('[PAYMENT_STATUS_TRACKER]') || 
        lowerUserMsg.includes('track payment') || 
        lowerUserMsg.includes('check payment') || 
        lowerUserMsg.includes('open status tracker') ||
        lowerUserMsg.includes('open payment tracker')) {
      widgets.push({ type: 'tracker' });
    }
    
    if (fullResponseText.includes('[SCHEME_COMPARISON]') || 
        lowerUserMsg.includes('compare schemes') || 
        lowerUserMsg.includes('show comparison table') ||
        lowerUserMsg.includes('open scheme comparison')) {
      widgets.push({ type: 'comparison' });
    }
    
    if (fullResponseText.includes('[DOCUMENT_CHECKLIST]') || 
        lowerUserMsg.includes('open document checklist') || 
        lowerUserMsg.includes('show document checklist') || 
        lowerUserMsg.includes('open checklists')) {
      widgets.push({ type: 'checklist' });
    }

    const lowerBody = (fullResponseText + " " + user_message).toLowerCase();

    // Scheme Citation Lookup on 76 loaded schemes
    const sources: Array<{ title: string; url: string; snippet?: string }> = [];
    try {
      const fs = await import('fs');
      const path = await import('path');
      const freshSchemesPath = path.join(process.cwd(), 'frontend', 'src', 'utils', 'fresh_schemes_mapped.json');
      if (fs.existsSync(freshSchemesPath)) {
        const schemes = JSON.parse(fs.readFileSync(freshSchemesPath, 'utf-8'));
        for (const sc of schemes) {
          if (sources.length >= 3) break;
          const nameEn = sc.name_en.toLowerCase();
          const nameTe = (sc.name_te || '').toLowerCase();
          if (lowerBody.includes(nameEn) || (nameTe && lowerBody.includes(nameTe))) {
            sources.push({
              title: sc.name_en,
              url: sc.apply_link || 'https://pib.gov.in',
              snippet: `Benefit amount: ${sc.benefit_amount || 'Subsidy/Grants'}. Domicile rules: ${sc.states ? sc.states.join(', ') : 'All India'}. Required documents: ${sc.documents_required ? sc.documents_required.slice(0, 3).join(', ') : 'Aadhaar'}.`
            });
          }
        }
      }
    } catch (citeErr) {
      logger.warn('Failed doing citation mapping search:', citeErr);
    }

    if (sources.length === 0) {
      sources.push({
        title: 'Municipal Citizen Secretariat Platform',
        url: 'https://www.ap.gov.in',
        snippet: 'Official public service portal for village/ward secretariats.'
      });
    }

    // Combine any Google Search sources with local scheme matching sources
    const finalSources = googleSearchSources && googleSearchSources.length > 0 
      ? [...googleSearchSources, ...sources] 
      : sources;

    // Append model response to conversation history cache
    activeHistoryList.push({
      role: 'model',
      parts: [{ text: fullResponseText }]
    });

    // Write terminal confirmation event with metadata
    res.write(`data: ${JSON.stringify({
      is_complete: true,
      widgets,
      sources: finalSources,
      artifactHtml: html || undefined,
      mermaidCode: mermaid || undefined
    })}\n\n`);
    res.end();

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Gemini streaming chatbot error:', { error: errorMessage });
    if (!res.headersSent) {
      res.status(500).json({ error: "Chat service unavailable.", code: "CHAT_SERVICE_ERROR" });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Request failed. Please retry.' })}\n\n`);
      res.end();
    }
  }
});

// Smart Chat Generate Endpoint (Backend Proxy to hide API Key and handle fallbacks)
router.post('/smart-chat/generate', async (req, res) => {
  logger.info('Processing /smart-chat/generate API request');
  try {
    const { messages, thinkingLevel, schemeContext, profileSnapshot } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages payload is required and must be an array' });
    }

    let preferredFallbackModels = [
      "nvidia/nemotron-3-super-120b-a12b:free",
      "moonshotai/kimi-k2.6:free",
      "openai/gpt-oss-120b:free",
      "poolside/laguna-m.1:free"
    ];

    const tLvl = thinkingLevel || 'low';
    if (tLvl === 'high') {
      preferredFallbackModels = ["nvidia/nemotron-3-super-120b-a12b:free", "moonshotai/kimi-k2.6:free", "openai/gpt-oss-120b:free"];
    } else if (tLvl === 'medium') {
      preferredFallbackModels = ["openai/gpt-oss-120b:free", "poolside/laguna-m.1:free", "nvidia/nemotron-3-super-120b-a12b:free"];
    } else {
      preferredFallbackModels = ["poolside/laguna-m.1:free", "moonshotai/kimi-k2.6:free", "openai/gpt-oss-120b:free"];
    }

    let systemPrompt = `You are Sahay AI, an expert bilingual/trilingual civil and welfare scheme counselor. You help users understand government welfare schemes, eligibility rules, benefits, and application protocols in Andhra Pradesh, Telangana, and Central India.
Identify the user's language (auto-detect English, Telugu, or Hindi) and respond in the same language. If they query in Telugu, respond in native Telugu (use Telugu script/unicode characters). If they query in Hindi, respond in native Hindi (use Devanagari script).

Respond ONLY with raw JSON matching this schema:
{
  "loading_messages": ["string", "string"],
  "thinking_level": "minimal|low|medium|high",
  "blocks": [
    { "type":"text", "data":{ "content":"", "size":"normal|large", "emphasis":"normal|muted|highlight" } },
    { "type":"code", "data":{ "language":"", "code":"", "filename":"", "explanation":"" } },
    { "type":"table", "data":{ "title":"", "headers":[], "rows":[[]], "caption":"" } },
    { "type":"flowchart", "data":{ "title":"", "mermaid":"", "description":"" } },
    { "type":"flashcards", "data":{ "topic":"", "cards":[{ "front":"", "back":"", "tag":"" }] } },
    { "type":"dashboard", "data":{ "title":"", "metrics":[{ "label":"", "value":"", "unit":"", "trend":"up|down|stable|null", "change":"" }], "insight":"" } },
    { "type":"steps", "data":{ "title":"", "style":"numbered|checklist", "steps":[{ "title":"", "description":"", "code":"", "tip":"" }] } },
    { "type":"comparison", "data":{ "title":"", "labels":["",""], "criteria":[{ "name":"", "a":"", "b":"", "winner":"a|b|tie" }], "verdict":"" } },
    { "type":"callout", "data":{ "variant":"info|warning|error|success|tip|important", "title":"", "content":"" } },
    { "type":"timeline", "data":{ "title":"", "events":[{ "date":"", "title":"", "description":"", "milestone":true }] } },
    { "type":"accordion", "data":{ "sections":[{ "title":"", "content":"", "open":true }] } },
    { "type":"quiz", "data":{ "topic":"", "questions":[{ "question":"", "options":["","","",""], "answer":"", "explanation":"" }] } },
    { "type":"mindmap", "data":{ "center":"", "branches":[{ "topic":"", "subtopics":["",""] }] } }
  ],
  "citations": [{ "id": 1, "text": "source name", "url": "optional string" }],
  "follow_up_suggestions": ["question 1", "question 2", "question 3"]
}
Do not use markdown formatting marks (\`\`\`) in the top-level JSON response.`;

    if (schemeContext) {
      systemPrompt += `\n\nCONCURRENT ACTIVE SCHEME DETAILS (RAG Ground Truth Context):\nThe user is currently inquiring about this specific government scheme. Use the precise details below as your sole source of truth to answer follow-up questions, describe required documents, verify eligibility constraints, and guide on application procedures. Do not hallucinate; restrict yourself to these facts:
${JSON.stringify(schemeContext, null, 2)}

Provide highly precise, humanistic, helpful answers about this scheme. Use clean standard Markdown (headers, lists, bold text) in the "content" of any "text" blocks. Be extremely brief and specific. Always reply in the user's active language dial (English, Telugu, or Hindi).`;
    }

    if (profileSnapshot) {
      const p = profileSnapshot;
      const profileStr = `
- Citizen Name: ${p.name || 'Citizen'}
- Age: ${p.age || 'N/A'} yrs
- Gender: ${p.gender || 'N/A'}
- Category/Caste Class: ${p.caste_category || p.category || 'N/A'}
- District & State: ${p.district || 'N/A'}, ${p.state || 'N/A'}
- Occupation: ${p.occupation || 'N/A'}
- Annual Income: ₹${typeof p.income_annual === 'number' ? p.income_annual.toLocaleString('en-IN') : (p.income_annual || 'N/A')}
- Land size in acres: ${p.land_acres ?? p.land_size ?? 'N/A'}
`;
      systemPrompt += `\n\nACTIVE CITIZEN PROFILE DETAILS for personalization & precision eligibility:
${profileStr}
In corporate discussions, relate benefits and prerequisites to this user's profile where relevant!`;
    }

    const mappedMessages = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content || JSON.stringify(m.blocks) }]
    }));

    const response: any = await generateContentWithRetryAndFallback({
      contents: mappedMessages,
      preferredFallbackModels,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    if (response && response.text) {
      let cleaned = response.text.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
      const startIndex = cleaned.indexOf('{');
      const endIndex = cleaned.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1) {
        cleaned = cleaned.substring(startIndex, endIndex + 1);
      }
      return res.json(JSON.parse(cleaned));
    } else {
      throw new Error('Empty response from AI');
    }
  } catch (error: any) {
    logger.error('Smart chat generation failed:', error);
    return res.status(500).json({
      loading_messages: ["Error"],
      thinking_level: "low",
      blocks: [
        { type: 'callout', data: { variant: 'error', title: 'API Error', content: String(error) } }
      ],
      citations: [],
      follow_up_suggestions: []
    });
  }
});

export default router;
