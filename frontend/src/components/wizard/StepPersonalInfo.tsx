import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { ProfilePayload } from '../../types';

export interface StepPersonalInfoProps {
  formData: Partial<ProfilePayload>;
  localName: string;
  setLocalName: (val: string) => void;
  localAge: string;
  setLocalAge: (val: string) => void;
  errors: Record<string, string>;
  handleChange: (field: string, value: any) => void;
  handleBlur: (field: string) => void;
  direction: number;
  stepVariants: any;
  language: string;
  t: (key: string) => string;
}

const CASTES = ["General", "OBC", "SC", "ST", "Minority"];

export const StepPersonalInfo: React.FC<StepPersonalInfoProps> = ({
  formData,
  localName,
  setLocalName,
  localAge,
  setLocalAge,
  errors,
  handleChange,
  handleBlur,
  direction,
  stepVariants,
  language,
  t,
}) => {
  return (
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
          required
          aria-required="true"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => {
            handleChange('name', localName);
            handleBlur('name');
          }}
          placeholder={language === 'te' ? 'ఉదా: రాముడు' : 'e.g. Ramanjaneyulu'}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={`bg-bg-base text-text-primary border rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all ${
            errors.name ? 'border-error focus:ring-1 focus:ring-error' : 'border-border-main focus:border-accent-saffron focus:ring-1'
          }`}
        />
        {errors.name && (
          <span id="name-error" role="alert" className="text-xs font-bold text-error mt-1.5 flex items-center">
            <AlertCircle size={12} className="mr-1" />
            {errors.name}
          </span>
        )}
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
            min={0}
            max={120}
            required
            aria-required="true"
            value={localAge}
            onChange={(e) => setLocalAge(e.target.value)}
            onBlur={() => handleBlur('age')}
            placeholder="e.g. 45"
            aria-invalid={errors.age ? "true" : "false"}
            aria-describedby={errors.age ? "age-error" : undefined}
            className={`bg-bg-base text-text-primary border rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all ${
              errors.age ? 'border-error focus:ring-1 focus:ring-error' : 'border-border-main focus:border-accent-saffron'
            }`}
          />
          {errors.age && (
            <span id="age-error" role="alert" className="text-xs font-bold text-error mt-1.5 flex items-center">
              <AlertCircle size={12} className="mr-1" />
              {errors.age}
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-black text-text-secondary uppercase mb-2">
            {t('wizard.field.gender')} *
          </label>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Gender selection">
            {['Male', 'Female', 'Other'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleChange('gender', g)}
                aria-invalid={errors.gender ? "true" : "false"}
                aria-describedby={errors.gender ? "gender-error" : undefined}
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
          {errors.gender && (
            <span id="gender-error" className="text-xs font-bold text-error mt-1.5 flex items-center">
              <AlertCircle size={12} className="mr-1" />
              {errors.gender}
            </span>
          )}
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
            required
            aria-required="true"
            aria-label={language === 'te' ? 'కులం ఎంచుకోండి' : 'Select caste category'}
            value={formData.caste_category || ''}
            onChange={(e) => handleChange('caste_category', e.target.value)}
            onBlur={() => handleBlur('caste_category')}
            aria-invalid={errors.caste_category ? "true" : "false"}
            aria-describedby={errors.caste_category ? "caste-error" : undefined}
            className={`bg-bg-base text-text-primary border rounded-xl px-4 py-3 text-sm font-semibold outline-none cursor-pointer transition-all ${
              errors.caste_category ? 'border-error' : 'border-border-main'
            }`}
          >
            <option value="">{language === 'te' ? '-- కులం --' : '-- Select --'}</option>
            {CASTES.map((c) => (
              <option key={c} value={c}>{c === 'General' ? 'General / OC' : c}</option>
            ))}
          </select>
          {errors.caste_category && (
            <span id="caste-error" role="alert" className="text-xs font-bold text-error mt-1.5 flex items-center">
              <AlertCircle size={12} className="mr-1" />
              {errors.caste_category}
            </span>
          )}
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
  );
};
