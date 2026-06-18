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
  language: 'en' | 'te';
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
