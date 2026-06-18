import React, { useState } from 'react';
import { Mail, Lock, User, Sparkles, CheckCircle2, AlertCircle, Home, Heart, Leaf } from 'lucide-react';
import { useTranslation } from '../i18n';
import { getSecuredStorage, setSecuredStorage } from '../utils/security';

interface AuthPageProps {
  onLogin: (user: { name: string; email: string }) => void;
  setView: (v: string) => void;
  redirectIntent?: string | null;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, setView, redirectIntent }) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Local Validators
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const validate = () => {
    const errs: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      errs.email = language === 'te' ? 'దయచేసి సరైన ఇమెయిల్ చిరునామాను నమోదు చేయండి.' : 'Please enter a valid email address.';
    }

    if (password.length < 6) {
      errs.password = language === 'te' ? 'పాస్వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.' : 'Password must be at least 6 characters long.';
    }

    if (activeTab === 'signup') {
      if (!fullName.trim()) {
        errs.fullName = language === 'te' ? 'దయచేసి మీ పూర్తి పేరును నమోదు చేసుకోండి.' : 'Please enter your full name.';
      }
      if (password !== confirmPassword) {
        errs.confirmPassword = language === 'te' ? 'పాస్‌వర్డ్‌లు సరిపోలడం లేదు.' : 'Passwords do not match.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (activeTab === 'signin') {
      try {
        // Mock authentication login success check
        const users = getSecuredStorage<any[]>('sc_users') || [];
        const matched = users.find((u: any) => u.email === email && u.password === password);
        
        if (matched || (email === 'citizen@ap.gov.in' && password === 'password123') || (email.startsWith('guest') && password.length >= 6)) {
          const loggedInUser = matched || { name: fullName || email.split('@')[0], email };
          onLogin(loggedInUser);
          setView(redirectIntent || 'dashboard');
        } else {
          setErrors({ global: t('auth.invalid_credentials') });
        }
      } catch (err) {
        setErrors({ global: 'Authentication engine error. Please check values.' });
      }
    } else {
      // Sign up flows
      try {
        const users = getSecuredStorage<any[]>('sc_users') || [];
        if (users.find((u: any) => u.email === email)) {
          setErrors({ email: language === 'te' ? 'ఈ ఇమెయిల్ ఇప్పటికే నమోదు చేయబడింది.' : 'This email address is already in use.' });
          return;
        }

        const newUser = { name: fullName, email, password };
        users.push(newUser);
        setSecuredStorage('sc_users', users);

        setIsSuccess(true);
        setStatusMessage(t('auth.verify_email'));
        setTimeout(() => {
          setIsSuccess(false);
          setActiveTab('signin');
        }, 3000);
      } catch (err) {
        setErrors({ global: 'Registration error. Please check storage capacity.' });
      }
    }
  };

  const handleGoogleLogin = () => {
    // Elegant simulation of Google single-signon
    const googleUser = {
      name: language === 'te' ? 'రామకృష్ణ' : 'Ramakrishna',
      email: 'ramakrishna.ap@gmail.com'
    };
    onLogin(googleUser);
    setView(redirectIntent || 'dashboard');
  };

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center justify-center px-4" id="auth-viewport">
      <div className="w-full max-w-4xl bg-bg-surface border border-border-main rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in fade-in duration-500" id="auth-card">
        
        {/* LEFT COLUMN: BRANDING & TRUST ILLUSTRATION */}
        <div className="hidden md:flex md:w-1/2 p-8 flex-col justify-between bg-gradient-to-br from-bg-surface to-bg-base/45 border-r border-border-subtle relative overflow-hidden select-none">
          {/* Subtle Glow Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-accent-saffron/5 blur-3xl pointer-events-none" />
          
          {/* Top portal header branding */}
          <div className="relative z-10">
            <div className="flex items-center space-x-2 text-accent-saffron">
              <Sparkles size={18} className="animate-pulse" />
              <span className="font-heading font-black tracking-wider text-sm uppercase">SchemeConnect</span>
            </div>
            <p className="text-text-muted text-[11px] leading-tight font-semibold mt-1">AP & Telangana Digital Welfare Engine</p>
          </div>

          {/* Central India-themed Civic SVG/Geometric Illustration */}
          <div className="relative my-4 flex flex-col items-center justify-center min-h-[220px]">
            {/* Spinning/Radiating Chakra Ring Background */}
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-accent-saffron/12 animate-spin" style={{ animationDuration: '120s' }}>
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="2" fill="currentColor" />
                {Array.from({ length: 24 }).map((_, i) => (
                  <line 
                    key={i} 
                    x1="50" 
                    y1="50" 
                    x2={50 + 35 * Math.cos((i * 15 * Math.PI) / 180)} 
                    y2={50 + 35 * Math.sin((i * 15 * Math.PI) / 180)} 
                    stroke="currentColor" 
                    strokeWidth="0.4" 
                  />
                ))}
              </svg>

              {/* Category Nodes */}
              <div className="absolute z-10 flex items-center space-x-3.5">
                {/* Sprout (Agri) */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10B981]/12 to-[#06B6D4]/12 border border-[#10B981]/20 flex items-center justify-center shadow-md text-[#10B981] hover:scale-105 transition-transform duration-300">
                  <Leaf size={18} />
                </div>
                {/* Home (Housing) */}
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-accent-saffron/12 to-[#F59E0B]/12 border border-accent-saffron/20 flex items-center justify-center shadow-lg text-accent-saffron hover:scale-110 transition-transform duration-300">
                  <Home size={24} />
                </div>
                {/* Heart (Health/Welfare) */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F43F5E]/12 to-[#EC4899]/12 border border-[#F43F5E]/20 flex items-center justify-center shadow-md text-[#F43F5E] hover:scale-105 transition-transform duration-300">
                  <Heart size={18} />
                </div>
              </div>

              {/* Floating Benefit Pills */}
              <div className="absolute top-[8%] left-[8%] bg-bg-surface/95 dark:bg-bg-elevated/95 border border-border-subtle px-3 py-1 rounded-full text-[11px] leading-tight font-bold text-text-primary flex items-center space-x-1.5 shadow-sm transform hover:-translate-y-0.5 transition-transform">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span>₹13,500</span>
              </div>
              <div className="absolute bottom-[8%] right-[8%] bg-bg-surface/95 dark:bg-bg-elevated/95 border border-border-subtle px-3 py-1 rounded-full text-[11px] leading-tight font-bold text-text-primary flex items-center space-x-1.5 shadow-sm transform hover:-translate-y-0.5 transition-transform">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-saffron" />
                <span>₹15,000</span>
              </div>
              <div className="absolute top-[45%] right-[-4%] bg-bg-surface/95 dark:bg-bg-elevated/95 border border-border-subtle px-3 py-1 rounded-full text-[11px] leading-tight font-bold text-text-primary flex items-center space-x-1.5 shadow-sm transform hover:-translate-y-0.5 transition-transform">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                <span>₹6,000</span>
              </div>
            </div>
          </div>

          {/* Bottom section: Trusted Civic Badge */}
          <div className="relative z-10 border-t border-border-subtle/50 pt-4 mt-auto text-center">
            <div className="inline-flex items-center space-x-1.5 bg-[#10B981]/15 text-[#10B981] text-[11px] leading-tight font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              <CheckCircle2 size={12} />
              <span>Trusted by 40,000+ Citizens</span>
            </div>
            <p className="text-xs font-bold text-text-primary">AP & Telangana Welfare Portal</p>
            <p className="text-[11px] leading-tight text-text-muted mt-0.5 font-sans">ఆంధ్రప్రదేశ్ & తెలంగాణ సంక్షేమ పోర్టల్</p>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTHENTICATION FORM */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-center">
        
          {/* Toggle Headings tab selectors */}
          <div className="flex bg-bg-elevated p-1 rounded-2xl mb-8 border border-border-subtle" id="auth-tabs">
            <button
              onClick={() => {
                setActiveTab('signin');
                setErrors({});
              }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl cursor-pointer transition-all ${
                activeTab === 'signin' ? 'bg-bg-surface text-accent-saffron shadow-md border border-border-subtle' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t('auth.signin')}
            </button>
            
            <button
              onClick={() => {
                setActiveTab('signup');
                setErrors({});
              }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl cursor-pointer transition-all ${
                activeTab === 'signup' ? 'bg-bg-surface text-accent-saffron shadow-md border border-border-subtle' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t('auth.signup')}
            </button>
          </div>

          {/* Global Warnings/Success state bars */}
          {errors.global && (
            <div className="bg-error/10 border border-error/20 p-3.5 rounded-xl flex items-center space-x-2 text-error text-xs font-bold mb-6">
              <AlertCircle size={15} />
              <span>{errors.global}</span>
            </div>
          )}

          {isSuccess && (
            <div className="bg-[#10B981]/10 border border-[#10B981]/20 p-4 rounded-xl flex items-start space-x-2 text-[#10B981] text-xs font-bold mb-6">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold flex items-center">Registration Successful!</p>
                <p className="text-text-secondary mt-1 font-medium">{statusMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" id="auth-form">
            {activeTab === 'signup' && (
              <div className="flex flex-col">
                <label className="text-xs font-bold text-text-secondary mb-1.5">{t('auth.name')}</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramakrishna AP"
                    className={`w-full bg-bg-base text-text-primary border rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none ${
                      errors.fullName ? 'border-error' : 'border-border-main focus:border-accent-saffron'
                    }`}
                  />
                </div>
                {errors.fullName && <span className="text-xs text-error mt-1">{errors.fullName}</span>}
              </div>
            )}

            <div className="flex flex-col">
              <label className="text-xs font-bold text-text-secondary mb-1.5">{t('auth.email')}</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@ap.gov.in"
                  className={`w-full bg-bg-base text-text-primary border rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none ${
                    errors.email ? 'border-error' : 'border-border-main focus:border-accent-saffron'
                  }`}
                />
              </div>
              {errors.email && <span className="text-xs text-error mt-1">{errors.email}</span>}
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-text-secondary mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className={`w-full bg-bg-base text-text-primary border rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none ${
                    errors.password ? 'border-error' : 'border-border-main focus:border-accent-saffron'
                  }`}
                />
              </div>
              {errors.password && <span className="text-xs text-error mt-1">{errors.password}</span>}
            </div>

            {activeTab === 'signup' && (
              <div className="flex flex-col">
                <label className="text-xs font-bold text-text-secondary mb-1.5">{t('auth.confirm_password')}</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    className={`w-full bg-bg-base text-text-primary border rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none ${
                      errors.confirmPassword ? 'border-error' : 'border-border-main focus:border-accent-saffron'
                    }`}
                  />
                </div>
                {errors.confirmPassword && <span className="text-xs text-error mt-1">{errors.confirmPassword}</span>}
              </div>
            )}

            <button
              type="submit"
              className="saffron-gradient-btn w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase mt-3 cursor-pointer animate-pulse"
            >
              {activeTab === 'signin' ? t('auth.signin') : t('auth.signup')}
            </button>
          </form>

          <div className="relative my-6" id="auth-separator">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center text-xs uppercase" id="or-badge">
              <span className="bg-bg-surface px-3 text-text-muted font-bold tracking-widest">{t('auth.or')}</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 rounded-xl border border-border-main text-text-secondary hover:text-text-primary bg-bg-surface hover:bg-bg-elevated transition-colors flex items-center justify-center space-x-2 font-bold text-xs cursor-pointer shadow-xs active:scale-98"
            id="google-oauth-btn"
          >
            <div className="w-4 h-4 rounded bg-accent-blue text-white font-extrabold flex items-center justify-center shrink-0">
              G
            </div>
            <span>{t('auth.google')}</span>
          </button>

          {/* Quick demo credentials hint */}
          {activeTab === 'signin' && (
            <div className="mt-6 text-center text-[11px] leading-tight font-semibold text-text-muted bg-bg-base/40 border border-border-subtle p-2.5 rounded-xl">
              Demo Credentials — Email: <strong className="text-text-secondary">guest@ap.gov.in</strong> • Pass: <strong className="text-text-secondary">password123</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
