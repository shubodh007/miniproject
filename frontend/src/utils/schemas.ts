import { z } from 'zod';

// HTML / JS tag stripping helper
export const stripHtml = (val: string): string => {
  if (!val) return '';
  return val.replace(/<\/?[^>]+(>|$)/g, '').trim();
};

export const DIST_ENUM = [
  // Andhra Pradesh
  'Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Prakasam',
  'Srikakulam', 'Nellore', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa',
  // Telangana
  'Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally',
  'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem Asifabad', 'Mahabubabad',
  'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda',
  'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy',
  'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'
] as const;

export const OCCUPATION_WHITELIST = [
  'Farmer',
  'Agricultural Laborer',
  'Tenant Farmer',
  'Weaver',
  'Artisan',
  'Student',
  'Unemployed',
  'Retired',
  'Private Employee',
  'Self Employed',
  'Other'
] as const;

const DIST_MUTABLE: [string, ...string[]] = [
  // Andhra Pradesh
  'Srikakulam', 'Vizianagaram', 'Visakhapatnam', 'Alluri Sitharama Raju', 
  'Parvathipuram Manyam', 'Anakapalli', 'Kakinada', 'Konaseema', 'Eluru', 
  'West Godavari', 'NTR', 'Krishna', 'Guntur', 'Bapatla', 'Palnadu', 
  'Sri Potti Sriramulu Nellore', 'Kurnool', 'Nandyal', 'Anantapur', 
  'Sri Sathya Sai', 'Kadapa', 'YSR Kadapa', 'Tirupati', 'Annamayya', 'Prakasam', 'Chittoor',
  'East Godavari', 'Nellore',
  // Telangana
  'Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally',
  'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem Asifabad', 'Mahabubabad',
  'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda',
  'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy',
  'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'
];

const OCC_MUTABLE: [string, ...string[]] = [
  'Farmer', 'Agricultural Laborer', 'Agricultural Labourer', 'Daily Wage Worker', 'Tenant Farmer', 'Weaver', 'Artisan', 'Student',
  'Unemployed', 'Retired', 'Private Employee', 'Private Salaried', 'Government Employee', 'Self Employed', 'Self-Employed', 'Other'
];

export const CitizenProfileSchema = z.object({
  name: z.string()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name cannot exceed 100 characters' })
    .transform(stripHtml),
  age: z.number().int().min(0, { message: 'Age cannot be negative' }).max(120, { message: 'Age cannot exceed 120 years' }),
  gender: z.string().transform(stripHtml),
  income_annual: z.number().nonnegative({ message: 'Income cannot be negative' }),
  occupation: z.enum(OCC_MUTABLE),
  land_acres: z.number().nonnegative().optional().default(0),
  bpl_card: z.string().transform(stripHtml),
  district: z.enum(DIST_MUTABLE),
  state: z.enum(['Andhra Pradesh', 'Telangana']),
  caste_category: z.enum(['General', 'OBC', 'SC', 'ST', 'Minority']),
  sub_caste: z.string().max(80).optional().transform((v) => v ? stripHtml(v) : undefined),
  existing_schemes: z.array(z.string()).default([]),
  family_members: z.number().int().min(1).max(30).default(1),
  language: z.enum(['en', 'te']).default('en'),
  
  // 6-step expansion fields
  disability: z.enum(['Yes', 'No']).optional().default('No'),
  mandal: z.string().max(100).optional().transform((v) => v ? stripHtml(v) : undefined),
  habitation: z.enum(['Urban', 'Rural', 'Tribal']).optional().default('Rural'),
  ration_card: z.enum(['White', 'Yellow', 'Pink', 'None']).optional().default('None'),
  soil_type: z.enum(['Black', 'Red', 'Sandy', 'Alluvial', 'Other']).optional().default('Other'),
  student_level: z.enum(['School', 'Intermediate', 'Undergraduate', 'Postgraduate', 'Diploma', 'Other']).optional().default('Other'),
  own_house: z.enum(['Yes', 'No']).optional().default('No'),
  house_type: z.enum(['Pucca', 'Kutcha']).optional().default('Pucca'),
  bank_account: z.enum(['Yes', 'No']).optional().default('No'),

  // Audit properties
  isTenantFarmer: z.boolean().optional().default(false),
  hasCCRC: z.boolean().optional().default(false),
  aadhaar: z.string().optional().transform((v) => v ? stripHtml(v) : undefined)
});

export type ValidatedCitizenProfile = z.infer<typeof CitizenProfileSchema>;
