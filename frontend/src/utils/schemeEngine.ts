import { ProfilePayload, SchemeResult } from '../types';
import freshSchemes from './fresh_schemes_mapped.json';

export const DISTRICT_GEO_LIMITS: Record<string, { Rural: number; Urban: number }> = {
  // Andhra Pradesh Districts
  'Anantapur': { Rural: 120000, Urban: 144000 },
  'Chittoor': { Rural: 120000, Urban: 144000 },
  'East Godavari': { Rural: 125000, Urban: 150000 },
  'Guntur': { Rural: 130000, Urban: 160000 },
  'Krishna': { Rural: 130000, Urban: 160000 },
  'Kurnool': { Rural: 120000, Urban: 144000 },
  'Prakasam': { Rural: 120000, Urban: 144000 },
  'Srikakulam': { Rural: 110000, Urban: 135000 },
  'Nellore': { Rural: 125000, Urban: 150000 },
  'Visakhapatnam': { Rural: 140000, Urban: 180000 },
  'Vizianagaram': { Rural: 110000, Urban: 135000 },
  'West Godavari': { Rural: 125000, Urban: 150000 },
  'YSR Kadapa': { Rural: 120000, Urban: 144000 },

  // Telangana Districts
  'Adilabad': { Rural: 115000, Urban: 140000 },
  'Bhadradri Kothagudem': { Rural: 120000, Urban: 144000 },
  'Hyderabad': { Rural: 160000, Urban: 240000 },
  'Jagtial': { Rural: 120000, Urban: 144000 },
  'Jangaon': { Rural: 120000, Urban: 144000 },
  'Jayashankar Bhupalpally': { Rural: 115000, Urban: 140000 },
  'Jogulamba Gadwal': { Rural: 120000, Urban: 144000 },
  'Kamareddy': { Rural: 120000, Urban: 144000 },
  'Karimnagar': { Rural: 130000, Urban: 160000 },
  'Khammam': { Rural: 125000, Urban: 150000 },
  'Kumuram Bheem Asifabad': { Rural: 110000, Urban: 135000 },
  'Mahabubabad': { Rural: 115000, Urban: 140000 },
  'Mahabubnagar': { Rural: 120000, Urban: 144000 },
  'Mancherial': { Rural: 120000, Urban: 144000 },
  'Medak': { Rural: 120000, Urban: 144000 },
  'Medchal-Malkajgiri': { Rural: 150000, Urban: 200000 },
  'Mulugu': { Rural: 110000, Urban: 135000 },
  'Nagarkurnool': { Rural: 120000, Urban: 144000 },
  'Nalgonda': { Rural: 125000, Urban: 150000 },
  'Narayanpet': { Rural: 115000, Urban: 140000 },
  'Nirmal': { Rural: 120000, Urban: 144000 },
  'Nizamabad': { Rural: 125000, Urban: 150000 },
  'Peddapalli': { Rural: 120000, Urban: 144000 },
  'Rajanna Sircilla': { Rural: 120000, Urban: 144000 },
  'Rangareddy': { Rural: 150000, Urban: 210000 },
  'Sangareddy': { Rural: 130000, Urban: 170000 },
  'Siddipet': { Rural: 125000, Urban: 150000 },
  'Suryapet': { Rural: 120000, Urban: 144000 },
  'Vikarabad': { Rural: 120000, Urban: 144000 },
  'Wanaparthy': { Rural: 120000, Urban: 144000 },
  'Warangal Rural': { Rural: 120000, Urban: 144000 },
  'Warangal Urban': { Rural: 130000, Urban: 165000 },
  'Yadadri Bhuvanagiri': { Rural: 125000, Urban: 150000 },
};

export const SEED_SCHEMES = freshSchemes as any[];

/**
 * Replace flat income limits with a geographic offset map for rural and urban categories per district.
 */
export function getSchemeIncomeLimit(schemeId: string, defaultMaxIncome: number, district: string, habitation: string = 'Rural'): number {
  const geo = DISTRICT_GEO_LIMITS[district] || { Rural: 120000, Urban: 144000 };
  const geoBase = habitation === 'Urban' ? geo.Urban : geo.Rural;

  switch (schemeId) {
    case 'talliki-vandanam-007':
    case 'thalliki-vandanam-scheme-mother-s-salute-052':
      return habitation === 'Urban' ? geo.Urban : geo.Rural;
    case 'ntr-bharosa-005':
    case 'ntr-bharosa-pension-scheme-051':
      return geoBase * 0.9;
    case 'ntr-aarogyasri-002':
    case 'tg-aarogyasri-002':
    case 'ap-aarogyasri-community-health-insurance-continued-076':
      return geoBase * 3.5;
    case 'chandranna-pelli-kanuka-004':
    case 'tg-kalyana-lakshmi-004':
    case 'chandranna-pelli-kanuka-scheme-058':
    case 'kalyana-lakshmi-scheme-037':
      return geoBase * 1.5;
    case 'tg-grupajyothi-006':
    case 'gruha-jyothi-scheme-045':
      return geoBase * 1.8;
    case 'pmay-003':
    case 'pradhan-mantri-awaas-yojana-gramin-pmay-g-007':
    case 'pradhan-mantri-awaas-yojana-urban-pmay-u-008':
    case 'ntr-housing-scheme-056':
    case 'indiramma-indlu-housing-scheme-044':
      return geoBase * 2.0;
    default:
      // Farmer schemes (PM-Kisan, Rythu Bharosa) have high flat exclusion limits (no hard local cap unless extremely rich)
      return defaultMaxIncome;
  }
}

export function runMatchEngine(profile: ProfilePayload): SchemeResult[] {
  const matches: SchemeResult[] = [];
  if (!profile) return matches;

  const userDistrict = profile.district || 'Anantapur';
  const userHabitation = profile.habitation || 'Rural';

  for (const item of SEED_SCHEMES) {
    // 1. Filter by State
    if (!item.states.includes(profile.state)) {
      continue;
    }

    // 2. Filter by Age
    if (profile.age < item.min_age || profile.age > item.max_age) {
      continue;
    }

    // 3. Filter by Geographically-Offset Income Limit
    const dynamicIncomeCap = getSchemeIncomeLimit(item.scheme_id, item.max_income, userDistrict, userHabitation);
    if (profile.income_annual > dynamicIncomeCap) {
      continue;
    }

    // 4. Filter by Land Requirement (with Tenant Farmer & CCRC check)
    if (item.requires_land) {
      const ownsLand = !!profile.land_acres && profile.land_acres > 0;
      const isEligibleTenant = !!profile.isTenantFarmer && !!profile.hasCCRC;
      if (!ownsLand && !isEligibleTenant) {
        continue;
      }
    }

    // 5. Filter by Gender
    if ((item as any).female_only && profile.gender?.toLowerCase() === 'male') {
      continue;
    }

    // 6. Filter by Caste
    const cleanUserCaste = profile.caste_category === 'OBC' ? 'BC' : profile.caste_category;
    const cleanSchemeCastes = item.castes.map((c: string) => c === 'OBC' ? 'BC' : c);
    if (!cleanSchemeCastes.includes(cleanUserCaste)) {
      continue;
    }

    // Construct eligibility explanation bullet points dynamically based on language
    const eligibility_reasons: string[] = [];

    const incomeCap = getSchemeIncomeLimit(item.scheme_id, item.max_income, userDistrict, userHabitation);

    if (profile.language === 'te') {
      eligibility_reasons.push(`మీరు ${profile.state} శాశ్వత నివాసి.`);
      eligibility_reasons.push(`మీ వయస్సు ${profile.age} సంవత్సరాలు, ఇది ${item.min_age}-${item.max_age} సంవత్సరాల పరిధిలో ఉంది.`);
      eligibility_reasons.push(`మీ వార్షిక కుటుంబ ఆదాయం ₹ ${profile.income_annual.toLocaleString('en-IN')}, ఇది గరిష్ట పరిమితి ₹ ${incomeCap.toLocaleString('en-IN')} లోపలే ఉంది.`);
      
      if (item.requires_land) {
        if (profile.isTenantFarmer && profile.hasCCRC) {
          eligibility_reasons.push(`మీరు CCRC కార్డ్ ఒప్పందం గల కౌలు రైతు.`);
        } else {
          eligibility_reasons.push(`మీ వద్ద వ్యవసాయ భూమి (${profile.land_acres || 0} ఎకరాలు) ఉంది.`);
        }
      }
      if (profile.caste_category !== 'General') {
        eligibility_reasons.push(`మీరు ${profile.caste_category} వర్గానికి సంబంధించి అర్హత కలిగి ఉన్నారు.`);
      }
    } else {
      eligibility_reasons.push(`You are a permanent resident of ${profile.state}.`);
      eligibility_reasons.push(`Your age is ${profile.age} years which fits in the eligible range of ${item.min_age}-${item.max_age} years.`);
      eligibility_reasons.push(`Your household income of ₹${profile.income_annual.toLocaleString('en-IN')} is below the ₹${incomeCap.toLocaleString('en-IN')} limit.`);
      
      if (item.requires_land) {
        if (profile.isTenantFarmer && profile.hasCCRC) {
          eligibility_reasons.push(`You are an authorized tenant farmer with a verified CCRC agreement card.`);
        } else {
          eligibility_reasons.push(`You own agricultural land (${profile.land_acres || 0} acres).`);
        }
      }
      if (profile.caste_category !== 'General') {
        eligibility_reasons.push(`Your caste category (${profile.caste_category}) is eligible for this assistance.`);
      }
    }

    matches.push({
      scheme_id: item.scheme_id,
      name_en: item.name_en,
      name_te: item.name_te,
      ministry: item.ministry,
      department: item.department,
      category: item.category,
      source: item.source,
      apply_link: item.apply_link,
      benefit_amount: item.benefit_amount,
      documents_required: item.documents_required,
      eligibility_reasons: eligibility_reasons,
      similarity_score: 0.95 - (matches.length * 0.03)
    });
  }

  return matches;
}
