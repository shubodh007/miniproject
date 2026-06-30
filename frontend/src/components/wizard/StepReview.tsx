import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Edit2, User, MapPin, Landmark, Briefcase, Home } from 'lucide-react';
import { ProfilePayload } from '../../types';

export interface StepReviewProps {
  formData: Partial<ProfilePayload>;
  setStep: (step: number) => void;
  direction: number;
  stepVariants: any;
}

export const StepReview: React.FC<StepReviewProps> = ({
  formData,
  setStep,
  direction,
  stepVariants,
}) => {
  return (
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
  );
};
