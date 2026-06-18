import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ArrowRight, Sparkles, Loader2, Info, AlertCircle, 
  CheckCircle, Search, Edit2, User, MapPin, Home, Briefcase, Landmark, ListChecks 
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { ProfilePayload } from '../types';

interface ProfileWizardProps {
  onSearch: (payload: ProfilePayload) => void;
  isLoading: boolean;
  errorMsg: string | null;
  setView: (v: string) => void;
}

const AP_DISTRICTS = [
  "Srikakulam", "Vizianagaram", "Visakhapatnam", "Alluri Sitharama Raju", 
  "Parvathipuram Manyam", "Anakapalli", "Kakinada", "Konaseema", "Eluru", 
  "West Godavari", "NTR", "Krishna", "Guntur", "Bapatla", "Palnadu", 
  "Sri Potti Sriramulu Nellore", "Kurnool", "Nandyal", "Anantapur", 
  "Sri Sathya Sai", "Kadapa", "Tirupati", "Annamayya", "Prakasam", "Chittoor"
];

const TS_DISTRICTS = [
  "Hyderabad", "Rangareddy", "Medchal", "Sangareddy", "Warangal", 
  "Karimnagar", "Nizamabad", "Khammam", "Nalgonda", "Mahabubnagar", "Adilabad"
];

const OCCUPATIONS = [
  "Farmer", "Agricultural Labourer", "Daily Wage Worker", "Self-Employed", 
  "Government Employee", "Private Salaried", "Student", "Unemployed", "Retired", "Other"
];

const CASTES = ["General", "OBC", "SC", "ST", "Minority"];

const EXISTING_SCHEMES_LIST = [
  "PM-KISAN", "PMAY", "NTR Bharosa Pension", "Aarogyasri", "YSR Rythu Bharosa", "Kalyana Lakshmi"
];

export const ProfileWizard: React.FC<ProfileWizardProps> = ({ onSearch, isLoading, errorMsg, setView }) => {
  const { t, language } = useTranslation();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  const stepVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0
    })
  };
  
  // Single comprehensive state mapping our schema with 6-stage expansions
  const [formData, setFormData] = useState<Partial<ProfilePayload>>({
    name: '',
    age: undefined,
    gender: '',
    income_annual: 120000,
    occupation: '',
    family_members: 4,
    land_acres: undefined,
    bpl_card: 'BPL',
    state: 'Andhra Pradesh',
    district: '',
    caste_category: '',
    sub_caste: '',
    existing_schemes: [],
    language: language,
    // Expansion fields
    disability: 'No',
    mandal: '',
    habitation: 'Rural',
    ration_card: 'White',
    soil_type: undefined,
    student_level: undefined,
    own_house: 'No',
    house_type: undefined,
    bank_account: 'Yes'
  });

  // Load autosaved progress on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('sc_wizard_autosave');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
        const savedStep = localStorage.getItem('sc_wizard_step_autosave');
        if (savedStep) {
          setStep(Number(savedStep));
        }
      } catch (e) {
        console.error('Error reloading wizard autosave', e);
      }
    }
  }, []);

  // Autosave to localStorage on form changes with robust, defensive safety checks
  React.useEffect(() => {
    if (!formData) return;
    try {
      // Filter out any potential non-serializable elements to safeguard against crashes
      const sanitized: Record<string, any> = {};
      const seen = new WeakSet();
      
      const safeSerializer = (key: string, val: any): any => {
        if (key.startsWith('__react') || key.startsWith('_react') || key === 'stateNode' || key === 'updater') {
          return undefined;
        }
        if (typeof val === 'object' && val !== null) {
          if (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement) {
            return undefined;
          }
          if ('nodeType' in val || 'ownerDocument' in val || 'preventDefault' in val || 'target' in val) {
            return undefined;
          }
          if (seen.has(val)) {
            return undefined;
          }
          seen.add(val);
        }
        return val;
      };

      for (const [key, val] of Object.entries(formData)) {
        if (val === null || val === undefined) {
          sanitized[key] = val;
        } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          sanitized[key] = val;
        } else if (Array.isArray(val)) {
          sanitized[key] = val.filter(v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');
        } else {
          try {
            const strValue = JSON.stringify(val, safeSerializer);
            if (strValue !== undefined) {
              sanitized[key] = JSON.parse(strValue);
            }
          } catch (e) {
            console.warn(`[ProfileWizard] Stripped non-serializable field index: ${key}`);
          }
        }
      }

      localStorage.setItem('sc_wizard_autosave', JSON.stringify(sanitized));
    } catch (err) {
      console.error('[ProfileWizard] Error during safe serialization of form data:', err);
    }
  }, [formData]);

  React.useEffect(() => {
    localStorage.setItem('sc_wizard_step_autosave', String(step));
  }, [step]);

  // Keyboard navigation listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (step < 6) {
            handleNext();
          } else {
            handleSubmit();
          }
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (step < 6) {
          handleNext();
        } else if (step === 6) {
          handleSubmit();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        e.preventDefault();
        if (step > 1) {
          handleBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, formData]);

  // Handle manual complete reset
  const handleWizardReset = () => {
    localStorage.removeItem('sc_wizard_autosave');
    localStorage.removeItem('sc_wizard_step_autosave');
    setStep(1);
    setFormData({
      name: '',
      age: undefined,
      gender: '',
      income_annual: 120000,
      occupation: '',
      family_members: 4,
      land_acres: undefined,
      bpl_card: 'BPL',
      state: 'Andhra Pradesh',
      district: '',
      caste_category: '',
      sub_caste: '',
      existing_schemes: [],
      language: language,
      disability: 'No',
      mandal: '',
      habitation: 'Rural',
      ration_card: 'White',
      soil_type: undefined,
      student_level: undefined,
      own_house: 'No',
      house_type: undefined,
      bank_account: 'Yes'
    });
    setErrors({});
    setTouched({});
    setDistrictSearch('');
  };

  // Interactive District Search
  const [districtSearch, setDistrictSearch] = useState('');
  const [isCasteTouched, setIsCasteTouched] = useState(false);

  // Field validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: any) => {
    let err = '';
    
    switch (field) {
      case 'name':
        if (!value || String(value).trim().length < 2) {
          err = language === 'te' ? 'దయచేసి మీ పూర్తి పేరు నమోదు చేయండి (కనీసం 2 అక్షరాలు).' : 'Please enter your full name (minimum 2 characters).';
        }
        break;
      case 'age':
        const ageNum = Number(value);
        if (!value || isNaN(ageNum) || ageNum < 1 || ageNum > 115) {
          err = language === 'te' ? 'దయచేసి సరైన వయసును నమోదు చేయండి (1 - 115).' : 'Please enter a valid age (1 - 115).';
        }
        break;
      case 'gender':
        if (!value) {
          err = language === 'te' ? 'దయచేసి లింగాన్ని ఎంచుకోండి.' : 'Please select your gender.';
        }
        break;
      case 'caste_category':
        if (!value) {
          err = language === 'te' ? 'దయచేసి కుల వర్గాన్ని ఎంచుకోండి.' : 'Please select your caste category.';
        }
        break;
      case 'district':
        if (!value) {
          err = language === 'te' ? 'దయచేసి మీ జిల్లా ఎంచుకోండి.' : 'Please select your district.';
        }
        break;
      case 'mandal':
        if (!value || String(value).trim().length === 0) {
          err = language === 'te' ? 'దయచేసి మండలం పేరు టైప్ చేయండి.' : 'Please type your Mandal name.';
        }
        break;
      case 'occupation':
        if (!value) {
          err = language === 'te' ? 'వృత్తిని ఎంచుకోండి.' : 'Please select your occupation.';
        }
        break;
    }

    setErrors(prev => ({ ...prev, [field]: err }));
    return err === '';
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, (formData as any)[field]);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const toggleScheme = (scheme: string) => {
    const current = formData.existing_schemes || [];
    const updated = current.includes(scheme)
      ? current.filter(s => s !== scheme)
      : [...current, scheme];
    handleChange('existing_schemes', updated);
  };

  const handleNext = () => {
    let isValid = true;

    // Validate fields based on the current step
    if (step === 1) {
      const vName = validateField('name', formData.name);
      const vAge = validateField('age', formData.age);
      const vGender = validateField('gender', formData.gender);
      const vCaste = validateField('caste_category', formData.caste_category);
      isValid = vName && vAge && vGender && vCaste;
      setTouched(prev => ({ ...prev, name: true, age: true, gender: true, caste_category: true }));
    } else if (step === 2) {
      const vDistrict = validateField('district', formData.district);
      const vMandal = validateField('mandal', formData.mandal);
      isValid = vDistrict && vMandal;
      setTouched(prev => ({ ...prev, district: true, mandal: true }));
    } else if (step === 3) {
      // Step 3 (Household) holds Sliders & ration, usually inherently valid
      isValid = true;
    } else if (step === 4) {
      const vOcc = validateField('occupation', formData.occupation);
      isValid = vOcc;
      setTouched(prev => ({ ...prev, occupation: true }));
    } else if (step === 5) {
      isValid = true;
    }

    if (isValid) {
      setDirection(1);
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    // Collect all final payload variables
    const payload: ProfilePayload = {
      name: formData.name || 'Citizen',
      age: Number(formData.age || 35),
      gender: formData.gender || 'Male',
      income_annual: Number(formData.income_annual || 120000),
      occupation: formData.occupation || 'Farmer',
      family_members: Number(formData.family_members || 4),
      land_acres: formData.occupation === 'Farmer' ? Number(formData.land_acres || 0) : undefined,
      bpl_card: formData.ration_card === 'None' ? 'None' : 'BPL',
      state: formData.state || 'Andhra Pradesh',
      district: formData.district || 'Guntur',
      caste_category: formData.caste_category || 'General',
      sub_caste: formData.sub_caste || undefined,
      existing_schemes: formData.existing_schemes || [],
      language: language,
      // Expansion fields
      disability: formData.disability || 'No',
      mandal: formData.mandal || '',
      habitation: formData.habitation || 'Rural',
      ration_card: formData.ration_card || 'White',
      soil_type: formData.soil_type,
      student_level: formData.student_level,
      own_house: formData.own_house || 'No',
      house_type: formData.house_type,
      bank_account: formData.bank_account || 'Yes'
    };
    onSearch(payload);
  };

  // Filter districts based on searchable criteria
  const baseDistricts = formData.state === 'Andhra Pradesh' ? AP_DISTRICTS : TS_DISTRICTS;
  const filteredDistricts = baseDistricts.filter(d => 
    d.toLowerCase().includes(districtSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center justify-center px-4" id="wizard-viewport">
      <div className="w-full max-w-3xl bg-bg-surface border border-border-main rounded-3xl overflow-hidden shadow-2xl relative" id="wizard-card">
        
        {/* Step progress bar background strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-bg-elevated flex">
          {[1,2,3,4,5,6].map((i) => (
            <div 
              key={i}
              className={`flex-1 h-full transition-all duration-300 ${
                i <= step 
                  ? 'bg-accent-saffron' 
                  : 'bg-transparent border-r border-border-subtle/40'
              }`}
            />
          ))}
        </div>

        {/* Wizard Header bar */}
        <div className="px-6 sm:px-8 pt-8 pb-5 border-b border-border-subtle flex justify-between items-center bg-bg-surface/20">
          <div>
            <span className="text-[11px] leading-tight font-black text-accent-saffron tracking-wider uppercase mb-1 block" id="wizard-step-label">
              Step {step} of 6 — {
                step === 1 ? 'Personal Identity' :
                step === 2 ? 'Local Address' :
                step === 3 ? 'Economic Snapshot' :
                step === 4 ? 'Employment Details' :
                step === 5 ? 'Asset Safeguards' :
                'Review Choices'
              }
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary" id="wizard-step-title">
              {step === 1 && (language === 'te' ? 'వ్యక్తిగత వివరాలు' : 'Who are you?')}
              {step === 2 && (language === 'te' ? 'నివాస ప్రాంతం' : 'Where are you from?')}
              {step === 3 && (language === 'te' ? 'ఆర్ధిక స్థితి గతులు' : 'Your Household Profile')}
              {step === 4 && (language === 'te' ? 'ఉపాధి మరియు విద్య' : 'Occupation Categories')}
              {step === 5 && (language === 'te' ? 'ఆస్తులు మరియు ఇతర లబ్ది' : 'Family Assets & Welfare')}
              {step === 6 && (language === 'te' ? 'సమీక్ష మరియు సమర్పణ' : 'Review & Submit Answers')}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleWizardReset}
              className="text-xs font-bold text-text-secondary hover:text-accent-saffron border border-border-main hover:border-accent-saffron/20 bg-bg-elevated px-3 py-1.5 rounded-xl cursor-pointer transition-all"
              title="Wipe autosaved form data and start fresh"
              id="wizard-reset-action"
            >
              {language === 'te' ? 'రీసెట్' : 'Restart Form'}
            </button>
            <p className="text-xs font-black text-text-muted hidden sm:block font-mono uppercase tracking-widest bg-bg-elevated px-3 py-1.5 rounded-xl">
              {formData.state} Portal
            </p>
          </div>
        </div>

        {/* Backend API Error alert block */}
        {errorMsg && (
          <div className="mx-6 sm:mx-8 mt-6 bg-error/10 border border-error/20 p-4 rounded-xl flex items-start space-x-3 text-error">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm font-semibold">
              <p>{errorMsg}</p>
              <p className="text-xs mt-1 text-error/80">{t('error.api_failed_te')}</p>
            </div>
          </div>
        )}

        {/* STEP CONTENT WRAPPERS */}
        <div className="px-6 sm:px-8 py-8 h-[440px] overflow-y-auto" id="wizard-form-body">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: PERSONAL INFORMATION */}
            {step === 1 && (
              <motion.div 
                key="step1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="space-y-6"
              >
                {/* Name */}
                <div className="flex flex-col">
                  <label className="text-xs font-black text-text-secondary uppercase mb-2" htmlFor="ctz-name">
                    {t('wizard.field.name')} *
                  </label>
                  <input
                    type="text"
                    id="ctz-name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    placeholder={language === 'te' ? 'ఉదా: రాముడు' : 'e.g. Ramanjaneyulu'}
                    className={`bg-bg-base text-text-primary border rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all ${
                      errors.name ? 'border-error focus:ring-1 focus:ring-error' : 'border-border-main focus:border-accent-saffron focus:ring-1'
                    }`}
                  />
                  {errors.name && <span className="text-xs font-bold text-error mt-1.5 flex items-center"><AlertCircle size={12} className="mr-1" />{errors.name}</span>}
                </div>

                {/* Age & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className="text-xs font-black text-text-secondary uppercase mb-2" htmlFor="ctz-age">
                      {t('wizard.field.age')} *
                    </label>
                    <input
                      type="number"
                      id="ctz-age"
                      value={formData.age !== undefined ? formData.age : ''}
                      onChange={(e) => handleChange('age', e.target.value === '' ? undefined : Number(e.target.value))}
                      onBlur={() => handleBlur('age')}
                      placeholder="e.g. 45"
                      className={`bg-bg-base text-text-primary border rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all ${
                        errors.age ? 'border-error focus:ring-1 focus:ring-error' : 'border-border-main focus:border-accent-saffron'
                      }`}
                    />
                    {errors.age && <span className="text-xs font-bold text-error mt-1.5 flex items-center"><AlertCircle size={12} className="mr-1" />{errors.age}</span>}
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-black text-text-secondary uppercase mb-2">
                      {t('wizard.field.gender')} *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Male', 'Female', 'Other'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handleChange('gender', g)}
                          className={`py-3 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                            formData.gender === g
                              ? 'bg-accent-blue/15 border-accent-blue text-accent-blue'
                              : 'bg-bg-base border-border-main text-text-secondary hover:border-text-secondary'
                          }`}
                        >
                          {g === 'Female' ? (language === 'te' ? 'స్త్రీ' : 'Female') : g === 'Male' ? (language === 'te' ? 'పురుషుడు' : 'Male') : (language === 'te' ? 'ఇతర' : 'Other')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Caste Category & disability */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className="text-xs font-black text-text-secondary uppercase mb-2" htmlFor="ctz-caste">
                      {t('wizard.field.caste')} *
                    </label>
                    <select
                      id="ctz-caste"
                      value={formData.caste_category}
                      onChange={(e) => handleChange('caste_category', e.target.value)}
                      onBlur={() => handleBlur('caste_category')}
                      className={`bg-bg-base text-text-primary border rounded-xl px-4 py-3 text-sm font-semibold outline-none cursor-pointer transition-all ${
                        errors.caste_category ? 'border-error' : 'border-border-main'
                      }`}
                    >
                      <option value="">{language === 'te' ? '-- కులం --' : '-- Select --'}</option>
                      {CASTES.map((c) => (
                        <option key={c} value={c}>{c === 'General' ? 'General / OC' : c}</option>
                      ))}
                    </select>
                    {errors.caste_category && <span className="text-xs font-bold text-error mt-1.5 flex items-center"><AlertCircle size={12} className="mr-1" />{errors.caste_category}</span>}
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-black text-text-secondary uppercase mb-2">
                      Special Disability Status?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Yes', 'No'].map((op) => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => handleChange('disability', op)}
                          className={`py-3 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                            formData.disability === op
                              ? 'bg-accent-saffron/15 border-accent-saffron text-accent-saffron'
                              : 'bg-bg-base border-border-main text-text-secondary hover:border-text-secondary'
                          }`}
                        >
                          {op === 'Yes' ? (language === 'te' ? 'అవును' : 'Yes') : (language === 'te' ? 'కాదు' : 'No')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: ADDRESS AND GEOGRAPHY */}
            {step === 2 && (
              <motion.div 
                key="step2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="space-y-6"
              >
                {/* State Toggles (AP prefilled/Telangana) */}
                <div className="flex flex-col">
                  <label className="text-xs font-black text-text-secondary uppercase mb-2">
                    {t('wizard.field.state')} *
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-bg-base/40 p-1.5 rounded-2xl border border-border-subtle">
                    {['Andhra Pradesh', 'Telangana'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          handleChange('state', st);
                          handleChange('district', '');
                          setDistrictSearch('');
                        }}
                        className={`py-3 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                          formData.state === st
                            ? 'bg-accent-saffron text-white shadow-md'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* District search lookups */}
                <div className="flex flex-col">
                  <label className="text-xs font-black text-text-secondary uppercase mb-2">
                    {t('wizard.field.district')} *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 text-text-muted" size={15} />
                    <input
                      type="text"
                      placeholder="Type district to filter... (e.g. Guntur)"
                      value={districtSearch || formData.district}
                      onChange={(e) => {
                        setDistrictSearch(e.target.value);
                        handleChange('district', e.target.value);
                      }}
                      className="bg-bg-base text-text-primary border border-border-main rounded-xl pl-9 pr-4 py-3 text-sm font-semibold outline-none w-full"
                    />
                  </div>
                  {/* Matching results dropdown list */}
                  <div className="grid grid-cols-3 gap-1.5 mt-2 max-h-24 overflow-y-auto pr-1 bg-bg-base/30 p-2 rounded-xl">
                    {filteredDistricts.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          handleChange('district', d);
                          setDistrictSearch(d);
                        }}
                        className={`px-2 py-1.5 rounded text-[11px] leading-tight font-black tracking-wide border cursor-pointer truncate ${
                          formData.district === d
                            ? 'bg-accent-blue/15 border-accent-blue text-accent-blue'
                            : 'bg-bg-surface border-border-subtle text-text-secondary hover:border-text-secondary'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  {errors.district && <span className="text-xs font-bold text-error mt-1 flex items-center"><AlertCircle size={12} className="mr-1" />{errors.district}</span>}
                </div>

                {/* Mandal & Habitation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className="text-xs font-black text-text-secondary uppercase mb-2" htmlFor="ctz-mandal">
                      Mandal Textbox *
                    </label>
                    <input
                      type="text"
                      id="ctz-mandal"
                      value={formData.mandal}
                      onChange={(e) => handleChange('mandal', e.target.value)}
                      onBlur={() => handleBlur('mandal')}
                      placeholder="e.g. Tenali"
                      className={`bg-bg-base text-text-primary border rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all ${
                        errors.mandal ? 'border-error' : 'border-border-main'
                      }`}
                    />
                    {errors.mandal && <span className="text-xs font-bold text-error mt-1.5 flex items-center"><AlertCircle size={12} className="mr-1" />{errors.mandal}</span>}
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-black text-text-secondary uppercase mb-2" htmlFor="ctz-habitation">
                      Habitation Area Type *
                    </label>
                    <select
                      id="ctz-habitation"
                      value={formData.habitation}
                      onChange={(e) => handleChange('habitation', e.target.value)}
                      className="bg-bg-base text-text-primary border border-border-main rounded-xl px-4 py-3 text-sm font-semibold outline-none cursor-pointer"
                    >
                      <option value="Rural">{language === 'te' ? 'గ్రామీణ (Rural)' : 'Rural / Village'}</option>
                      <option value="Urban">{language === 'te' ? 'పట్టణ (Urban)' : 'Urban / City'}</option>
                      <option value="Tribal">{language === 'te' ? 'గిరిజన (Tribal)' : 'Tribal agency area'}</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: HOUSEHOLD PROFILE AND ECONOMIC CONDITIONS */}
            {step === 3 && (
              <motion.div 
                key="step3"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="space-y-6"
              >
                {/* Family Members slider */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-black text-text-secondary uppercase">
                      Number of Family Members
                    </label>
                    <span className="bg-accent-blue/10 text-accent-blue font-bold text-xs px-2.5 py-0.5 rounded-full font-mono">
                      {formData.family_members} Persons
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={formData.family_members}
                    onChange={(e) => handleChange('family_members', Number(e.target.value))}
                    className="w-full h-1.5 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent-blue"
                  />
                  <div className="flex justify-between text-[11px] leading-tight text-text-muted font-bold mt-1.5">
                    <span>1 (Single)</span>
                    <span>5 (Standard)</span>
                    <span>10 (Joint)</span>
                    <span>15+</span>
                  </div>
                </div>

                {/* Income annual slider */}
                <div className="flex flex-col bg-bg-base/30 p-5 rounded-2xl border border-border-subtle">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-black text-text-primary uppercase">
                      Annual Household Income
                    </label>
                    <span className="text-accent-saffron font-black text-sm font-mono">
                      ₹{formData.income_annual?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[11px] leading-tight text-text-muted font-semibold mb-3">
                    Calculated Slab: {
                      (formData.income_annual || 0) <= 150000 ? '🔴 BPL Target (Below 1.5 Lakhs)' :
                      (formData.income_annual || 0) <= 300000 ? '🟠 Low Income (1.5 - 3 Lakhs)' :
                      (formData.income_annual || 0) <= 600000 ? '🟡 Medium Slab (3 - 6 Lakhs)' :
                      '🟢 High Income Slab (Above 6 Lakhs)'
                    }
                  </p>
                  <input
                    type="range"
                    min="30000"
                    max="1000000"
                    step="10000"
                    value={formData.income_annual}
                    onChange={(e) => handleChange('income_annual', Number(e.target.value))}
                    className="w-full h-2 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent-saffron"
                  />
                  <div className="flex justify-between text-[11px] leading-tight text-text-muted font-mono mt-1.5 font-bold">
                    <span>₹30K</span>
                    <span>₹1.5 Lakhs</span>
                    <span>₹3 Lakhs</span>
                    <span>₹6 Lakhs</span>
                    <span>₹10 Lakhs+</span>
                  </div>
                </div>

                {/* Ration Card states */}
                <div className="flex flex-col">
                  <label className="text-xs font-black text-text-secondary uppercase mb-2">
                    Ration Card & BPL Status *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 'White', label: 'White Card (BPL)', color: 'border-white text-text-primary bg-white/5' },
                      { val: 'Yellow', label: 'Yellow (Antyodaya)', color: 'border-yellow-400 text-yellow-500 bg-yellow-500/5' },
                      { val: 'Pink', label: 'Pink Card (APL)', color: 'border-pink-400 text-pink-500 bg-pink-500/5' },
                      { val: 'None', label: 'None', color: 'border-text-muted text-text-muted' }
                    ].map((rc) => (
                      <button
                        key={rc.val}
                        type="button"
                        onClick={() => handleChange('ration_card', rc.val)}
                        className={`p-3 rounded-xl border text-center font-bold text-[11px] leading-tight sm:text-xs cursor-pointer transition-all ${
                          formData.ration_card === rc.val
                            ? 'ring-1 ring-accent-saffron border-accent-saffron ' + rc.color
                            : 'bg-bg-base border-border-default text-text-muted hover:border-text-secondary'
                        }`}
                      >
                        {rc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: OCCUPATION CATEGORIES */}
            {step === 4 && (
              <motion.div 
                key="step4"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="space-y-6"
              >
                {/* Primary Occupation select */}
                <div className="flex flex-col">
                  <label className="text-xs font-black text-text-secondary uppercase mb-2" htmlFor="ctz-occ">
                    Primary Occupation *
                  </label>
                  <select
                    id="ctz-occ"
                    value={formData.occupation}
                    onChange={(e) => {
                      handleChange('occupation', e.target.value);
                      // Clear conditionally nested variables
                      if (e.target.value !== 'Farmer') {
                        handleChange('land_acres', undefined);
                        handleChange('soil_type', undefined);
                      }
                      if (e.target.value !== 'Student') {
                        handleChange('student_level', undefined);
                      }
                    }}
                    onBlur={() => handleBlur('occupation')}
                    className="bg-bg-base text-text-primary border border-border-main rounded-xl px-4 py-3 text-sm font-semibold outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Category --</option>
                    {OCCUPATIONS.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  {errors.occupation && <span className="text-xs font-bold text-error mt-1 flex items-center"><AlertCircle size={12} className="mr-1" />{errors.occupation}</span>}
                </div>

                {/* Conditionally reveal Farmer configurations */}
                {formData.occupation === 'Farmer' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border border-accent-saffron/10 bg-accent-saffron/5 p-5 rounded-2xl space-y-4"
                  >
                    <div className="flex items-center space-x-2">
                      <Sparkles className="text-accent-saffron animate-pulse" size={14} />
                      <span className="text-xs font-black uppercase text-accent-saffron">Rythu Mitra Subfields</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label className="text-[11px] leading-tight font-black text-text-secondary uppercase mb-1.5" htmlFor="ctz-acres">
                          Owned Cultivable Land (Acres) *
                        </label>
                        <input
                          type="number"
                          id="ctz-acres"
                          step="0.1"
                          placeholder="e.g. 2.5"
                          value={formData.land_acres !== undefined ? formData.land_acres : ''}
                          onChange={(e) => handleChange('land_acres', e.target.value === '' ? undefined : Number(e.target.value))}
                          className="bg-bg-base text-text-primary border border-border-main rounded-xl px-3 py-2 text-xs font-bold outline-none"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[11px] leading-tight font-black text-text-secondary uppercase mb-1.5" htmlFor="ctz-soil">
                          Irrigation Soil dry-type
                        </label>
                        <select
                          id="ctz-soil"
                          value={formData.soil_type || ''}
                          onChange={(e) => handleChange('soil_type', e.target.value)}
                          className="bg-bg-base text-text-primary border border-border-main rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="">-- Select Dry type --</option>
                          <option value="Black">Regur / Black Soil</option>
                          <option value="Red">Red Soil (AP Dry blocks)</option>
                          <option value="Alluvial">Alluvial (Delta river basin)</option>
                          <option value="Sandy">Sandy coastal belt</option>
                          <option value="Other">Other / Hard gravel</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Conditionally reveal Student educational parameters */}
                {formData.occupation === 'Student' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border border-accent-blue/10 bg-accent-blue/5 p-5 rounded-2xl space-y-4"
                  >
                    <div className="flex items-center space-x-2">
                      <Info className="text-accent-blue" size={14} />
                      <span className="text-xs font-black uppercase text-accent-blue">Vidya Deevena criteria</span>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[11px] leading-tight font-black text-text-secondary uppercase mb-1.5" htmlFor="student-lvl">
                        Level of current education
                      </label>
                      <select
                        id="student-lvl"
                        value={formData.student_level || ''}
                        onChange={(e) => handleChange('student_level', e.target.value)}
                        className="bg-bg-base text-text-primary border border-border-main rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="">-- Choose level --</option>
                        <option value="School">School Level (Primary/High)</option>
                        <option value="Intermediate">Intermediate / 12th Class</option>
                        <option value="Undergraduate">Undergraduate (BTech, BSc, etc)</option>
                        <option value="Postgraduate">Postgraduate (MTech, MSc, etc)</option>
                        <option value="Diploma">Polytechnic / ITI Diploma</option>
                        <option value="Other">Other Certificate / Coaching</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* STEP 5: HOUSE PROPERTIES AND EXISTING WELFARES */}
            {step === 5 && (
              <motion.div 
                key="step5"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="space-y-6"
              >
                {/* House parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className="text-xs font-black text-text-secondary uppercase mb-2">
                      Own permanent house?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Yes', 'No'].map(op => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => {
                            handleChange('own_house', op);
                            if (op === 'No') handleChange('house_type', undefined);
                          }}
                          className={`py-3 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                            formData.own_house === op
                              ? 'bg-accent-saffron/15 border-accent-saffron text-accent-saffron'
                              : 'bg-bg-base border-border-main text-text-secondary hover:border-text-secondary'
                          }`}
                        >
                          {op === 'Yes' ? (language === 'te' ? 'అవును' : 'Yes') : (language === 'te' ? 'కాదు' : 'No')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.own_house === 'Yes' && (
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-text-secondary uppercase mb-2">
                        Physical Structure Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: 'Pucca', text: 'Pucca (Cement)' },
                          { val: 'Kutcha', text: 'Kutcha (Thatch)' }
                        ].map(ht => (
                          <button
                            key={ht.val}
                            type="button"
                            onClick={() => handleChange('house_type', ht.val)}
                            className={`py-3 rounded-xl border font-bold text-[11px] sm:text-xs cursor-pointer transition-colors ${
                              formData.house_type === ht.val
                                ? 'bg-accent-blue/15 border-accent-blue text-accent-blue'
                                : 'bg-bg-base border-border-main text-text-secondary hover:border-text-secondary'
                            }`}
                          >
                            {ht.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* DBT Active Bank toggle */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-black text-text-secondary uppercase">
                      Direct Benefit Transfer / Active Bank Account
                    </label>
                    <span className="text-[11px] leading-tight bg-[#10B981]/15 text-[#10B981] font-bold px-2 py-0.5 rounded">DBT COMPLIANT</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Yes', 'No'].map((ba) => (
                      <button
                        key={ba}
                        type="button"
                        onClick={() => handleChange('bank_account', ba)}
                        className={`py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                          formData.bank_account === ba
                            ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981]'
                            : 'bg-bg-base border-border-main text-text-secondary'
                        }`}
                      >
                        {ba === 'Yes' ? (language === 'te' ? 'బ్యాంక్ ఖాతా ఉంది' : 'Bank Active') : (language === 'te' ? 'ఖాతా లేదు' : 'No Account')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Multi selection existing receiving welfares */}
                <div className="flex flex-col">
                  <label className="text-xs font-black text-text-secondary uppercase mb-3">
                    {t('wizard.field.existing_schemes')}
                  </label>
                  <div className="grid grid-cols-2 gap-2" id="existing-schemes-chk-grid">
                    {EXISTING_SCHEMES_LIST.map((sch) => {
                      const isChecked = (formData.existing_schemes || []).includes(sch);
                      return (
                        <button
                          key={sch}
                          type="button"
                          onClick={() => toggleScheme(sch)}
                          className={`flex items-center justify-between px-3.5 py-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-accent-saffron/10 border-accent-saffron text-accent-saffron'
                              : 'bg-bg-base/40 border-border-main text-text-secondary hover:border-text-secondary'
                          }`}
                        >
                          <span className="text-[11px] leading-tight font-black">{sch}</span>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center text-white ${
                            isChecked ? 'bg-accent-saffron border-accent-saffron' : 'border-text-muted'
                          }`}>
                            {isChecked && <CheckCircle size={10} className="stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: SUMMARISED VERIFICATION VERDICT - EDIT AND DRILL BACK CAPABILITY */}
            {step === 6 && (
              <motion.div 
                key="step6"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="space-y-4"
              >
                <div className="bg-bg-elevated/40 border border-border-subtle rounded-2xl p-3 flex items-start space-x-2">
                  <CheckCircle className="text-accent-saffron shrink-0 mt-0.5" size={15} />
                  <p className="text-[11px] leading-tight font-semibold text-text-secondary leading-relaxed">
                    Check your details below. Click the small edit icon beside any section to return instantly and make modifications.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="review-cards-matrix">
                  {/* Card Section 1: Who are you */}
                  <div className="bg-bg-base/30 border border-border-default rounded-2xl p-4 relative group">
                    <button 
                      onClick={() => setStep(1)}
                      className="absolute top-3 right-3 p-1 text-text-muted hover:text-accent-saffron bg-bg-surface border border-border-subtle rounded-lg cursor-pointer"
                    >
                      <Edit2 size={11} />
                    </button>
                    <div className="flex items-center space-x-2 text-text-muted mb-2">
                      <User size={13} />
                      <span className="text-[11px] leading-tight font-black uppercase tracking-wider">Identity</span>
                    </div>
                    <div className="space-y-1 text-xs text-text-secondary font-bold">
                      <p>Name: <span className="text-text-primary font-black">{formData.name}</span></p>
                      <p>Age/Sex: <span className="text-text-primary">{formData.age} • {formData.gender}</span></p>
                      <p>Category: <span className="text-text-primary">{formData.caste_category || 'General'}</span></p>
                      <p>Disability: <span className="text-text-primary">{formData.disability || 'No'}</span></p>
                    </div>
                  </div>

                  {/* Card Section 2: Address */}
                  <div className="bg-bg-base/30 border border-border-default rounded-2xl p-4 relative">
                    <button 
                      onClick={() => setStep(2)}
                      className="absolute top-3 right-3 p-1 text-text-muted hover:text-accent-saffron bg-bg-surface border border-border-subtle rounded-lg cursor-pointer"
                    >
                      <Edit2 size={11} />
                    </button>
                    <div className="flex items-center space-x-2 text-text-muted mb-2">
                      <MapPin size={13} />
                      <span className="text-[11px] leading-tight font-black uppercase tracking-wider">Geography</span>
                    </div>
                    <div className="space-y-1 text-xs text-text-secondary font-bold">
                      <p>State: <span className="text-text-primary">{formData.state}</span></p>
                      <p>District: <span className="text-text-primary">{formData.district || 'Not Chosen'}</span></p>
                      <p>Mandal: <span className="text-text-primary">{formData.mandal || 'N/A'}</span></p>
                      <p>Habitation: <span className="text-text-primary">{formData.habitation}</span></p>
                    </div>
                  </div>

                  {/* Card Section 3: Economics */}
                  <div className="bg-bg-base/30 border border-border-default rounded-2xl p-4 relative">
                    <button 
                      onClick={() => setStep(3)}
                      className="absolute top-3 right-3 p-1 text-text-muted hover:text-accent-saffron bg-bg-surface border border-border-subtle rounded-lg cursor-pointer"
                    >
                      <Edit2 size={11} />
                    </button>
                    <div className="flex items-center space-x-2 text-text-muted mb-2">
                      <Landmark size={13} />
                      <span className="text-[11px] leading-tight font-black uppercase tracking-wider">Household</span>
                    </div>
                    <div className="space-y-1 text-xs text-text-secondary font-bold">
                      <p>Members: <span className="text-text-primary">{formData.family_members} Persons</span></p>
                      <p>Income: <span className="text-text-primary font-black">₹{formData.income_annual?.toLocaleString()}</span></p>
                      <p>Ration Card: <span className="text-text-primary font-bold">{formData.ration_card} Card</span></p>
                    </div>
                  </div>

                  {/* Card Section 4: Occupation */}
                  <div className="bg-bg-base/30 border border-border-default rounded-2xl p-4 relative">
                    <button 
                      onClick={() => setStep(4)}
                      className="absolute top-3 right-3 p-1 text-text-muted hover:text-accent-saffron bg-bg-surface border border-border-subtle rounded-lg cursor-pointer"
                    >
                      <Edit2 size={11} />
                    </button>
                    <div className="flex items-center space-x-2 text-text-muted mb-2">
                      <Briefcase size={13} />
                      <span className="text-[11px] leading-tight font-black uppercase tracking-wider">Education & Labor</span>
                    </div>
                    <div className="space-y-1 text-xs text-text-secondary font-bold">
                      <p>Occupation: <span className="text-text-primary font-black">{formData.occupation || 'N/A'}</span></p>
                      {formData.occupation === 'Farmer' && (
                        <>
                          <p>Land Acres: <span className="text-text-primary">{formData.land_acres} Acres</span></p>
                          <p>Soil Dry Type: <span className="text-text-primary">{formData.soil_type || 'Mixed'}</span></p>
                        </>
                      )}
                      {formData.occupation === 'Student' && (
                        <p>Edu Level: <span className="text-text-primary">{formData.student_level || 'School'}</span></p>
                      )}
                    </div>
                  </div>

                  {/* Card Section 5: Property and Assets */}
                  <div className="bg-bg-base/30 border border-border-default rounded-2xl p-4 relative sm:col-span-2">
                    <button 
                      onClick={() => setStep(5)}
                      className="absolute top-3 right-3 p-1 text-text-muted hover:text-accent-saffron bg-bg-surface border border-border-subtle rounded-lg cursor-pointer"
                    >
                      <Edit2 size={11} />
                    </button>
                    <div className="flex items-center space-x-2 text-text-muted mb-2">
                      <Home size={13} />
                      <span className="text-[11px] leading-tight font-black uppercase tracking-wider">Property & Welfare</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-text-secondary font-bold">
                      <div>
                        <p>Own House: <span className="text-text-primary">{formData.own_house}</span></p>
                        {formData.own_house === 'Yes' && <p>House structure: <span className="text-text-primary">{formData.house_type || 'Pucca'}</span></p>}
                        <p>DBT Bank Active: <span className="text-text-primary">{formData.bank_account || 'Yes'}</span></p>
                      </div>
                      <div>
                        <p className="text-[11px] leading-tight uppercase text-text-muted">Already receiving:</p>
                        <p className="text-text-primary mt-0.5 truncate">{formData.existing_schemes?.join(', ') || 'None'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wizard Footer bar */}
        <div className="px-6 sm:px-8 py-5 border-t border-border-subtle bg-bg-base/40 flex justify-between items-center animate-fade-in" id="wizard-control-footer">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center space-x-1 px-4 py-2.5 text-sm font-bold text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-xl transition-all cursor-pointer"
              id="wizard-back-btn"
            >
              <ArrowLeft size={16} />
              <span>{t('wizard.btn.back')}</span>
            </button>
          ) : (
            <button
              onClick={() => setView('landing')}
              className="flex items-center space-x-1 px-4 py-2.5 text-sm font-bold text-text-muted hover:text-text-secondary rounded-xl cursor-pointer"
              id="wizard-cancel-btn"
            >
              <span>Cancel</span>
            </button>
          )}

          {step < 6 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 text-white rounded-xl font-bold text-sm shadow-md cursor-pointer flex items-center space-x-1 transition-all active:scale-[0.98]"
              style={{
                backgroundColor: '#0f172a', // Premium deep slate-900 yielding > 18:1 maximum contrast ratio against white text
                textShadow: '0px 1px 3px rgba(0, 0, 0, 0.90), 0px 0px 1.5px rgba(0, 0, 0, 0.90)' // Maximum legibility outline for low-vision accessibility
              }}
              id="wizard-next-btn"
            >
              <span>{t('wizard.btn.next')}</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`saffron-gradient-btn px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 cursor-pointer relative ${
                isLoading ? 'opacity-80 cursor-not-allowed' : ''
              }`}
              id="wizard-submit-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{t('wizard.searching')}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>{t('wizard.btn.submit')}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
