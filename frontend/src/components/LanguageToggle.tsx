import React from 'react';
import { useTranslation } from '../i18n';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <div 
      className="flex flex-row overflow-x-auto gap-1 scrollbar-none pb-0.5 bg-bg-elevated border border-border-main rounded-full p-1" 
      style={{ WebkitOverflowScrolling: 'touch' }}
      id="language-toggle"
      role="radiogroup" 
      aria-label="Select Portal Language"
    >
      <button
        onClick={() => setLanguage('en')}
        role="radio"
        aria-checked={language === 'en'}
        aria-label="English language selector (English)"
        className={`min-w-fit min-h-[44px] px-3 py-2 flex-shrink-0 whitespace-nowrap text-xs font-bold rounded-full transition-all duration-250 cursor-pointer ${
          language === 'en'
            ? 'bg-accent-saffron text-white shadow-sm shadow-accent-saffron/20 border-2 border-[var(--accent-primary)]'
            : 'text-text-secondary hover:text-text-primary'
        }`}
        style={language === 'en' ? { boxShadow: '0 0 12px var(--color-accent-glow)' } : undefined}
        id="lang-btn-en"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('te')}
        role="radio"
        aria-checked={language === 'te'}
        aria-label="Telugu language selector (తెలుగు)"
        className={`min-w-fit min-h-[44px] px-3 py-2 flex-shrink-0 whitespace-nowrap text-xs font-bold rounded-full transition-all duration-250 cursor-pointer ${
          language === 'te'
            ? 'bg-accent-saffron text-white shadow-sm shadow-accent-saffron/20 border-2 border-[var(--accent-primary)]'
            : 'text-text-secondary hover:text-text-primary'
        }`}
        style={language === 'te' ? { boxShadow: '0 0 12px var(--color-accent-glow)' } : undefined}
        id="lang-btn-te"
      >
        తె
      </button>
    </div>
  );
};
