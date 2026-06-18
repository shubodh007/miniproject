import crypto from 'crypto';

export interface Finding {
  risk_title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  evidence: string;
  clause_reference: string;
  why_flagged: string[];
  recommended_revision: string;
  business_impact: string;
  legal_impact: string;
}

export interface Contradiction {
  clause_a_number: number;
  clause_b_number: number;
  clause_a_excerpt: string;
  clause_b_excerpt: string;
  conflict_description: string;
  legal_consequence: string;
  confidence: number;
}

export interface MissingClause {
  clause_type: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  why_needed: string;
  standard_safe_language: string;
}

export interface DocStructureChunk {
  id: string;
  text: string;
  sequence_index: number;
  heading: string;
  categories: string[];
}

// Target Classifications
export type ClauseCategory =
  | 'PAYMENT'
  | 'TERMINATION'
  | 'LIABILITY'
  | 'INDEMNITY'
  | 'CONFIDENTIALITY'
  | 'ARBITRATION'
  | 'REFUND'
  | 'FORCE_MAJEURE'
  | 'INTELLECTUAL_PROPERTY'
  | 'DATA_PRIVACY'
  | 'OWNERSHIP'
  | 'NON_COMPETE'
  | 'NON_SOLICITATION'
  | 'EMPLOYMENT'
  | 'TENANCY'
  | 'SERVICE_LEVEL'
  | 'WARRANTY'
  | 'LIMITATION_OF_LIABILITY';

// REDACTION HELPER (PII Sanitizer)
export function sanitizePII(text: string): string {
  let sanitized = text;
  
  // 1. Aadhaar Number (12 digits, optional spaces/hyphens)
  sanitized = sanitized.replace(/\b\d{4}[-\s]*\d{4}[-\s]*\d{4}\b/g, 'XXXX-XXXX-[REDACTED]');
  
  // 2. Email pattern
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL_REDACTED]');
  
  // 3. Indian Phone Numbers (10 Digits, +91 etc)
  sanitized = sanitized.replace(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/g, '[PHONE_REDACTED]');
  
  // 4. PAN card pattern (5 letters, 4 digits, 1 letter)
  sanitized = sanitized.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, '[PAN_REDACTED]');
  
  return sanitized;
}

// STRUCTURE DETECTION & CHUNKING KEYWORD PARSER
export function segmentDocumentIntoChunks(rawText: string): DocStructureChunk[] {
  // Normalize line endings
  const normalized = rawText.replace(/\r\n/g, '\n');
  
  // Split into block paragraphs/sections
  const segments = normalized.split(/\n\s*\n+/);
  const chunks: DocStructureChunk[] = [];
  let index = 1;

  for (const block of segments) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Detect heading - first sentence or first line if short
    const lines = trimmed.split('\n');
    let heading = `Clause ${index}`;
    const firstLine = lines[0].trim();
    
    if (firstLine.length < 100 && (
      /^\d+\.?\s+/i.test(firstLine) || // Numbers
      /^[A-Z\s\-]{3,35}$/.test(firstLine.replace(/[^a-zA-Z]/g, '')) || // Short uppercase heading
      /^(clause|section|article|property|payment|duration|notice|maintenance|termination|arbitration|covenants|witness|verification|dispute|indemnity)/i.test(firstLine)
    )) {
      heading = firstLine.replace(/^[0-9\.\s\-]+/g, '');
    }

    // Determine classifications
    const categories = classifyChunkText(trimmed);

    chunks.push({
      id: crypto.randomUUID(),
      text: trimmed,
      sequence_index: index,
      heading,
      categories
    });
    index++;
  }

  return chunks;
}

// RULE-BASED CLASS CLASSIFICATION ENGINE
export function classifyChunkText(text: string): string[] {
  const t = text.toUpperCase();
  const categories: string[] = [];

  const mappings: { [key in ClauseCategory]: RegExp } = {
    PAYMENT: /\b(PAY|PAYMENT|RENT|AMOUNT|FEES|CHARGE|PRICE|BOREWELL|INVOICE|COSTS|₹|RUPEES|INTEREST|DUES|TAX)\b/i,
    TERMINATION: /\b(TERMINATE|TERMINATION|EXPIRATION|EXPIRE|CANCEL|CONVENIENCE|VACATE|EXIT|AT WILL)\b/i,
    LIABILITY: /\b(LIABILITY|LIABLE|DAMAGES|BREACH|RESPONSIBILITY|RESPONSIBLE|INDEMNITY|INDEMNIFY|RECOURSE|HARMLESS)\b/i,
    INDEMNITY: /\b(INDEMNIFY|INDEMNITY|HOLD HARMLESS|DEFEND|LIABILITIES|LOSSES|CLAIMS)\b/i,
    CONFIDENTIALITY: /\b(CONFIDENTIAL|CONFIDENTIALITY|NDA|SECRECY|DISCLOSE|DISCLOSURE|RESTRICTED INFO|TRADE SECRET|PRIVACY)\b/i,
    ARBITRATION: /\b(ARBITRATE|ARBITRATION|ARBITRATOR|DISPUTE|RESOLUTION|MAGISTRATE|SOLEMNLY AFFIRM|OATH)\b/i,
    REFUND: /\b(REFUND|RETURN|SECURITY DEPOSIT|FORFEITURE|FORFEIT|RECOVERY)\b/i,
    FORCE_MAJEURE: /\b(FORCE MAJEURE|ACT OF GOD|DROUGHT|FLOOD|NATURAL DISASTER|WEATHER|UNFORSEEABLE|STRIKE)\b/i,
    INTELLECTUAL_PROPERTY: /\b(INTELLECTUAL PROPERTY|IP|PATENT|COPYRIGHT|TRADEMARK|OWNERSHIP|INVENT|WORK PRODUCT|CREATION)\b/i,
    DATA_PRIVACY: /\b(DATA PRIVACY|Aadhaar|PRIVACY POLICY|DATA PROTECTION|REDACTED|PERSONAL DATA|SECURITY MEASURE)\b/i,
    OWNERSHIP: /\b(OWNER|OWNERSHIP|TITLE|LANDLORD|PATTADAR|PROPERTY DEED|INHERITANCE|LAND DETAILS)\b/i,
    NON_COMPETE: /\b(NON-COMPETE|NONCOMPETE|RESTRAINT OF TRADE|COMPETING|COVENANT NOT TO COMPETE)\b/i,
    NON_SOLICITATION: /\b(NON-SOLICITATION|NONSOLICITATION|SOLICIT|EMPLOYEE POACHING|RECRUIT)\b/i,
    EMPLOYMENT: /\b(EMPLOYEE|EMPLOYER|EMPLOYMENT|SALARY|WAGES|GRATUITY|RETRENCHMENT|SHOPS AND ESTABLISHMENTS|ICC|POSH)\b/i,
    TENANCY: /\b(TENANT|TENANCY|LANDLORD|RENTAL|LEASE|PREMISES|RESIDENTIAL|EVICT|EVICTION|RENT CONTROLLER)\b/i,
    SERVICE_LEVEL: /\b(SERVICE LEVEL|SLA|PERFORMANCE METRIC|COMPLIANCE RATE|Uptime|PENALTY RATE)\b/i,
    WARRANTY: /\b(WARRANTY|WARRANTIES|REPRESENTATION|GUARANTEE|GUARANTEES|AS IS|MERCHANTABILITY)\b/i,
    LIMITATION_OF_LIABILITY: /\b(LIMITATION OF LIABILITY|LIMIT LIABILITY|CAP ON LIABILITY|AGGREGATE LIABILITY|SOLE REMEDY)\b/i
  };

  for (const [cat, regex] of Object.entries(mappings)) {
    if (regex.test(t)) {
      categories.push(cat);
    }
  }

  if (categories.length === 0) {
    categories.push('WARRANTY'); // Default fallback classification
  }

  return categories;
}

// RULE-BASED DETERMINISTIC RISK DETECTION ENGINE
export function detectRiskRules(chunk: DocStructureChunk): Finding[] {
  const text = chunk.text;
  const index = chunk.sequence_index;
  const findings: Finding[] = [];

  // Rule 1: Unlimited Liability
  if (/any and all damages|unlimited liability|sole responsibility|shall be liable for all|unlimited damages/i.test(text)) {
    findings.push({
      risk_title: 'Unlimited Liability Clause',
      severity: 'CRITICAL',
      confidence: 0.98,
      evidence: text.match(/(.{0,40}(?:any and all damages|unlimited liability|sole responsibility|shall be liable for all|unlimited damages).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Exposes the signing party to potentially devastating financial obligations.',
        'Violates standard balanced corporate risks allocation rules.'
      ],
      recommended_revision: 'The total aggregate liability of either party for any breach of covenants shall be limited to the total fees paid under this agreement.',
      business_impact: 'High hazard of unexpected balance sheet depletion or business liquidation during civil claims.',
      legal_impact: 'Legally binding and permits the other party to recover values exceeding the entire commercial deal envelope.'
    });
  }

  // Rule 2: One-Sided Termination
  if (/(?:company|employer|owner|lessor) may terminate (?:immediately|at will|at any time)/i.test(text)) {
    findings.push({
      risk_title: 'Unilateral Immediate Termination',
      severity: 'HIGH',
      confidence: 0.95,
      evidence: text.match(/(.{0,40}(?:may terminate immediately|may terminate at will|may terminate at any time).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Grants the stronger party absolute exit rights without giving corresponding notices to the weaker party.',
        'Denies basic service cure periods.'
      ],
      recommended_revision: 'Either party may terminate this agreement upon 30 days written notice, or immediately for cause with a 15-day prior written cure notice.',
      business_impact: 'Disrupts operations instantly, threatening cashflows and leaving the weaker party without immediate recourse or transition windows.',
      legal_impact: 'Standard unconscionable contract trigger. Courts under the Indian Contract Act may inspect such power imbalances with high skepticism.'
    });
  }

  // Rule 3: Excessive Penalties
  if (/penalty exceeds|recurring daily penalties|daily penalty|liquidated damages exceed|forfeit all deposit|charge (?:[0-9%]+) interest per day/i.test(text)) {
    findings.push({
      risk_title: 'Excessive Liquidated Penalties',
      severity: 'HIGH',
      confidence: 0.96,
      evidence: text.match(/(.{0,40}(?:penalty|daily penalties|liquidated damages|forfeit all deposit).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Imposes punitive daily interest or total forfeit ratios that exceed genuine pre-estimates of damages.',
        'Usually voids as penalty rules under Section 74.'
      ],
      recommended_revision: 'Any delayed credit shall accrue simple interest at a rate of 1% per month, capped at a maximum of 10% of outstanding totals.',
      business_impact: 'Submits the covenant signatory to snowballing debt structures and severe collateral foreclosures for minor timeline friction.',
      legal_impact: 'Section 74 of the Indian Contract Act voids clauses representing strict fines/penalties; only verified actual damages represent compensable claims.'
    });
  }

  // Rule 4: Forced Arbitration select unilateral
  if (/mandatory arbitration|without alternatives|sole arbitrator selected exclusively/i.test(text)) {
    findings.push({
      risk_title: 'Forced Unilateral Arbitration Appointment',
      severity: 'MEDIUM',
      confidence: 0.95,
      evidence: text.match(/(.{0,40}(?:arbitration|sole arbitrator|exclusively).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Enforces dispute resolution under a panel chosen fully by one side.',
        'Violates supreme court neutrality rules under the Arbitration Act.'
      ],
      recommended_revision: 'Disputes shall be referred to arbitration under a neutral sole arbitrator appointed jointly through mutual written approval values.',
      business_impact: 'High danger of biased tribunal awards during claims and disputes.',
      legal_impact: 'Under the Arbitration and Conciliation (Amendment) Act, unilateral appointment of a sole arbitrator is invalid and unenforceable in courts.'
    });
  }

  // Rule 5: Unclear Ownership
  if (/ownership not defined|transfer ambiguous|owns all rights without specification/i.test(text)) {
    findings.push({
      risk_title: 'Ambiguous IP Ownership',
      severity: 'MEDIUM',
      confidence: 0.95,
      evidence: text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Fails to delineate proprietary patents, creations, or agricultural deliverables produced under the contract.'
      ],
      recommended_revision: 'Subject to payment of due fees, all intellectual property rights in deliverables created under this deal vests fully in the Client.',
      business_impact: 'Risks loss of high-value business secrets, code, designs, or proprietary materials.',
      legal_impact: 'Without express written transfer definitions, authorship defaults can trigger long and expensive copyright disputes.'
    });
  }

  // Rule 6: Hidden Auto-Renewals
  if (/automatically renews unless|auto-renew|renew automatically|unless cancelled in writing/i.test(text)) {
    findings.push({
      risk_title: 'Unfair Auto-Renewal Obligation',
      severity: 'MEDIUM',
      confidence: 0.96,
      evidence: text.match(/(.{0,40}(?:renew|auto|automatically).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Enforces recurring fees silently unless active cancel documents are dispatching early.'
      ],
      recommended_revision: 'This lease/contract may be renewed only upon mutual written execution prior to the primary expiration date.',
      business_impact: 'Forces lock-ins to expired deals and drains capital for unneeded recurring service cycles.',
      legal_impact: 'Binding unless the customer complies strictly with notice timings. Highly exploitative subscription pattern.'
    });
  }

  // Rule 7: Unlawful Post-Employment Non-Compete (Section 27 of Indian Contract Act)
  if (/\b(?:non-compete|noncompete|shall not engage in competing|shall not work for any competitor|not join any competitor|not compete after|restriction after termination|post-employment\s+(?:non-compete|competition))\b/i.test(text)) {
    findings.push({
      risk_title: 'Unlawful Post-Employment Non-Compete',
      severity: 'CRITICAL',
      confidence: 0.99,
      evidence: text.match(/(.{0,40}(?:non-compete|noncompete|not join any competitor|not compete after|post-employment).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Imposes post-employment restrictions on working for competitors or starting a competing business.',
        'Directly violates Section 27 of the Indian Contract Act, 1872.'
      ],
      recommended_revision: 'All restrictive non-compete covenants shall cease immediately upon termination of employment for any reason.',
      business_impact: 'Creates a chilling effect, making employees fear legal action for taking other jobs, even though it is completely unenforceable.',
      legal_impact: 'Under Section 27 of the Indian Contract Act, any agreement restraining trade or profession is void. Post-termination non-competes are completely unenforceable in India.'
    });
  }

  // Rule 8: Predatory Security Deposit Forfeiture
  if (/\b(?:forfeit.*deposit|retained.*deposit|painting charges|painting and cleaning|non-refundable deposit|deduct.*painting|wear and tear deduction)\b/i.test(text)) {
    findings.push({
      risk_title: 'Predatory Security Deposit Forfeiture',
      severity: 'HIGH',
      confidence: 0.95,
      evidence: text.match(/(.{0,40}(?:forfeit|retained|painting|wear and tear).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Primes the tenant for automatic deductions for painting and standard wear-and-tear, which should be landlord operating costs.',
        'Voids the principal purpose of a refundable security deposit.'
      ],
      recommended_revision: 'The security deposit shall be refunded in full within 7 business days of vacating, subject only to deductions for actual damage beyond normal wear and tear.',
      business_impact: 'Results in immediate, predictable loss of hard-earned money at move-out, causing legal friction and stress for common citizens.',
      legal_impact: 'Under Rent Control Acts and model tenancy frameworks, tenants are not liable for standard wear-and-tear. Automatic deductions are unfair commercial practices.'
    });
  }

  // Rule 9: Structural Repair Shifting
  if (/\b(?:tenant\s+(?:responsible\s+for|shall\s+bear|shall\s+pay)\s+(?:structural|plumbing|roofing|seepage|walls|leakage|external|major\s+repairs))\b/i.test(text)) {
    findings.push({
      risk_title: 'Unfair Structural Repair Burden Shifting',
      severity: 'HIGH',
      confidence: 0.96,
      evidence: text.match(/(.{0,40}(?:structural|plumbing|roofing|seepage|walls|leakage).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Shifts the cost of major building structural repairs (leakages, walls, roof) from the owner to the tenant.',
        'Directly conflicts with Section 108(m) of the Transfer of Property Act, 1882.'
      ],
      recommended_revision: 'The Landlord shall be responsible for all structural repairs, including roof leaks, wall seepage, plumbing lines, and external wiring. The Tenant is only responsible for minor day-to-day repairs up to ₹500.',
      business_impact: 'Exposes common tenants to sudden, high construction or repair bills for a property they do not own.',
      legal_impact: 'Under Section 108 of the Transfer of Property Act and local state Tenancy laws, structural integrity and major repairs are structural obligations of the owner.'
    });
  }

  // Rule 10: Unilateral Arbitrary Access/Entry
  if (/\b(?:enter\s+(?:at any time|access\s+without|without prior\s+notice|premises\s+at any hour|any hour of day))\b/i.test(text)) {
    findings.push({
      risk_title: 'Unreasonable Landlord Entry Power',
      severity: 'MEDIUM',
      confidence: 0.97,
      evidence: text.match(/(.{0,40}(?:enter|access|any hour|without notice).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Authorizes the landlord to enter the property without notice or during unreasonable hours.',
        'Violates the tenant covenant of Quiet Enjoyment of the leased premises.'
      ],
      recommended_revision: 'The Landlord shall provide at least 24 hours prior written or digital notice before entering the premises, and such entry shall only occur during normal business hours (9 AM to 6 PM) in the company of the Tenant.',
      business_impact: 'Destroys basic privacy and physical security of families, creating environments ripe for harassment.',
      legal_impact: 'Violates the common-law covenant of peaceful and quiet possession of property key to any valid lease deed under Indian jurisprudence.'
    });
  }

  // Rule 11: Unreasonable Training Bonds / Notice Periods
  if (/\b(?:training bond|employment bond|pay rupees|forfeit\s+months\s+salary|pay the sum of|liquidated damages for resignation|reimburse training cost)\b/i.test(text)) {
    findings.push({
      risk_title: 'Exorbitant Employment Resignation Bond',
      severity: 'HIGH',
      confidence: 0.96,
      evidence: text.match(/(.{0,40}(?:bond|pay rupees|forfeit.*salary|liquidated damages).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Imposes an exorbitant financial penalty on an employee for resigning before a fixed duration.',
        'Binds the employee unreasonably, functioning as forced labor warning signs.'
      ],
      recommended_revision: 'The Employee may terminate employment at any time by serving the standard notice period, without any penal financial obligation or training cost forfeitures.',
      business_impact: 'Forces low-income or mid-level workers to stay in abusive or low-yielding workplaces due to fear of colossal legal pay demands.',
      legal_impact: 'Under Section 74 of the Indian Contract Act, punitive bonds are void. Employers can only recover actual, documented direct training expenses incurred, which must be reasonable.'
    });
  }

  // Rule 12: Direct Double-notice mismatch / Notice Imbalance
  if (/\b(?:employee shall serve|notice period of\s+\d+\s+months|employer may terminate with\s+\d+\s+days|terminate on\s+\d+\s+days notice)\b/i.test(text)) {
    findings.push({
      risk_title: 'Asymmetric Contractual Notice Periods',
      severity: 'HIGH',
      confidence: 0.95,
      evidence: text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Locks the employee/contractor into long notice obligations while allowing the employer to sever the deal instantly.',
        'Creates a heavily biased power imbalance.'
      ],
      recommended_revision: 'Either party may terminate this agreement by providing the other party with 30 days written notice, or payment of salary in lieu of notice.',
      business_impact: 'Allows employers to fire employees without livelihood buffers, while locking employees in so they miss other job opportunities.',
      legal_impact: 'Though technically contractually permissible, heavily asymmetric clauses are scrutinized as unconscionable and unfair covenants in local labor tribunals.'
    });
  }

  // Rule 13: Predatory Rent Late Fee compounding
  if (/\b(?:interest of\s*[0-9%]+\s*per day|interest of\s*36%|interest of\s*24%|late fee of rupees\s*\d+\s*per day|fine of\s*\d+\s*per day)\b/i.test(text)) {
    findings.push({
      risk_title: 'Predatory Compounding Rent Late Fees',
      severity: 'HIGH',
      confidence: 0.95,
      evidence: text.match(/(.{0,40}(?:per day|interest|late fee|fine).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Imposes compounding interest or exorbitant daily fines on minor payment delays.',
        'Exceeds standard legal rates of interest, serving as a punitive penalty.'
      ],
      recommended_revision: 'Delayed payments shall attract simple interest at a rate of 1% per month (12% per annum), capped at a maximum of 10% of the rent due.',
      business_impact: 'Minor administrative bank delays or paycheck late arrivals can trigger snowballing debts, leaving families vulnerable to foreclosure.',
      legal_impact: 'Punitive fees violate Section 74 of the Indian Contract Act, which restricts recoveries strictly to actual damages, invalidating coercive fines.'
    });
  }

  // Rule 14: Squeeze-out Exclusive Out-Of-State Jurisdiction
  if (/\b(?:exclusive jurisdiction to courts of\s+(?!andhra pradesh|telangana|hyderabad|amaravati|guntur|vijayawada)[a-z]+|subject only to courts in\s+(?!andhra pradesh|telangana|hyderabad|amaravati|guntur|vijayawada)[a-z]+)\b/i.test(text)) {
    findings.push({
      risk_title: 'Predatory Remote Jurisdiction Clause',
      severity: 'MEDIUM',
      confidence: 0.96,
      evidence: text.match(/(.{0,40}(?:jurisdiction|courts of|courts in).{0,40})/i)?.[0]?.trim() || text.slice(0, 100),
      clause_reference: `Clause ${index}: ${chunk.heading}`,
      why_flagged: [
        'Attempts to force legal actions to a remote court, making litigation too expensive for local tenants or employees to pursue.',
        'Locks out access to convenient local dispute mechanisms.'
      ],
      recommended_revision: 'Any legal action or dispute arising out of this agreement shall be initiated exclusively in the courts where the property is located or the services are rendered.',
      business_impact: 'Deprives common citizens of any real ability to enforce their rights in court due to prohibitive travel and legal cost barriers.',
      legal_impact: 'Under the Civil Procedure Code (CPC), courts where the cause of action arises or where the defendant resides hold jurisdiction. Forcing remote jurisdiction is highly suspect.'
    });
  }

  return findings;
}

// CONTRADICTION DETECTION ENGINE
export function analyzeContradictions(chunks: DocStructureChunk[]): Contradiction[] {
  const contradictions: Contradiction[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    for (let j = i + 1; j < chunks.length; j++) {
      const textA = chunks[i].text.toLowerCase();
      const textB = chunks[j].text.toLowerCase();
      
      // 1. Conflict dates notice (e.g. 30 days vs immediate termination notices)
      if (
        (textA.includes('notice') && textB.includes('terminate immediately')) ||
        (textA.includes('immediate') && textB.includes('notice period'))
      ) {
        if (
          (textA.includes('days written') || textA.includes('months notice')) &&
          (textB.includes('immediately without') || textB.includes('at will'))
        ) {
          contradictions.push({
            clause_a_number: chunks[i].sequence_index,
            clause_b_number: chunks[j].sequence_index,
            clause_a_excerpt: chunks[i].text,
            clause_b_excerpt: chunks[j].text,
            conflict_description: 'Clause conflict regarding termination notice rules. One clause requires notice while the other grants immediate dismissal power.',
            legal_consequence: 'Ambiguity triggers judicial interpretation rules, potentially favoring the weaker party under the Contra Proferentem doctrine.',
            confidence: 0.95
          });
        }
      }

      // 2. Conflict payment dates (e.g., due on 1st vs due on 5th)
      const daysA = chunks[i].text.match(/\b(?:due on the|pay on or before the)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
      const daysB = chunks[j].text.match(/\b(?:due on the|pay on or before the)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
      if (daysA && daysB && daysA[1] !== daysB[1] && (textA.includes('rent') || textA.includes('due')) && (textB.includes('due') || textB.includes('pay'))) {
        contradictions.push({
          clause_a_number: chunks[i].sequence_index,
          clause_b_number: chunks[j].sequence_index,
          clause_a_excerpt: chunks[i].text,
          clause_b_excerpt: chunks[j].text,
          conflict_description: `Conflicting due dates: Clause ${chunks[i].sequence_index} mandates payment by the ${daysA[1]} day, whereas Clause ${chunks[j].sequence_index} permits/mandates by the ${daysB[1]} day.`,
          legal_consequence: 'Creates immediate commercial breathing room disputes or false default notices under procedural law.',
          confidence: 0.96
        });
      }
    }
  }

  return contradictions;
}

// MISSING PROTECTIVE CLAUSES DETECTION ENGINE
export function evaluateMissingProtections(chunks: DocStructureChunk[], docType: string): MissingClause[] {
  const allText = chunks.map(c => c.text).join(' ').toLowerCase();
  const missing: MissingClause[] = [];

  const checkTargets = [
    {
      type: 'DISPUTE_RESOLUTION',
      keywords: [/arbitrat/i, /dispute/i, /mediation/i],
      importance: 'MEDIUM' as const,
      why_needed: 'Avoids highly expensive court litigation by forcing structured resolution.',
      standard_safe_language: 'Any dispute arising from this contract shall be settled under the Arbitration and Conciliation Act by a mutually selected sole arbitrator.'
    },
    {
      type: 'GOVERNING_LAW',
      keywords: [/governing law/i, /jurisdiction/i, /laws of/i, /courts/i],
      importance: 'CRITICAL' as const,
      why_needed: 'Establishes exactly which state laws and local court judicial bounds govern contract breaches.',
      standard_safe_language: 'This agreement shall be governed and interpreted under the laws of India, under exclusive jurisdiction of the local courts of Andhra Pradesh / Telangana.'
    },
    {
      type: 'TERMINATION_CURE_PERIOD',
      keywords: [/cure/i, /breach.*remed/i, /days to rectify/i],
      importance: 'HIGH' as const,
      why_needed: 'Prevents sudden contract termination for administrative mistakes by granting a 15-day window to restore compliance.',
      standard_safe_language: 'Neither party shall terminate this contract for breach without providing 15 days written notice detailing the breach and permitting cure.'
    },
    {
      type: 'FORCE_MAJEURE',
      keywords: [/force majeure/i, /act of god/i, /natural disaster/i],
      importance: 'MEDIUM' as const,
      why_needed: 'Protects signees from contract breach penalties during extreme events like fires, floods, or structural dry outs.',
      standard_safe_language: 'Neither party shall be liable for failures or delays resulting from acts of God, extreme weather, lockouts, or unforeseen disasters.'
    },
    {
      type: 'LIABILITY_CAP',
      keywords: [/limit.*liability/i, /liability.*cap/i, /aggregate liability/i],
      importance: 'HIGH' as const,
      why_needed: 'Places a strict dollar ceiling on breach payouts rather than exposing personal or entire business reserves.',
      standard_safe_language: 'The total maximum liability of either party for all claims combined under this deed shall be capped at the total amounts paid hither.'
    }
  ];

  for (const target of checkTargets) {
    const isPresent = target.keywords.some(regex => regex.test(allText));
    if (!isPresent) {
      missing.push({
        clause_type: target.type.replace(/_/g, ' '),
        importance: target.importance,
        why_needed: target.why_needed,
        standard_safe_language: target.standard_safe_language
      });
    }
  }

  return missing;
}
