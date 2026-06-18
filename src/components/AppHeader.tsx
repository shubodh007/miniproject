import React, { useState, useEffect } from 'react';
import { User, LogOut, History, LogIn, Sparkles } from 'lucide-react';
import { useTranslation } from '../i18n';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { getAvatarGradient, getInitials } from '../utils/avatar';

interface AppHeaderProps {
  currentView: string;
  setView: (view: string) => void;
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentView, setView, user, onLogout }) => {
  const { t, language } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [fromColor, toColor] = getAvatarGradient(user?.name || 'SC');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-bg-surface/80 backdrop-blur-md border-b border-border-subtle py-3 shadow-md'
          : 'bg-transparent py-5'
      }`}
      id="app-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => setView('landing')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setView('landing');
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="SchemeConnect Homepage"
          className="flex items-center space-x-2.5 cursor-pointer group focus-ring rounded-lg"
          id="brand-logo"
        >
          <div className="bg-gradient-to-b from-accent-saffron to-[#d26c19] text-white p-2 rounded-xl flex items-center justify-center shadow-md shadow-accent-saffron/10 group-hover:scale-[1.02] transition-transform">
            <Sparkles size={16} />
          </div>
          <span className="text-lg font-bold tracking-tight text-text-primary flex items-center">
            SchemeConnect
          </span>
        </div>

        {/* Desktop Central Navigation */}
        <nav 
          role="navigation" 
          aria-label="Main Portal Navigation"
          className="hidden md:flex items-center space-x-0.5 bg-[#0e131f]/60 p-1 rounded-full border border-border-subtle" 
          id="desktop-center-nav"
        >
          <button
            onClick={() => setView('landing')}
            aria-current={currentView === 'landing' ? 'page' : undefined}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus-ring ${
              currentView === 'landing'
                ? 'bg-bg-elevated text-text-primary border border-border-subtle shadow-inner'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {language === 'te' ? 'హోమ్' : 'Home'}
          </button>
          <button
            onClick={() => setView('wizard')}
            aria-current={(currentView === 'wizard' || currentView === 'results') ? 'page' : undefined}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus-ring ${
              currentView === 'wizard' || currentView === 'results'
                ? 'bg-bg-elevated text-text-primary border border-border-subtle shadow-inner'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {language === 'te' ? 'అర్హత తనిఖీ' : 'Check Eligibility'}
          </button>
          <button
            onClick={() => setView('legal')}
            aria-current={currentView === 'legal' ? 'page' : undefined}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus-ring ${
              currentView === 'legal'
                ? 'bg-bg-elevated text-text-primary border border-border-subtle shadow-inner'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {language === 'te' ? 'న్యాయ సలహా' : 'Legal Advisor'}
          </button>
          <button
            onClick={() => setView('chat')}
            aria-current={currentView === 'chat' ? 'page' : undefined}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus-ring ${
              currentView === 'chat'
                ? 'bg-bg-elevated text-text-primary border border-border-subtle shadow-inner'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {language === 'te' ? 'AI చాట్' : 'Smart Chat'}
          </button>
          {user && (
            <button
              onClick={() => setView('history')}
              aria-current={currentView === 'history' ? 'page' : undefined}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus-ring ${
                currentView === 'history'
                  ? 'bg-bg-elevated text-text-primary border border-border-subtle shadow-inner'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {language === 'te' ? 'చరిత్ర' : 'History'}
            </button>
          )}
        </nav>

        {/* Right Section controls */}
        <div className="flex items-center space-x-3" id="header-tools">
          <LanguageToggle />
          <ThemeToggle />

          {/* User profile dropdown button */}
          <div className="relative">
            {user ? (
              <div>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-haspopup="true"
                  aria-expanded={isDropdownOpen}
                  aria-label="User account dropdown"
                  className="flex items-center space-x-2 bg-bg-surface hover:bg-bg-elevated border border-border-main rounded-full pl-2 pr-3 py-1 cursor-pointer transition-colors focus-ring"
                  id="user-menu-button"
                >
                  <div 
                    style={{ background: `linear-gradient(135deg, ${fromColor}, ${toColor})` }}
                    className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-sm uppercase hover:ring-2 hover:ring-offset-1 hover:ring-offset-bg-surface hover:ring-accent-saffron/40 transition-all"
                  >
                    {getInitials(user.name || 'SC')}
                  </div>
                  <span className="text-sm font-semibold max-w-[90px] truncate text-text-secondary hidden sm:inline">
                    {user.name}
                  </span>
                </button>

                {/* Dropdown popup */}
                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-bg-surface border border-border-main rounded-2xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                      <div className="px-4 py-2 border-b border-border-subtle bg-bg-base/40">
                        <p className="text-xs font-semibold text-text-muted">{language === 'te' ? 'ఇలా లాగిన్ అయ్యారు' : 'Signed in as'}</p>
                        <p className="text-sm font-bold text-text-primary truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setView('history');
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors flex items-center space-x-2 cursor-pointer"
                      >
                        <History size={16} />
                        <span>{t('nav.history')}</span>
                      </button>
                      <button
                        onClick={() => {
                          onLogout();
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-error hover:bg-error/5 transition-colors flex items-center space-x-2 border-t border-border-subtle cursor-pointer"
                      >
                        <LogOut size={16} />
                        <span>{t('nav.signout')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setView('auth')}
                aria-label="Sign in to your account"
                className="flex items-center space-x-1.5 bg-accent-blue text-white hover:bg-accent-blue/90 font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-1.5 rounded-full shadow-lg shadow-accent-blue/10 transition-all active:scale-95 cursor-pointer focus-ring"
                id="login-trigger-btn"
              >
                <LogIn size={15} />
                <span>{t('nav.signin')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
