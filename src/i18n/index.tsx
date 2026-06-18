import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from './en.json';
import teTranslations from './te.json';
import { getSecuredStorage, setSecuredStorage } from '../utils/security';

type Language = 'en' | 'te';
type Theme = 'light' | 'dark';

interface TranslationContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextProps | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: enTranslations as Record<string, string>,
  te: teTranslations as Record<string, string>,
};

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = getSecuredStorage<Language>('sc_lang');
    return (saved === 'te' || saved === 'en') ? saved : 'en';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = getSecuredStorage<Theme>('sc_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    setSecuredStorage('sc_lang', language);
    const html = document.documentElement;
    html.setAttribute('lang', language);
    if (language === 'te') {
      html.style.fontFamily = "'Noto Sans Telugu', 'Noto Sans', sans-serif";
    } else {
      html.style.fontFamily = "'Inter', sans-serif";
    }
  }, [language]);

  useEffect(() => {
    setSecuredStorage('sc_theme', theme);
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    let text = translations[language][key] || translations['en'][key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, val]) => {
        text = text.replace(`{${k}}`, String(val));
      });
    }
    return text;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, theme, setTheme, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
