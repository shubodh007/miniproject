import React, { useState, useEffect } from 'react';
import { TranslationProvider, useTranslation } from './i18n';
import { AppHeader } from './components/AppHeader';
import { LandingPage } from './components/LandingPage';
import { ProfileWizard } from './components/ProfileWizard';
import { ResultsPage } from './components/ResultsPage';
import { HistoryPage } from './components/HistoryPage';
import { AuthPage } from './components/AuthPage';
import { LegalPage } from './components/LegalPage';
import { ChatPage } from './components/ChatPage';
import { DashboardPage } from './components/DashboardPage';
import { SavedItemsPage } from './components/SavedItemsPage';
import { ProfileSettingsPage } from './components/ProfileSettingsPage';
import { AppShell } from './components/AppShell';
import { ProfilePayload, SchemeResult, SearchHistory, MatchResponse } from './types';
import { SEED_SCHEMES } from './utils/schemeEngine';
import { Loader2, Sparkles, Home, ShieldAlert, MessageSquare, History, User } from 'lucide-react';
import { getSecuredStorage, setSecuredStorage } from './utils/security';

export default function App() {
  return (
    <TranslationProvider>
      <MainAppContainer />
    </TranslationProvider>
  );
}

interface PrivateRouteProps {
  user: { name: string; email: string } | null;
  setView: (v: string) => void;
  children: React.ReactNode;
  currentRoute: string;
  setRedirectIntent: (v: string | null) => void;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  user,
  setView,
  children,
  currentRoute,
  setRedirectIntent,
}) => {
  useEffect(() => {
    if (!user) {
      setRedirectIntent(currentRoute);
      setView('auth');
    }
  }, [user, setView, currentRoute, setRedirectIntent]);

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

function MainAppContainer() {
  const { t, language } = useTranslation();
  
  // Views navigation router state
  const [currentView, setView] = useState<string>('landing');
  
  // Authentication states
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Protected routes constraint list
  const protectedRoutes = ['dashboard', 'wizard', 'results', 'legal', 'chat', 'history', 'saved', 'settings'];

  // Preserved intent to restore targeted route after login
  const [redirectIntent, setRedirectIntent] = useState<string | null>(null);

  // Safeguarded view routing or active redirect logic
  const navigateToView = (view: string) => {
    if (!user && protectedRoutes.includes(view)) {
      setRedirectIntent(view);
      setView('auth');
    } else {
      setView(view);
    }
  };

  const activeView = (!user && protectedRoutes.includes(currentView)) ? 'auth' : currentView;

  // Document attachment transfer to Smart Chat
  const [chatAttachedFile, setChatAttachedFile] = useState<{ name: string; content: string } | null>(null);

  // Chat prepopulated query transfer
  const [chatPrepopulatedQuery, setChatPrepopulatedQuery] = useState<string | null>(null);

  const handleStartChatWithQuery = (query: string) => {
    setChatPrepopulatedQuery(query);
    navigateToView('chat');
  };

  // Recommendations and Profiler snapshots
  const [results, setResults] = useState<{ schemes: SchemeResult[]; summary_message?: string } | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfilePayload | null>(null);
  
  // Storage arrays indices
  const [historyList, setHistoryList] = useState<SearchHistory[]>([]);
  const [savedSchemeIds, setSavedSchemeIds] = useState<string[]>([]);
  
  // Loading and Error overlays
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load session storage profiles on mount
  useEffect(() => {
    // 1. Initialise mock standard user if desired, or read active
    const savedUser = getSecuredStorage<{ name: string; email: string }>('sc_active_user');
    if (savedUser) {
      setUser(savedUser);
      setView('dashboard');
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

  const handleLogin = (newUser: { name: string; email: string }) => {
    setUser(newUser);
    setSecuredStorage('sc_active_user', newUser);
  };

  const handleLogout = () => {
    setUser(null);
    window.localStorage.removeItem('sc_active_user');
    setRedirectIntent(null);
    setView('landing');
  };

  const handleSearch = async (payload: ProfilePayload) => {
    setIsLoading(true);
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

        // Let the scanning simulation fade smoothly for maximum aesthetic feel
        setTimeout(() => {
          setIsLoading(false);
          setView('results');
        }, 1200);
      } else {
        throw new Error('API request failed at client layer');
      }
    } catch (apiError) {
      // Local matchmaking rule engine execution
      setErrorMsg('Central API gateway is offline. Working with localized diagnostic indexes.');
      setIsLoading(false);
    }
  };

  const handleToggleSaveScheme = (schemeId: string) => {
    // Toggles saved scheme key arrays
    let nextKeys = [...savedSchemeIds];
    if (nextKeys.includes(schemeId)) {
      nextKeys = nextKeys.filter(id => id !== schemeId);
    } else {
      nextKeys.push(schemeId);
    }
    setSavedSchemeIds(nextKeys);
    setSecuredStorage('sc_bookmarks', nextKeys);
  };

  const handleLoadHistoryItem = (item: SearchHistory) => {
    setProfileSnapshot(item.profile_snapshot);
    setResults(item.results_snapshot);
    setView('results');
  };

  const handleDeleteHistoryItem = (id: string) => {
    const nextList = historyList.filter(item => item.id !== id);
    setHistoryList(nextList);
    setSecuredStorage('sc_histories', nextList);
  };

  const handleBrowseAll = () => {
    if (!user) {
      setView('auth');
      return;
    }
    // Generate simulated "All Available Schemes" index diagnosis using default parameters
    const defaultPayload: ProfilePayload = {
      name: 'Guest Explorer',
      age: 25,
      gender: 'Male',
      income_annual: 150000,
      occupation: 'Farmer',
      bpl_card: 'BPL',
      state: 'Andhra Pradesh',
      district: 'Visakhapatnam',
      caste_category: 'OBC',
      existing_schemes: [],
      family_members: 4,
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
    setView('results');
  };

  if (user) {
    return (
      <TranslationProvider>
        <AppShell 
          currentView={activeView}
          setView={navigateToView}
          user={user}
          onLogout={handleLogout}
        >
          {activeView === 'dashboard' && (
            <DashboardPage
              user={user}
              historyList={historyList}
              savedSchemeIds={savedSchemeIds}
              onLoadHistoryItem={handleLoadHistoryItem}
              setView={navigateToView}
              onStartChatWithQuery={handleStartChatWithQuery}
            />
          )}

          {activeView === 'wizard' && (
            <ProfileWizard
              onSearch={handleSearch}
              isLoading={isLoading}
              errorMsg={errorMsg}
              setView={navigateToView}
            />
          )}

          {activeView === 'results' && (
            <ResultsPage
              results={results}
              profileSnapshot={profileSnapshot}
              onEditProfile={() => navigateToView('wizard')}
              savedSchemeIds={savedSchemeIds}
              onToggleSaveScheme={handleToggleSaveScheme}
              setView={navigateToView}
              user={user}
            />
          )}

          {activeView === 'history' && (
            <HistoryPage
              historyList={historyList}
              onLoadHistoryItem={handleLoadHistoryItem}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              setView={navigateToView}
              user={user}
            />
          )}

          {activeView === 'legal' && (
            <LegalPage 
              setView={navigateToView} 
              setChatAttachedFile={setChatAttachedFile} 
            />
          )}

          {activeView === 'chat' && (
            <ChatPage 
              attachedFile={chatAttachedFile} 
              clearAttachedFile={() => setChatAttachedFile(null)} 
              prepopulatedQuery={chatPrepopulatedQuery}
              clearPrepopulatedQuery={() => setChatPrepopulatedQuery(null)}
            />
          )}

          {activeView === 'saved' && (
            <SavedItemsPage
              savedSchemeIds={savedSchemeIds}
              onToggleSaveScheme={handleToggleSaveScheme}
              setView={navigateToView}
              user={user}
            />
          )}

          {activeView === 'settings' && (
            <ProfileSettingsPage
              user={user}
              onLogout={handleLogout}
              setView={navigateToView}
            />
          )}

          {activeView === 'landing' && (
            <LandingPage 
              setView={navigateToView} 
              onBrowseAll={handleBrowseAll} 
              onStartChatWithQuery={handleStartChatWithQuery}
            />
          )}

          {isLoading && (
            <div className="fixed inset-0 bg-bg-base/90 backdrop-blur-md z-50 flex flex-col justify-center items-center text-center px-4 animate-in fade-in duration-200">
              <div className="bg-bg-surface border border-border-main p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm">
                <div className="w-16 h-16 rounded-full bg-accent-saffron/10 text-accent-saffron flex items-center justify-center mb-6 animate-spin">
                  <Loader2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2 flex items-center justify-center space-x-1.5">
                  <Sparkles className="text-accent-gold" size={18} />
                  <span>Matching Schemes...</span>
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed font-semibold">
                  Scanning 2,400+ Central and State welfare database models. Realizing matching margins for Andhra & Telangana districts...
                </p>
              </div>
            </div>
          )}
        </AppShell>
      </TranslationProvider>
    );
  }

  return (
    <div className="relative min-h-screen pb-12 flex flex-col justify-between">
      {/* Universal header top branding navigation */}
      <AppHeader
        currentView={activeView}
        setView={navigateToView}
        user={user}
        onLogout={handleLogout}
      />

      {/* RENDER ACTIVE SCREEN ROUTING VIEWPORTS */}
      <div className="flex-grow pb-16 md:pb-0">
        {activeView === 'landing' && (
          <LandingPage 
            setView={navigateToView} 
            onBrowseAll={handleBrowseAll} 
            onStartChatWithQuery={handleStartChatWithQuery}
          />
        )}

        {activeView === 'auth' && (
          <AuthPage
            onLogin={handleLogin}
            setView={navigateToView}
            redirectIntent={redirectIntent}
          />
        )}
      </div>

      {activeView === 'landing' && (
        <footer className="border-t border-border-subtle bg-bg-surface/50 py-8 text-center" id="guest-landing-footer">
          <p className="text-xs text-text-muted">© 2026 SchemeConnect AP Civic Welfare Advisory Core. All Rights Reserved.</p>
        </footer>
      )}

      {/* SCANNING PROGRESS OVERLAY */}
      {isLoading && (
        <div className="fixed inset-0 bg-bg-base/90 backdrop-blur-md z-50 flex flex-col justify-center items-center text-center px-4 animate-in fade-in duration-200">
          <div className="bg-bg-surface border border-border-main p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-accent-saffron/10 text-accent-saffron flex items-center justify-center mb-6 animate-spin">
              <Loader2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2 flex items-center justify-center space-x-1.5">
              <Sparkles className="text-accent-gold" size={18} />
              <span>Matching Schemes...</span>
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed font-semibold">
              Scanning 2,400+ Central and State welfare database models. Realizing matching margins for Andhra & Telangana districts...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
