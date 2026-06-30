import React from 'react';
import { motion } from 'motion/react';
import { Loader2, MapPin, Search, AlertCircle } from 'lucide-react';
import { ProfilePayload } from '../../types';

export interface StepLocationProps {
  formData: Partial<ProfilePayload>;
  localDistrict: string;
  setLocalDistrict: (val: string) => void;
  localMandal: string;
  setLocalMandal: (val: string) => void;
  districtSearch: string;
  setDistrictSearch: (val: string) => void;
  isLocating: boolean;
  handleAutoDetectLocation: () => Promise<void>;
  filteredDistricts: string[];
  errors: Record<string, string>;
  handleChange: (field: string, value: any) => void;
  handleBlur: (field: string) => void;
  direction: number;
  stepVariants: any;
  language: string;
  t: (key: string) => string;
}

export const StepLocation: React.FC<StepLocationProps> = ({
  formData,
  localDistrict,
  setLocalDistrict,
  localMandal,
  setLocalMandal,
  districtSearch,
  setDistrictSearch,
  isLocating,
  handleAutoDetectLocation,
  filteredDistricts,
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
                setLocalDistrict('');
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
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-black text-text-secondary uppercase animate-pulse-subtle" htmlFor="ctz-district">
            {t('wizard.field.district')} *
          </label>
          <div className="flex flex-col items-end">
            <button
              type="button"
              onClick={handleAutoDetectLocation}
              disabled={isLocating}
              className="flex items-center space-x-1.5 text-xs font-bold text-accent-blue hover:text-accent-blue/80 disabled:opacity-50 transition-colors cursor-pointer bg-accent-blue/10 hover:bg-accent-blue/20 px-3 py-1.5 rounded-xl border border-accent-blue/10"
              id="auto-detect-location-btn"
            >
              {isLocating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <MapPin size={14} />
              )}
              <span>{language === 'te' ? 'నా స్థానం ఉపయోగించు' : 'Use My Location'}</span>
            </button>
            <span className="text-[10px] text-text-muted mt-1">
              {language === 'te' ? 'ఈ పరికరం GPS ని ఉపయోగిస్తుంది' : 'Uses device GPS'}
            </span>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-text-muted" size={15} />
          <input
            type="text"
            id="ctz-district"
            required
            aria-required="true"
            placeholder="Type district to filter... (e.g. Guntur)"
            value={localDistrict}
            onChange={(e) => {
              setLocalDistrict(e.target.value);
              setDistrictSearch(e.target.value);
            }}
            onBlur={() => {
              handleChange('district', localDistrict);
              handleBlur('district');
            }}
            aria-invalid={errors.district ? "true" : "false"}
            aria-describedby={errors.district ? "district-error" : undefined}
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
                setLocalDistrict(d);
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
        {errors.district && (
          <span id="district-error" role="alert" className="text-xs font-bold text-error mt-1 flex items-center">
            <AlertCircle size={12} className="mr-1" />
            {errors.district}
          </span>
        )}
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
            required
            aria-required="true"
            value={localMandal}
            onChange={(e) => setLocalMandal(e.target.value)}
            onBlur={() => {
              handleChange('mandal', localMandal);
              handleBlur('mandal');
            }}
            placeholder="e.g. Tenali"
            aria-invalid={errors.mandal ? "true" : "false"}
            aria-describedby={errors.mandal ? "mandal-error" : undefined}
            className={`bg-bg-base text-text-primary border rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all ${
              errors.mandal ? 'border-error' : 'border-border-main'
            }`}
          />
          {errors.mandal && (
            <span id="mandal-error" role="alert" className="text-xs font-bold text-error mt-1.5 flex items-center">
              <AlertCircle size={12} className="mr-1" />
              {errors.mandal}
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-black text-text-secondary uppercase mb-2" htmlFor="ctz-habitation">
            Habitation Area Type *
          </label>
          <select
            id="ctz-habitation"
            required
            aria-required="true"
            aria-label="Habitation Area Type"
            value={formData.habitation || 'Rural'}
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
  );
};
