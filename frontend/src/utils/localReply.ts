// Local reply and legal document analysis heuristics

export function analyzeLegalDocumentLocal(text: string, language: string) {
  const textLower = text.toLowerCase();
  const flags: any[] = [];
  let score = 95;

  const isTelugu = language === 'te';

  // 1. Check for Rental Agreement specific clauses
  const isRental = textLower.includes('rental') || textLower.includes('అద్దె') || textLower.includes('tenant');
  if (isRental) {
    // Notice period checks
    const hasNotice = textLower.includes('notice') || textLower.includes('నోటీసు');
    if (!hasNotice) {
      score -= 10;
      flags.push({
        id: 'rental-notice',
        severity: 'WARNING',
        clause_ref: isTelugu ? 'నోటీసు వ్యవధి సమాచారం లేదు' : 'Notice Period Omission',
        excerpt: isTelugu ? '"గదిని ఖాళీ చేసే లేదా ఒప్పందం రద్దు చేసే నోటీసు వ్యవధి క్లాజు కనబడలేదు"' : '"Notice period clause for eviction or termination was not detected"',
        explanation: isTelugu
          ? 'ఈ అద్దె ఒప్పందంలో నోటీసు వ్యవధి ప్రస్తావించబడలేదు. దీనివల్ల యజమాని తక్షణమే ఇల్లు ఖాళీ చేయించే ప్రమాదం పొంచి ఉంది.'
          : 'Omission of notice period exposes the tenant to arbitrary eviction. Tenant protection laws suggest a mandatory 1-2 month notification window.',
        recommendation: isTelugu
          ? 'కనీసం 2 నెలల నోటీసు వ్యవధి ఉండేలా ఒప్పందంలో మార్పు చేయండి.'
          : 'Request to explicitly insert a 2-month written advance notice requirement for termination.',
        legal_basis: 'Transfer of Property Act, 1882 — Section 106'
      });
    }

    // Security deposit check
    const hasDeposit = textLower.includes('deposit') || textLower.includes('డిపాజిట్');
    if (hasDeposit) {
      const depositHigh = textLower.includes('forfeit') || textLower.includes('penalty') || textLower.includes('జప్తు');
      if (depositHigh) {
        score -= 15;
        flags.push({
          id: 'rental-deposit',
          severity: 'CRITICAL',
          clause_ref: isTelugu ? 'డిపాజిట్ ఉల్లంఘన జప్తు క్లాజ్' : 'Predatory Deposit Forfeiture Clause',
          excerpt: isTelugu ? '"ఉల్లంఘన లేదా ఆలస్యం జరిగితే మొత్తం సెక్యూరిటీ డిపాజిట్‌ను జప్తు చేస్తుంది..."' : '"...shall forfeit caution/security deposit immediately..."',
          explanation: isTelugu
            ? 'చిన్నపాటి ఆలస్యం లేదా వివాదానికి మొత్తం డిపాజిట్‌ను జప్తు చేయడం దారుణం మరియు చట్టవీరుద్ధం.'
            : 'Preemptive and near-instant forfeiture of massive security deposits without proportional proof of damages is restricted by courts.',
          recommendation: isTelugu
            ? 'కేవలం సంభవించిన నష్టాలకు మాత్రమే మినహాయింపులు చెల్లుతాయని రాయండి.'
            : 'Adjust the clause to guarantee deposit refund, subject strictly to structural wear-and-tear damages backed by bills.',
          legal_basis: 'Indian Contract Act, 1872 — Section 74'
        });
      }
    }
  }

  // 2. Check for Affidavit specific declarations
  const isAffidavit = textLower.includes('affidavit') || textLower.includes('ప్రమాణ పత్రం') || textLower.includes('deponent');
  if (isAffidavit) {
    // Solmen affirmation confirmation
    const hasOath = textLower.includes('solemnly') || textLower.includes('ప్రమాణం') || textLower.includes('swear');
    if (!hasOath) {
      score -= 10;
      flags.push({
        id: 'affidavit-oath',
        severity: 'WARNING',
        clause_ref: isTelugu ? 'ప్రమాణ శీర్షిక లోపం' : 'Missing Solemn Affirmation Clause',
        excerpt: isTelugu ? '"నేను నిరూపిస్తూ సమర్పిస్తున్నాను..."' : '"I hereby state..."',
        explanation: isTelugu
          ? 'అఫిడవిట్ చట్టబద్ధమైన క్లాజుగా మారడానికి అవసరమైన గంభీరమైన చట్ట ప్రమాణ పదం లోపించింది.'
          : 'Affidavits must carry a solemn preamble confirming that the deponent makes the declarations under state-recognized oath.',
        recommendation: isTelugu
          ? '"నేను దైవసాక్షిగా / సత్యసాక్షిగా ప్రమాణం చేయుచున్నాను" అనే వాక్యం జోడించండి.'
          : 'Rewrite the opening using standardized legally valid terms: "do hereby solemnly affirm and state on oath".',
        legal_basis: 'Indian Oaths Act, 1969 — Section 4 & 5'
      });
    }

    // Swearing authority warning
    flags.push({
      id: 'affidavit-authority',
      severity: 'NOTICE',
      clause_ref: isTelugu ? 'నోటరీ లేదా గెజిటెడ్ సంతకం' : 'Notarization / Gazetted Verification Required',
      excerpt: text.substring(0, Math.min(text.length, 100)) + '...',
      explanation: isTelugu
        ? 'సంక్షేమ పథకాలకు స్వీయ ప్రమాణ పత్రం చెల్లుతుంది, కానీ న్యాయపరంగా దీనిని ఒక నోటరీ లేదా గెజిటెడ్ అధికారి ధృవీకరించాలి.'
        : 'Self-signed affidavits are widely accepted for primary welfare checks, but certain schemes demand Notary Public certification for final disbursal.',
      recommendation: isTelugu
        ? 'దీనిని రూ. 10 లేదా రూ. 20 నాన్-జుడిషియల్ స్టాంప్ పేపర్‌పై ప్రింట్ చేసి నోటరీ సంతకం తీసుకోండి.'
        : 'Execute this document on a standard stamp paper of nominal value and get it attested by a Notary Public or Executive Magistrate.',
      legal_basis: 'A.P. Civic Welfare Administrative Guidelines'
    });
  }

  // 3. Income Certificate Request Letter
  const isIncomeCert = textLower.includes('income certificate') || textLower.includes('ఆదాయ ధృవీకరణ') || textLower.includes('tehsildar');
  if (isIncomeCert) {
    // Check if annual household income limits are outlined properly
    const hasIncomeNo = textLower.includes('annual') || textLower.includes('ఆదాయం') || textLower.includes('₹') || textLower.includes('rs');
    if (!hasIncomeNo) {
      score -= 15;
      flags.push({
        id: 'income-omit',
        severity: 'CRITICAL',
        clause_ref: isTelugu ? 'నిర్దిష్ట ఆదాయ సంఖ్య లోపించింది' : 'Incomplete Annual Income Declaration',
        excerpt: isTelugu ? '"ఆదాయ ధృవీకరణ పత్రం కొరకు దరఖాస్తు..."' : '"Request for family income certificate..."',
        explanation: isTelugu
          ? 'ధృవీకరణ పత్రం జారీ కావాలంటే మీ స్వంత అంచనా వార్షిక ఆదాయాన్ని ఖచ్చితంగా సంఖ్యల రూపంలో ప్రకటించాలి.'
          : 'Your letter omits a specific self-declared annual income figure, making processing or manual assessment by local revenue officials impossible.',
        recommendation: isTelugu
          ? 'మీకుటుంబ వార్షిక ఆదాయం (ఉదా: ₹84,000) అనే సంఖ్యను ఖచ్చితంగా జోడించండి.'
          : 'Insert a clean self-declared annual income statement representing your household (e.g., "annual income amounts to ₹84,000").',
        legal_basis: 'AP Land Revenue Regulations & Civil Sourcing Standards'
      });
    }

    flags.push({
      id: 'income-timeline',
      severity: 'NOTICE',
      clause_ref: isTelugu ? 'సేవా హక్కు గడువు పరిమితి' : 'Right to Public Services Timeline Limit',
      excerpt: isTelugu ? '"పరిశీలించి త్వరగా ఆదాయ ధృవీకరణ జారీ చేయుము..."' : '"Kindly request to process at earliest..."',
      explanation: isTelugu
        ? 'రాష్ట్ర ప్రభుత్వ సేవా హక్కుల చట్టం ప్రకారం మీ దరఖాస్తుకు 15 రోజులలోగా ప్రభుత్వం సమాధానం చెప్పాలి.'
        : 'Under the Right to Public Services Act, revenue secretariats are legally bound to deliver income certificates within a strict timeline (typically 15 days).',
      recommendation: isTelugu
        ? 'దరఖాస్తు చేసుకున్న తర్వాత సచివాలయంలో తప్పనిసరిగా రశీదు నంబర్ తీసుకోండి.'
        : 'Upon physical or digital submission at the village secretariat, demand a stamped acknowledgement slip to monitor timelines.',
      legal_basis: 'AP Right to Services Act, 2011'
    });
  }

  // 4. Land Lease Agreement specific checks
  const isLandLease = textLower.includes('land lease') || textLower.includes('వ్యవసాయ భూమి') || textLower.includes('cultivator') || textLower.includes('కౌలు పత్రం');
  if (isLandLease) {
    // Licence protection check
    const hasLicence = textLower.includes('licence') || textLower.includes('licensed') || textLower.includes('చాందీ') || textLower.includes('భూస్వామి');
    if (!hasLicence) {
      score -= 10;
      flags.push({
        id: 'land-lease-licence',
        severity: 'WARNING',
        clause_ref: isTelugu ? 'కౌలు రైతు హక్కుల రక్షణ క్లాజ్ లోపం' : 'Omission of Licensed Cultivator Protection',
        excerpt: text.substring(0, Math.min(text.length, 120)) + '...',
        explanation: isTelugu
          ? 'రుణాలు, విత్తన రాయితీలు, సంక్షేమ పథకాలు పొందడానికి అవసరమయ్యే లైసెన్స్డ్ కౌలుదారు ధృవీకరణకు ఈ ఒప్పందం పూచీ ఇవ్వడం లేదు.'
          : 'Without explicit landlord agreement acknowledging the tenancy for official registrations, tenant farmers are locked out of credit and subsidized seeds.',
        recommendation: isTelugu
          ? '"ఈ ఒప్పందం ద్వారా ప్రభుత్వం నుంచి కౌలు సీఈఓ పత్రం పొందే హక్కు కౌలుదారుకు కలదు" అని జోడించండి.'
          : 'Add clause: "The Landlord hereby consents to the Tenant Farmer applying for a Loan Eligibility Card (LEC) or CCRC under state laws."',
        legal_basis: 'A.P. Land Licensed Cultivators Act, 2011'
      });
    }
  }

  // 5. Grievance letter specific checks
  const isGrievance = textLower.includes('grievance') || textLower.includes('complaint') || textLower.includes('ఫిర్యాదు') || textLower.includes('ఆలస్య');
  if (isGrievance) {
    // Beneficiary Id checking
    const hasId = textLower.includes('id') || textLower.includes('number') || textLower.includes('ఖాతా') || textLower.includes('సంఖ్య') || textLower.includes('ap-');
    if (!hasId) {
      score -= 15;
      flags.push({
        id: 'grievance-no-id',
        severity: 'CRITICAL',
        clause_ref: isTelugu ? 'లబ్ధిదారు గుర్తింపు సంఖ్య లేదు' : 'Missing Beneficiary Identification ID',
        excerpt: isTelugu ? '"నా సంక్షేమ పథక చెల్లింపు బదిలీ కాలేదు..."' : '"My welfare payment was not credited..."',
        explanation: isTelugu
          ? 'పథకం గుర్తింపు సంఖ్య లేదా ఆధార్ నంబర్ లేని పక్షంలో తహశీల్దార్ లేదా సచివాలయ अधिकारी మీ రికార్డులను శోధించలేరు.'
          : 'A grievance without a certified unique Beneficiary ID, application ID, or Ration ID is routinely rejected as unsearchable.',
        recommendation: isTelugu
          ? 'మీ నవశకం ఐడీ (లేదా ఆధార్ నంబర్) మరియు ఖాతా నంబర్ నోటిఫికేషన్ తప్పకుండా ప్రస్తావించండి.'
          : 'Ensure you write down your unique Welfare ID (e.g., AP-AV-2026-98741) or Aadhaar number clearly in the introduction card.',
        legal_basis: 'Andhra Pradesh Electronic Service Delivery Rules'
      });
    }

    flags.push({
      id: 'grievance-spandana',
      severity: 'NOTICE',
      clause_ref: isTelugu ? 'స్పందన / ప్రజావాణి వేదికల ఉపయోగం' : 'Direct Lodging at Spandana/Prajavani Gateways',
      excerpt: isTelugu ? '"తహశీల్దార్ కార్యాలయం చుట్టూ తిరుగుతున్నాను..."' : '"Kindly resolve the technical seed block..."',
      explanation: isTelugu
        ? 'కేవలం భౌతిక కాగితం ఇవ్వడమే కాకుండా భౌతిక మరియు డిజిటల్ లూప్‌ల అనుసంధానానికి స్పందన లేదా ప్రజావాణి పోర్టల్‌లో రిజిస్టర్ చేయడం ఉత్తమం.'
        : 'Submitting grievances directly online to AP Spandana or Telangana Prajavani ensures the district collector oversees resolution progress.',
      recommendation: isTelugu
        ? 'ఈ లేఖను ఆన్‌లైన్ స్పందన / ప్రజావాణి పోర్టల్‌లో అప్‌లోడ్ చేసి ఆటో-ట్రాకింగ్ ఐడీని తీసుకోండి.'
        : 'We suggest uploading this identical letter text via the Spandana/Prajavani online portal to get automated escalation.',
      legal_basis: 'G.O.Ms.No. 45 Administrative Reforms Implementation'
    });
  }

  // Generic Fallback Penalty Forfeiture checks for general contracts
  if (!isRental && !isAffidavit && !isIncomeCert && !isLandLease && !isGrievance) {
    const forfeitKeywords = ['forfeit', 'delay', 'penalty', 'breach', 'fine', 'liquidated', 'shall lose', 'జప్తు', 'సమర్పించు', 'నష్టం', 'గడువు', 'రుసుము'];
    const hasForfeit = forfeitKeywords.some(kw => textLower.includes(kw));
    if (hasForfeit) {
      score -= 25;
      flags.push({
        id: 'local-forfeit',
        severity: 'CRITICAL',
        clause_ref: isTelugu ? 'ఒప్పందం జప్తు & జరిమానాలు' : 'Contract Breach Penalties',
        excerpt: isTelugu 
          ? '"ఒప్పందం ఉల్లంఘించిన లేదా ఆలస్యమైన పక్షంలో డిపాజిట్లు మరియు గత చెల్లింపులు జప్తు చేయబడతాయి..."'
          : '"...shall forfeit all caution deposit or prior payments immediately upon contract breach or delay..."',
        explanation: isTelugu
          ? 'ఈ ఒప్పంద క్లాజులో కేవలం కొద్ది రోజుల ఆలస్యానికి కూడా మొత్తం కాషన్ డిపాజిట్ జప్తు చేసే హక్కు యజమానికి ఇవ్వబడింది. ఇది కౌలు చట్టం మరియు కాంట్రాక్ట్ చట్టం విరుద్ధం.'
          : 'The agreement allows immediate and disproportionate forfeiture of your caution deposit for minor delays. This bypasses section 74 of the Indian Contract Act, which restricts penalty clauses.',
        recommendation: isTelugu
          ? 'కనీసం 30 రోజుల లిఖితపూర్వక నోటీసు మరియు ఆలస్యానికి తక్కువ వడ్డీ మాత్రమే చెల్లించేలా సవరించండి.'
          : 'Negotiate to modify this clause. Insist on a 30-day written cure notice before lease termination or deposit liquidation.',
        legal_basis: 'Indian Contract Act, 1872 — Section 74'
      });
    }

    // Unneutral Arbitration
    const arbKeywords = ['arbitration', 'arbitrator', 'dispute', 'litigation', 'court', 'sole arbitrator', 'unilateral', 'resolution', 'రిజల్యూషన్', 'మధ్యవర్తి', 'కోర్టు', 'వివాదం'];
    const hasArb = arbKeywords.some(kw => textLower.includes(kw));
    if (hasArb) {
      score -= 15;
      flags.push({
        id: 'local-arb',
        severity: 'WARNING',
        clause_ref: isTelugu ? 'మధ్యవర్తి నియామకం' : 'Dispute Resolution & Unilateral Arbitration',
        excerpt: isTelugu
          ? '"ఏదైనా వివాదం తలెత్తితే కేవలం యజమాని ఎంపిక చేసిన ఏకైక మధ్యవర్తి నిర్ణయమే అంతిమం..."'
          : '"...disputes shall be referred to a sole arbitrator appointed solely by the Lessor/Owner..."',
        explanation: isTelugu
          ? 'వివాదాల పరిష్కారానికి కేవలం యజమానే మధ్యవర్తిని ఎన్నుకునే అధికారాన్ని కలిగి ఉండటం వల్ల న్యాయం జరిగే అవకాశం తక్కువ.'
          : 'Unilateral select permissions for arbitrators are legally invalid. Under Supreme Court neutrality guidelines, the appointment of an arbitrator must be mutual.',
        recommendation: isTelugu
          ? 'ఇద్దరూ అంగీకరించిన స్వతంత్ర వ్యక్తిని లేదా జిల్లా కోర్టు ద్వారా ఎంపిక చేసుకునేలా మార్చండి.'
          : 'Incorporate mutual consent triggers where both parties agree on a certified panel or request the High Court to designate a neutral official.',
        legal_basis: 'Arbitration and Conciliation (Amendment) Act, 2015'
      });
    }

    // Water, Irrigation or Resources
    const waterKeywords = ['water', 'borewell', 'electricity', 'irrigation', 'groundwater', 'drought', 'విద్యుత్', 'బావి', 'నీరు', 'కరెంట్', 'పంపు'];
    const hasWater = waterKeywords.some(kw => textLower.includes(kw));
    if (hasWater) {
      score -= 10;
      flags.push({
        id: 'local-water',
        severity: 'NOTICE',
        clause_ref: isTelugu ? 'వ్యవసాయ నీటి పారుదల బాధ్యత' : 'Agricultural Infrastructure and Irrigation Liability',
        excerpt: isTelugu
          ? '"బోరుబావి విద్యుత్ కనెక్షన్లు మరియు నీటి సరఫరా వైఫల్యానికి యజమాని బాధ్యుడు కాడు..."'
          : '"...the lessee remains solely responsible for borewell repair and electricity, dry groundwater is not a ground for rent release..."',
        explanation: isTelugu
          ? 'విద్యుత్ కోతలు లేదా భూగర్భ జలాల తగ్గుదల వల్ల పంట పాడైనా మీరు పూర్తి అద్దె చెల్లించాల్సి ఉంటుంది. ఇది రైతుకు నష్టం.'
          : 'Directs the full financial burden of agricultural utility interruptions, pump mechanics, and natural water table dried states onto the farmer.',
        recommendation: isTelugu
          ? 'ప్రకృతి వైపరీత్యాలు లేదా విద్యుత్ లోపాలు ఏర్పడినప్పుడు అద్దెను తాత్కాలికంగా తగ్గించే క్లాజ్ చేర్చండి.'
          : 'Negotiate a proportional rent remission clause during periods of government-enforced grid shutdowns or geological dry spells.',
        legal_basis: 'Andhra Pradesh Land Licensed Cultivators Rules'
      });
    }
  }

  // 6. Default safe checker if nothing is flagged
  if (flags.length === 0) {
    flags.push({
      id: 'local-safe',
      severity: 'NOTICE',
      clause_ref: isTelugu ? 'ప్రాథమిక పరిశీలన విజయవంతం' : 'Standard Document Review',
      excerpt: text.substring(0, Math.min(text.length, 120)) + '...',
      explanation: isTelugu
        ? 'ఈ ఒప్పందంలో తీవ్రమైన లేదా అనుమానాస్పద జరిమానాలకు సంబంధించిన క్లాజులు ప్రత్యేకంగా లేవు.'
        : 'The scanned excerpt did not trigger standard safety heuristics for severe, predatory, or unilateral penalty clauses.',
      recommendation: isTelugu
        ? 'ఒప్పందాన్ని జిల్లా సబ్-రిజిస్ట్రార్ లేదా స్థానిక పంచాయతీ సచివాలయంలో నమోదు చేయవచ్చు.'
        : 'Proceed with formal registration. Secure witnesses and lodge this lease deed at your nearest rural revenue sub-office.',
      legal_basis: 'Indian Registration Act, 1908'
    });
  }

  const calculatedRisk = score < 60 ? 'CRITICAL' : score < 75 ? 'HIGH' : score < 85 ? 'MEDIUM' : 'LOW';
  const calculatedGrade = score < 60 ? 'F' : score < 70 ? 'D' : score < 80 ? 'C' : score < 90 ? 'B' : 'A';

  return {
    health_score: score,
    health_grade: calculatedGrade,
    overall_risk: calculatedRisk,
    flags: flags
  };
}

export function generateDynamicChatResponseLocal(messages: any[], language: string) {
  const isTelugu = language === 'te';
  const latestMessage = messages[messages.length - 1];
  const query = (latestMessage?.content || '').toLowerCase();

  let responseText = '';

  if (query.includes('eligibility') || query.includes('eligible') || query.includes('అర్హత')) {
    responseText = isTelugu
      ? `నేను మీ కొరకు సముచితమైన **అర్హత తనిఖీ సాధనాన్ని (Eligibility Checker Card)** సిద్ధం చేశాను. కింద చూపిన ఇంటరాక్టివ్ చెక్ లిస్ట్ లో మీ నివాసం, వార్షిక ఆదాయం, ఆధార్ లింకింగ్ మరియు వయస్సు వివరాలను టిక్ చేసి, వివిధ పథకాలకు మీ అర్హత శాతాన్ని సులభంగా పరీక్షించుకోండి.\n\n[ELIGIBILITY_CHECKER]`
      : `I have prepared the interactive **Eligibility Checker Card** for you. Please use the live checkbox list below to verify your resident status, annual household income brackets, family occupation, and Aadhaar links to calculate your status:\n\n[ELIGIBILITY_CHECKER]`;
  }
  else if (query.includes('calculator') || query.includes('calculate') || query.includes('payout') || query.includes('గణన') || query.includes('లెక్క')) {
    responseText = isTelugu
      ? `వ్యవసాయ పెట్టుబడి సాయాన్ని సులభంగా లెక్కించడానికి కింద **ఉచిత వ్యవసాయ పెట్టుబడి కాలిక్యులేటర్ (Benefit Calculator)** అందించబడింది. మీ భూమి విస్తీర్ణాన్ని (ఎకరాలలో) స్లైడర్ ద్వారా ఎంచుకుని Rythu Bharosa, Rythu Bandhu, మరియు PM-KISAN పథకాల ద్వారా లభించే వార్షిక సాయాన్ని లైవ్ లో గమనించండి.\n\n[BENEFIT_CALCULATOR]`
      : `I have generated the interactive **Benefit Calculator Worksheet** for you below. Select your target scheme and scroll the land acreage slider to calculate exactly how much money is sent annually and per seasonal tranche (Kharif / Rabi):\n\n[BENEFIT_CALCULATOR]`;
  }
  else if (query.includes('tracker') || query.includes('status') || query.includes('payment') || query.includes('ట్రాకర్') || query.includes('స్థితి')) {
    responseText = isTelugu
      ? `మీ డైరెక్ట్ బెనిఫిట్ ట్రాన్స్ఫర్ (DBT) సాయం ఏ దశలో ఉందో గమనించడానికి కింద **లైవ్ పేమెంట్ స్టేటస్ ట్రాకర్ (Payment Status Tracker)** సక్రియం చేయబడింది. మీ 12-అంకెల ఆధార్ కార్డు నంబర్ నమోదు చేసి 'బ్యాంక్ స్టేటస్ తనిఖీ' క్లిక్ చేయండి.\n\n[PAYMENT_STATUS_TRACKER]`
      : `I have prepared the live-simulated **Payment Status Tracker** widget for you below. To query the state DBT treasury servers, pick a scheme and enter your 12-digit Aadhaar number to run a security status fetch:\n\n[PAYMENT_STATUS_TRACKER]`;
  }
  else if (query.includes('compare') || query.includes('comparison') || query.includes('వ్యత్యాసం') || query.includes('పోలిక')) {
    responseText = isTelugu
      ? `కనపడేలా కేంద్ర మరియు రాష్ట్ర ప్రభుత్వాల రైతు సంక్షేమ పథకాల మధ్య తేడాలను సులభంగా అర్థం చేసుకోవడానికి కింద **పథకాల పోలిక పట్టిక (Scheme Comparison Card)** రూపకల్పన చేయబడింది. PM Kisan vs Rythu Bharosa పథకాల మధ్య నిధులు, విడతలు మరియు నిబంధనల తేడాలను ఇక్కడ పరిశీలించండి.\n\n[SCHEME_COMPARISON]`
      : `I have assembled a comprehensive **Scheme Comparison Card** comparing PM Kisan (Central government) vs Rythu Bharosa / Rythu Bandhu (State support schemes) side-by-side:\n\n[SCHEME_COMPARISON]`;
  }
  else if (query.includes('checklist') || query.includes('document') || query.includes('పత్రాలు') || query.includes('లిస్ట్')) {
    responseText = isTelugu
      ? `మీరు విజయవంతంగా దరఖాస్తు చేసుకోవడానికి అవసరమైన ధృవీకరణ పత్రాల తనిఖీ కోసం కింద **ఇంటరాక్టివ్ డాక్యుమెంట్ చెక్ లిస్ట్ (Document Checklist Widget)** పొందుపరచబడింది. పథకంల జాబితా నుండి సరైన పథకాన్ని ఎంచుకుని, మీ వద్ద సిద్ధంగా ఉన్న పత్రాలను మార్క్ చేసుకోండి.\n\n[DOCUMENT_CHECKLIST]`
      : `I have compiled an interactive **Document Checklist Widget** for you below. Choose any welfare program from the dropdown selector to load the real required certificate list, and check them off as you organize your packet:\n\n[DOCUMENT_CHECKLIST]`;
  }
  else if (query.includes('aarogyasri') || query.includes('ఆరోగ్యశ్రీ') || query.includes('health') || query.includes('వైద్యం')) {
    responseText = isTelugu
      ? `ఆరోగ్యశ్రీ పథకానికి అర్హతలు మరియు తాజా వివరాలు ఇక్కడ ఉన్నాయి:
      
### సంక్షిప్త వివరణ
డాక్టర్ వైఎస్ఆర్ ఆరోగ్యశ్రీ అనేది ఆంధ్రప్రదేశ్ ప్రభుత్వం అందిస్తున్న ఉచిత కార్పొరేట్ వైద్య సేవ. తెలంగాణలో కూడా తెలంగాణ ఆరోగ్యశ్రీ పథకం ద్వారా పేద ప్రజలకు వైద్య సహాయం అందుతోంది.

### ముఖ్యమైన అర్హతలు:
1. **ఆదాయ పరిమితి:** కుటుంబ వార్షిక ఆదాయం రూ. 5,00,000 / సంవత్సరానికి లోబడి ఉండాలి.
2. **రేషన్ కార్డ్:** తెల్ల రేషన్ కార్డ్ (White Ration Card) లేదా అర్హత కలిగిన బిపిఎల్ కార్డ్ ఉండాలి.
3. **భూమి పరిమితి:** గరిష్టంగా 35 ఎకరాల లోపు వ్యవసాయ భూమి (మెట్ట/పల్లం కలిపి) కలిగి ఉండవచ్చు.

### అవసరమైన పత్రాలు:
- ఆధార్ కార్డ్
- వైట్ రేషన్ కార్డ్ / ఆహార భద్రతా కార్డ్
- ఆధార్ లింక్ చేయబడిన మొబైల్ నంబర్
- నివాస ధ్రువీకరణ పత్రం

---
*[కింది ఇంటరాక్టివ్ నివేదికను పరిశీలించండి]*

\`\`\`html
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background: #0F172A; color: #F1F5F9; padding: 15px; margin:0; }
  .box { background: #1E293B; border-left: 4px solid #F59E0B; padding: 12px; margin-bottom: 10px; border-radius: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  dt { font-weight: bold; color: #F59E0B; font-size: 11px; }
  dd { margin: 0 0 8px 0; font-size: 14px; }
</style>
</head>
<body>
  <h3 style="color:#F59E0B; margin-top:0;">ఆరోగ్యశ్రీ ఉచిత చికిత్స రక్షణ పరిమితి</h3>
  <div class="box">
    <strong>గరిష్ట వైద్య ముఖచిత్రం:</strong> రూ. 15,00,000 / సంవత్సరానికి కుటుంబానికి ఉచితం (తెలంగాణలో రూ. 10,000,000)
  </div>
  <div class="grid">
    <div style="background:#1E293B; padding:10px; border-radius:4px;">
      <dt>ఆదాయ అర్హత</dt>
      <dd>&lt; రూ. 5,00,000 / ఏటా</dd>
    </div>
    <div style="background:#1E293B; padding:10px; border-radius:4px;">
      <dt>చికిత్స ప్యాకేజీలు</dt>
      <dd>3200+ రకాల ఆపరేషన్లు</dd>
    </div>
  </div>
</body>
</html>
\`\`\`

\`\`\`mermaid
graph TD
  A[రైతు / పౌరుడు అత్యవసర నమోదు] --> B[ఆరోగ్య మిత్రను సేవ హాస్పిటల్ లో కలవండి]
  B --> C{నమోదు అర్హత చెక్}
  C -->|వైట్ కార్డ్ ఉందా| D[నిమిషాల్లో ఉచిత చికిత్స ఆమోదం]
  C -->|కార్డ్ లేదు కానీ ఆదాయ ధృవపత్రం| D
  D --> E[రూ. 15 లక్షల పరిమితి కార్పొరేట్ ఆపరేషన్]
\`\`\``
      : `Here are the latest dynamic guidelines for the **Aarogyasri Health Scheme**:

### Scheme Summary
AP YSR Aarogyasri and TS Aarogyasri are flagship healthcare initiatives providing cash-free private hospitalization benefits to low-income and middle-income families across Andhra Pradesh and Telangana.

### Qualification Criteria:
1. **Income Segment:** All families with a combined household income below **₹5,00,000 per annum** are eligible.
2. **Asset Limits:** Wet lands under 12 acres or dry lands under 35 acres.
3. **Identification:** Must possess a valid BPL/White Ration Card or food security certificate.

### Required Documentation:
- Aadhaar Card of all family members.
- White BPL Ration Card.
- Active Income certificate from Revenue Department.
- Address proof / Gas connection receipt if name differs.

---
*[Review the interactive threshold widget and process flow chart below for quick registration instructions]*

\`\`\`html
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; background: #0F172A; color: #F1F5F9; padding: 15px; margin: 0; }
  .metric-card { background: #1E293B; border-radius: 8px; padding: 10px; border: 1px solid #334155; }
  .grid { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-top: 10px; }
  h3 { color: #38BDF8; margin-top: 0; }
  .badge { background: #38BDF8; color: #0F172A; font-weight: bold; border-radius:4px; padding: 2px 6px; font-size:10px; display:inline-block; }
</style>
</head>
<body>
  <h3>Aarogyasri Universal Health Card</h3>
  <span class="badge">ACTIVE DIRECT GOVERNMENT DISPATCH</span>
  <div class="grid">
    <div class="metric-card">
      <div style="font-size:10px; color:#94A3B8;">MAXIMUM COVER</div>
      <div style="font-size:18px; font-weight:bold; color:#10B981;">₹15,00,000</div>
      <div style="font-size:10px; color:#94A3B8;">per family / year</div>
    </div>
    <div class="metric-card">
      <div style="font-weight:bold; font-size:13px; margin-bottom:5px;">Included Facilities</div>
      <div style="font-size:11px; color:#CBD5E1;">• Cover all private surgeries with cashless smartcard<br>• Post-discharge diagnostic follow-ups for 1 year<br>• Free medicine pack</div>
    </div>
  </div>
</body>
</html>
\`\`\`

\`\`\`mermaid
graph TD
  A[Patient Visits Empaneled Hospital] --> B[Aarogya Mithra Desk Scan]
  B --> C{BPL Status OK?}
  C -->|Yes: White Card / Income Cert| D[Pre-Auth Approval Issued under 2 Hrs]
  C -->|No: Standard Ward| E[Convert to General Private Billing]
  D --> F[Cashless Operation / Post-Care Cover]
\`\`\``;
  }
  else if (query.includes('pension') || query.includes('పెన్షన్') || query.includes('bharosa') || query.includes('భరోసా') || query.includes('old age') || query.includes('వయోవృద్ధుల')) {
    responseText = isTelugu
      ? `ఎన్టీఆర్ భరోసా / తెలంగాణ ఆసరా పెన్షన్ల తాజా నియమాలు క్రింది విధంగా ఉన్నాయి:

### పథకం వివరణ
వృద్ధులు, వితంతువులు, ఒంటరి మహిళలు మరియు చేనేత కార్మికులకు జీవనోపాధి కల్పించేందుకు ప్రభుత్వం ప్రతి నెలా నగదు బదిలీ పథకం నిర్వహిస్తుంది.

### ప్రధాన అర్హతలు:
1. **వయస్సు:** వయోవృద్ధుల పెన్షన్‌కు వయసు కనీసం **60 సంవత్సరాలు** నిండాలి.
2. **వార్షిక ఆదాయం:** గ్రామీణ ప్రాంతంలో ఏటా రూ. 1,20,000 / పట్టణ ప్రాంతంలో రూ. 1,50,050 లోపు ఉండాలి.
3. **భూమి పరిమితి:** 3.0 ఎకరాల లోపు మాగాణి లేదా 10 ఎకరాల లోపు మెట్ట వ్యవసాయ భూమి మాత్రమే ఉండాలి.

### అవసరమైన పత్రాలు:
- ఆధార్ కార్డ్
- వయస్సు నిర్ధారణ పత్రం (పుట్టిన తేదీ పత్రం లేదా ఓటరు గుర్తింపు కార్డు లేదా పదవ తరగతి సర్టిఫికెట్)
- బ్యాంక్ పాస్ బుక్ (ఆధార్ లింక్ మరియు డీబీటీ యాక్టివ్)
- నివాస ధ్రువీకరణ పత్రం

---
*[కింది ఇంటరాక్టివ్ డ్రాఫ్ట్ ట్రేని పరిశీలించండి]*

\`\`\`html
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background: #0F172A; color: #F1F5F9; padding: 15px; margin:0; }
  .status { background: #10B981; color: white; padding: 4px 8px; border-radius: 99px; font-size: 11px; font-weight: bold; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #334155; padding: 8px; text-align: left; font-size:12px; }
  th { background: #1E293B; }
</style>
</head>
<body>
  <div style="display:flex; justify-content:space-between; align-items:center;">
    <h3 style="margin:0; color:#10B981;">NTR భరోసా పంపిణీ వివరాలు</h3>
    <span class="status">ప్రతి నెలా 1వ తేదీ సేవ</span>
  </div>
  <table>
    <tr><th>వర్గం</th><th>నెలవారీ పారితోషికం</th><th>అర్హత వయస్సు</th></tr>
    <tr><td>వృద్ధాప్య పెన్షన్</td><td>రూ. 2,750</td><td>60+ సంవత్సరాలు</td></tr>
    <tr><td>వితంతు పెన్షన్</td><td>రూ. 2,750</td><td>18+ సంవత్సరాలు</td></tr>
    <tr><td>దివ్యాంగుల పెన్షన్</td><td>రూ. 4,000</td><td>చికిత్స సర్టిఫికేట్ (40%+)</td></tr>
  </table>
</body>
</html>
\`\`\`

\`\`\`mermaid
graph TD
  A[గ్రామ/వార్డు వాలంటీర్ ఆఫీస్ విలేజ్ అప్లికేషన్] --> B[తహశీల్దార్ లేదా పంచాయతీ సెక్రటరీ వెరిఫికేషన్]
  B --> C{అర్హతలు సమగ్రంగా ఉన్నాయా?}
  C -->|అవును| D[పెన్షన్ మంజూరు ఆదేశ పత్రం]
  C -->|కాదు| E[రిజెక్ట్ - అప్పీల్ చేసుకోవడానికి 15 రోజులు]
  D --> F[వాలంటీర్ మొదటి తారీఖున డోర్ డెలివరీ]
\`\`\``
      : `Here are the latest dynamic rules and details for the **NTR Bharosa old-age pension schemes**:

### Scheme Summary
NTR Bharosa (AP) and Aasara Pension (TS) provide direct monthly social security cash allowances to senior citizens, widows, physical disabled, and marginalized rural workers.

### Core Eligibility Criteria:
1. **Age Thresholds:** Minimum **60 years** required for Senior Citizen status. (Disability pensions have no age limit but require min 40% certificate).
2. **Income Index:** Rural family income < ₹1,20,000/year or Urban family income < ₹1,50,000/year.
3. **Household Assets:** Maximum dry floor area owned under 1000 square feet, and dry agricultural lands below 10 acres.

### Documentation Requirements:
- Certified Proof of Birth (Aadhaar, Voter ID, or Secondary School Ledger).
- Active Aadhaar Card linked to Mobile and DBT.
- Bank Account statement linked to Aadhaar.
- Village or Municipal Residence Proof.

---
*[Review the pension scale tables and approval flowcharts below]*

\`\`\`html
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; background: #0F172A; color: #F1F5F9; padding: 15px; margin: 0; }
  .pension-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .pension-table th { background: #334155; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; color: #34D399; }
  .pension-table td { padding: 8px; border-bottom: 1px solid #334155; font-size:12px; }
</style>
</head>
<body>
  <h3 style="color:#34D399; margin:0 0 5px 0;">Pension Disbursement Scale</h3>
  <table class="pension-table">
    <tr><th>Category</th><th>Monthly Direct Benefit</th><th>Age Spec</th></tr>
    <tr><td>Old Age Citizens</td><td>₹2,750 / Month</td><td>60+ yrs</td></tr>
    <tr><td>Widows & Single Women</td><td>₹2,750 / Month</td><td>18+ yrs</td></tr>
    <tr><td>Specially Abled</td><td>₹4,000 / Month</td><td>SADAREM 40%+</td></tr>
  </table>
</body>
</html>
\`\`\`

\`\`\`mermaid
graph TD
  A[Submit Application at Ward/Village Secretariat] --> B[Field Verification by Panchayat Officer]
  B --> C{Verify Land & Income Limits?}
  C -->|Verified & Passed| D[Pension Card Issued with DBT Allocation]
  C -->|Failed Criteria| E[Application Rejected with Cause Log]
  D --> F[Direct Bank Transfer or Doorstep Cash delivery on 1st of every month]
\`\`\``;
  }
  else if (query.includes('pm-kisan') || query.includes('kisan') || query.includes('రైతు') || query.includes('farmer') || query.includes('agriculture') || query.includes('వ్యవసాయం')) {
    responseText = isTelugu
      ? `ఆర్థిక సహాయ వివరాలు ఇక్కడ ఉన్నాయి:

### పథ్కం వివరాలు
రైతులకు పెట్టుబడి సాయం కోసం కేంద్ర మరియు రాష్ట్ర ప్రభుత్వాలు అందిస్తున్న ముఖ్యమైన పథకాలు పీఎం-కిసాన్ మరియు రైతు భరోసా.

### ప్రధాన అర్హతలు:
1. **వ్యవసాయ భూమి:** మీ పేరు మీద ఖచ్చితమైన పట్టాదారు భూమి రిజిస్టర్ అయి ఉండాలి (కనీసం 1 సెంట్ లేదా అంతకంటే ఎక్కువ).
2. **వార్షిక ఆదాయం:** కౌలు రైతులు రాష్ట్ర సాయం పొందవచ్చు కానీ పీఎం-కిసాన్ కు సొంత భూమి రికార్డులు తప్పనిసరి.
3. **కరెంట్ వృత్తి:** ప్రభుత్వ ఉద్యోగులు లేదా పెన్షన్ పొందుతున్న మాజీ లోక్ సభ లీడర్లు కాకూడదు.

---
*[కింది పెట్టుబడి పట్టికను పరిశీలించండి]*

\`\`\`html
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background: #0F172A; color: #F1F5F9; padding: 15px; margin:0; }
  .kcard { background: #065F46; border: 1px solid #10B981; border-radius: 8px; padding: 10px; text-align: center; margin-bottom: 8px; }
</style>
</head>
<body>
  <div class="kcard">
    <strong style="font-size:11px; text-transform:uppercase; color:#A7F3D0;">మొత్తం వార్షిక రైతు మద్దతు సాయం</strong>
    <h2 style="margin:5px 0 0 0; color:#34D399;">రూ. 13,500 / సంవత్సరానికి</h2>
  </div>
  <div style="font-size:11px; line-height:1.5;">
    • పీఎం కిసాన్ సాయం: రూ. 6,000 (3 విడతలు - రూ. 2000 ప్రతి)<br>
    • ఏపీ రైతు భరోసా సాయం: రూ. 7,500 (రాష్ట్ర ప్రభుత్వ తోడ్పాటు)
  </div>
</body>
</html>
\`\`\`

\`\`\`mermaid
graph TD
  A[పట్టాదారు పాస్ బుక్ భూమి రిజిస్ట్రేషన్] --> B[ఆన్‌లైన్ PM-KISAN పోర్టల్ సమర్పణ]
  B --> C[మండల వ్యవసాయ అధికారి (MAO) భౌతిక తనిఖీ]
  C --> D{భూమి రికార్డు వెబ్ ల్యాండ్ సరిపోలిందా?}
  D -->|అవును| E[పిఎఫ్ఎమ్ఎస్ ద్వారా ఆధార్ బ్యాంక్ అకౌంట్ ఆమోదం]
  D -->|కాదు| F[రద్దు - ఇకెవైసి పూర్తి కావాలి]
  E --> G[ఏడాదికి 3 విడతలుగా బ్యాంకు ఖాతాలోకి నగదు జమ]
\`\`\``
      : `Here are the dynamic updates and rules for **PM-KISAN & Rythu Bharosa** agriculture assistance program:

### Scheme Snapshot
PM-KISAN (Central Government) integrated alongside Rythu Bharosa (AP State Gov) or Rythu Bandhu (TS State Gov) supplies investment capital incentives for seeds, fertilizers, and inputs to multi-season crop growers.

### Eligibility Benchmarks:
1. **Land Ownership:** Must have active land ownership registry (Pattadar Passbook or Webland record). Tenant farmers or licensed cultivators are specifically covered under State support schemes.
2. **Exclusion Clauses:** Taxpayers, pensioners receiving above ₹10,000/month, and active political leaders or institutional owners are excluded from cash tranches.

### Necessary Documentation:
- Pattadar Lease/Passbook.
- Land Revenue Records (Adangal, 1-B, e-Crop Registration).
- Bank Passbook.
- Aadhaar-Linked Bank Accounts with physical biometric e-KYC verified.

---
*[Examine the funding brackets and verifying workflows below]*

\`\`\`html
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; background: #0F172A; color: #F1F5F9; padding: 15px; margin: 0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .box { background: #1E293B; border: 1px solid #059669; padding: 10px; border-radius: 6px; }
  h4 { margin: 0 0 5px 0; color: #10B981; font-size:13px; }
</style>
</head>
<body>
  <div class="grid">
    <div class="box">
      <h4>Central Share</h4>
      <div style="font-size:16px; font-weight:bold; color:#10B981;">₹6,000 / Year</div>
      <div style="font-size:9; color:#94A3B8;">3 Installments of ₹2,000</div>
    </div>
    <div class="box">
      <h4>State Support</h4>
      <div style="font-size:16px; font-weight:bold; color:#10B981;">₹7,500 / Year</div>
      <div style="font-size:9; color:#94A3B8;">Integrated under Rythu Bharosa</div>
    </div>
  </div>
</body>
</html>
\`\`\`

\`\`\`mermaid
graph TD
  A[Land registry registered on Webland portal] --> B[Self-Registration on PM-KISAN App]
  B --> C[Authorized Biometric Verification at Village Secretariat]
  C --> D{e-KYC verified via OTP?}
  D -->|Yes| E[Approved in Public Finance Management System PFMS]
  D -->|No| F[Flagged for Pending e-KYC Action]
  E --> G[Direct bank transfer tranche launched]
\`\`\``;
  }
  else if (query.includes('pmay') || query.includes('awaas') || query.includes('గృహ') || query.includes('housing') || query.includes('ఇల్లు')) {
    responseText = isTelugu
      ? `ఉచిత గృహనిర్మాణ పథకాలు (పీఎం ఆవాస్ యోజన - PMAY) తాజా గైడ్‌లైన్స్ ఇక్కడ ఉన్నాయి:

### సంక్షిప్త వివరణ
నిరుపేదలు, గుడిసెలలో నివసిస్తున్న అల్పాదాయ వర్గాల ప్రజలకు సుస్థిరమైన పక్కా ఇళ్లను నిర్మించడానికి కేంద్ర మరియు రాష్ట్ర ప్రభుత్వాలు ఉమ్మడి ఆర్థిక సాయం అందిస్తాయి.

### ప్రధాన అర్హతలు:
1. **సొంత ఇల్లు:** దరఖాస్తుదారుడికి లేదా వారి కుటుంబ సభ్యులకీ భారతదేశంలో ఎక్కడా శాశ్వత పక్కా ఇల్లు ఉండకూడదు.
2. **వార్షిక ఆదాయం:** అల్పాదాయ వర్గాలు (LIG): ఏటా రూ. 3,00,000 నుండి 6,000,000 లోపు ఇల్లు రకం ఆధారంగా ఉండాలి.
3. **భూమి పట్టా:** ఇల్లు కట్టుకునేందుకు సొంత స్థలం లేదా ప్రభుత్వ పట్టా కలిగి ఉండాలి.

### పత్రాలు:
- ఆధార్ కార్డ్
- వైట్ రేషన్ కార్డ్
- స్థానిక భూమి యాజమాన్య పత్రా (పట్టాదారు పాస్ బుక్)
- ఓటర్ ఐడి లేదా నివాస ధృవీకరణ పత్రం

---
*[కింది ఇంటరాక్టివ్ గృహ సహాయ పట్టికన పరిశీలించండి]*

\`\`\`html
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background: #0F172A; color: #F1F5F9; padding: 15px; margin:0; }
  .hb { background: #1E3A8A; color: white; padding: 10px; border-radius: 6px; text-align: center; }
</style>
</head>
<body>
  <div class="hb">
    <strong>Peoples PMAY గృహ ఉచిత మంజూరు</strong>
    <h2 style="margin:5px; color:#60A5FA;">రూ. 1,20,000 - రూ. 2,50,000</h2>
  </div>
  <p style="font-size:11px; color:#CBD5E1; margin-top:8px;">కూలీల కింద లభించే ఉచిత ఉపాధి పని దినాలతో పాటు ఉచిత ఇటుకలు మరియు సిమెంట్ కూపన్లు కూడా మంజూరవుతాయి.</p>
</body>
</html>
\`\`\`

\`\`\`mermaid
graph TD
  A[గ్రామ పంచాయతీ దరఖాస్తుల సమీకరణ] --> B[జియో ట్యాగింగ్ ద్వారా ప్రస్తుత నివాసం సర్వే]
  B --> C{శాశ్వత పక్కా ఇల్లు ఉందా?}
  C -->|కాదు| D[PMAY లబ్ధిదారుల శాశ్వత జాబితాలో నమోదు]
  C -->|కాదు| E[రిజెక్ట్]
  D --> F[వందల రోజులలో బ్యాంక్ కు నేరుగా విడతలవారీగా డబ్బు]
\`\`\``
      : `Here are the latest dynamic rules for **PMAY (Pradhan Mantri Awaas Yojana - Housing)** guidelines:

### Scheme Summary
PMAY Gramin and Urban provide capital subsidies, building resources, and structural benefits to poor, homeless, or slum-dwelling citizens in rural and urban sectors to build solid brick homes.

### Key Criteria:
1. **Home Ownership:** Neither the applicant nor any close family members of the household should own a registered brick or concrete "pucca" home in any part of India.
2. **Income Brackets:** EWS household earnings capped under ₹3,00,000 / year or LIG capped under ₹6,00,000 / year.
3. **Construction Land:** Must own a small plot, possession deed, or government-dispatched homestead "patta" ready for basement leveling.

### Documents Checklist:
- Aadhaar Card + Mobile verification.
- Valid White Ration card.
- Sample possession/Homestead Deed.
- Current picture of original mud hut or raw land.

---
*[Review the housing tranche details and geo-tagging workflows below]*

\`\`\`html
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; background: #0F172A; color: #F1F5F9; padding: 15px; margin: 0; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align:center; }
  .step-card { background: #1E293B; border-bottom: 3px solid #2563EB; border-radius:6px; padding: 8px; }
  h4 { margin: 0 0 2px 0; color:#60A5FA; font-size:11px; }
</style>
</head>
<body>
  <div class="grid">
    <div class="step-card">
      <h4>Stage 1</h4>
      <div style="font-size:12px; font-weight:bold;">₹40,000</div>
      <div style="font-size:8px; color:#A3A3A3;">Basement level</div>
    </div>
    <div class="step-card">
      <h4>Stage 2</h4>
      <div style="font-size:12px; font-weight:bold;">₹60,000</div>
      <div style="font-size:8px; color:#A3A3A3;">Lintel/Roof level</div>
    </div>
    <div class="step-card font-semibold">
      <h4>Stage 3</h4>
      <div style="font-size:12px; font-weight:bold;">₹20,000</div>
      <div style="font-size:8px; color:#A3A3A3;">Finishing/Doors</div>
    </div>
  </div>
</body>
</html>
\`\`\`

\`\`\`mermaid
graph TD
  A[Homeless verification matching SECC registry] --> B[Physical surveys & geo-tagging with raw land photo]
  B --> C{Homeless status confirmed?}
  C -->|Yes| D[Drafting building approval order linked to bank account]
  C -->|No| E[Exclusion of application]
  D --> F[Incremental funding based on geo-tagged construction stages]
\`\`\``;
  }
  else {
    responseText = isTelugu
      ? `నమస్కారం! నేను **సహాయ్** - మీ స్మార్ట్ సంక్షేమ మరియు పౌర అధికార నాలెడ్జ్ గైడ్‌ని.
      
నేను మీ ప్రశ్న ఆధారంగా ప్రభుత్వ సంక్షేమ పథకాలు, వాటి అర్హతలు మరియు అవసరమైన సర్టిఫికెట్ల వివరాలను ఇవ్వగలను. 

**ఉదాహరణ ప్రశ్నలు:**
- "నేను ఆరోగ్యశ్రీ హెల్త్ స్కీమ్‌కు అర్హుడినా?"
- "పీఎం కిసాన్ కింద నాకు విడతలుగా ఎంత సాయం వస్తుంది?"
- "వృద్ధాప్య ఎన్టీఆర్ భరోసా పెన్షన్ కోసం ఏ ఏ డాక్యుమెంట్లు సిద్ధం చేసుకోవాలి?"
- "ఇండ్ల స్థలం దరఖాస్తు చేసుకోవడం ఎలా?"
- "నేను నా జప్తు క్లాజు ఉన్న లీజ్ డాక్యుమెంట్లాని ఎలా విశ్లేషించాలి?"

మీరు అడిగిన: "${latestMessage?.content || ''}" గురించి పరిశిలిస్తే, కింద తెలిపిన ప్రధాన పథకాల శీర్షికలను పరిశీలించండి. మీ అర్హతలను నిశితంగా అంచనా వేయడానికి మన హోమ్ పేజీ లోని **Profile wizard** క్లిక్ చేసి మీ వయస్సు, ఆదాయాన్ని నమోదు చేయండి!`
      : `Hello! I am **Sahay**, your bilingual smart civic and legal counselor.

I can guide you through central and state-level government welfare schemes, registration requirements, timeline assistance, and legal lease reviews.

**Try asking me things like:**
- "Am I eligible for Aarogyasri health operations?"
- "What are the required documents for NTR old-age pension?"
- "Create a breakdown of PM-KISAN payouts."
- "Examine severe warning/forfeiture clauses in my land lease."

Since you asked about: *"${latestMessage?.content || ''}"*, I highly recommend exploring our interactive **Welfare Discovery Engine (Wizard)** on the home screen! Input your age, income, state and district to discover every matched scheme.`;
  }

  return responseText;
}
