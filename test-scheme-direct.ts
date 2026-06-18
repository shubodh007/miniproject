import { generateContentWithRetryAndFallback } from './frontend/src/utils/gemini';
import { Type } from '@google/genai';

const prompt = `Analyze the following citizen of Andhra Pradesh, India and match them with welfare schemes.
        
Citizen Profile:
- Name: Jane
- Age: 45 years old
- Gender: Female
- Annual Household Income: ₹40,000
- Occupation: Farmer
- Owns Land: No
- Landowner vs Tenant Farmer: Tenant Farmer (Owns: No, CCRC: Yes)
- bpl_card status: Yes
- Caste Category: SC
- Sub Caste: None Specified
- District: Anantapur
- Mandal: Not Defined
- Habitation: Rural
- Student level: Other
- House type: Pucca (Owns house: No)
- Soil type: Other

Candidates from our local rule engine matching basic criteria:
[
  {
    "scheme_id": "AP-RYTHU-BHAROSA",
    "name_en": "YSR Rythu Bharosa",
    "name_te": "వైఎస్ఆర్ రైతు భరోసా",
    "ministry": "Agriculture & Farmers Welfare",
    "department": "Agriculture",
    "category": "Agriculture"
  }
]

Task:
Output a precise welfare recommendations list in English.
CRITICAL RULES:
1. Spatial Consistency Rule: Verify districts carefully. If State is Andhra Pradesh, never recommend Telangana-specific programs.
2. Tenant Farmer Rule: Under Telangana Rythu Bharosa/Rythu Bandhu, Tenant Farmers are strictly NOT eligible. Under AP Amma Vodi & Central PM-Kisan, tenant statuses do not block education/subsistence payouts.
3. For each scheme, provide customized translated name, ministry, department, and category.
4. Generate 2-3 logical bullet points explaining precisely WHY they qualify. Start reasons with "Your..." or "You are..." (in the selected language).
5. Also compile necessary documents in documents_required list.`;

import fs from 'fs';

(async () => {
    const start = Date.now();
    try {
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
        
        fs.writeFileSync('test-output.log', `Success! Time taken: ${Date.now() - start}ms\n` + response.text);
    } catch(e) {
        fs.writeFileSync('test-error.log', `Failed after ${Date.now() - start}ms\n` + e);
    }
})();
