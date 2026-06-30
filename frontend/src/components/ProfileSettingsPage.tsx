import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Settings, 
  Volume2, 
  Bell, 
  Globe, 
  ShieldCheck, 
  LogOut,
  AppWindow,
  Languages
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { AuthUser } from '../types';

interface ProfileSettingsPageProps {
  user: AuthUser | null;
  onLogout: () => void;
  setView: (v: string) => void;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({
  user,
  onLogout,
  setView
}) => {
  const { t, language } = useTranslation();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [newslettersOn, setNewslerrersOn] = useState(false);

  return (
    <div className="relative min-h-screen bg-bg-base pt-6 pb-24 md:pb-12" id="settings-page-container">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--bg-surface)_1px,transparent_1px),linear-gradient(to_bottom,var(--bg-surface)_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_10%,black_80%,transparent_100%)] pointer-events-none z-0" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Page Title */}
        <div id="settings-header">
          <div className="inline-flex items-center space-x-1 text-[11px] font-black tracking-widest uppercase text-accent-saffron">
            <Settings size={12} />
            <span>{language === 'te' ? 'క్రమ అమరికలు' : 'PREFERENCES PORTAL'}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary font-heading mt-1">
            {language === 'te' ? 'వ్యక్తిగత ప్రొఫైల్' : 'Account Settings'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {language === 'te' 
              ? 'మీ పౌర ఖాతా వివరాలు, నోటిఫికేషన్ ప్రాధాన్యతలు మరియు రక్షణ నిబంధనలను ఇక్కడ నిర్వహించండి.'
              : 'Modify workspace interface preferences, verify civic credentials, and manage authentication state.'}
          </p>
        </div>

        {/* User Card Layout */}
        <div className="bg-bg-surface border border-border-main p-6 rounded-3xl flex flex-col sm:flex-row items-center sm:justify-between gap-4 shadow-sm" id="user-profile-summary">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-accent-saffron/10 text-accent-saffron border border-accent-saffron/20 flex items-center justify-center text-2xl font-black font-heading uppercase">
              {user?.name?.charAt(0) || 'C'}
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold font-heading text-text-primary tracking-wide leading-tight">
                {user?.name || 'Citizen User'}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">{user?.email || 'citizen@ap.gov.in'}</p>
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] leading-tight font-black uppercase tracking-wider">
            {language === 'te' ? 'ధృవీకరించబడిన పౌర కార్డు' : 'Verified Citizen Card'}
          </div>
        </div>

        {/* Settings blocks */}
        <div className="space-y-6" id="settings-groups">
          
          {/* Identity Info */}
          <div className="bg-bg-surface border border-border-main rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-black tracking-wide uppercase text-text-primary border-b border-border-subtle pb-3">
              {language === 'te' ? 'ఖాతా సమాచారము' : 'Personal Details'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black tracking-wider uppercase text-text-secondary block">{language === 'te' ? 'పూర్తి పేరు' : 'Full Name'}</label>
                <div className="flex items-center space-x-2 bg-bg-base border border-border-subtle p-3 rounded-xl">
                  <User size={15} className="text-text-muted" />
                  <span className="text-sm text-text-primary font-medium">{user?.name}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black tracking-wider uppercase text-text-secondary block">{language === 'te' ? 'ఇమెయిల్' : 'Email Address'}</label>
                <div className="flex items-center space-x-2 bg-bg-base border border-border-subtle p-3 rounded-xl">
                  <Mail size={15} className="text-text-muted" />
                  <span className="text-sm text-text-primary font-medium">{user?.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Localization Preferences */}
          <div className="bg-bg-surface border border-border-main rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-black tracking-wide uppercase text-text-primary border-b border-border-subtle pb-3">
              {language === 'te' ? 'భాషా మరియు శైలి ప్రాధాన్యతలు' : 'Interface Theme & Language'}
            </h3>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-text-primary">{language === 'te' ? 'భాష మార్చు' : 'Portal Language'}</h4>
                  <p className="text-[11px] text-text-secondary mt-0.5">{language === 'te' ? 'మీకు నచ్చిన భాష ఎంచుకోండి' : 'Toggle English or Telugu transcription'}</p>
                </div>
                <LanguageToggle />
              </div>

              <div className="flex items-center justify-between border-t border-border-subtle pt-3.5">
                <div>
                  <h4 className="text-xs font-bold text-text-primary">{language === 'te' ? 'రంగు శైలి (థీమ్)' : 'Visual Palette'}</h4>
                  <p className="text-[11px] text-text-secondary mt-0.5">{language === 'te' ? 'డార్క్ లేదా లైట్ మోడ్ మధ్య మారండి' : 'Switch between twilight dark and clean daylight mode'}</p>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-bg-surface border border-border-main rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-black tracking-wide uppercase text-text-primary border-b border-border-subtle pb-3">
              {language === 'te' ? 'నోటిఫికేషన్లు' : 'Updates & Notifications'}
            </h3>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-text-primary">{language === 'te' ? 'సిస్టమ్ అలర్ట్‌లు' : 'Instant Eligibility Alerts'}</h4>
                  <p className="text-[11px] text-text-secondary mt-0.5">{language === 'te' ? 'మీ ప్రొఫైల్‌కు సరిపోలే కొత్త జీ.ఓ లు వచ్చినప్పుడు హెచ్చరించండి' : 'Notify when new welfare schemes or budget updates match your profile'}</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={notificationsOn} 
                  onChange={() => setNotificationsOn(!notificationsOn)}
                  className="w-4 h-4 rounded text-accent-saffron focus:ring-accent-saffron/20 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between border-t border-border-subtle pt-3.5">
                <div>
                  <h4 className="text-xs font-bold text-text-primary">{language === 'te' ? 'నెలవారీ వార్తాపత్రిక' : 'Monthly Civic Newsletter'}</h4>
                  <p className="text-[11px] text-text-secondary mt-0.5">{language === 'te' ? 'సంక్షేమ పథకాలపై నెలవారీ వివరణలను ఇమెయిల్ ద్వారా పంపండి' : 'Receive educational email digests summarising upcoming structural reforms'}</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={newslettersOn} 
                  onChange={() => setNewslerrersOn(!newslettersOn)}
                  className="w-4 h-4 rounded text-accent-saffron focus:ring-accent-saffron/20 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Danger Zone & Logout */}
          <div className="bg-bg-surface border border-border-main rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-black tracking-wide uppercase text-error border-b border-border-subtle pb-3">
              {language === 'te' ? 'భద్రత మరియు నిష్క్రమణ' : 'Authentication Control'}
            </h3>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="text-xs font-bold text-text-primary">{language === 'te' ? 'ఖాతా నుండి నిష్క్రమించండి' : 'Sign out from portal'}</h4>
                <p className="text-[11px] text-text-secondary mt-0.5">{language === 'te' ? 'మీ పరికరం నుండి సిటిజన్ ఖాతాను తీసివేస్తుంది' : 'Instantly terminates active secure workspace and returns to start screen.'}</p>
              </div>
              <button
                onClick={onLogout}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-error/10 border border-error/20 text-error hover:bg-error hover:text-white rounded-xl font-bold text-xs transition-all cursor-pointer focus-ring"
              >
                <LogOut size={14} />
                <span>{language === 'te' ? 'ఖాతా నిష్క్రమణ' : 'Logout Citizen'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
