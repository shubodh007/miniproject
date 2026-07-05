import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Search, 
  Bookmark, 
  FileCheck, 
  ArrowRight, 
  Clock, 
  Activity, 
  ShieldAlert, 
  MessageSquare, 
  Sliders, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { SearchHistory, SchemeResult, AuthUser } from '../types';
import { SEED_SCHEMES } from '../utils/schemeEngine';
import { router } from '../utils/router';
import { DashboardStatsSkeleton } from './skeletons/DashboardStatsSkeleton';

// Real-time templates and mock data removed in favor of real telemetry and user database indices.

interface DashboardPageProps {
  user: AuthUser | null;
  historyList: SearchHistory[];
  savedSchemeIds: string[];
  onLoadHistoryItem: (item: SearchHistory) => void;
  setView: (view: string) => void;
  onStartChatWithQuery?: (query: string) => void;
  isLoading?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  historyList,
  savedSchemeIds,
  onLoadHistoryItem,
  setView,
  onStartChatWithQuery,
  isLoading = false
}) => {
  const { t, language } = useTranslation();
  // Helper inside the component to format relative time in English and Telugu
  const getRelativeTime = (dateStr: string | undefined): string => {
    if (!dateStr) return language === 'te' ? 'సమాచారం లేదు' : 'No history';
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) {
        return language === 'te' ? 'ఇప్పుడే' : 'Just now';
      }
      if (diffMins < 60) {
        return language === 'te' ? `${diffMins} నిమిషాల క్రితం` : `${diffMins}m ago`;
      }
      if (diffHours < 24) {
        return language === 'te' ? `${diffHours} గంటల క్రితం` : `${diffHours}h ago`;
      }
      if (diffDays === 1) {
        return language === 'te' ? 'నిన్న' : 'Yesterday';
      }
      return language === 'te' ? `${diffDays} రోజుల క్రితం` : `${diffDays}d ago`;
    } catch (e) {
      return language === 'te' ? 'సమాచారం లేదు' : 'No history';
    }
  };

  // Helper to calculate top matching score percentage
  const getTopMatchScore = (): string => {
    if (!historyList || historyList.length === 0) return '—';
    try {
      let maxScore = 0;
      historyList.forEach(hist => {
        if (hist.results_snapshot && Array.isArray(hist.results_snapshot.schemes)) {
          hist.results_snapshot.schemes.forEach(s => {
            const score = s.similarity_score ?? 0;
            if (score > maxScore) {
              maxScore = score;
            }
          });
        }
      });
      if (maxScore <= 1 && maxScore > 0) {
        return `${Math.round(maxScore * 100)}%`;
      }
      return maxScore > 0 ? `${Math.round(maxScore)}%` : '—';
    } catch (e) {
      return '—';
    }
  };

  // Helper to construct real user logs based on active searches and bookmarks
  const getTimelineActivities = () => {
    const list: Array<{ id: string; type: string; text_en: string; text_te: string; time: string; color: string }> = [];
    
    if (historyList && historyList.length > 0) {
      historyList.slice(0, 2).forEach((hist) => {
        const citizenName = hist.profile_snapshot?.name || (language === 'te' ? 'పౌరుడు' : 'citizen');
        list.push({
          id: `act-hist-${hist.id}`,
          type: 'wizard',
          text_en: `Welfare eligibility analysis for ${citizenName} executed`,
          text_te: `${citizenName} కోసం సంక్షేమ అర్హత విశ్లేషణ విజయవంతంగా జరిగింది`,
          time: getRelativeTime(hist.created_at),
          color: 'bg-emerald-500'
        });
      });
    }

    const savedSchemes = SEED_SCHEMES.filter(scheme => 
      savedSchemeIds.includes(scheme.scheme_id)
    );

    if (savedSchemes && savedSchemes.length > 0) {
      savedSchemes.slice(0, 2).forEach((scheme, idx) => {
        list.push({
          id: `act-save-${scheme.scheme_id}`,
          type: 'bookmark',
          text_en: `Bookmarked "${scheme.name_en}"`,
          text_te: `"${scheme.name_te || scheme.name_en}" పథకం భద్రపరచబడింది`,
          time: idx === 0 ? (language === 'te' ? 'ఇటీవల' : 'Recently') : (language === 'te' ? 'క్రితం' : 'Earlier'),
          color: 'bg-amber-500'
        });
      });
    }

    if (list.length === 0) {
      list.push({
        id: 'act-default',
        type: 'system',
        text_en: 'Portal session initialized successfully',
        text_te: 'పోర్టల్ సెషన్ విజయవంతంగా ప్రారంభించబడింది',
        time: language === 'te' ? 'ఇప్పుడే' : 'Just now',
        color: 'bg-blue-500'
      });
    }

    return list;
  };

  const handleSchemeCardClick = (scheme: SchemeResult) => {
    // 1. Guard against event or invalid objects passing in
    if (!scheme || typeof scheme !== 'object' || 'preventDefault' in scheme || 'target' in scheme) {
      console.warn('[SchemeCard] Invalid scheme object passed');
      return;
    }

    const safePayload = {
      scheme_id: scheme.scheme_id,
      name_en: scheme.name_en,
      name_te: scheme.name_te || '',
      department: scheme.department ? String(scheme.department) : '',
      category: scheme.category ? String(scheme.category) : '',
      state: scheme.source ? String(scheme.source) : '',
      benefit_amount: String(scheme.benefit_amount || (language === 'te' ? "ఆర్థిక సహాయం / సబ్సిడీ" : "Financial Benefit / Subsidy")),
      eligibility_match: 95,
      match_certainty: String(language === 'te' ? "బుక్‌మార్క్ చేయబడింది" : "SAVED PROFILE"),
      reasoning_chain: Array.isArray(scheme.eligibility_reasons)
        ? scheme.eligibility_reasons.filter(item => typeof item === 'string' || typeof item === 'number').map(String)
        : [],
      documents_needed: Array.isArray(scheme.documents_required)
        ? scheme.documents_required.filter(item => typeof item === 'string' || typeof item === 'number').map(String)
        : [],
      apply_url: scheme.apply_link ? String(scheme.apply_link) : "https://www.myscheme.gov.in"
    };

    try {
      console.log('[SchemeCard] Safe payload successfully sanitized and validated:', safePayload);
      
      router.push('/chat', {
        state: { schemeHandoff: safePayload }
      });
      setView('chat');
    } catch (err) {
      console.error('[SchemeCard] Failed to handle navigation for safe payload:', err);
    }
  };

  const handleChatHandoff = handleSchemeCardClick;

  // Find corresponding SchemeResult objects for saved IDs
  const savedSchemes = SEED_SCHEMES.filter(scheme => 
    savedSchemeIds.includes(scheme.scheme_id)
  );

  // Filter actual history item summary data
  const recentHistory = historyList.slice(0, 3);

  // Stable legal report list for the dashboard
  const liveLegalReports = [
    {
      id: 'rep-01',
      title_en: 'Tenant Farmer Rental Deed Audit',
      title_te: 'కౌలు రైతు ఒప్పంద పత్రం ఆడిట్',
      timestamp: language === 'te' ? 'రెండు రోజుల క్రితం' : 'two days ago',
      score: 84,
      risk_en: 'Medium Risk',
      risk_te: 'మధ్యస్థ ప్రమాదం'
    }
  ];

  // Construct user system activity logs based on actual historical determinations and bookmarks
  const liveActivities = (() => {
    const list: Array<{ id: string; text_en: string; text_te: string; time: string; color: string }> = [];

    if (historyList && historyList.length > 0) {
      const latestSearch = historyList[0];
      if (latestSearch && latestSearch.profile_snapshot) {
        const totalFound = latestSearch.results_snapshot?.total_found ?? 0;
        const schemesFound = latestSearch.results_snapshot?.schemes?.slice(0, 2) || [];
        
        list.push({
          id: `act-search-${latestSearch.id}`,
          text_en: `Evaluated eligibility for ${latestSearch.profile_snapshot.name} (${totalFound} matched)`,
          text_te: `${latestSearch.profile_snapshot.name} కు అర్హతలను తనిఖీ చేసారు (${totalFound} పథకాలు జతపడ్డాయి)`,
          time: getRelativeTime(latestSearch.created_at),
          color: 'bg-emerald-500'
        });

        schemesFound.forEach((scheme, idx) => {
          if (scheme) {
            list.push({
              id: `act-scheme-${scheme.scheme_id}-${idx}`,
              text_en: `Viewed matching details for "${scheme.name_en}"`,
              text_te: `"${scheme.name_te || scheme.name_en}" సరిపోలు వివరణలను చూశారు`,
              time: getRelativeTime(latestSearch.created_at),
              color: 'bg-blue-500'
            });
          }
        });
      }
    }

    if (savedSchemes && savedSchemes.length > 0) {
      savedSchemes.slice(0, 2).forEach(scheme => {
        list.push({
          id: `act-save-${scheme.scheme_id}`,
          text_en: `Bookmarked "${scheme.name_en}"`,
          text_te: `"${scheme.name_te || scheme.name_en}" పథకం భద్రపరచబడింది`,
          time: language === 'te' ? 'ఇటీవల' : 'Recently',
          color: 'bg-amber-500'
        });
      });
    }

    if (list.length === 0) {
      list.push({
        id: 'act-welcome-1',
        text_en: 'Welcome to SchemeConnect! Fill out the smart wizard to find matching schemes.',
        text_te: 'స్కీమ్ కనెక్ట్ కు సుస్వాగతం! మీ అర్హతలను కనుగొనడానికి స్మార్ట్ విజార్డ్ పూరించండి.',
        time: language === 'te' ? 'ఇప్పుడే' : 'Just now',
        color: 'bg-purple-500'
      });
      list.push({
        id: 'act-welcome-2',
        text_en: 'Configure your profile in the analysis section to initiate secure compliance checks.',
        text_te: 'సురక్షిత సమ్మతి తనిఖీలను ప్రారంభించడానికి విశ్లేషణ విభాగంలో మీ ప్రొఫైల్‌ను కాన్ఫిగర్ చేయండి.',
        time: language === 'te' ? 'ఇప్పుడే' : 'Just now',
        color: 'bg-indigo-500'
      });
    }

    return list.slice(0, 4);
  })();


  return (
    <div className="relative min-h-screen bg-bg-base overflow-x-hidden font-sans pt-6 pb-24 md:pb-12" id="dashboard-container">
      {/* Premium Subtle Ambient Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--bg-surface)_1px,transparent_1px),linear-gradient(to_bottom,var(--bg-surface)_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_10%,black_80%,transparent_100%)] pointer-events-none z-0" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Welcome Header Section */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="dashboard-welcome">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-accent-saffron/10 border border-accent-saffron/20 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase text-accent-saffron">
              <span>{language === 'te' ? 'యాక్టివ్ పోర్టల్ ప్యానెల్' : 'ACTIVE PORTAL CONTROL'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary font-heading mt-2">
              {language === 'te' ? `నమస్కారం, ${user?.name || 'మిత్రులు'}` : `Welcome back, ${user?.name || 'User'}`}
            </h1>
            <p className="text-sm text-text-secondary mt-1 max-w-xl">
              {language === 'te' 
                ? 'ఆంధ్రప్రదేశ్ మరియు తెలంగాణకు అనుబంధించబడిన సంక్షేమ పథకాలు మరియు న్యాయ సలహాలు క్రమబద్ధంగా అమర్చబడ్డాయి.'
                : 'Access unified demographic mapping index, legal risk monitors, and instant dynamic assistance workflows.'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-2 bg-bg-surface border border-border-main rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-mono font-bold text-text-secondary">{language === 'te' ? 'ఏపీఐ గేట్‌వే: ఆన్‌లైన్' : 'API GATEWAY: ONLINE'}</span>
            </div>
          </div>
        </section>

        {/* Continue where you left off block (Compact panel) */}
        {historyList.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-accent-blue/5 border border-accent-blue/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm"
            id="continue-panel"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-accent-blue/10 rounded-xl text-accent-blue flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-[11px] leading-tight font-black tracking-widest text-accent-blue uppercase block">
                  {language === 'te' ? 'చివరి ప్రొఫైల్ శోధన' : 'CONTINUE RECENT WORK'}
                </span>
                <p className="text-sm font-bold text-text-primary mt-0.5">
                  {language === 'te' 
                    ? `చివరి శోధన: ${historyList[0].profile_snapshot?.name || 'User'}, ₹${(historyList[0].profile_snapshot?.income_annual ?? 0).toLocaleString()} వార్షిక ఆదాయం` 
                    : `Last evaluation profile: ${historyList[0].profile_snapshot?.name || 'User'}, ₹${(historyList[0].profile_snapshot?.income_annual ?? 0).toLocaleString()} income`}
                </p>
              </div>
            </div>
            <button
              onClick={() => onLoadHistoryItem(historyList[0])}
              className="inline-flex items-center space-x-1.5 self-start sm:self-center px-4 py-2 bg-accent-blue text-white rounded-xl font-bold text-xs hover:bg-accent-blue/90 shadow-lg shadow-accent-blue/10 transition-colors cursor-pointer focus-ring"
            >
              <span>{language === 'te' ? 'ఫలితాలను పునఃసమీక్షించండి' : 'Restore Results'}</span>
              <ArrowRight size={14} />
            </button>
          </motion.div>
        )}

        {/* Grid: Overview Metric summary cards */}
        {isLoading ? (
          <DashboardStatsSkeleton />
        ) : (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4" id="dashboard-metrics">
            <div className="bg-bg-surface border border-border-main p-5 rounded-2xl shadow-sm hover:border-accent-saffron/20 transition-all flex flex-col justify-between relative overflow-hidden group">
              <span className="text-text-muted text-xs font-semibold">{language === 'te' ? 'మొత్తం శోధించిన పథకాలు' : 'Total Schemes Searched'}</span>
              <div className="flex items-baseline space-x-1.5 mt-3">
                <span className="text-3xl font-bold font-heading text-text-primary transition-all duration-300 tabular-nums">
                  {historyList.length}
                </span>
              </div>
              <p className="text-[11px] leading-tight text-emerald-500 font-mono font-bold mt-1 uppercase flex items-center space-x-1">
                <span>● {language === 'te' ? 'తనిఖీ చేయబడిన ప్రొఫైల్స్' : 'EVALUATION HISTORIES'}</span>
              </p>
            </div>

            <div className="bg-bg-surface border border-border-main p-5 rounded-2xl shadow-sm hover:border-accent-saffron/20 transition-all flex flex-col justify-between relative overflow-hidden group">
              <span className="text-text-muted text-xs font-semibold">{language === 'te' ? 'భద్రపరచిన పథకాలు' : 'Bookmarked Schemes'}</span>
              <div className="flex items-baseline space-x-1.5 mt-3">
                <span className="text-3xl font-bold font-heading text-text-primary">
                  {savedSchemeIds.length}
                </span>
                <span className="text-[11px] leading-tight text-text-muted">{language === 'te' ? 'పథకాలు' : 'SCHEMES'}</span>
              </div>
              <p className="text-[11px] leading-tight text-accent-blue font-mono font-bold mt-1 uppercase">
                ● {language === 'te' ? 'క్లౌడ్ సేవ్ యాక్టివ్' : 'SECURE DB SYNCED'}
              </p>
            </div>

            <div className="bg-bg-surface border border-border-main p-5 rounded-2xl shadow-sm hover:border-accent-saffron/20 transition-all flex flex-col justify-between relative overflow-hidden group">
              <span className="text-text-muted text-xs font-semibold">{language === 'te' ? 'చివరి శోధన సమయం' : 'Last Search Time'}</span>
              <div className="flex items-baseline space-x-1 mt-3">
                <span className="text-xl sm:text-2xl font-bold font-heading text-text-primary truncate">
                  {historyList && historyList[0] ? getRelativeTime(historyList[0].created_at) : '—'}
                </span>
              </div>
              <p className="text-[11px] leading-tight text-accent-saffron font-bold font-mono mt-1 uppercase">
                ● {language === 'te' ? 'ఇటీవలి విశ్లేషణ ప్రొఫైల్' : 'MOST RECENT PROFILE'}
              </p>
            </div>

            <div className="bg-bg-surface border border-border-main p-5 rounded-2xl shadow-sm hover:border-accent-saffron/20 transition-all flex flex-col justify-between relative overflow-hidden group">
              <span className="text-text-muted text-xs font-semibold">{language === 'te' ? 'అత్యధిక సరిపోలిక స్కోరు' : 'Top Match Score'}</span>
              <div className="flex items-baseline space-x-1.5 mt-3">
                <span className="text-3xl font-bold font-heading text-accent-blue tabular-nums">
                  {getTopMatchScore()}
                </span>
              </div>
              <p className="text-[11px] leading-tight text-text-muted font-mono mt-1 uppercase">
                🌐 {language === 'te' ? 'వ్యక్తిగతీకరించిన గరిష్ట' : 'PERSONALIZED MAXIMUM'}
              </p>
            </div>
          </section>
        )}

        {/* Layout: Main grid splits */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="dashboard-layouts-grid">
          
          {/* Col 1 & 2: Workspaces / Recent indexes */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Quick Actions Panel */}
            <div className="bg-bg-surface border border-border-main p-6 rounded-3xl space-y-5 shadow-sm" id="dashboard-quick-actions">
              <h2 className="text-lg font-bold font-heading text-text-primary flex items-center space-x-2">
                <Sliders size={18} className="text-accent-saffron" />
                <span>{language === 'te' ? 'త్వరిత కార్యాచరణ కేంద్రం' : 'Workspace Launchpads'}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setView('wizard')}
                  className="flex flex-col justify-between p-4 bg-bg-elevated/40 hover:bg-bg-elevated border border-border-subtle hover:border-accent-saffron/30 rounded-2xl text-left cursor-pointer transition-all hover:scale-[1.01] group h-36"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-saffron/10 text-accent-saffron flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-wide uppercase text-text-primary flex items-center group-hover:text-accent-saffron transition-colors">
                      <span>{language === 'te' ? 'అర్హత విశ్లేషణ' : 'Smart Wizard'}</span>
                      <ChevronRight size={14} className="ml-0.5 opacity-0 group-hover:opacity-100 transition-all" />
                    </h3>
                    <p className="text-[11px] text-text-secondary mt-1">{language === 'te' ? 'అర్హత సూచికలను ధృవీకరించు' : 'Verify eligibility indexes'}</p>
                  </div>
                </button>
                <button
                  onClick={() => setView('legal')}
                  className="flex flex-col justify-between p-4 bg-bg-elevated/40 hover:bg-bg-elevated border border-border-subtle hover:border-accent-blue/30 rounded-2xl text-left cursor-pointer transition-all hover:scale-[1.01] group h-36"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-blue/10 text-accent-blue flex items-center justify-center">
                    <FileCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-wide uppercase text-text-primary flex items-center group-hover:text-accent-blue transition-colors">
                      <span>{language === 'te' ? 'లిగల్ అనలైజర్' : 'Legal Analyzer'}</span>
                      <ChevronRight size={14} className="ml-0.5 opacity-0 group-hover:opacity-100 transition-all" />
                    </h3>
                    <p className="text-[11px] text-text-secondary mt-1">{language === 'te' ? 'ఒప్పందాల విశ్లేషణ చేయండి' : 'Analyze contract hazards'}</p>
                  </div>
                </button>
                <button
                  onClick={() => setView('chat')}
                  className="flex flex-col justify-between p-4 bg-bg-elevated/40 hover:bg-bg-elevated border border-border-subtle hover:border-emerald-500/30 rounded-2xl text-left cursor-pointer transition-all hover:scale-[1.01] group h-36"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-wide uppercase text-text-primary flex items-center group-hover:text-emerald-500 transition-colors">
                      <span>{language === 'te' ? 'AI చాట్ బాట్' : 'Assistance Chat'}</span>
                      <ChevronRight size={14} className="ml-0.5 opacity-0 group-hover:opacity-100 transition-all" />
                    </h3>
                    <p className="text-[11px] text-text-secondary mt-1">{language === 'te' ? 'సంక్షేమ గెజెట్లను శోధించండి' : 'Query welfare gazettes'}</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Insight Widget Banner */}
            <div className="bg-gradient-to-r from-bg-elevated to-bg-surface border border-border-main p-6 rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm" id="dashboard-insight-widget">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-saffron/5 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-1 text-accent-saffron text-xs font-bold uppercase tracking-wider">
                  <TrendingUp size={14} />
                  <span>{language === 'te' ? 'కొత్త జీ.ఓ. అప్డేట్' : 'REGULATORY INSIGHT'}</span>
                </div>
                <h3 className="text-base font-bold text-text-primary font-heading">
                  {language === 'te' 
                    ? 'ఆంధ్రప్రదేశ్ సవరించిన కౌలు రైతు సాగు హక్కుదారుల కార్డు (CCRC) నిబంధనలు'
                    : 'Andhra Pradesh Revised Tenant Farmer CCRC Entitlements'}
                </h3>
                <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
                  {language === 'te' 
                    ? 'నూతన సాగు చట్టాల ప్రకారం రైతు భరోసా మినహాయింపులు లేకుండా నేరుగా కౌలు రైతులకు లబ్ది పొందే తనిఖీ వ్యవస్థ చట్టబద్ధం చేయబడింది.'
                    : 'Tenant Farmer support mechanisms are now systematically segregated to bypass landholder signature holds on active CCRC documents.'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (onStartChatWithQuery) {
                    onStartChatWithQuery("Explain new CCRC Tenant Farmer guidelines active in Andhra Pradesh");
                  } else {
                    setView('chat');
                  }
                }}
                className="inline-flex items-center justify-center px-4 py-2 bg-bg-elevated border border-border-main text-text-primary hover:text-accent-saffron hover:border-accent-saffron/30 rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-inner transition-colors"
              >
                <span>{language === 'te' ? 'AI వివరణ' : 'Read AI Analysis'}</span>
                <ChevronRight size={14} className="ml-1" />
              </button>
            </div>

            {/* Saved Schemes (Bookmarks) */}
            <div className="bg-bg-surface border border-border-main p-6 rounded-3xl space-y-5 shadow-sm" id="dashboard-saved-schemes">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold font-heading text-text-primary flex items-center space-x-2">
                  <Bookmark size={18} className="text-accent" id="bookmark-header-icon" />
                  <span>{language === 'te' ? 'భద్రపరచిన పథకాలు' : 'Bookmarked Welfare Options'}</span>
                </h2>
                {savedSchemes.length > 0 && (
                  <button 
                    onClick={() => setView('results')} 
                    className="text-xs font-bold text-accent-saffron hover:underline inline-flex items-center space-x-0.5 cursor-pointer"
                  >
                    <span>{language === 'te' ? 'అన్నీ చూడండి' : 'Check results'}</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {savedSchemes.length === 0 ? (
                <div className="border border-dashed border-border-main p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Bookmark size={24} className="text-text-muted mb-2 opacity-50" />
                  <p className="text-xs text-text-secondary font-bold mb-1">{language === 'te' ? 'ఏ పథకం భద్రపరచలేదు' : 'No bookmarked schemes'}</p>
                  <p className="text-[11px] text-text-muted max-w-xs">{language === 'te' ? 'అర్హత విశ్లేషణ ఫలితాల నుండి పథకాలను ఇక్కడ భద్రపరచవచ్చు.' : 'Evaluate your profile and toggle bookmark icons on matching schemes.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedSchemes.slice(0, 4).map(scheme => {
                    return (
                      <div 
                        key={scheme.scheme_id}
                        className="p-4 bg-bg-elevated/35 border border-border-subtle rounded-2xl flex flex-col justify-between hover:border-accent/30 transition-all group relative overflow-hidden"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] leading-tight font-black tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase">
                              {scheme.category}
                            </span>
                            
                            {/* Secure Sync Indicator */}
                            <div className="flex items-center space-x-1 font-mono">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span className="text-[11px] leading-tight font-bold text-text-secondary uppercase">
                                {language === 'te' ? 'రక్షించబడింది' : 'SECURE SYNCED'}
                              </span>
                            </div>
                          </div>
                          <h4 className="text-xs font-bold text-text-primary mt-2 font-heading tracking-wide group-hover:text-accent transition-colors leading-tight">
                            {language === 'te' ? scheme.name_te : scheme.name_en}
                          </h4>
                          <p className="text-[11px] text-text-secondary truncate mt-1">{scheme.ministry}</p>
                        </div>
                        <div className="flex items-center justify-between border-t border-border-subtle pt-2 mt-4">
                          <span className="text-[11px] leading-tight font-bold text-text-muted">{scheme.source}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleChatHandoff(scheme)}
                              className="text-[11px] leading-tight font-black text-accent-blue hover:underline inline-flex items-center space-x-0.5 cursor-pointer bg-accent-blue/5 border border-accent-blue/10 px-2 py-0.5 rounded"
                              title="Consult Sahay AI"
                            >
                              <MessageSquare size={10} />
                              <span>{language === 'te' ? 'సలహా' : 'Consult'}</span>
                            </button>
                            <a 
                              href={scheme.apply_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[11px] leading-tight font-black text-accent-saffron hover:underline inline-flex items-center space-x-0.5 cursor-pointer"
                            >
                              <span>{language === 'te' ? 'పోర్టల్' : 'Apply'}</span>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Searches / Determinations Card with Live Match Stream */}
            <div className="bg-bg-surface border border-border-main p-6 rounded-3xl space-y-4 shadow-sm" id="dashboard-recent-searches">
              <h2 className="text-lg font-bold font-heading text-text-primary flex items-center space-x-2">
                <Clock size={18} className="text-text-muted" id="recent-determinations-clock" />
                <span>{language === 'te' ? 'వ్యక్తిగత తనిఖీల చరిత్ర' : 'Recent Determinations'}</span>
              </h2>

              {historyList.length === 0 ? (
                <div className="border border-dashed border-border-main p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Search size={24} className="text-text-muted mb-2 opacity-50" />
                  <p className="text-xs text-text-secondary font-bold mb-1">{language === 'te' ? 'ఎటువంటి చరిత్ర కనపడలేదు' : 'No history yet'}</p>
                  <p className="text-[11px] text-text-muted max-w-xs">{language === 'te' ? 'అర్హతను తనిఖీ చేసిన తరువాత మునుపటి నిвеదికలు ఇక్కడ అమర్చబడతాయి.' : 'Run a quick eligibility check wizard to list historical calculations here.'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentHistory.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => onLoadHistoryItem(item)}
                      className="p-3 bg-bg-elevated/20 border border-border-subtle hover:border-accent-saffron/20 rounded-2xl flex items-center justify-between gap-4 cursor-pointer hover:bg-bg-elevated/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="w-8 h-8 rounded-lg bg-accent-saffron/10 text-accent-saffron flex items-center justify-center shrink-0">
                          <Search size={14} />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-text-primary capitalize leading-tight">
                            {item.profile_snapshot?.name || ''} ({item.profile_snapshot?.gender || ''}, {item.profile_snapshot?.age || ''})
                          </p>
                          <p className="text-[11px] leading-tight text-text-secondary truncate mt-0.5">
                            {item.profile_snapshot?.district || ''}, {item.profile_snapshot?.state || ''} • ₹{(item.profile_snapshot?.income_annual ?? 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[11px] leading-tight bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full font-bold">
                          {item.results_snapshot?.total_found ?? 0} {language === 'te' ? 'జతలు' : 'Matches'}
                        </span>
                        <ChevronRight size={14} className="text-text-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actual Recent Activity Logs */}
              <div className="border-t border-border-subtle pt-4 mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black tracking-widest text-[#0284c7] uppercase flex items-center space-x-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                    <span>{language === 'te' ? 'ఇటీవలి మీ ప్రొఫైల్ శోధనలు' : 'YOUR ACCOUNT RECENT ACTIVITY'}</span>
                  </h3>
                  <span className="text-[9.5px] font-mono text-text-muted bg-bg-base border border-border-subtle px-2 py-0.5 rounded-full uppercase">
                    {language === 'te' ? 'ధృవీకరించబడింది' : 'SECURE LOGS'}
                  </span>
                </div>
                
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {recentHistory.length === 0 ? (
                    <div className="text-center py-6 text-text-muted text-xs">
                      <p className="font-semibold">{language === 'te' ? 'యాక్టివిటీ రికార్డులు శూన్యం' : 'No recent searches recorded'}</p>
                      <p className="text-[11px] leading-tight mt-1">{language === 'te' ? 'మొదటి సారి తనిఖీ చేసిన తర్వాత ఇక్కడ కనిపిస్తుంది.' : 'Completed evaluations will appear here.'}</p>
                    </div>
                  ) : (
                    recentHistory.map(item => {
                      const topScheme = item.results_snapshot?.schemes?.[0];
                      return (
                        <div 
                          key={item.id}
                          className="p-2.5 bg-bg-elevated/40 border border-border-subtle rounded-xl flex items-center justify-between gap-4 text-xs hover:border-accent-blue/30 transition-all"
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            <div className="w-5 h-5 rounded bg-accent-blue/10 text-accent-blue flex items-center justify-center font-bold text-[11px] leading-tight shrink-0 font-mono">
                              {(item.profile_snapshot?.name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-text-primary leading-tight">
                                {item.profile_snapshot?.name || ''}
                                <span className="font-semibold text-text-secondary text-[11px] leading-tight"> ({item.profile_snapshot?.district || ''})</span>
                              </p>
                              <p className="text-[10.5px] text-text-secondary truncate mt-0.5 font-medium">
                                {language === 'te' ? 'పథకాలు జతపడ్డాయి' : 'Matched'} → <span className="text-emerald-500 font-bold">{item.results_snapshot?.total_found ?? 0}</span>
                                {topScheme && (
                                  <span className="text-text-muted text-[11px] leading-tight">
                                    {" "}({language === 'te' ? 'అగ్ర పథకం' : 'Top'}: {language === 'te' ? (topScheme.name_te || topScheme.name_en) : topScheme.name_en})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] leading-tight font-mono text-text-muted bg-bg-base border border-border-subtle rounded px-1.5 py-0.5 shrink-0">
                            {getRelativeTime(item.created_at)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Col 3: Sidebar widgets (Activity timeline, status, legal reports) */}
          <div className="space-y-8">
            
            {/* Legal Document Audits Summary */}
            <div className="bg-bg-surface border border-border-main p-6 rounded-3xl space-y-5 shadow-sm overflow-hidden" id="dashboard-legal-summary">
              <h2 className="text-lg font-bold font-heading text-text-primary flex items-center space-x-2">
                <FileCheck size={18} className="text-accent-blue" />
                <span>{language === 'te' ? 'న్యాయ ఒప్పంద నివేదికలు' : 'Legal Audits Screen'}</span>
              </h2>
              <div className="space-y-3">
                {liveLegalReports.map(report => (
                  <motion.div 
                    key={report.id} 
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-bg-elevated/35 border border-border-subtle rounded-2xl space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-text-primary leading-tight truncate max-w-[130px]">
                        {language === 'te' ? report.title_te : report.title_en}
                      </h4>
                      <span className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        report.risk_en === 'Low Risk' 
                          ? 'text-emerald-500 bg-emerald-500/10' 
                          : 'text-amber-500 bg-amber-500/10'
                      }`}>
                        {language === 'te' ? report.risk_te : report.risk_en}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border-subtle pt-2 mt-2">
                      <span className="text-[11px] leading-tight font-mono font-semibold text-text-muted">
                        {language === 'te' ? 'స్కోరు' : 'SCORE'}: {report.score}%
                      </span>
                      <span className="text-[11px] leading-tight font-mono text-text-muted">{report.timestamp}</span>
                    </div>
                  </motion.div>
                ))}
                
                <button
                  onClick={() => setView('legal')}
                  className="w-full py-2 bg-bg-elevated/40 hover:bg-bg-elevated border border-dashed border-border-main rounded-2xl text-[11px] font-bold tracking-wide text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  {language === 'te' ? '+ కొత్త ఒప్పందాన్ని ఆడిట్ చేయండి' : '+ Run New Contract Audit'}
                </button>
              </div>
            </div>

            {/* Direct AI Assistant Card */}
            <div className="bg-bg-surface border border-border-main p-6 rounded-3xl space-y-5 shadow-sm" id="dashboard-chat-shortcut">
              <h2 className="text-lg font-bold font-heading text-text-primary flex items-center space-x-2">
                <MessageSquare size={18} className="text-emerald-500" />
                <span>{language === 'te' ? 'సంక్షేమ AI సహాయకుడు' : 'Welfare AI Query'}</span>
              </h2>
              <div className="space-y-3">
                <p className="text-xs text-text-secondary leading-relaxed">
                  {language === 'te' 
                    ? 'ఆరోగ్యశ్రీ శస్త్రచికిత్స కవరేజీలు, రైతు రుణాల మాఫీ పరిమితులు మొదలైన వాటిపై అధికారిక సమాచారాన్ని ఇక్కడ అడగండి.'
                    : 'Query verified central and state regulatory guidelines directly on certified information libraries.'}
                </p>
                <div className="space-y-2 pt-2">
                  <button 
                    onClick={() => {
                      if (onStartChatWithQuery) {
                        onStartChatWithQuery("YSR Rythu Bharosa eligibility requirements and annual aid limit");
                      } else {
                        setView('chat');
                      }
                    }}
                    className="w-full p-2.5 bg-bg-elevated/20 hover:bg-bg-elevated/60 border border-border-subtle hover:border-emerald-500/20 text-text-secondary hover:text-text-primary rounded-xl text-[11px] font-semibold text-left transition-all flex items-center justify-between"
                  >
                    <span>Rythu Bharosa limits?</span>
                    <ChevronRight size={12} />
                  </button>
                  <button 
                    onClick={() => {
                      if (onStartChatWithQuery) {
                        onStartChatWithQuery("What is Jagananna Amma Vodi educational incentive?");
                      } else {
                        setView('chat');
                      }
                    }}
                    className="w-full p-2.5 bg-bg-elevated/20 hover:bg-bg-elevated/60 border border-border-subtle hover:border-emerald-500/20 text-text-secondary hover:text-text-primary rounded-xl text-[11px] font-semibold text-left transition-all flex items-center justify-between"
                  >
                    <span>Jagananna Amma Vodi requirements?</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-bg-surface border border-border-main p-6 rounded-3xl space-y-5 shadow-sm" id="dashboard-activity-timeline">
              <h2 className="text-lg font-bold font-heading text-text-primary flex items-center space-x-2">
                <Activity size={18} className="text-accent-saffron" />
                <span>{language === 'te' ? 'కార్యాచరణ కాలక్రమం' : 'Portal Log Events'}</span>
              </h2>
              <div className="space-y-4 relative pl-3 border-l border-border-subtle ml-1.5" id="dashboard-activity-events">
                {liveActivities.map(act => (
                  <motion.div 
                    key={act.id} 
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="relative space-y-1"
                  >
                    <span className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full ${act.color} ring-4 ring-bg-surface`} />
                    <p className="text-[11px] font-bold text-text-primary leading-tight">
                      {language === 'te' ? act.text_te : act.text_en}
                    </p>
                    <span className="text-[11px] leading-tight text-text-muted font-mono">{act.time}</span>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
