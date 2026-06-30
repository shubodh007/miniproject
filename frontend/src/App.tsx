import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { TranslationProvider, useTranslation } from './i18n';
import { AppHeader } from './components/AppHeader';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { ChatPage } from './components/ChatPage';
import { AppShell } from './components/AppShell';
import { ProfilePayload, SchemeResult, SearchHistory, MatchResponse, AuthUser } from './types';
import { SEED_SCHEMES, runMatchEngine as matchSchemes } from './utils/schemeEngine';
import { Loader2, Sparkles, Home, ShieldAlert, MessageSquare, History, User } from 'lucide-react';
import { getSecuredStorage, setSecuredStorage } from './utils/security';
import { ScanningOverlay } from './components/ScanningOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useToast } from './components/ToastProvider';

// Dynamic lazy imports
const LegalPage = lazy(() => import(/* webpackChunkName: "legal-page" */ './components/LegalPage').then(m => ({ default: m.LegalPage })));
const ProfileWizard = lazy(() => import(/* webpackChunkName: "profile-wizard" */ './components/ProfileWizard').then(m => ({ default: m.ProfileWizard })));
const DashboardPage = lazy(() => import(/* webpackChunkName: "dashboard-page" */ './components/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ResultsPage = lazy(() => import(/* webpackChunkName: "results-page" */ './components/ResultsPage').then(m => ({ default: m.ResultsPage })));
const HistoryPage = lazy(() => import(/* webpackChunkName: "history-page" */ './components/HistoryPage').then(m => ({ default: m.HistoryPage })));
const SavedItemsPage = lazy(() => import(/* webpackChunkName: "saved-items-page" */ './components/SavedItemsPage').then(m => ({ default: m.SavedItemsPage })));
const ProfileSettingsPage = lazy(() => import(/* webpackChunkName: "profile-settings-page" */ './components/ProfileSettingsPage').then(m => ({ default: m.ProfileSettingsPage })));
const AdminPage = lazy(() => import('./components/AdminPage').then(m => ({ default: m.AdminPage })));

// PageLoader component
const PageLoader = () => (
  <div className="w-full h-48 flex items-center justify-center">
    <div className="flex flex-col items-center space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
      <span className="text-xs text-[var(--text-secondary)] font-medium">Loading...</span>
    </div>
  </div>
);

export default function App() {
  return (
    <TranslationProvider>
      <MainAppContainer />
    </TranslationProvider>
  );
}

// ProtectedRoute Wrapper Component (Step 4)
interface ProtectedRouteProps {
  user: AuthUser | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user }) => {
  const location = useLocation();

  if (!user) {
    // If not authenticated, save the current path and redirect to /auth
    sessionStorage.setItem('sc_redirect_intent', location.pathname);
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

// Main layout wrapper that adapts layout conditionally if the user is authenticated (with AppShell) or not (with AppHeader)
interface MainLayoutProps {
  user: AuthUser | null;
  currentView: string;
  navigateToView: (view: string) => void;
  handleLogout: () => void;
  language: string;
  handleBrowseAll: () => void;
  handleStartChatWithQuery: (q: string) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  user,
  currentView,
  navigateToView,
  handleLogout,
  language,
}) => {
  if (user) {
    return (
      <AppShell 
        currentView={currentView}
        setView={navigateToView}
        user={user}
        onLogout={handleLogout}
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </AppShell>
    );
  } else {
    return (
      <div className="relative min-h-screen pb-12 flex flex-col justify-between">
        <a href="#main-content" 
           className="sr-only focus:not-sr-only focus:fixed focus:top-4 
                      focus:left-4 focus:z-50 focus:px-4 focus:py-2 
                      focus:bg-[var(--accent-primary)] focus:text-white 
                      focus:rounded-md focus:text-sm focus:font-medium">
          Skip to main content
        </a>
        <AppHeader
          currentView={currentView}
          setView={navigateToView}
          user={user}
          onLogout={handleLogout}
        />
        <main className="flex-grow pb-16 md:pb-0" id="main-content">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
        {currentView === 'landing' && (
          <footer className="border-t border-border-subtle bg-bg-surface/50 py-8 text-center" id="guest-landing-footer">
            <p className="text-xs text-text-muted">© 2026 SchemeConnect AP Civic Welfare Advisory Core. All Rights Reserved.</p>
          </footer>
        )}
      </div>
    );
  }
};

function MainAppContainer() {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Authentication states
  const [user, setUser] = useState<AuthUser | null>(null);

  // Map view strings to URL paths and vice-versa
  const viewToPathMap: Record<string, string> = {
    landing: '/',
    auth: '/auth',
    dashboard: '/dashboard',
    wizard: '/wizard',
    results: '/results',
    legal: '/legal',
    chat: '/chat',
    history: '/history',
    saved: '/saved',
    settings: '/settings'
  };

  const pathToViewMap: Record<string, string> = {
    '/': 'landing',
    '/auth': 'auth',
    '/dashboard': 'dashboard',
    '/wizard': 'wizard',
    '/results': 'results',
    '/legal': 'legal',
    '/chat': 'chat',
    '/history': 'history',
    '/saved': 'saved',
    '/settings': 'settings'
  };

  const currentView = pathToViewMap[location.pathname] || 'landing';

  // Navigate wrapper function to retain setView prop signature on legacy child components (Step 6)
  const navigateToView = (view: string) => {
    const targetPath = viewToPathMap[view];
    if (targetPath) {
      navigate(targetPath);
    } else {
      navigate('/');
    }
  };

  // Document attachment transfer to Smart Chat
  const [chatAttachedFile, setChatAttachedFile] = useState<{ name: string; content: string } | null>(null);

  // Chat prepopulated query transfer
  const [chatPrepopulatedQuery, setChatPrepopulatedQuery] = useState<string | null>(null);

  const handleStartChatWithQuery = (query: string) => {
    setChatPrepopulatedQuery(query);
    navigateToView('chat');
  };

  // Recommendations and Profiler snapshots
  const [results, setResults] = useState<MatchResponse | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfilePayload | null>(null);
  
  // Storage arrays indices
  const [historyList, setHistoryList] = useState<SearchHistory[]>([]);
  const [savedSchemeIds, setSavedSchemeIds] = useState<string[]>([]);
  
  // Loading and Error overlays
  const [isLoading, setIsLoading] = useState(false);
  const [apiResolved, setApiResolved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showStateModal, setShowStateModal] = useState(false);

  const handleScanningComplete = () => {
    setIsLoading(false);
    setApiResolved(false);
    navigateToView('results');
  };

  // Load session storage profiles on mount
  useEffect(() => {
    // 1. Initialise mock standard user if desired, or read active
    const savedUser = getSecuredStorage<{ name: string; email: string }>('sc_active_user');
    if (savedUser) {
      setUser(savedUser);
      if (location.pathname === '/' || location.pathname === '/auth') {
        navigate('/dashboard', { replace: true });
      }
    }

    // 2. Load scheme bookmark indices
    const keys = getSecuredStorage<string[]>('sc_bookmarks');
    if (keys) {
      setSavedSchemeIds(keys);
    }

    // 3. Load historical logs list
    const logs = getSecuredStorage<SearchHistory[]>('sc_histories');
    if (logs) {
      setHistoryList(logs);
    }
  }, []);

  // Synchronize bookmarked scheme IDs when changed from elsewhere (like inside chat)
  useEffect(() => {
    const handleStorageSync = (e: Event) => {
      const keys = getSecuredStorage<string[]>('sc_bookmarks');
      if (keys) {
        setSavedSchemeIds(keys);
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => {
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  // Sync HTML document lang attribute with active runtime language selection
  useEffect(() => {
    document.documentElement.lang = language || 'en';
  }, [language]);

  const handleLogin = (newUser: { name: string; email: string }) => {
    setUser(newUser);
    setSecuredStorage('sc_active_user', newUser);
  };

  const handleLogout = () => {
    setUser(null);
    window.localStorage.removeItem('sc_active_user');
    navigateToView('landing');
  };

  const handleSearch = async (payload: ProfilePayload) => {
    setIsLoading(true);
    setApiResolved(false);
    setErrorMsg(null);

    try {
      // Direct call to Express gateway API or dynamic falling rules
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json() as MatchResponse;
        setResults(data);
        setProfileSnapshot(payload);
        
        // Append to Search Histories array list
        const newHistoryItem: SearchHistory = {
          id: Math.random().toString(36).substring(2, 9),
          profile_snapshot: payload,
          results_snapshot: data,
          created_at: new Date().toISOString()
        };

        const updatedHistories = [newHistoryItem, ...historyList];
        setHistoryList(updatedHistories);
        setSecuredStorage('sc_histories', updatedHistories);

        // Signal scanning overlay to fast-track to 100%
        setApiResolved(true);
      } else {
        throw new Error('API request failed at client layer');
      }
    } catch (apiError) {
      console.warn('[SchemeConnect] API offline — using local engine fallback:', apiError);
      
      // Use the local deterministic rules engine
      const localSchemes = matchSchemes(payload);
      
      const offlineResults: MatchResponse = {
        search_id: `local-${Date.now()}`,
        total_found: localSchemes.length,
        schemes: localSchemes,
        summary_message: language === 'te'
          ? `ఆఫ్లైన్ మోడ్: స్థానిక నియమాలు ఆధారంగా ${localSchemes.length} పథకాలు కనుగొనబడ్డాయి. పూర్తి AI విశ్లేషణకు ఇంటర్నెట్ కనెక్ట్ చేయండి.`
          : `Offline mode: Found ${localSchemes.length} schemes using local rules. Connect to internet for full AI analysis.`
      };
      
      setResults(offlineResults);
      setProfileSnapshot(payload);

      // Append matching history to history state so that dashboard is up-to-date
      const newHistoryItem: SearchHistory = {
        id: `local-${Math.random().toString(36).substring(2, 9)}`,
        profile_snapshot: payload,
        results_snapshot: offlineResults,
        created_at: new Date().toISOString()
      };
      const updatedHistories = [newHistoryItem, ...historyList];
      setHistoryList(updatedHistories);
      setSecuredStorage('sc_histories', updatedHistories);

      setErrorMsg(language === 'te' ? 'ఆఫ్లైన్ మోడ్ లో పని చేస్తున్నారు' : 'Working in offline mode');
      setApiResolved(true);  // Signal scan overlay to complete and show results
      toast.warning(language === 'te' ? 'ఆఫ్‌లైన్ మోడ్: స్థానిక డేటాబేస్ ఉపయోగించబడుతోంది' : 'Offline mode: Using local database');
    }
  };

  const handleToggleSaveScheme = (schemeId: string) => {
    // Toggles saved scheme key arrays
    let nextKeys = [...savedSchemeIds];
    const isAdding = !nextKeys.includes(schemeId);

    if (nextKeys.includes(schemeId)) {
      nextKeys = nextKeys.filter(id => id !== schemeId);
    } else {
      nextKeys.push(schemeId);
    }
    setSavedSchemeIds(nextKeys);
    setSecuredStorage('sc_bookmarks', nextKeys);

    if (isAdding) {
      toast.success(language === 'te' ? 'పథకం సేవ్ చేయబడింది!' : 'Scheme bookmarked!');
    } else {
      toast.info(language === 'te' ? 'సేవ్ చేసిన పథకాల నుండి తొలగించబడింది' : 'Scheme removed from saved');
    }

    // Sync saved scheme objects next
    const savedObjects = getSecuredStorage<SchemeResult[]>('sc_bookmarks_objects') || [];
    let nextObjects = [...savedObjects];

    if (isAdding) {
      let schemeObj = results?.schemes?.find(s => s.scheme_id === schemeId);
      if (!schemeObj) {
        schemeObj = SEED_SCHEMES.find(s => s.scheme_id === schemeId);
      }
      if (schemeObj) {
        if (!nextObjects.some(s => s.scheme_id === schemeId)) {
          nextObjects.push(schemeObj);
        }
      }
    } else {
      nextObjects = nextObjects.filter(s => s.scheme_id !== schemeId);
    }
    setSecuredStorage('sc_bookmarks_objects', nextObjects);
    window.dispatchEvent(new StorageEvent('storage', { key: 'sc_bookmarks' }));
  };

  const handleLoadHistoryItem = (item: SearchHistory) => {
    setProfileSnapshot(item.profile_snapshot);
    setResults(item.results_snapshot);
    navigateToView('results');
  };

  const handleDeleteHistoryItem = (id: string) => {
    const nextList = historyList.filter(item => item.id !== id);
    setHistoryList(nextList);
    setSecuredStorage('sc_histories', nextList);
  };

  const executeBrowseAll = (selectedState: string, selectedDistrict: string) => {
    const defaultPayload: ProfilePayload = {
      name: profileSnapshot?.name || 'Guest Explorer',
      age: profileSnapshot?.age || 25,
      gender: profileSnapshot?.gender || 'Male',
      income_annual: profileSnapshot?.income_annual || 150000,
      occupation: profileSnapshot?.occupation || 'Farmer',
      bpl_card: profileSnapshot?.bpl_card || 'BPL',
      state: selectedState as 'Andhra Pradesh' | 'Telangana',
      district: selectedDistrict,
      caste_category: profileSnapshot?.caste_category || 'OBC',
      existing_schemes: profileSnapshot?.existing_schemes || [],
      family_members: profileSnapshot?.family_members || 4,
      language: language
    };
    
    // Package all SEED schemes directly under results context
    const fullMockResults: MatchResponse = {
      search_id: 'full-explorer-001',
      total_found: SEED_SCHEMES.length,
      schemes: SEED_SCHEMES.map((item, idx) => ({
        scheme_id: item.scheme_id,
        name_en: item.name_en,
        name_te: item.name_te,
        ministry: item.ministry,
        department: item.department,
        category: item.category,
        source: item.source,
        apply_link: item.apply_link,
        benefit_amount: item.benefit_amount,
        documents_required: item.documents_required,
        eligibility_reasons: language === 'te' 
          ? [`ఈ ప్రొఫైల్ ద్వారా ఈ పథకం విహారించవచ్చు.`]
          : [`General listing criteria matching search indexing.`],
        similarity_score: 0.95 - (idx * 0.02)
      })),
      summary_message: 'Complete Welfare Index'
    };

    setResults(fullMockResults);
    setProfileSnapshot(defaultPayload);
    navigateToView('results');
  };

  const handleBrowseAll = () => {
    if (!user) {
      navigateToView('auth');
      return;
    }

    // Step 1: Check if profileSnapshot (already in App state) has a valid state value. If yes, use it.
    if (profileSnapshot?.state) {
      const defaultDist = profileSnapshot.state === 'Telangana' ? 'Hyderabad' : 'Visakhapatnam';
      executeBrowseAll(profileSnapshot.state, profileSnapshot.district || defaultDist);
      return;
    }

    // Step 2 & 3: Check sessionStorage sc_state_pref to see if state is determined
    const storedState = sessionStorage.getItem('sc_state_pref');
    if (storedState) {
      executeBrowseAll(storedState, storedState === 'Telangana' ? 'Hyderabad' : 'Visakhapatnam');
      return;
    }

    // Otherwise detect using the modal
    setShowStateModal(true);
  };

  return (
    <div className="w-full min-h-screen flex flex-col">
      <Routes>
        {/* Protected Admin CRUD Panel Road */}
        <Route path="/admin" element={
          <ErrorBoundary key="admin" sectionName="Admin Panel">
            <Suspense fallback={<PageLoader />}>
              <AdminPage />
            </Suspense>
          </ErrorBoundary>
        } />

        <Route element={
          <MainLayout
            user={user}
            currentView={currentView}
            navigateToView={navigateToView}
            handleLogout={handleLogout}
            language={language}
            handleBrowseAll={handleBrowseAll}
            handleStartChatWithQuery={handleStartChatWithQuery}
          />
        }>
          {/* Public Roads */}
          <Route path="/" element={
            <LandingPage 
              setView={navigateToView} 
              onBrowseAll={handleBrowseAll} 
              onStartChatWithQuery={handleStartChatWithQuery}
            />
          } />
          
          <Route path="/auth" element={
            <AuthPage
              onLogin={handleLogin}
            />
          } />

          {/* Protected Roads wrapped under security guard */}
          <Route element={<ProtectedRoute user={user} />}>
            <Route path="/dashboard" element={
              <ErrorBoundary key={currentView} sectionName="Dashboard">
                <DashboardPage
                  user={user}
                  historyList={historyList}
                  savedSchemeIds={savedSchemeIds}
                  onLoadHistoryItem={handleLoadHistoryItem}
                  setView={navigateToView}
                  onStartChatWithQuery={handleStartChatWithQuery}
                />
              </ErrorBoundary>
            } />
            <Route path="/wizard" element={
              <ErrorBoundary key={currentView} sectionName="Profile Wizard">
                <ProfileWizard
                  onSearch={handleSearch}
                  isLoading={isLoading}
                  errorMsg={errorMsg}
                  setView={navigateToView}
                />
              </ErrorBoundary>
            } />
            <Route path="/results" element={
              <ErrorBoundary key={currentView} sectionName="Eligibility Results">
                <ResultsPage
                  results={results}
                  profileSnapshot={profileSnapshot}
                  onEditProfile={() => navigateToView('wizard')}
                  savedSchemeIds={savedSchemeIds}
                  onToggleSaveScheme={handleToggleSaveScheme}
                  setView={navigateToView}
                  user={user}
                />
              </ErrorBoundary>
            } />
            <Route path="/history" element={
              <HistoryPage
                historyList={historyList}
                onLoadHistoryItem={handleLoadHistoryItem}
                onDeleteHistoryItem={handleDeleteHistoryItem}
                setView={navigateToView}
                user={user}
              />
            } />
            <Route path="/legal" element={
              <ErrorBoundary key={currentView} sectionName="Legal Analyzer">
                <LegalPage 
                  setView={navigateToView} 
                  setChatAttachedFile={setChatAttachedFile} 
                />
              </ErrorBoundary>
            } />
            <Route path="/chat" element={
              <ErrorBoundary key={currentView} sectionName="Smart Chat">
                <ChatPage 
                  attachedFile={chatAttachedFile} 
                  clearAttachedFile={() => setChatAttachedFile(null)} 
                  prepopulatedQuery={chatPrepopulatedQuery}
                  clearPrepopulatedQuery={() => setChatPrepopulatedQuery(null)}
                  profileSnapshot={profileSnapshot}
                  user={user}
                />
              </ErrorBoundary>
            } />
            <Route path="/saved" element={
              <SavedItemsPage
                savedSchemeIds={savedSchemeIds}
                onToggleSaveScheme={handleToggleSaveScheme}
                setView={navigateToView}
                user={user}
              />
            } />
            <Route path="/settings" element={
              <ProfileSettingsPage
                user={user}
                onLogout={handleLogout}
                setView={navigateToView}
              />
            } />
          </Route>

          {/* Fallback routing mechanism */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {/* Single root-level overlay — never duplicate this */}
      <ScanningOverlay
        isOpen={isLoading}
        language={language}
        apiResolved={apiResolved}
        onComplete={handleScanningComplete}
      />

      <StateSelectionModal
        isOpen={showStateModal}
        onClose={() => setShowStateModal(false)}
        onSelect={(state) => {
          sessionStorage.setItem('sc_state_pref', state);
          executeBrowseAll(state, state === 'Telangana' ? 'Hyderabad' : 'Visakhapatnam');
          setShowStateModal(false);
        }}
        language={language}
      />
    </div>
  );
}

interface StateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (state: string) => void;
  language: string;
}

export const StateSelectionModal: React.FC<StateSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  language
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus treatment when opened
    const focusableElements = modalRef.current?.querySelectorAll('button');
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        if (!focusableElements || focusableElements.length === 0) return;
        const first = focusableElements[0] as HTMLElement;
        const last = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isTe = language === 'te';
  const title = isTe ? "మీ రాష్ట్రాన్ని ఎంచుకోండి" : "Select your state to browse schemes";
  const selectLabel = isTe ? "స్కీమ్‌లను బ్రౌజ్ చేయడానికి మీ నివాస రాష్ట్రాన్ని ఎంచుకోండి:" : "Select your residential state to browse matching schemes:";
  const cancelText = isTe ? "రద్దు చేయి" : "Cancel";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div 
        ref={modalRef}
        className="w-full max-w-sm p-6 bg-bg-surface border border-border-default rounded-2xl shadow-xl animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="state-modal-title"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="state-modal-title" className="text-base font-bold text-text-primary">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-text-muted mb-6 leading-relaxed">
          {selectLabel}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onSelect('Andhra Pradesh')}
            className="w-full py-3.5 px-4 text-center text-sm font-semibold text-text-primary bg-bg-surface hover:bg-bg-elevated border border-border-default hover:border-accent-saffron/40 hover:text-accent-saffron rounded-xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-saffron/30 scale-100 active:scale-98"
          >
            {isTe ? "ఆంధ్రప్రదేశ్" : "Andhra Pradesh"}
          </button>
          
          <button
            onClick={() => onSelect('Telangana')}
            className="w-full py-3.5 px-4 text-center text-sm font-semibold text-text-primary bg-bg-surface hover:bg-bg-elevated border border-border-default hover:border-accent-saffron/40 hover:text-accent-saffron rounded-xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-saffron/30 scale-100 active:scale-98"
          >
            {isTe ? "తెలంగాణ" : "Telangana"}
          </button>

          <button
            onClick={onClose}
            className="w-full mt-2 py-2 px-4 text-center text-xs font-medium text-text-muted hover:text-text-primary transition-all cursor-pointer rounded-lg hover:bg-bg-elevated"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};
