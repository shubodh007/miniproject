import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Sparkles, 
  FileCheck, 
  MessageSquare, 
  History, 
  Bookmark, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  ChevronRight,
  Menu,
  X,
  Award,
  BookOpen
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './ui/CommandPalette';
import { AuthUser } from '../types';

interface AppShellProps {
  currentView: string;
  setView: (view: string) => void;
  user: AuthUser | null;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  setView,
  user,
  onLogout,
  children
}) => {
  const { t, language } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global keydown listener for Cmd/Ctrl + K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Notifications mock array for premium internal product feel
  const notifications = [
    {
      id: 'not-1',
      title: language === 'te' ? 'వైఎస్ఆర్ రైతు భరోసా పంపిణీ' : 'YSR Rythu Bharosa Disbursement',
      desc: language === 'te' ? 'వార్షిక పథకం విడత ₹13,500 మార్గదర్శకాలు అమలులో ఉన్నాయి.' : 'Annual scheme installment ₹13,500 guidelines active.',
      time: language === 'te' ? '1గం క్రితం' : '1h ago',
      unread: true
    },
    {
      id: 'not-2',
      title: language === 'te' ? 'ముఖ్యమైన చట్టపరమైన నోటీసు' : 'Legal Risk Critical Advisory',
      desc: language === 'te' ? 'సిసిఆర్‌ఎ కార్డుల కోసం భూయజమాని సంతకాలు లేకుండా కొత్త నిబంధనలు.' : 'New rules bypass landholder signatures for CCRA cards.',
      time: language === 'te' ? '4గం క్రితం' : '4h ago',
      unread: true
    }
  ];

  // Defined sidebar list
  const sidebarItems = [
    {
      id: 'dashboard',
      labelEn: 'Dashboard Home',
      labelTe: 'డాష్‌బోర్డ్ హోమ్',
      icon: Home,
    },
    {
      id: 'wizard',
      labelEn: 'Eligibility Wizard',
      labelTe: 'అర్హత విగ్గీ',
      icon: Sparkles,
    },
    {
      id: 'results',
      labelEn: 'Evaluation Results',
      labelTe: 'నివేదిక ఫలితాలు',
      icon: Award,
    },
    {
      id: 'legal',
      labelEn: 'Legal Analyzer',
      labelTe: 'న్యాయ అనలైజర్',
      icon: FileCheck,
    },
    {
      id: 'chat',
      labelEn: 'Smart Assistance',
      labelTe: 'సంక్షేమ AI సహాయం',
      icon: MessageSquare,
    },
    {
      id: 'history',
      labelEn: 'Audit Histories',
      labelTe: 'శోధన చరిత్ర',
      icon: History,
    },
    {
      id: 'saved',
      labelEn: 'Saved Items',
      labelTe: 'సేవ్ చేసిన జాబితా',
      icon: Bookmark,
    },
    {
      id: 'settings',
      labelEn: 'Profile Settings',
      labelTe: 'ఖాతా అమరికలు',
      icon: Settings,
    }
  ];

  const handleSidebarClick = (id: string) => {
    setView(id);
    // Removed setMobileMenuOpen call here to avoid redundant JS-driven state modifications on navigation click
  };

  const mobileNavItems = [
    {
      id: 'dashboard',
      labelEn: 'Dashboard',
      labelTe: 'డ్యాష్',
      icon: Home,
    },
    {
      id: 'wizard',
      labelEn: 'Wizard',
      labelTe: 'అర్హత',
      icon: Sparkles,
    },
    {
      id: 'results',
      labelEn: 'Results',
      labelTe: 'ఫలితాలు',
      icon: Award,
    },
    {
      id: 'legal',
      labelEn: 'Legal',
      labelTe: 'న్యాయం',
      icon: FileCheck,
    },
    {
      id: 'chat',
      labelEn: 'Chat',
      labelTe: 'చాట్',
      icon: MessageSquare,
    },
    {
      id: 'settings',
      labelEn: 'Settings',
      labelTe: 'అమరి',
      icon: Settings,
    }
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col lg:flex-row" id="app-shell-viewport"> {/* Changed: Configured parent breakpoint for viewport layout from md: to lg: for flexible sidebars */}
      
      {/* =========================================================================
          DESKTOP SIDEBAR NAVIGATION (LEFT)
          ========================================================================= */}
      {/* Changed: Swapped md:flex with lg:flex so the sidebar shows/hides purely using Tailwind responsive styling rules */}
      <aside 
        className="hidden lg:flex flex-col w-64 bg-bg-surface border-r border-border-main shrink-0 h-screen sticky top-0 z-30"
        id="desktop-sidebar-nav"
      >
        {/* Brand logo top spacing */}
        <div 
          onClick={() => setView('landing')}
          className="h-16 px-6 flex items-center space-x-2.5 border-b border-border-subtle cursor-pointer group hover:bg-bg-elevated/20 transition-all"
        >
          <div className="bg-gradient-to-b from-accent-saffron to-accent-saffron/80 text-white p-2 rounded-xl flex items-center justify-center shadow-lg shadow-accent-saffron/10 group-hover:scale-[1.03] transition-transform">
            <Sparkles size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-tight text-text-primary leading-tight font-heading">
              SchemeConnect
            </span>
            <span className="text-[11px] leading-tight font-bold text-accent-saffron tracking-wider font-mono">AP PORTAL</span>
          </div>
        </div>

        {/* Dynamic Nav Items */}
        <nav className="flex-grow p-4 space-y-1 overflow-y-auto" role="navigation">
          {sidebarItems.map(item => {
            const IconComponent = item.icon;
            const isActive = currentView === item.id || (item.id === 'wizard' && currentView === 'results');
            return (
              <button
                key={item.id}
                onClick={() => handleSidebarClick(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs tracking-wide cursor-pointer transition-all overflow-hidden ${
                  isActive 
                    ? 'bg-accent-saffron/12 border border-accent-saffron/20 text-accent-saffron shadow-inner font-extrabold relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:bg-accent-saffron before:rounded-r-full shadow-[0_0_12px_rgba(228,122,34,0.08)]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/60 border border-transparent font-bold'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <IconComponent 
                    size={16} 
                    className={isActive ? 'text-accent-saffron' : 'text-text-secondary'} 
                    fill={isActive ? 'currentColor' : 'none'} 
                  />
                  <span>{language === 'te' ? item.labelTe : item.labelEn}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* User profile footer element bottom sidebar */}
        <div className="p-4 border-t border-border-subtle bg-bg-base/30 space-y-4">
          <div className="flex items-center space-x-3 p-1">
            <div className="w-9 h-9 rounded-xl bg-accent-blue/10 text-accent-blue flex items-center justify-center font-bold text-sm uppercase">
              {user?.name?.charAt(0) || 'C'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-text-primary truncate">{user?.name || (language === 'te' ? 'పౌరుడు' : 'Citizen User')}</p>
              <p className="text-[11px] leading-tight text-text-secondary truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-2 p-2.5 bg-error/10 hover:bg-error text-error hover:text-white border border-error/15 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>{language === 'te' ? 'నిష్క్రమించు' : 'Logout Portal'}</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MAIN WORKSPACE LAYOUT WRAPPER (RIGHT/TOP)
          ========================================================================= */}
      <div className="flex-grow flex flex-col min-h-screen overflow-x-hidden" id="workspace-content-wrapper">
        
        {/* TOP UTILITY WORKSPACE HEADER BAR */}
        {/* Changed: Adjusted responsive workspace padding on the header from md:px-8 to lg:px-8 */}
        <header 
          className="h-16 px-4 lg:px-8 bg-bg-surface/85 backdrop-blur-md border-b border-border-main flex items-center justify-between sticky top-0 z-40"
          id="workspace-top-bar"
        >
          {/* Logo brand only on Mobile widths - Changed: Swapped md:hidden with lg:hidden to show top logo on tablets/mobiles up to lg width */}
          <div className="flex items-center space-x-3 lg:hidden">
            <div className="bg-accent-saffron text-white p-1.5 rounded-lg flex items-center justify-center shadow-lg shadow-accent-saffron/10">
              <Sparkles size={14} />
            </div>
            <span className="text-sm font-extrabold font-heading text-text-primary">SchemeConnect</span>
          </div>

          {/* Desktop Search bar mock (Linear style) - Changed: Adjusted quick search visibility breakpoint from md: to lg: */}
          <div 
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden lg:flex items-center space-x-2 bg-bg-base border border-border-subtle px-3.5 py-1.5 rounded-full w-64 text-text-secondary hover:text-text-primary transition-colors cursor-pointer focus-ring shadow-inner"
            id="workspace-search-trigger"
          >
            <Search size={14} className="text-text-muted" />
            <span className="text-[11px] font-semibold text-text-muted select-none">{language === 'te' ? 'ద్వార శోధన (Cmd+K)' : 'Quick Portal Search (Cmd+K)'}</span>
          </div>

          {/* Utility Tools on Center/Right header */}
          <div className="flex items-center space-x-3.5 ml-auto">
            
            <LanguageToggle />
            <ThemeToggle />

            {/* Notifications Bell with interactive alert popup */}
            <div className="relative">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-bg-surface hover:bg-bg-elevated border border-border-main hover:text-text-primary text-text-secondary transition-all cursor-pointer shadow-sm focus-ring"
                id="portal-alert-bell"
              >
                <Bell size={17} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent-saffron"></span>
              </button>

              {/* Notification card panel overlay */}
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-bg-surface border border-border-main rounded-2xl shadow-xl z-40 p-1 divide-y divide-border-subtle overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2.5 bg-bg-base/30 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-text-primary tracking-wide">{language === 'te' ? 'నోటీసులు' : 'Notifications'}</span>
                      <span className="text-[11px] leading-tight font-bold text-accent-saffron bg-accent-saffron/10 px-1.5 py-0.5 rounded-full">{language === 'te' ? 'కొత్తది' : 'New'}</span>
                    </div>
                    {notifications.map(item => (
                      <div key={item.id} className="p-3.5 hover:bg-bg-elevated/40 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-[11px] font-bold text-text-primary leading-tight">{item.title}</h4>
                          <span className="text-[11px] leading-tight text-text-muted shrink-0 font-mono">{item.time}</span>
                        </div>
                        <p className="text-[11px] leading-tight text-text-secondary mt-1 leading-snug">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Profile trigger for users dropdown popup on header */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 bg-bg-surface hover:bg-bg-elevated border border-border-main rounded-full p-1 cursor-pointer transition-colors focus-ring"
                id="user-shell-avatar-btn"
              >
                <div className="w-8 h-8 rounded-full bg-accent-blue/15 text-accent-blue flex items-center justify-center font-bold text-sm uppercase">
                  {user?.name?.charAt(0) || 'C'}
                </div>
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-bg-surface border border-border-main rounded-2xl shadow-xl z-40 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-border-subtle bg-bg-base/50">
                      <p className="text-xs font-semibold text-text-muted">{language === 'te' ? 'ఇలా లాగిన్ అయ్యారు' : 'Signed in as'}</p>
                      <p className="text-xs font-extrabold text-text-primary truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setView('settings');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-black tracking-wide uppercase text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors flex items-center space-x-2 cursor-pointer py-2.5"
                    >
                      <Settings size={14} />
                      <span>{t('nav.settings') || 'Settings'}</span>
                    </button>
                    <button
                      onClick={() => {
                        onLogout();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-black tracking-wide uppercase text-error hover:bg-error/5 transition-colors flex items-center space-x-2 border-t border-border-subtle cursor-pointer py-2.5"
                    >
                      <LogOut size={14} />
                      <span>{t('nav.signout')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* CONTAINER VIEWPORTS MAIN AREA - Changed: Adjusted main content viewport spacing break point from md: to lg: */}
        <main className="flex-grow p-4 lg:p-8 relative z-10" id="main-content">
          {children}
        </main>

      </div>

      {/* =========================================================================
          MOBILE BOTTOM ACCORDION ERGONOMIC BAR (UNDER MOBILE WIDTHS)
          ========================================================================= */}
      {/* Changed: Display mobile navigation dashboard controls below lg breakpoint instead of md */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-surface/95 backdrop-blur-md border-t border-border-subtle flex justify-around items-center py-2 px-1 shadow-2xl pb-safe"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
        id="mobile-bottom-nav"
      >
        {mobileNavItems.map(item => {
          const IconComponent = item.icon;
          const isActive = currentView === item.id;
          const label = language === 'te' ? item.labelTe : item.labelEn;
          
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className="flex-1 flex flex-col items-center justify-center min-w-[44px] min-h-[44px] p-1 active:scale-95 transition-transform duration-75 select-none focus:outline-none cursor-pointer"
              aria-label={language === 'te' ? item.labelTe : item.labelEn}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`w-full max-w-[64px] flex flex-col items-center space-y-1 py-1 px-2 rounded-xl transition-all ${
                isActive 
                  ? 'bg-accent-saffron/15 border border-accent-saffron/30 text-accent-saffron shadow-xs font-semibold' 
                  : 'border border-transparent text-text-secondary font-semibold'
              }`}>
                <IconComponent size={17} />
                <span className="text-[11px] leading-tight uppercase tracking-wider text-center block truncate w-full font-sans leading-tight font-semibold">
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        setView={setView} 
        currentView={currentView} 
      />
    </div>
  );
};
