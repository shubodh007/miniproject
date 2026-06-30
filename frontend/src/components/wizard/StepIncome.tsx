import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Sparkles, Info, CheckCircle } from 'lucide-react';
import { ProfilePayload } from '../../types';

export interface StepIncomeProps {
  step: number;
  direction: number;
  stepVariants: any;
  formData: Partial<ProfilePayload>;
  localFamilyMembers: number;
  setLocalFamilyMembers: (val: number) => void;
  localIncomeAnnual: number;
  setLocalIncomeAnnual: (val: number) => void;
  localLandAcres: string;
  setLocalLandAcres: (val: string) => void;
  errors: Record<string, string>;
  handleChange: (field: string, value: any) => void;
  handleBlur: (field: string) => void;
  toggleScheme: (scheme: string) => void;
  language: string;
  t: (key: string) => string;
}

const OCCUPATIONS = [
  "Farmer", "Agricultural Labourer", "Daily Wage Worker", "Self-Employed", 
  "Government Employee", "Private Salaried", "Student", "Unemployed", "Retired", "Other"
];

const EXISTING_SCHEMES_LIST = [
  "PM-KISAN", "PMAY", "NTR Bharosa Pension", "Aarogyasri", "YSR Rythu Bharosa", "Kalyana Lakshmi"
];

export const StepIncome: React.FC<StepIncomeProps> = ({
  step,
  direction,
  stepVariants,
  formData,
  localFamilyMembers,
  setLocalFamilyMembers,
  localIncomeAnnual,
  setLocalIncomeAnnual,
  localLandAcres,
  setLocalLandAcres,
  errors,
  handleChange,
  handleBlur,
  toggleScheme,
  language,
  t,
}) => {
  return (
    <>
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
              <label id="family-members-label" className="text-xs font-black text-text-secondary uppercase" htmlFor="family-members-input">
                Number of Family Members
              </label>
              <span className="bg-accent-blue/10 text-accent-blue font-bold text-xs px-2.5 py-0.5 rounded-full font-mono">
                {localFamilyMembers} Persons
              </span>
            </div>
            <input
              type="range"
              id="family-members-input"
              aria-labelledby="family-members-label"
              min="1"
              max="15"
              value={localFamilyMembers}
              onChange={(e) => setLocalFamilyMembers(Number(e.target.value))}
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
              <label id="income-annual-label" className="text-xs font-black text-text-primary uppercase" htmlFor="income-annual-input">
                Annual Household Income
              </label>
              <span className="text-accent-saffron font-black text-sm font-mono">
                ₹{localIncomeAnnual?.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[11px] leading-tight text-text-muted font-semibold mb-3">
              Calculated Slab: {
                (localIncomeAnnual || 0) <= 150000 ? '🔴 BPL Target (Below 1.5 Lakhs)' :
                (localIncomeAnnual || 0) <= 300000 ? '🟠 Low Income (1.5 - 3 Lakhs)' :
                (localIncomeAnnual || 0) <= 600000 ? '🟡 Medium Slab (3 - 6 Lakhs)' :
                '🟢 High Income Slab (Above 6 Lakhs)'
              }
            </p>
            <input
              type="range"
              id="income-annual-input"
              aria-labelledby="income-annual-label"
              min="0"
              max="10000000"
              step="25000"
              value={localIncomeAnnual || 0}
              onChange={(e) => setLocalIncomeAnnual(Number(e.target.value))}
              className="w-full h-2 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent-saffron"
            />
            <div className="flex justify-between text-[11px] leading-tight text-text-muted font-mono mt-1.5 font-bold">
              <span>₹0</span>
              <span>₹1.5 Lakhs</span>
              <span>₹5 Lakhs</span>
              <span>₹20 Lakhs</span>
              <span>₹1 Crore</span>
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
              required
              aria-required="true"
              aria-label="Primary Occupation"
              value={formData.occupation || ''}
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
              aria-invalid={errors.occupation ? "true" : "false"}
              aria-describedby={errors.occupation ? "occupation-error" : undefined}
              className="bg-bg-base text-text-primary border border-border-main rounded-xl px-4 py-3 text-sm font-semibold outline-none cursor-pointer"
            >
              <option value="">-- Choose Category --</option>
              {OCCUPATIONS.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            {errors.occupation && (
              <span id="occupation-error" role="alert" className="text-xs font-bold text-error mt-1 flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {errors.occupation}
              </span>
            )}
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
                    required
                    aria-required="true"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 2.5"
                    value={localLandAcres}
                    onChange={(e) => setLocalLandAcres(e.target.value)}
                    className="bg-bg-base text-text-primary border border-border-main rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[11px] leading-tight font-black text-text-secondary uppercase mb-1.5" htmlFor="ctz-soil">
                    Irrigation Soil dry-type
                  </label>
                  <select
                    id="ctz-soil"
                    aria-label="Irrigation Soil dry-type"
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
                  aria-label="Level of current education"
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
              <span className="text-[11px] leading-tight bg-success/15 text-success font-bold px-2 py-0.5 rounded">DBT COMPLIANT</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['Yes', 'No'].map((ba) => (
                <button
                  key={ba}
                  type="button"
                  onClick={() => handleChange('bank_account', ba)}
                  className={`py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                    formData.bank_account === ba
                      ? 'bg-success/15 border-success text-success'
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
    </>
  );
};
