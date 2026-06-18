import express from 'express';
import { runMatchEngine } from '../../utils/schemeEngine';
import { maskAadhaar } from '../../utils/security';
import { sessionCache } from '../../utils/sessionCache';
import { logger } from '../../utils/logger';
import { CitizenProfileSchema } from '../../utils/schemas';
import { generateContentWithRetryAndFallback, Type } from '../../utils/gemini';
import { analyzeLegalDocumentLocal, generateDynamicChatResponseLocal } from '../../utils/localReply';
import { ProfilePayload } from '../../types';

const router = express.Router();

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
      const response = await generateContentWithRetryAndFallback({
        contents: prompt,
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
    } catch (gemError: any) {
      logger.error('Gemini processing failed, utilizing rule engine fallback results', { error: gemError?.message || gemError });
    }

    // Direct fallback response with local rule checker engine results
    sessionCache.set(payload, matchedLocalSchemes);
    return res.json({
      search_id: Math.random().toString(36).substring(2, 9),
      total_found: matchedLocalSchemes.length,
      schemes: matchedLocalSchemes,
      summary_message: payload.language === 'te'
        ? `స్థానిక ఫలితాలు: మీ ప్రొఫైల్‌కు సరిపోయే ${matchedLocalSchemes.length} సంక్షేమ పథకాలు కనుగొనబడ్డాయి.`
        : `Match complete! Found ${matchedLocalSchemes.length} welfare schemes matching your profile.`
    });

  } catch (error: any) {
    logger.error('Error handling /match request', { error: error?.message || error });
    return res.status(error?.name === 'ZodError' ? 400 : 500).json({
      error: error?.message || 'Internal server error processing eligibility match.'
    });
  }
});

// Legal Document Analysis Endpoint
router.post('/legal/analyze', async (req, res) => {
  const { documentText, language } = req.body;
  if (!documentText) {
    logger.warn('Received legal analysis request with empty documentText');
    return res.status(400).json({ error: 'Please provide documentText for analysis.' });
  }

  try {
    const prompt = `
      Analyze this Indian legal document / agreement (e.g. rent lease, land deed) for a citizen of Andhra Pradesh or Telangana.
      Find unfair clauses, severe penalty rates, hidden traps, unreasonable liabilities, or unneutral arbitration rules.
      
      Document Content:
      ${documentText}
      
      Generate the analysis output strictly in ${language === 'te' ? 'Telugu' : 'English'} mode.
      Provide:
      1. A safety health score (0 to 100, where 100 is perfectly safe and 0 is extremely malicious).
      2. A safety letter grade (A, B, C, D, or F).
      3. A list of flagged items containing severity (CRITICAL, WARNING, or NOTICE), clause reference, excerpt quote, why it is risky, recommended action, and legal basis.
    `;

    logger.info('Evaluating legal document risk using Gemini model');
    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        systemInstruction: 'You are an elite Indian legal risk analyzer. Output ONLY a valid JSON object matching the requested schema. Never include preamble or surrounding markdown text.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            health_score: { type: Type.INTEGER },
            health_grade: { type: Type.STRING },
            overall_risk: { type: Type.STRING },
            flags: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  clause_ref: { type: Type.STRING },
                  excerpt: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                  legal_basis: { type: Type.STRING }
                },
                required: ['id', 'severity', 'clause_ref', 'excerpt', 'explanation', 'recommendation', 'legal_basis']
              }
            }
          },
          required: ['health_score', 'health_grade', 'overall_risk', 'flags']
        }
      }
    });

    if (response && response.text) {
      const parsed = JSON.parse(response.text.trim());
      logger.info(`Legal review successfully generated health score: ${parsed.health_score}`);
      return res.json(parsed);
    }
  } catch (err: any) {
    logger.error('Gemini legal analysis error, fallback to mock ruleset', { error: err?.message || err });
  }

  // Pure dynamic fallback checking
  const analysisResult = analyzeLegalDocumentLocal(documentText, language || 'en');
  return res.json(analysisResult);
});

// Chat Session Endpoint
router.post('/chat', async (req, res) => {
  const { messages, language } = req.body;
  if (!messages || !Array.isArray(messages)) {
    logger.warn('Received invalid messages parameters for /chat API');
    return res.status(400).json({ error: 'Please provide messages array.' });
  }

  try {
    const activeThread = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    logger.info(`Sending ${messages.length} thread message turn to Sahay`);
    const response = await generateContentWithRetryAndFallback({
      contents: activeThread as any,
      config: {
        systemInstruction: `You are Sahay, an elite Indian civics counsel and village welfare guide. 
        Provide short, helpful answers regarding central and state government schemes in ${language === 'te' ? 'Telugu' : 'English'}.
        If appropriate, you can output formatted listings or citations where applicable.`
      }
    });

    if (response && response.text) {
      return res.json({
        response: response.text
      });
    }
  } catch (chatErr: any) {
    logger.error('Gemini chat evaluation error, performing local query search fallback', { error: chatErr?.message || chatErr });
  }

  const dynamicReply = generateDynamicChatResponseLocal(messages, language || 'en');
  return res.json({
    response: dynamicReply
  });
});

export default router;
