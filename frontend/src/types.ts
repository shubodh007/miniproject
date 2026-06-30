export interface ProfilePayload {
  name: string;
  age: number;
  gender: string;
  income_annual: number;
  occupation: string;
  land_acres?: number;
  bpl_card: string;
  district: string;
  state: 'Andhra Pradesh' | 'Telangana';
  caste_category: string;
  sub_caste?: string;
  existing_schemes: string[];
  family_members: number;
  language: 'en' | 'te' | 'hi';
  // 6-step expansion fields
  disability?: 'Yes' | 'No';
  mandal?: string;
  habitation?: 'Urban' | 'Rural' | 'Tribal';
  ration_card?: 'White' | 'Yellow' | 'Pink' | 'None';
  soil_type?: 'Black' | 'Red' | 'Sandy' | 'Alluvial' | 'Other';
  student_level?: 'School' | 'Intermediate' | 'Undergraduate' | 'Postgraduate' | 'Diploma' | 'Other';
  own_house?: 'Yes' | 'No';
  house_type?: 'Pucca' | 'Kutcha';
  bank_account?: 'Yes' | 'No';
  // Audit properties
  isTenantFarmer?: boolean;
  hasCCRC?: boolean;
  aadhaar?: string;
}

export interface SchemeResult {
  scheme_id: string;
  name_en: string;
  name_te: string;
  ministry: string;
  department: string;
  category: 'Agriculture' | 'Health' | 'Housing' | 'Education' | 'Women & Child' | 'Social Security' | 'Employment';
  source: 'Central' | 'AP State' | 'Telangana State';
  eligibility_reasons: string[];   // 2-4 bullet points in selected language
  documents_required: string[];    // list of document names
  apply_link: string;              // real URL, never empty
  benefit_amount?: string;         // e.g. "₹6,000/year"
  similarity_score: number;        // 0.72–1.0
}

export interface MatchResponse {
  search_id: string;
  total_found: number;
  schemes: SchemeResult[];
  summary_message: string;         // plain language summary in selected language
}

export interface SearchHistory {
  id: string;
  profile_snapshot: ProfilePayload;
  results_snapshot: MatchResponse;
  created_at: string;
}

export interface EligibilityRules {
  min_age?: number;
  max_age?: number;
  max_income?: number;
  max_income_urban?: number;
  max_income_rural?: number;
  max_land_acres?: number;
  applicable_states?: string[];
  caste_categories?: string[];
  occupation?: string;
  gender?: string;
  has_pattadar_passbook?: boolean;
  [key: string]: unknown; // Allow extensible keys
}

export interface WelfareScheme {
  id?: string; // Optional during creation
  name: string;
  name_te?: string;
  description: string;
  description_te?: string;
  benefit_details?: string;
  benefit_details_te?: string;
  eligibility_rules: EligibilityRules;
  docs_required?: string[];
  docs_required_te?: string[];
  state: 'Andhra Pradesh' | 'Telangana' | 'Central';
  district?: string | null;
  category: 'Agriculture' | 'Education' | 'Social Welfare' | 'Housing' | 'Health' | 'Employment' | 'Women & Child';
  external_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  name: string;
  email: string;
}


