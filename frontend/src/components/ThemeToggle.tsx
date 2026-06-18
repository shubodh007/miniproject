import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../i18n';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTranslation();

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-bg-surface hover:bg-bg-elevated border border-border-main hover:text-text-primary text-text-secondary transition-all duration-200 cursor-pointer shadow-sm focus-ring"
      id="theme-toggler-btn"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'dark' ? (
          <motion.div
            key="dark"
            initial={{ opacity: 0, scale: 0.8, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex items-center justify-center text-amber-400"
          >
            <Sun size={18} />
          </motion.div>
        ) : (
          <motion.div
            key="light"
            initial={{ opacity: 0, scale: 0.8, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex items-center justify-center text-accent-saffron"
          >
            <Moon size={18} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};
