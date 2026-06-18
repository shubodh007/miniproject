import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from './en.json';
import { motion, AnimatePresence } from 'motion/react';
import teTranslations from './te.json';
import hiTranslations from './hi.json';
import { getSecuredStorage, setSecuredStorage } from '../utils/security';

type Language = 'en' | 'te' | 'hi';
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
  hi: hiTranslations as Record<string, string>,
};

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const rawSaved = localStorage.getItem('sc-pref-lang');
    const saved = (rawSaved === 'en' || rawSaved === 'te' || rawSaved === 'hi') ? rawSaved : getSecuredStorage<Language>('sc_lang');
    const initLang = (saved === 'te' || saved === 'en' || saved === 'hi') ? saved : 'en';
    
    // Seed Google translate cookie early so it renders in selected language on bootstrap
    try {
      if (initLang === 'te') {
        document.cookie = "googtrans=/en/te; path=/";
        document.cookie = "googtrans=/en/te; path=/; domain=" + window.location.hostname;
      } else if (initLang === 'hi') {
        document.cookie = "googtrans=/en/hi; path=/";
        document.cookie = "googtrans=/en/hi; path=/; domain=" + window.location.hostname;
      } else {
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
      }
    } catch (e) {
      console.error('Failed to set initial translation cookies:', e);
    }
    return initLang;
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = getSecuredStorage<Theme>('sc_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [overlayTheme, setOverlayTheme] = useState<Theme | null>(null);

  // Lazy-load free Google Auto-Translation dynamic widgets script
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Create hidden element for Google Web translator to attach to
      let container = document.getElementById('google_translate_element');
      if (!container) {
        container = document.createElement('div');
        container.id = 'google_translate_element';
        container.style.display = 'none';
        container.setAttribute('aria-hidden', 'true');
        document.body.appendChild(container);
      }

      // 2. Map global configuration function
      (window as any).googleTranslateElementInit = () => {
        try {
          new (window as any).google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'te,hi,en',
            autoDisplay: false,
            layout: (window as any).google.translate.TranslateElement?.InlineLayout?.SIMPLE
          }, 'google_translate_element');
        } catch (err) {
          console.warn('Google Translate initialization failed:', err);
        }
      };

      // 3. Inject JS elements
      if (!document.getElementById('google-translate-script')) {
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.type = 'text/javascript';
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, []);

  // Sync Google combo selection dropdown if dynamically loaded later on the page
  useEffect(() => {
    let checkCount = 0;
    const interval = setInterval(() => {
      checkCount++;
      const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
      if (combo) {
        let targetVal = 'en';
        if (language === 'te') targetVal = 'te';
        if (language === 'hi') targetVal = 'hi';
        
        if (combo.value !== targetVal) {
          combo.value = targetVal;
          combo.dispatchEvent(new Event('change'));
        }
        clearInterval(interval);
      }
      if (checkCount > 15) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('sc-pref-lang', language);
    setSecuredStorage('sc_lang', language);
    const html = document.documentElement;
    html.setAttribute('lang', language);
    if (language === 'te') {
      html.style.fontFamily = "'Noto Sans Telugu', 'Noto Sans', sans-serif";
      document.cookie = "googtrans=/en/te; path=/";
      document.cookie = "googtrans=/en/te; path=/; domain=" + window.location.hostname;
    } else if (language === 'hi') {
      html.style.fontFamily = "'Noto Sans Devanagari', 'Noto Sans', sans-serif";
      document.cookie = "googtrans=/en/hi; path=/";
      document.cookie = "googtrans=/en/hi; path=/; domain=" + window.location.hostname;
    } else {
      html.style.fontFamily = "'Inter', sans-serif";
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
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
    if (lang !== language) {
      if (lang === 'te') {
        document.cookie = "googtrans=/en/te; path=/";
        document.cookie = "googtrans=/en/te; path=/; domain=" + window.location.hostname;
      } else if (lang === 'hi') {
        document.cookie = "googtrans=/en/hi; path=/";
        document.cookie = "googtrans=/en/hi; path=/; domain=" + window.location.hostname;
      } else {
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
      }
      setLanguageState(lang);

      // Attempt fast hot translation inside browser combo event 
      const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
      if (combo) {
        let val = 'en';
        if (lang === 'te') val = 'te';
        if (lang === 'hi') val = 'hi';
        combo.value = val;
        combo.dispatchEvent(new Event('change'));
      } else {
        // Fallback to quick page reload to initialize the widget with new cookies
        setTimeout(() => {
          window.location.reload();
        }, 150);
      }
    }
  };

  const setTheme = (t: Theme) => {
    if (t === theme) return;
    setOverlayTheme(theme);
    setThemeState(t);

    // Keep overlay active for a short duration matching the transition
    setTimeout(() => {
      setOverlayTheme(null);
    }, 700);
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
      <AnimatePresence>
        {overlayTheme && (
          <motion.div
            key="theme-overlay"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: 999999,
              backgroundColor: overlayTheme === 'dark' ? '#0a0a0f' : '#f4f6f8',
            }}
          />
        )}
      </AnimatePresence>
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
