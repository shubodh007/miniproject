import React from 'react';
import { useTranslation } from '../i18n';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <div 
      className="flex bg-bg-elevated border border-border-main rounded-full p-1" 
      id="language-toggle"
      role="radiogroup" 
      aria-label="Select Portal Language"
    >
      <button
        onClick={() => setLanguage('en')}
        role="radio"
        aria-checked={language === 'en'}
        aria-label="English language selector (English)"
        className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-250 cursor-pointer ${
          language === 'en'
            ? 'bg-accent-saffron text-white shadow-sm shadow-[#FF8C00]/20'
            : 'text-text-secondary hover:text-text-primary'
        }`}
        id="lang-btn-en"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('te')}
        role="radio"
        aria-checked={language === 'te'}
        aria-label="Telugu language selector (తెలుగు)"
        className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-250 cursor-pointer ${
          language === 'te'
            ? 'bg-accent-saffron text-white shadow-sm shadow-[#FF8C00]/20'
            : 'text-text-secondary hover:text-text-primary'
        }`}
        id="lang-btn-te"
      >
        తె
      </button>
    </div>
  );
};
