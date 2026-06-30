import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ArrowRight, Sparkles, Loader2, Info, AlertCircle, MapPin 
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { ProfilePayload } from '../types';
import { useToast } from './ToastProvider';

// Import subcomponents
import { StepPersonalInfo } from './wizard/StepPersonalInfo';
import { StepLocation } from './wizard/StepLocation';
import { StepIncome } from './wizard/StepIncome';
import { StepReview } from './wizard/StepReview';

interface ProfileWizardProps {
  onSearch: (payload: ProfilePayload) => void;
  isLoading: boolean;
  errorMsg: string | null;
  setView: (v: string) => void;
}

interface WizardDraft {
  step: number;
  formData: Partial<ProfilePayload>;
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

export const ProfileWizard: React.FC<ProfileWizardProps> = ({ onSearch, isLoading, errorMsg, setView }) => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [draftToResume, setDraftToResume] = useState<WizardDraft | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState<boolean>(false);
  const [announcerMessage, setAnnouncerMessage] = useState<string>('');
  const isDraftInitialized = React.useRef(false);

  const stepVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 })
  };
  
  const [formData, setFormData] = useState<Partial<ProfilePayload>>({
    name: '', age: undefined, gender: '', income_annual: 120000, occupation: '',
    family_members: 4, land_acres: undefined, bpl_card: 'BPL', state: 'Andhra Pradesh',
    district: '', caste_category: '', sub_caste: '', existing_schemes: [], language: language,
    disability: 'No', mandal: '', habitation: 'Rural', ration_card: 'White', soil_type: undefined,
    student_level: undefined, own_house: 'No', house_type: undefined, bank_account: 'Yes'
  });

  React.useEffect(() => {
    const sessionSaved = sessionStorage.getItem('sc-wizard-draft');
    if (sessionSaved) {
      try {
        const parsed = JSON.parse(sessionSaved) as WizardDraft;
        if (parsed && typeof parsed.step === 'number' && parsed.formData) {
          setDraftToResume(parsed);
          setShowResumeBanner(true);
        }
      } catch (e) {
        console.error('Error reloading sessionStorage wizard draft', e);
      }
    }
    isDraftInitialized.current = true;
  }, []);

  React.useEffect(() => {
    if (!isDraftInitialized.current || showResumeBanner) return;
    try {
      sessionStorage.setItem('sc-wizard-draft', JSON.stringify({ step, formData }));
    } catch (err) {
      console.error('[ProfileWizard] Error saving draft:', err);
    }
  }, [formData, step, showResumeBanner]);

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasEntries = !!((formData.name && formData.name.trim().length > 0) || formData.age !== undefined || formData.gender !== '' || formData.district !== '');
      if (hasEntries) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (step < 6) handleNext(); else handleSubmit();
        }
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (step < 6) handleNext(); else handleSubmit();
      } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        e.preventDefault();
        if (step > 1) handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, formData]);

  const handleResumeDraft = () => {
    if (draftToResume) {
      setStep(draftToResume.step);
      if (draftToResume.formData) setFormData(prev => ({ ...prev, ...draftToResume.formData }));
      setShowResumeBanner(false);
    }
  };

  const handleDismissDraft = () => setShowResumeBanner(false);

  const handleWizardReset = () => {
    sessionStorage.removeItem('sc-wizard-draft');
    setShowResumeBanner(false);
    setStep(1);
    setFormData({
      name: '', age: undefined, gender: '', income_annual: 120000, occupation: '',
      family_members: 4, land_acres: undefined, bpl_card: 'BPL', state: 'Andhra Pradesh',
      district: '', caste_category: '', sub_caste: '', existing_schemes: [], language: language,
      disability: 'No', mandal: '', habitation: 'Rural', ration_card: 'White', soil_type: undefined,
      student_level: undefined, own_house: 'No', house_type: undefined, bank_account: 'Yes'
    });
    setErrors({});
    setTouched({});
    setDistrictSearch('');
  };

  const [districtSearch, setDistrictSearch] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const handleAutoDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation not supported on this device');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`, { headers: { 'User-Agent': 'SchemeConnectAP/1.0' } });
          const data = await response.json();
          const address = data.address;
          if (!address) {
            toast.warning('Could not resolve address details. Please select manually.');
            return;
          }
          const rawDistrict = address.county || address.district || address.state_district || '';
          const rawState = address.state || '';
          const detectedState = rawState.includes('Andhra') ? 'Andhra Pradesh' : rawState.includes('Telangana') ? 'Telangana' : (formData.state || 'Andhra Pradesh');
          const allDistricts = detectedState === 'Andhra Pradesh' ? AP_DISTRICTS : TS_DISTRICTS;
          const matchedDistrict = allDistricts.find(d => d.toLowerCase().includes(rawDistrict.toLowerCase()) || rawDistrict.toLowerCase().includes(d.toLowerCase())) || '';
          
          if (matchedDistrict) {
            setFormData(prev => ({ ...prev, state: detectedState, district: matchedDistrict }));
            setDistrictSearch(matchedDistrict);
            setLocalDistrict(matchedDistrict);
            setErrors(prev => ({ ...prev, district: '' }));
            toast.success(`Location detected: ${matchedDistrict}, ${detectedState}`);
          } else {
            toast.warning(`Could not match district "${rawDistrict}". Please select manually.`);
          }
        } catch (e) {
          toast.error('Location lookup failed. Please select your district manually.');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === 1) {
          toast.warning(language === 'te' ? 'స్థాన అనుమతి నిరాకరించబడింది' : 'Location permission denied. Select manually.');
        } else {
          toast.error('Could not get location. Please select your district manually.');
        }
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  const [localName, setLocalName] = useState(formData.name || '');
  const [localAge, setLocalAge] = useState(formData.age !== undefined ? String(formData.age) : '');
  const [localDistrict, setLocalDistrict] = useState(districtSearch || formData.district || '');
  const [localMandal, setLocalMandal] = useState(formData.mandal || '');
  const [localLandAcres, setLocalLandAcres] = useState(formData.land_acres !== undefined ? String(formData.land_acres) : '');
  const [localFamilyMembers, setLocalFamilyMembers] = useState(formData.family_members || 4);
  const [localIncomeAnnual, setLocalIncomeAnnual] = useState(formData.income_annual || 120000);

  React.useEffect(() => { setLocalName(formData.name || ''); }, [formData.name]);
  React.useEffect(() => { setLocalAge(formData.age !== undefined ? String(formData.age) : ''); }, [formData.age]);
  React.useEffect(() => { setLocalDistrict(formData.district || ''); }, [formData.district]);
  React.useEffect(() => { setLocalMandal(formData.mandal || ''); }, [formData.mandal]);
  React.useEffect(() => { setLocalLandAcres(formData.land_acres !== undefined ? String(formData.land_acres) : ''); }, [formData.land_acres]);
  React.useEffect(() => { setLocalFamilyMembers(formData.family_members || 4); }, [formData.family_members]);
  React.useEffect(() => { setLocalIncomeAnnual(formData.income_annual || 120000); }, [formData.income_annual]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = localAge === '' ? undefined : Number(localAge);
      if (parsed !== formData.age) handleChange('age', parsed);
    }, 300);
    return () => clearTimeout(timer);
  }, [localAge]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = localLandAcres === '' ? undefined : Number(localLandAcres);
      if (parsed !== formData.land_acres) handleChange('land_acres', parsed);
    }, 300);
    return () => clearTimeout(timer);
  }, [localLandAcres]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localFamilyMembers !== formData.family_members) handleChange('family_members', localFamilyMembers);
    }, 300);
    return () => clearTimeout(timer);
  }, [localFamilyMembers]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localIncomeAnnual !== formData.income_annual) handleChange('income_annual', localIncomeAnnual);
    }, 300);
    return () => clearTimeout(timer);
  }, [localIncomeAnnual]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const activeErrorMessages: string[] = [];
    if (step === 1) {
      if (errors.name) activeErrorMessages.push(errors.name);
      if (errors.age) activeErrorMessages.push(errors.age);
      if (errors.gender) activeErrorMessages.push(errors.gender);
      if (errors.caste_category) activeErrorMessages.push(errors.caste_category);
    } else if (step === 2) {
      if (errors.district) activeErrorMessages.push(errors.district);
      if (errors.mandal) activeErrorMessages.push(errors.mandal);
    } else if (step === 4) {
      if (errors.occupation) activeErrorMessages.push(errors.occupation);
    }
    setAnnouncerMessage(activeErrorMessages.length > 0 ? activeErrorMessages.join(' ') : '');
  }, [errors, step]);

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
        if (!value) err = language === 'te' ? 'దయచేసి లింగాన్ని ఎంచుకోండి.' : 'Please select your gender.';
        break;
      case 'caste_category':
        if (!value) err = language === 'te' ? 'దయచేసి కుల వర్గాన్ని ఎంచుకోండి.' : 'Please select your caste category.';
        break;
      case 'district':
        if (!value) err = language === 'te' ? 'దయచేసి మీ జిల్లా ఎంచుకోండి.' : 'Please select your district.';
        break;
      case 'mandal':
        if (!value || String(value).trim().length === 0) err = language === 'te' ? 'దయచేసి మండలం పేరు టైప్ చేయండి.' : 'Please type your Mandal name.';
        break;
      case 'occupation':
        if (!value) err = language === 'te' ? 'వృత్తిని ఎంచుకోండి.' : 'Please select your occupation.';
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
    if (touched[field]) validateField(field, value);
  };

  const toggleScheme = (scheme: string) => {
    const current = formData.existing_schemes || [];
    const updated = current.includes(scheme) ? current.filter(s => s !== scheme) : [...current, scheme];
    handleChange('existing_schemes', updated);
  };

  const handleNext = () => {
    let isValid = true;
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
    } else if (step === 4) {
      isValid = validateField('occupation', formData.occupation);
      setTouched(prev => ({ ...prev, occupation: true }));
    }

    if (isValid) {
      setDirection(1);
      setStep(prev => prev + 1);
    } else {
      toast.error(language === 'te' ? 'దయచేసి అన్ని కావలసిన ఫీల్డ్‌లను పూరించండి' : 'Please fill all required fields');
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    sessionStorage.removeItem('sc-wizard-draft');
    onSearch({
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
      disability: formData.disability || 'No',
      mandal: formData.mandal || '',
      habitation: formData.habitation || 'Rural',
      ration_card: formData.ration_card || 'White',
      soil_type: formData.soil_type,
      student_level: formData.student_level,
      own_house: formData.own_house || 'No',
      house_type: formData.house_type,
      bank_account: formData.bank_account || 'Yes'
    });
  };

  const baseDistricts = formData.state === 'Andhra Pradesh' ? AP_DISTRICTS : TS_DISTRICTS;
  const filteredDistricts = baseDistricts.filter(d => d.toLowerCase().includes(districtSearch.toLowerCase()));

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center justify-center px-4" id="wizard-viewport">
      <div className="w-full max-w-3xl bg-bg-surface border border-border-main rounded-3xl overflow-hidden shadow-2xl relative" id="wizard-card">
        
        {/* Step progress bar background strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-bg-elevated flex">
          {[1,2,3,4,5,6].map((i) => (
            <div 
              key={i}
              className={`flex-1 h-full transition-all duration-300 ${
                i <= step ? 'bg-accent-saffron' : 'bg-transparent border-r border-border-subtle/40'
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

        {/* Session recovery prompt banner */}
        {showResumeBanner && draftToResume && (
          <div className="mx-6 sm:mx-8 mt-6 bg-accent-blue/10 border border-accent-blue/20 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-text-primary animate-in fade-in slide-in-from-top-2" id="wizard-resume-banner">
            <div className="flex items-start space-x-3">
              <Info size={20} className="text-accent-blue shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">{language === 'te' ? 'మీరు మీ మునుపటి పురోగతిని మళ్ళీ ప్రారంభించవచ్చు.' : 'Resume your saved progress?'}</p>
                <p className="text-xs text-text-secondary mt-0.5 font-medium">
                  {language === 'te' ? `దశ ${draftToResume.step} లో ఆపివేయబడింది (${draftToResume.formData.name || 'సహాయకుడు'})` : `Step ${draftToResume.step} in progress (${draftToResume.formData.name || 'Anonymous'})`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResumeDraft}
                className="bg-accent-blue hover:bg-accent-blue/80 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {language === 'te' ? 'ప్రారంభించు' : 'Resume'}
              </button>
              <button
                type="button"
                onClick={handleDismissDraft}
                className="text-text-secondary hover:text-text-primary border border-border-main hover:bg-bg-elevated text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {language === 'te' ? 'తిరస్కరించు' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}

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
          <div aria-live="assertive" role="alert" className="sr-only" id="wizard-error-announcer">
            {announcerMessage}
          </div>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <StepPersonalInfo
                formData={formData}
                localName={localName}
                setLocalName={setLocalName}
                localAge={localAge}
                setLocalAge={setLocalAge}
                errors={errors}
                handleChange={handleChange}
                handleBlur={handleBlur}
                direction={direction}
                stepVariants={stepVariants}
                language={language}
                t={t}
              />
            )}

            {step === 2 && (
              <StepLocation
                formData={formData}
                localDistrict={localDistrict}
                setLocalDistrict={setLocalDistrict}
                localMandal={localMandal}
                setLocalMandal={setLocalMandal}
                districtSearch={districtSearch}
                setDistrictSearch={setDistrictSearch}
                isLocating={isLocating}
                handleAutoDetectLocation={handleAutoDetectLocation}
                filteredDistricts={filteredDistricts}
                errors={errors}
                handleChange={handleChange}
                handleBlur={handleBlur}
                direction={direction}
                stepVariants={stepVariants}
                language={language}
                t={t}
              />
            )}

            {(step === 3 || step === 4 || step === 5) && (
              <StepIncome
                step={step}
                direction={direction}
                stepVariants={stepVariants}
                formData={formData}
                localFamilyMembers={localFamilyMembers}
                setLocalFamilyMembers={setLocalFamilyMembers}
                localIncomeAnnual={localIncomeAnnual}
                setLocalIncomeAnnual={setLocalIncomeAnnual}
                localLandAcres={localLandAcres}
                setLocalLandAcres={setLocalLandAcres}
                errors={errors}
                handleChange={handleChange}
                handleBlur={handleBlur}
                toggleScheme={toggleScheme}
                language={language}
                t={t}
              />
            )}

            {step === 6 && (
              <StepReview
                formData={formData}
                setStep={setStep}
                direction={direction}
                stepVariants={stepVariants}
              />
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
              className="px-6 py-2.5 bg-bg-surface-raised border border-border-default hover:bg-bg-surface-raised/80 text-white rounded-xl font-bold text-sm shadow-md cursor-pointer flex items-center space-x-1 transition-all active:scale-[0.98]"
              style={{
                textShadow: '0px 1px 3px rgba(0, 0, 0, 0.90), 0px 0px 1.5px rgba(0, 0, 0, 0.90)'
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
