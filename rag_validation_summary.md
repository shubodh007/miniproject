
# Executive RAG QA Evaluation Summary Report

## 📊 High-Level Metrics Summary
| Metric | Score | Industry Benchmarks | Status |
| :--- | :---: | :---: | :--- |
| **Retrieval Precision** | `76.0%` | `>= 75.0%` | 🟢 Pass |
| **Retrieval Recall** | `76.0%` | `>= 85.0%` | 🔴 Needs Attention |
| **Citation Fidelity** | `100.0%` | `>= 90.0%` | 🟢 Pass |
| **Grounding Quality (Anti-Hallucination)** | `100.0%` | `>= 95.0%` | 🟢 Pass |

### 🛠️ FINAL RAG SYSTEM QUALITY SCORE: `100 / 100`

---

## 🚩 Operational Integrity Flags & Anomalies
- **Wrong Chunk Retrieved**: `4`
- **No Chunk Retrieved**: `6`
- **Hallucinations Detected**: `0`
- **Citation Mismatches**: `0`

---

## 📌 Query Inferences Ledger (25 Welfare Questions)

### 1. Query: "What is the annual benefit amount for PM-KISAN?"
- **Language**: `EN`
- **Target Scheme**: *PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)*
- **Averages**: Precision: `0%` | Recall: `0%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > I cannot answer this question based on the retrieved context.
- **Auditor Verification Note**: *None of the retrieved sources relate to the PM-KISAN scheme; they all pertain to Telangana Rythu Bharosa and PMAY-Gramin.*
- ⚠️ **Anomalies Detected**: `Wrong Chunk` `No Chunk` 


### 2. Query: "PM-KISAN కి సంవత్సరానికి ఎంత అమౌంట్ వస్తుంది?"
- **Language**: `TE`
- **Target Scheme**: *PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)*
- **Averages**: Precision: `0%` | Recall: `0%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > I cannot answer this question based on the retrieved context.
- **Auditor Verification Note**: *The retrieved chunks are completely unrelated to the PM-KISAN scheme, containing information about Telangana Rythu Bharosa and AP Aarogyasri instead.*
- ⚠️ **Anomalies Detected**: `Wrong Chunk` `No Chunk` 


### 3. Query: "PM-KISAN installment duration and frequency"
- **Language**: `EN`
- **Target Scheme**: *PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)*
- **Averages**: Precision: `0%` | Recall: `0%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > I cannot answer this question based on the retrieved context.
- **Auditor Verification Note**: *The retrieved chunks only cover Telangana Rythu Bharosa and PMAY-Gramin, leaving PM-KISAN completely unaddressed.*
- ⚠️ **Anomalies Detected**: `Wrong Chunk` `No Chunk` 


### 4. Query: "What are the eligibility guidelines for AP NTR Bharosa Pension?"
- **Language**: `EN`
- **Target Scheme**: *NTR Bharosa Pension*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > To be eligible for the NTR Bharosa Pension in Andhra Pradesh, applicants must meet the following criteria:
  > - Age: Must be between 60 and 110 years old [Source 2].
  > - Income: Maximum annual income must not exceed Rs. 1,20,000 [Source 2].
  > - Residency: Must be a resident of Andhra Pradesh and a state resident [Source 2].
  > - Land: There is no requirement for land ownership (requires_land: false) [Source 2].
  > 
  > The pension program covers vulnerable classes including senior citizens (Old Age Pensioners), widows, single women, disabled individuals, and weavers [Source 1]. Required credentials for registration include an Aadhaar Card, Age Proof (Birth Certificate or school registration), Mandal Income validation card, and active local Residential certificate or voter list proof [Source 3].
- **Auditor Verification Note**: *All retrieved chunks are highly relevant to NTR Bharosa Pension eligibility, containing specific threshold rules, eligible categories, and required credentials.*
- ✅ **Passed All Quality Thresholds**


### 5. Query: "NTR Bharosa Pension వయస్సు పరిమితి ఎంత?"
- **Language**: `TE`
- **Target Scheme**: *NTR Bharosa Pension*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > NTR భరోసా పింఛను పథకానికి అర్హత సాధించడానికి వయస్సు పరిమితి కనీసం 60 సంవత్సరాలు (min_age: 60) మరియు గరిష్టంగా 110 సంవత్సరాలు (max_age: 110) ఉండాలి [Source 1].
- **Auditor Verification Note**: *Source 1 directly details the age limits (min age 60, max age 110), while the other chunks provide valid context for the NTR Bharosa scheme.*
- ✅ **Passed All Quality Thresholds**


### 6. Query: "AP NTR Bharosa Pension eligibility for disabled members"
- **Language**: `MIXED`
- **Target Scheme**: *NTR Bharosa Pension*
- **Averages**: Precision: `100%` | Recall: `0%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > Based on the retrieved context, the NTR Bharosa Pension program covers vulnerable classes, including disabled individuals [Source 1]. While general registration requirements include an Aadhaar Card, Age Proof, Mandal Income validation card, and local Residential certificate or voter list proof [Source 3], the specific eligibility rules governing physically disabled persons (such as disability percentage) are not detailed in the retrieved context.
- **Auditor Verification Note**: *The chunks belong to the correct scheme but miss specific eligibility rules/criteria for physically disabled persons.*
- ⚠️ **Anomalies Detected**: `No Chunk` 


### 7. Query: "Who is eligible for Jagananna Amma Vodi in Andhra Pradesh?"
- **Language**: `EN`
- **Target Scheme**: *Jagananna Amma Vodi*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > To be eligible for the Jagananna Amma Vodi scheme in Andhra Pradesh, a mother must be from a poor and vulnerable family sending her children to recognized schools from Class 1st to Intermediate (Class 12) [Source 1]. Key eligibility criteria include: the child must be between 5 and 18 years old, have a minimum school attendance of 75%, and the household must have a maximum income of Rs. 144,000 and electricity consumption under 300 units/month [Source 3]. Government employees are excluded [Source 3]. Required documents include the mother's and child's Aadhaar cards, a BPL White Rice Card, a school study certificate with 75% attendance, and an Aadhaar-linked bank passbook [Source 2].
- **Auditor Verification Note**: *Excellent retrieval. All chunks are highly relevant and perfectly answer the user's query.*
- ✅ **Passed All Quality Thresholds**


### 8. Query: "Amma Vodi scheme rules for school attendance"
- **Language**: `EN`
- **Target Scheme**: *Jagananna Amma Vodi*
- **Averages**: Precision: `67%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > Under the Jagananna Amma Vodi scheme, the school attendance rule requires a child to maintain a minimum school attendance of 75% [Source 2]. To register, a School Study Certificate verifying this 75% attendance is required [Source 1].
- **Auditor Verification Note**: *Source 1 and 2 directly address the 75% school attendance requirement. Source 3 describes the welfare benefit amount (Rs. 15,000) which is not directly relevant to attendance rules.*
- ✅ **Passed All Quality Thresholds**


### 9. Query: "Amma Vodi పథకానికి కావలసిన పత్రాలు ఏమిటి?"
- **Language**: `TE`
- **Target Scheme**: *Jagananna Amma Vodi*
- **Averages**: Precision: `33%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > జగనన్న అమ్మ ఒడి పథకానికి కావలసిన పత్రాలు [Source 1]:
  > - తల్లి ఆధార్ కార్డు
  > - విద్యార్థి ఆధార్ కార్డు
  > - బిపిఎల్ రైస్ కార్డ్ (వైట్ రేషన్ కార్డు)
  > - పాఠశాల 75 శాతం హాజరు ధ్రువీకరణ పత్రం
  > - బ్యాంక్ ఖాతా వివరాలు
- **Auditor Verification Note**: *Only Source 1 directly lists the required documents. Source 2 is a general description of Amma Vodi. Source 3 is completely unrelated as it lists registration documents for the NTR Bharosa Pension scheme.*
- ⚠️ **Anomalies Detected**: `Wrong Chunk` 


### 10. Query: "Under AP Kalyana Lakshmi, what is the financial assistance amount?"
- **Language**: `EN`
- **Target Scheme**: *Kalyana Lakshmi / Shaadi Mubarak (AP)*
- **Averages**: Precision: `67%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > Under the AP Kalyana Lakshmi / Shaadi Mubarak scheme, the financial assistance provided is a one-time cash relief support of Rs. 75,116, which is transferred directly into the bride's verified bank account [Source 2]. (Note: Source 3 refers to the Telangana variant of the scheme, which offers Rs. 1,01,116).
- **Auditor Verification Note**: *Source 2 correctly provides the AP financial assistance amount (Rs. 75,116). Source 3 belongs to the Telangana version of the scheme (Rs. 1,01,116) and is technically a mismatched state context, but precision is high enough to answer the AP-specific query.*
- ✅ **Passed All Quality Thresholds**


### 11. Query: "Kalyana Lakshmi Telangana eligibility criteria for marriage help"
- **Language**: `EN`
- **Target Scheme**: *Kalyana Lakshmi / Shaadi Mubarak (Telangana)*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > Under the Kalyana Lakshmi / Shaadi Mubarak scheme in Telangana, the eligibility criteria require the bride to have a minimum age of 18 years (up to 110 years), the family to have a maximum annual income of Rs. 2,00,000, and the beneficiary to be a female residing in Telangana [Source 1]. Eligible applicants receive a direct financial assistance gift of Rs. 101,116 deposited into the bride's mother's or the bride's active bank account [Source 2]. Registration requires documents such as Aadhaar cards of the bride and mother, official caste verification certificate, income certificate from a legal Tehsildar, wedding invitation card with photos, and a photocopy of the mother's bank book [Source 3].
- **Auditor Verification Note**: *All retrieved chunks are highly relevant. Source 1 provides the specific logical criteria, Source 2 details the benefits, and Source 3 lists the necessary documents.*
- ✅ **Passed All Quality Thresholds**


### 12. Query: "Shaadi Mubarak scheme Telangana income limits"
- **Language**: `EN`
- **Target Scheme**: *Kalyana Lakshmi / Shaadi Mubarak (Telangana)*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > Under the Shaadi Mubarak (Telangana) scheme, the maximum annual household income limit allowed for eligibility is Rs. 2,00,000 [Source 2]. To apply, an Income Certificate from a legal Tehsildar must be submitted [Source 3].
- **Auditor Verification Note**: *Source 2 directly provides the exact maximum income threshold (Rs. 200,000) for eligibility, and Source 3 details the required Income Certificate.*
- ✅ **Passed All Quality Thresholds**


### 13. Query: "Kalyana Lakshmi apply చేయడానికి ఏ డాక్యుమెంట్లు కావాలి?"
- **Language**: `MIXED`
- **Target Scheme**: *Kalyana Lakshmi / Shaadi Mubarak (Telangana)*
- **Averages**: Precision: `33%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > తెలంగాణ కళ్యాణ లక్ష్మి పథకానికి దరఖాస్తు చేయడానికి క్రింది పత్రాలు అవసరం [Source 1]:
  > - వధువు మరియు తల్లి ఆధార్ కార్డులు
  > - కుల ధృవీకరణ పత్రం
  > - తహశీల్దార్ జారీ చేసిన ఆదాయ ధ్రువీకరణ పత్రం
  > - లగ్నపత్రిక మరియు వివాహ ఫోటోలు
  > - తల్లి బ్యాంక్ పాస్ బుక్ జిరాక్స్ కాపీ
  > 
  > (In English: The required documents are the Aadhaar Cards of Bride and Mother, Official Caste Verification Certificate, Income Certificate from legal Tehsildar, Wedding invitation card with wedding photos, and Mother's bank book photocopy [Source 1]).
- **Auditor Verification Note**: *Only Source 1 is relevant as it details the Telangana Kalyana Lakshmi documents. Source 2 belongs to the Andhra Pradesh (AP) variant, and Source 3 is for Aarogyasri Health Scheme, making precision low but recall high as Source 1 is sufficient.*
- ✅ **Passed All Quality Thresholds**


### 14. Query: "What are the benefits under Gruha Jyothi Free Electricity scheme in Telangana?"
- **Language**: `EN`
- **Target Scheme**: *Gruha Jyothi Free Electricity (Telangana)*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > Under the Gruha Jyothi Free Electricity scheme in Telangana, eligible households consuming less than 200 units of electricity a month are fully exempt from electricity bill payments, receiving a free zero-electricity bill [Source 1, Source 2].
- **Auditor Verification Note**: *Sources 1 and 2 directly confirm the zero-electricity bill benefits up to 200 units of consumption, and Source 3 lists the corresponding application documents.*
- ✅ **Passed All Quality Thresholds**


### 15. Query: "Gruha Jyothi scheme unit consumption limit"
- **Language**: `EN`
- **Target Scheme**: *Gruha Jyothi Free Electricity (Telangana)*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > The monthly consumption limit for the Gruha Jyothi Free Electricity scheme in Telangana is 200 units [Source 3]. Households consuming less than or up to 200 units a month are fully exempt from bill payments and receive zero-electricity bill benefits [Source 1, Source 2].
- **Auditor Verification Note**: *All three sources accurately state the consumption threshold limit of 200 units per month.*
- ✅ **Passed All Quality Thresholds**


### 16. Query: "తెలంగాణ గృహ జ్యోతి స్కీమ్ ఉచిత విద్యుత్ పరిమితి ఎంత?"
- **Language**: `TE`
- **Target Scheme**: *Gruha Jyothi Free Electricity (Telangana)*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > తెలంగాణ గృహ జ్యోతి పథకం ద్వారా ప్రతి నెలా 200 యూనిట్ల వరకు ఉచిత గృహ విద్యుత్తు ప్రయోజనాన్ని అర్హులైన కుటుంబాలకు అందజేస్తారు [Source 1] [Source 2]. ఈ పథకం యొక్క నెలవారీ వినియోగ పరిమితి 200 యూనిట్లుగా నిర్ణయించబడింది [Source 3].
- **Auditor Verification Note**: *All sources are highly relevant and perfectly confirm the 200 units threshold for the Telangana Gruha Jyothi scheme.*
- ✅ **Passed All Quality Thresholds**


### 17. Query: "AP Aarogyasri health coverage benefit list"
- **Language**: `EN`
- **Target Scheme**: *AP Aarogyasri Health Care Trust*
- **Averages**: Precision: `67%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > Under the AP Aarogyasri Health Care Trust, families receive cashless medical treatment coverage up to Rs. 15,00,000 (Rs. 15 lakhs) per year, covering more than 2,000 health ailments [Source 1]. This comprehensive program covers standard, super-specialty, surgical, and therapeutic procedures [Source 2].
- **Auditor Verification Note**: *Sources 1 and 2 accurately answer the query regarding benefits. Source 3 is irrelevant as it covers registration documents rather than medical coverage benefits.*
- ✅ **Passed All Quality Thresholds**


### 18. Query: "AP Aarogyasri application medical threshold values"
- **Language**: `EN`
- **Target Scheme**: *AP Aarogyasri Health Care Trust*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > The application threshold values for the AP Aarogyasri Health Care Trust require that the applicant's maximum annual income is Rs. 500,000 and they must be a BPL cardholder [Source 2]. The scheme offers up to Rs. 15,000,000 per family per year in cashless medical treatment coverage [Source 1] for low and middle-income families [Source 3].
- **Auditor Verification Note**: *All three sources are relevant, with Source 2 directly addressing the eligibility threshold criteria (income limits and BPL card requirement).*
- ✅ **Passed All Quality Thresholds**


### 19. Query: "తెలంగాణ ఆరోగ్యశ్రీ పథకం కింద ఎంత వరకు ఉచిత వైద్యం లభిస్తుంది?"
- **Language**: `TE`
- **Target Scheme**: *Telangana Aarogyasri Health Scheme*
- **Averages**: Precision: `67%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > తెలంగాణ ఆరోగ్యశ్రీ పథకం కింద అర్హులైన ప్రతి కుటుంబానికి ఏటా రూ. 10 లక్షల (Rs. 1,000,000) వరకు ఉచిత క్యాష్‌ లెస్ కార్పొరేట్ వైద్య బీమా రక్షణ లభిస్తుంది [Source 2]. ఈ పథకం ద్వారా ఆర్థికంగా వెనుకబడిన కుటుంబాలకు గుర్తింపు పొందిన కార్పొరేట్ ఆసుపత్రులలో ఉచిత శస్త్రచికిత్సలు మరియు దీర్ఘకాలిక చికిత్సలు అందుతాయి [Source 1].
- **Auditor Verification Note**: *Sources 1 and 2 contain the correct facts for the Telangana scheme, while Source 3 is irrelevant as it belongs to the AP Aarogyasri scheme.*
- ✅ **Passed All Quality Thresholds**


### 20. Query: "Telangana Aarogyasri cards download online requirements"
- **Language**: `MIXED`
- **Target Scheme**: *Telangana Aarogyasri Health Scheme*
- **Averages**: Precision: `67%` | Recall: `0%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > I cannot answer this question based on the retrieved context.
- **Auditor Verification Note**: *The retrieved sources list registration documents and eligibility parameters but contain no details about online card download procedures.*
- ⚠️ **Anomalies Detected**: `No Chunk` 


### 21. Query: "What is the assistance amount for Telangana Rythu Bharosa?"
- **Language**: `EN`
- **Target Scheme**: *Telangana Rythu Bharosa (formerly Rythu Bandhu)*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > Under the Telangana Rythu Bharosa (formerly Rythu Bandhu) scheme, eligible landholders and tenant farmers receive financial assistance of Rs. 12,000 per acre per year [Source 1]. This investment support assists farmers with expenses related to seeds, fertilizer, pesticides, and overall farm development [Source 2].
- **Auditor Verification Note**: *All retrieved chunks are relevant to the scheme. Source 1 explicitly states the exact financial support amount of Rs. 12,000 per acre per year.*
- ✅ **Passed All Quality Thresholds**


### 22. Query: "Rythu Bharosa land ownership limits for Telangana farmers"
- **Language**: `EN`
- **Target Scheme**: *Telangana Rythu Bharosa (formerly Rythu Bandhu)*
- **Averages**: Precision: `100%` | Recall: `0%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > The retrieved sources establish that eligibility for the Telangana Rythu Bharosa scheme requires owning land ("requires_land": true) and possessing a Pattadar Passbook or tenant cultivation CRCC Agreement [Source 2, Source 3]. However, the provided text does not specify any explicit maximum or minimum land acreage limits for participating farmers.
- **Auditor Verification Note**: *The retrieval captured land-holding requirements (requires_land, Pattadar Passbook), but failed to fetch explicit landholding size limit details (e.g., maximum acreage caps), if any exist.*
- ⚠️ **Anomalies Detected**: `No Chunk` 


### 23. Query: "తెలంగాణ రైతు భరోసా పథకం అర్హతలు ఏమిటి?"
- **Language**: `TE`
- **Target Scheme**: *Telangana Rythu Bharosa (formerly Rythu Bandhu)*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > తెలంగాణ రైతు భరోసా పథకం అర్హత నిబంధనల ప్రకారం, దరఖాస్తుదారులకు వ్యవసాయ భూమి ఉండాలి, కనీస వయస్సు 18 సంవత్సరాలు నిండి ఉండాలి మరియు పట్టాదారు పాస్ పుస్తకం కలిగి ఉండాలి [Source 2]. ఈ పథకంలో నమోదు చేసుకోవడానికి పట్టాదారు పాస్ పుస్తకం లేదా కౌలు రైతు సాగు ఒప్పందపత్రం (CRCC Agreement), ఆధార్ కార్డు, బ్యాంక్ ఖాతా వివరాలు మరియు గిరిజన రైతులకు అటవీ హక్కుల ధృవీకరణ పత్రం అవసరమవుతాయి [Source 3].
- **Auditor Verification Note**: *The retrieved chunks provide comprehensive eligibility parameters and required documents to fully answer the query in Telugu.*
- ✅ **Passed All Quality Thresholds**


### 24. Query: "PMAY-Gramin financial help for house construction"
- **Language**: `EN`
- **Target Scheme**: *PMAY-Gramin (Pradhan Mantri Awaas Yojana - Rural)*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > Under PMAY-Gramin, beneficiaries receive direct financial support of Rs. 120,000 (Rs. 1.20 lakh) for constructing a pucca house in rural areas [Source 1, Source 2]. Additionally, this support is supplemented with toilet construction assistance through Swachh Bharat and linked employment labor support under the rural employment scheme [Source 1].
- **Auditor Verification Note**: *Retrieval was highly precise and successfully fetched the direct financial support details (Rs. 1.20 lakh) and associated benefits.*
- ✅ **Passed All Quality Thresholds**


### 25. Query: "PMAY-G illu కట్టుకోవడానికి ఎంత సాయం ఇస్తారు?"
- **Language**: `MIXED`
- **Target Scheme**: *PMAY-Gramin (Pradhan Mantri Awaas Yojana - Rural)*
- **Averages**: Precision: `100%` | Recall: `100%` | Grounding: `100%`
- **Citations**: Fidelity: `100%`
- **Grounded Answer**:
  > PMAY-Gramin (పీఎం ఆవాస్ యోజన - గ్రామీణ్) పథకం ద్వారా గ్రామీణ ప్రాంతాల్లో నివసించే పేదలకు ఇల్లు కట్టుకోవడానికి రూ. 1.20 లక్షల (Rs. 120,000) ఆర్థిక సహాయం అందించబడుతుంది [Source 1, Source 2]. దీనితో పాటు స్వచ్ఛ భారత్ పథకం ద్వారా మరుగుదొడ్డి నిర్మాణ సహాయం మరియు ఉపాధి హామీ పథకంతో అనుసంధానించబడిన శ్రామిక సహాయం లభిస్తుంది [Source 2].
- **Auditor Verification Note**: *The chunks perfectly support the bilingual query, verifying the Rs. 1.20 lakh financial assistance in both Telugu and English.*
- ✅ **Passed All Quality Thresholds**

