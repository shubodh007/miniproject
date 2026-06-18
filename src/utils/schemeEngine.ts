import { ProfilePayload, SchemeResult } from '../types';

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

export const SEED_SCHEMES = [
  {
    scheme_id: "pm-kisan-001",
    name_en: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    name_te: "పీఎం-కిసాన్ (ప్రధానమంత్రి కిసాన్ సమ్మాన్ నిధి)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    department: "Department of Agriculture, Cooperation & Farmers Welfare",
    category: "Agriculture" as const,
    source: "Central" as const,
    apply_link: "https://pmkisan.gov.in/",
    benefit_amount: "₹6,000/year (3 installments of ₹2,000)",
    documents_required: ["Aadhaar Card", "Bank Passbook", "Land Records (Pahani/Adangal) or CCRC Certificate", "Mobile Number linked to Aadhaar"],
    states: ["Andhra Pradesh", "Telangana"],
    min_age: 18,
    max_age: 110,
    max_income: 1500000,
    requires_land: true,
    castes: ["General", "OBC", "SC", "ST", "Minority"]
  },
  {
    scheme_id: "talliki-vandanam-007",
    name_en: "Talliki Vandanam Scheme",
    name_te: "తల్లికి వందనం పథకం",
    ministry: "Andhra Pradesh Government",
    department: "School Education Department",
    category: "Education" as const,
    source: "AP State" as const,
    apply_link: "https://schooledu.ap.gov.in/",
    benefit_amount: "₹15,000/year per school-going child",
    documents_required: ["Aadhaar Card of Mother & Child", "White/BPL Ration Card / Rice Card", "School Study Certificate (75% attendance)", "Bank Passbook Details with active DBT link", "Electricity Bill (usage below 300 units/mo)"],
    states: ["Andhra Pradesh"],
    min_age: 5,
    max_age: 18,
    max_income: 144000,
    requires_land: false,
    castes: ["General", "OBC", "SC", "ST", "Minority"]
  },
  {
    scheme_id: "rythu-bharosa-tg-008",
    name_en: "Telangana Rythu Bharosa (formerly Rythu Bandhu)",
    name_te: "తెలంగాణ రైతు భరోసా (రైతు బంధు)",
    ministry: "Telangana Government",
    department: "Agriculture & Co-operation Department",
    category: "Agriculture" as const,
    source: "Telangana State" as const,
    apply_link: "https://rythubandhu.telangana.gov.in/",
    benefit_amount: "₹12,000 per acre/year (renamed January 2025)",
    documents_required: ["Pattadar Passbook or CCRC Agreement for Tenants", "Aadhaar Card", "Bank Account Details", "Forest Rights Record (if applicable)"],
    states: ["Telangana"],
    min_age: 18,
    max_age: 110,
    max_income: 99999999,
    requires_land: true,
    castes: ["General", "OBC", "SC", "ST", "Minority"]
  },
  {
    scheme_id: "ntr-aarogyasri-002",
    name_en: "Dr. NTR Aarogyasri Health Scheme",
    name_te: "డాక్టర్ ఎన్టీఆర్ ఆరోగ్యశ్రీ హెల్త్ స్కీమ్",
    ministry: "Andhra Pradesh Government",
    department: "Health, Medical & Family Welfare Department",
    category: "Health" as const,
    source: "AP State" as const,
    apply_link: "https://aarogyasri.ap.gov.in/",
    benefit_amount: "Cashless health insurance coverage up to ₹25 lakh per year per family",
    documents_required: ["Aadhaar Card", "White/BPL Ration Card / Rice Card", "Income Certificate", "Residence Proof"],
    states: ["Andhra Pradesh"],
    min_age: 0,
    max_age: 110,
    max_income: 500000,
    requires_land: false,
    castes: ["General", "OBC", "SC", "ST", "Minority"]
  },
  {
    scheme_id: "tg-aarogyasri-002",
    name_en: "Telangana Aarogyasri Health Scheme",
    name_te: "తెలంగాణ ఆరోగ్యశ్రీ హెల్త్ స్కీమ్",
    ministry: "Telangana Government",
    department: "Health, Medical & Family Welfare Department",
    category: "Health" as const,
    source: "Telangana State" as const,
    apply_link: "https://aarogyasri.telangana.gov.in/",
    benefit_amount: "Up to ₹10 lakh health coverage per year",
    documents_required: ["Aadhaar Card", "Food Security Card (Ration Card)", "Income Certificate", "Residence Proof"],
    states: ["Telangana"],
    min_age: 0,
    max_age: 110,
    max_income: 500000,
    requires_land: false,
    castes: ["General", "OBC", "SC", "ST", "Minority"]
  },
  {
    scheme_id: "pmay-003",
    name_en: "PMAY-Gramin (Pradhan Mantri Awaas Yojana - Rural)",
    name_te: "పీఎం ఆవాస్ యోజన - గ్రామీణ్",
    ministry: "Ministry of Rural Development",
    department: "Department of Rural Development",
    category: "Housing" as const,
    source: "Central" as const,
    apply_link: "https://pmayg.nic.in/",
    benefit_amount: "₹1.20 lakh financial assistance for housing purchase",
    documents_required: ["Aadhaar Card", "BPL Certificate / Ration Card", "Bank Account (Aadhaar-linked)", "Land Possession Certificate"],
    states: ["Andhra Pradesh", "Telangana"],
    min_age: 18,
    max_age: 110,
    max_income: 300000,
    requires_land: false,
    castes: ["General", "OBC", "SC", "ST", "Minority"]
  },
  {
    scheme_id: "chandranna-pelli-kanuka-004",
    name_en: "Chandranna Pelli Kanuka",
    name_te: "చంద్రన్న పెళ్లి కానుక",
    ministry: "Andhra Pradesh Government",
    department: "BC Welfare Department",
    category: "Women & Child" as const,
    source: "AP State" as const,
    apply_link: "https://allurijilla.ap.gov.in/scheme/chandranna-pelli-kanuka/",
    benefit_amount: "₹1,00,000 one-time marriage assistant gift for eligible brides",
    documents_required: ["Bride & Bridegroom Aadhaar Cards", "Official Caste Certificate", "Household Income Proof Certificate", "Registration application with wedding card", "Bride's Bank Account Book"],
    states: ["Andhra Pradesh"],
    min_age: 18,
    max_age: 110,
    max_income: 200000,
    requires_land: false,
    castes: ["SC", "ST", "OBC", "Minority"],
    female_only: true
  },
  {
    scheme_id: "tg-kalyana-lakshmi-004",
    name_en: "Kalyana Lakshmi / Shaadi Mubarak (Telangana)",
    name_te: "కళ్యాణ లక్ష్మీ పథకం (తెలంగాణ)",
    ministry: "Telangana Government",
    department: "Scheduled Castes Development Department",
    category: "Women & Child" as const,
    source: "Telangana State" as const,
    apply_link: "https://telanganaepass.cgg.gov.in/",
    benefit_amount: "₹1,001,116 financial support for marriage costs",
    documents_required: ["Aadhaar Card", "Caste Certificate", "Income Certificate", "Official Wedding Invitation Card", "Bank Account Details"],
    states: ["Telangana"],
    min_age: 18,
    max_age: 110,
    max_income: 200000,
    requires_land: false,
    castes: ["SC", "ST", "OBC", "Minority"],
    female_only: true
  },
  {
    scheme_id: "ntr-bharosa-005",
    name_en: "NTR Bharosa Pension",
    name_te: "ఎన్టీఆర్ భరోసా పెన్షన్",
    ministry: "Andhra Pradesh Government",
    department: "Rural Development Department",
    category: "Social Security" as const,
    source: "AP State" as const,
    apply_link: "https://sspensions.ap.gov.in/",
    benefit_amount: "₹4,000/month (Old Age / Widow) or ₹6,000/month (Disabled) or ₹15,000/month (Fully Disabled)",
    documents_required: ["Aadhaar Card", "Age Proof (Birth Certificate/School Certificate)", "Income Certificate", "Residence Proof"],
    states: ["Andhra Pradesh"],
    min_age: 60,
    max_age: 110,
    max_income: 120000,
    requires_land: false,
    castes: ["General", "OBC", "SC", "ST", "Minority"]
  },
  {
    scheme_id: "tg-grupajyothi-006",
    name_en: "Gruha Jyothi Free Electricity (Telangana)",
    name_te: "గృహ జ్యోతి ఉచిత విద్యుత్ (తెలంగాణ)",
    ministry: "Telangana Government",
    department: "Energy Department",
    category: "Social Security" as const,
    source: "Telangana State" as const,
    apply_link: "https://telanganaepass.cgg.gov.in/",
    benefit_amount: "Free domestic electricity up to 200 units/month",
    documents_required: ["Aadhaar Card", "Recent Electricity Bill", "Ration Card (FSC)", "House Ownership/Rental Proof"],
    states: ["Telangana"],
    min_age: 18,
    max_age: 110,
    max_income: 250000,
    requires_land: false,
    castes: ["General", "OBC", "SC", "ST", "Minority"]
  }
];

/**
 * Replace flat income limits with a geographic offset map for rural and urban categories per district.
 */
export function getSchemeIncomeLimit(schemeId: string, defaultMaxIncome: number, district: string, habitation: string = 'Rural'): number {
  const geo = DISTRICT_GEO_LIMITS[district] || { Rural: 120000, Urban: 144000 };
  const geoBase = habitation === 'Urban' ? geo.Urban : geo.Rural;

  switch (schemeId) {
    case 'talliki-vandanam-007':
      return habitation === 'Urban' ? geo.Urban : geo.Rural;
    case 'ntr-bharosa-005':
      return geoBase * 0.9;
    case 'ntr-aarogyasri-002':
    case 'tg-aarogyasri-002':
      return geoBase * 3.5;
    case 'chandranna-pelli-kanuka-004':
    case 'tg-kalyana-lakshmi-004':
      return geoBase * 1.5;
    case 'tg-grupajyothi-006':
      return geoBase * 1.8;
    case 'pmay-003':
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
    if (!item.castes.includes(profile.caste_category)) {
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
