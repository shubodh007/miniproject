import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, Sparkles, TrendingUp, HelpCircle, FileText, ChevronRight, CheckCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from '../i18n';
import { SEED_SCHEMES } from '../utils/schemeEngine';

interface LandingPageProps {
  setView: (view: string) => void;
  onBrowseAll: () => void;
  onStartChatWithQuery?: (query: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setView, onBrowseAll, onStartChatWithQuery }) => {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return SEED_SCHEMES
      .filter(s => 
        s.name_en.toLowerCase().includes(query) || 
        (s.name_te && s.name_te.includes(query))
      )
      .slice(0, 5);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowSuggestions(true);
      setFocusedIndex((prev) => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowSuggestions(true);
      setFocusedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === 'Enter') {
      if (showSuggestions && focusedIndex >= 0 && focusedIndex < filteredSuggestions.length) {
        e.preventDefault();
        const scheme = filteredSuggestions[focusedIndex];
        setSearchQuery(language === 'te' ? scheme.name_te : scheme.name_en);
        setShowSuggestions(false);
        setFocusedIndex(-1);
        handleSelectQuery(`Tell me about ${scheme.name_en} eligibility requirements`);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  // Trending government scheme announcements (authentic feel)
  const trendingUpdates = [
    {
      id: 'trend-1',
      tag: 'NEW EXPANSE',
      titleEn: 'YSR Aarogyasri annual health coverage expanded to ₹5 Lakhs',
      titleTe: 'వైఎస్ఆర్ ఆరోగ్యశ్రీ వార్షిక పరిమితి ₹5 లక్షలకు పెంపు',
      date: 'June 2026'
    },
    {
      id: 'trend-2',
      tag: 'TENANCY',
      titleEn: 'New licensing protections active for registered Tenant Farmers',
      titleTe: 'నమోదిత కౌలు రైతులకు నూతన సాగు రక్షణల గుర్తింపు',
      date: 'May 2026'
    },
    {
      id: 'trend-3',
      tag: 'FINANCIALS',
      titleEn: 'Central PM-Kisan 17th instalment disbursement guidelines released',
      titleTe: 'కేంద్ర పీఎం-కిసాన్ 17వ విడత నిధుల విడుదల మార్గదర్శకాలు',
      date: 'Just Now'
    }
  ];

  // Quick prompt templates (intelligent prompts)
  const samplePrompts = [
    {
      textEn: 'Am I eligible for YSR Aarogyasri if I have 4 acres of rainfed land?',
      textTe: 'నాకు 4 ఎకరాల మెట్ట భూమి ఉంటే ఆరోగ్యశ్రీకి నేను అర్హుడినా?',
      category: 'Health / ఆరోగ్యశ్రీ'
    },
    {
      textEn: 'What documents are required to claim Jagananna Amma Vodi education aid?',
      textTe: 'జగనన్న అమ్మఒడి విద్యా సహాయాన్ని పొందడానికి కావాల్సిన పత్రాలు ఏమిటి?',
      category: 'Education / విద్య'
    },
    {
      textEn: 'Evaluate rental contract forfeit dangers and warning clauses',
      textTe: 'అద్దె ఒప్పంద పత్రంలో ఉన్న అన్యాయమైన జప్తు నిబంధనల విశ్లేషణ',
      category: 'Legal Safety / న్యాయ రక్షణ'
    }
  ];

  // Quick select scheme cards
  const quickSchemes = [
    {
      id: 'ysr-rythu',
      nameEn: 'Rythu Bharosa / PM-Kisan',
      nameTe: 'రైతు భరోసా / పీఎం-కిసాన్',
      descEn: 'Direct investment aid of ₹13,500/yr for landholders & tenants.',
      descTe: 'భూస్వాములు మరియు కౌలు రైతులకు ఏడాదికి ₹13,500 పెట్టుబడి సహాయం.',
      badgeEn: 'Agriculture',
      badgeTe: 'వ్యవసాయం',
      query: 'Show me details and eligibility for Rythu Bharosa and PM-Kisan agricultural schemes'
    },
    {
      id: 'amma-vodi',
      nameEn: 'Jagananna Amma Vodi',
      nameTe: 'జగనన్న అమ్మఒడి',
      descEn: 'Annual education incentive of ₹15,000 for mothers sending kids to school.',
      descTe: 'పిల్లలను పాఠశాలకు పంపే తల్లులకు ఏడాదికి ₹15,000 విద్యా ప్రోత్సాహకం.',
      badgeEn: 'Education',
      badgeTe: 'విద్య',
      query: 'What is Jagananna Amma Vodi and who is eligible to apply?'
    },
    {
      id: 'ysr-aarog',
      nameEn: 'YSR Aarogyasri Healthcare',
      nameTe: 'వైఎస్ఆర్ ఆరోగ్యశ్రీ',
      descEn: 'Cashless super-specialty hospital coverage for eligible low income families.',
      descTe: 'అర్హులైన పేద కుటుంబాలకు ఉచిత కార్పొరేట్ సూపర్-స్పెషాలిటీ వైద్య కవరేజ్.',
      badgeEn: 'Healthcare',
      badgeTe: 'వైద్యం',
      query: 'Check my eligibility for YSR Aarogyasri healthcare surgery coverage'
    }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    if (onStartChatWithQuery) {
      onStartChatWithQuery(searchQuery);
    } else {
      setView('chat');
    }
  };

  const handleSelectQuery = (queryText: string) => {
    if (onStartChatWithQuery) {
      onStartChatWithQuery(queryText);
    } else {
      setView('chat');
    }
  };

  return (
    <div className="relative min-h-screen bg-bg-base flex flex-col justify-between" id="landing-container">
      {/* Immersive subtle ambient background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--bg-surface)_1px,transparent_1px),linear-gradient(to_bottom,var(--bg-surface)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black_70%,transparent_100%)] pointer-events-none z-0" />

      {/* Main Container */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-20 flex-grow flex flex-col justify-start w-full">
        
        {/* Government-Grade Calm Header */}
        <div className="text-center mb-10" id="landing-hero-center">
          <div className="inline-flex items-center space-x-2 bg-accent-saffron/10 border border-accent-saffron/20 px-3 py-1.5 rounded-full text-xs font-semibold text-accent-saffron mb-4 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-saffron"></span>
            <span> {language === 'te' ? 'ఆంధ్రప్రదేశ్ & తెలంగాణ పౌర సేవలు' : 'Andhra Pradesh & Telangana Civil Portal'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-primary mb-4 font-heading leading-tight">
            {language === 'te' ? 'రాష్ట్ర సంక్షేమ పథకాలు & న్యాయ రక్షణ కేంద్రం' : 'Civic Welfare & Legal Protections Nav'}
          </h1>
          <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed font-normal">
            {language === 'te' 
              ? 'మీ అర్హతలను తనిఖీ చేయండి, భూమి/అద్దె ఒప్పంద పత్రాలలో దాగి ఉన్న ప్రమాదకరమైన నిబంధనలను విశ్లేషించండి మరియు సహాయం పొందండి.'
              : 'Audit your welfare eligibility, evaluate hidden penalty clauses in contracts, and instantly query official government gazettes in real-time.'}
          </p>
        </div>

        {/* 1. Conversational Search Entry (Claude/Perplexity Style Focus) */}
        <div className="max-w-3xl mx-auto w-full mb-14 relative" id="conversational-search-wrapper" ref={containerRef}>
          <form onSubmit={handleSearchSubmit} className="relative bg-bg-surface border border-border-main rounded-3xl p-3 shadow-2xl focus-within:border-accent-saffron/50 focus-within:ring-2 focus-within:ring-accent-saffron/10 transition-all">
            <div className="flex items-center space-x-3 px-3">
              <Search className="text-text-muted shrink-0" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  setFocusedIndex(-1);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) {
                    setShowSuggestions(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={language === 'te' ? 'పథకం పేరు లేదా మీ అర్హత ప్రశ్నను టైప్ చేయండి...' : 'Ask about Jagananna Amma Vodi eligibility, Rythu Bharosa acreage limits...'}
                className="w-full bg-transparent outline-none border-none py-3 text-sm sm:text-base font-normal text-text-primary placeholder:text-text-muted font-sans"
                aria-autocomplete="list"
                aria-controls="scheme-autocomplete-listbox"
                aria-expanded={showSuggestions && filteredSuggestions.length > 0}
              />
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="px-5 py-3 bg-accent-saffron hover:bg-accent-saffron/90 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {language === 'te' ? 'శోధించు' : 'Search'}
              </button>
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 bg-bg-surface border border-border-main rounded-2xl overflow-hidden shadow-2xl z-50 divide-y divide-border-subtle"
                role="listbox"
                id="scheme-autocomplete-listbox"
              >
                {filteredSuggestions.map((scheme, idx) => (
                  <button
                    key={scheme.scheme_id}
                    type="button"
                    role="option"
                    aria-selected={focusedIndex === idx}
                    onClick={() => {
                      setSearchQuery(language === 'te' ? scheme.name_te : scheme.name_en);
                      setShowSuggestions(false);
                      setFocusedIndex(-1);
                      handleSelectQuery(`Tell me about ${scheme.name_en} eligibility requirements`);
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-bg-elevated transition-colors group border-b border-border-subtle last:border-0 cursor-pointer ${
                      focusedIndex === idx ? 'bg-bg-elevated text-accent-saffron' : ''
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-text-primary group-hover:text-accent-saffron transition-colors">
                        {language === 'te' ? scheme.name_te : scheme.name_en}
                      </span>
                      <span className="text-xs text-text-muted mt-0.5 font-normal">
                        {scheme.category} · {scheme.source}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-text-muted group-hover:text-accent-saffron group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Intelligent Prompts List */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center sm:gap-3 text-xs text-text-secondary" id="search-prompt-suggestions">
            <span className="font-bold text-text-muted mb-2 sm:mb-0 uppercase tracking-wider shrink-0">{language === 'te' ? 'ఇలా అడగండి:' : 'Try asking:'}</span>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.slice(0, 2).map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectQuery(language === 'te' ? p.textTe : p.textEn)}
                  className="bg-bg-surface hover:bg-bg-elevated border border-border-subtle hover:border-accent-saffron/30 px-3 py-1.5 rounded-xl font-bold transition-all text-left text-text-secondary hover:text-text-primary cursor-pointer max-w-xs truncate focus-ring"
                >
                  {language === 'te' ? p.textTe : p.textEn}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setView('chat')}
                className="p-1 px-2.5 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue rounded-xl font-bold transition-colors cursor-pointer focus-ring"
              >
                <span>{language === 'te' ? 'అన్ని శోధన ప్రశ్నలు' : 'Browse All Prompts'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Dashboard Centerpiece */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 w-full items-start" id="landing-split-grid">
          
          {/* Left: Quick scheme cards & tools */}
          <div className="space-y-6" id="quick-links-area">
            <div className="flex items-center justify-between pl-1">
              <h2 className="text-sm font-black uppercase tracking-wider text-text-primary font-mono flex items-center">
                <Sparkles size={14} className="text-accent-saffron mr-2" />
                <span> {language === 'te' ? 'త్వరిత అర్హత తనిఖీ' : 'Quick Gateway Cards'}</span>
              </h2>
              <button
                onClick={onBrowseAll}
                className="text-xs font-bold text-accent-saffron hover:underline flex items-center focus-ring p-1 rounded"
              >
                <span>{language === 'te' ? 'అన్ని పథకాల జాబితా' : 'Browse All Schemes'}</span>
                <ChevronRight size={13} className="ml-0.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="schemes-grid-container">
              {quickSchemes.map((qs) => (
                <div
                  key={qs.id}
                  onClick={() => handleSelectQuery(qs.query)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectQuery(qs.query);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className="glow-card rounded-2xl p-5 cursor-pointer flex flex-col justify-between h-[210px] relative hover:-translate-y-1 focus-ring transition-all"
                >
                  <div className="space-y-2">
                    <span className="text-[11px] leading-tight font-black uppercase tracking-wider px-2 py-0.5 bg-accent-saffron/10 border border-accent-saffron/20 rounded text-accent-saffron">
                      {language === 'te' ? qs.badgeTe : qs.badgeEn}
                    </span>
                    <h3 className="text-sm font-extrabold text-text-primary leading-tight font-heading mt-2">
                      {language === 'te' ? qs.nameTe : qs.nameEn}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-4 font-normal mt-1">
                      {language === 'te' ? qs.descTe : qs.descEn}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] leading-tight font-black text-accent-saffron uppercase mt-4">
                    <span>{language === 'te' ? 'అర్హత నిరూపించండి' : 'Validate eligibility'}</span>
                    <ChevronRight size={12} />
                  </div>
                </div>
              ))}
            </div>

            {/* Redesigned Primary Utilities row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1" id="other-utilities-row">
              <div 
                onClick={() => setView('wizard')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setView('wizard');
                  }
                }}
                tabIndex={0}
                role="button"
                className="bg-bg-surface border border-border-main hover:border-accent-blue/30 rounded-2xl p-5 cursor-pointer flex items-center space-x-4 hover:-translate-y-0.5 focus-ring transition-all animate-none"
              >
                <div className="w-12 h-12 rounded-xl bg-accent-blue/10 text-accent-blue flex items-center justify-center shrink-0 border border-accent-blue/10">
                  <Search size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-text-primary">{language === 'te' ? 'అర్హత విశ్లేషణ విజార్డ్' : 'Full Eligibility Wizard'}</h4>
                  <p className="text-xs text-text-secondary font-normal mt-0.5">{language === 'te' ? '3-దశల సమగ్ర ప్రొఫైల్ విశ్లేషణ సాధనం.' : '3-step detailed profiler assessment tool.'}</p>
                </div>
              </div>

              <div 
                onClick={() => setView('legal')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setView('legal');
                  }
                }}
                tabIndex={0}
                role="button"
                className="bg-bg-surface border border-border-main hover:border-accent-saffron/30 rounded-2xl p-5 cursor-pointer flex items-center space-x-4 hover:-translate-y-0.5 focus-ring transition-all animate-none"
              >
                <div className="w-12 h-12 rounded-xl bg-accent-saffron/10 text-accent-saffron flex items-center justify-center shrink-0 border border-accent-saffron/10">
                  <FileText size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-text-primary">{language === 'te' ? 'న్యాయ ఒప్పంద నిపుణుడు' : 'Deed & Contract Auditor'}</h4>
                  <p className="text-xs text-text-secondary font-normal mt-0.5">{language === 'te' ? 'జరిమానా నిబంధనలు & హక్కుల విశ్లేషణ.' : 'Diagnose penalty triggers & water rights.'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Trending scheme updates & news feed */}
          <aside className="space-y-5" id="news-aside-panel">
            <h2 className="text-sm font-black uppercase tracking-wider text-text-primary font-mono flex items-center pl-1">
              <TrendingUp size={14} className="text-accent-saffron mr-2" />
              <span> {language === 'te' ? 'తాజా జీవోలు & మార్పులు' : 'Recent Civic G.O. Updates'}</span>
            </h2>

            <div className="bg-bg-surface border border-border-main rounded-2xl p-4 divide-y divide-border-subtle" id="trending-feed-container">
              {trendingUpdates.map((update) => (
                <div key={update.id} className="py-3.5 first:pt-1 last:pb-1 space-y-1.5 flex flex-col text-left">
                  <div className="flex items-center justify-between text-[11px] leading-tight font-bold tracking-wider leading-tight">
                    <span className="text-accent-blue bg-accent-blue/10 border border-accent-blue/15 px-2 py-0.5 rounded">
                      {update.tag}
                    </span>
                    <span className="text-text-muted">{update.date}</span>
                  </div>
                  <h4 className="text-[12.5px] font-extrabold text-text-primary leading-snug">
                    {language === 'te' ? update.titleTe : update.titleEn}
                  </h4>
                  <button 
                    onClick={() => handleSelectQuery(`Tell me about the recent updates corresponding to ${update.titleEn}`)}
                    className="text-[11px] leading-tight text-accent-saffron font-bold hover:underline self-start flex items-center focus-ring p-1 rounded transition-all"
                  >
                    <span>{language === 'te' ? 'అధికారిక పాలసీ వివరాలు' : 'Read official policy grounding'}</span>
                    <ChevronRight size={10} className="ml-0.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* High trust stamp */}
            <div className="p-4 bg-bg-surface border border-border-main rounded-2xl flex items-start space-x-3 text-left">
              <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={15} />
              <div>
                <span className="text-[11px] leading-tight font-black text-text-primary uppercase tracking-wide">{language === 'te' ? 'ప్రభుత్వ ప్రమాణాల ధృవీకరణ' : 'Government Standard Verification'}</span>
                <p className="text-[11px] leading-tight text-text-secondary leading-normal mt-0.5 font-normal">
                  {language === 'te' 
                    ? 'ప్రతి పథకం అర్హతలు నేరుగా అధికారిక ఏపీ గెజెట్లు మరియు విభాగాల నిబంధనలతో సరిపోల్చబడ్డాయి.'
                    : 'Every scheme criteria matches verified AP Gazettes, Central rule books & Department statements directly.'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Redesigned Premium minimalist footer */}
      <footer className="relative z-10 border-t border-border-subtle py-8 w-full bg-bg-surface/10 backdrop-blur-xs" id="landing-footer">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-text-primary uppercase tracking-wider">SchemeConnect AP/TS</span>
            <span className="text-xs text-text-muted">|</span>
            <span className="text-[10.5px] font-bold text-text-secondary uppercase">{language === 'te' ? 'నిష్పాక్షిక పౌర సంక్షేమ నావిగేటర్' : 'Independent Citizen Advocacy Portal'}</span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] leading-tight font-bold text-text-muted uppercase" id="sdg-indicators">
            <span>SDG 1: NO POVERTY</span>
            <span>•</span>
            <span>SDG 10: REDUCED INEQUALITIES</span>
          </div>

          <p className="text-[11px] leading-tight text-text-muted font-bold uppercase tracking-wider">© 2026. Handcrafted for AP citizens</p>
        </div>
      </footer>
    </div>
  );
};
