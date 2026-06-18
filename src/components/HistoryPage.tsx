import React, { useState, useEffect } from 'react';
import { 
  History, Calendar, Trash2, ArrowRight, FileCheck, MapPin, 
  IndianRupee, CheckCircle2, Search, X, Loader2, ShieldAlert, MessageSquare 
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { SearchHistory } from '../types';

interface HistoryPageProps {
  historyList: SearchHistory[];
  onLoadHistoryItem: (item: SearchHistory) => void;
  onDeleteHistoryItem: (id: string) => void;
  setView: (v: string) => void;
  user: { name: string; email: string } | null;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  historyList,
  onLoadHistoryItem,
  onDeleteHistoryItem,
  setView,
  user,
}) => {
  const { t, language } = useTranslation();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  useEffect(() => {
    if (!user) {
      setView('auth');
    }
  }, [user, setView]);

  if (!user) {
    return null;
  }
  
  // Navigation tabs: 'wizard' (matches), 'agreements' (documents), 'chats' (conversations)
  const [activeTab, setActiveTab] = useState<'wizard' | 'agreements' | 'chats'>('wizard');

  // Backend state for database fetched items
  const [dbHistory, setDbHistory] = useState<{
    searches: any[];
    documents: any[];
    chat_sessions: any[];
  }>({ searches: [], documents: [], chat_sessions: [] });
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Fetch db consolidated history stats on mount
  useEffect(() => {
    const fetchDbHistory = async () => {
      setDbLoading(true);
      setDbError(null);
      try {
        const response = await fetch('/api/history');
        if (response.ok) {
          const data = await response.json();
          setDbHistory({
            searches: data.searches || [],
            documents: data.documents || [],
            chat_sessions: data.chat_sessions || []
          });
        } else {
          throw new Error('Database response failed');
        }
      } catch (err) {
        setDbError(language === 'te' ? 'క్లౌడ్ రికార్డుల సర్వర్ తాత్కాలికంగా ఆఫ్‌లైన్‌లో ఉంది. స్థానిక శాండ్‌బాక్స్ స్నాప్‌షాట్‌లతో పని చేస్తోంది.' : 'Constituted cloud history is temporarily offline. Working with local sandbox snapshots.');
      } finally {
        setDbLoading(false);
      }
    };
    fetchDbHistory();
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(language === 'te' ? 'te-IN' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getRiskGrade = (score: number) => {
    if (score >= 85) return { label: 'A', color: 'text-success bg-success/10 border-success/30' };
    if (score >= 70) return { label: 'B', color: 'text-accent-gold bg-accent-gold/10 border-accent-gold/30' };
    if (score >= 50) return { label: 'C', color: 'text-accent-saffron bg-accent-saffron/10 border-accent-saffron/30' };
    return { label: 'F', color: 'text-error bg-error/10 border-error/30' };
  };

  // Filters for Wizard Profile Searches (Tab 1)
  const filteredWizardHistory = historyList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    const matchesName = item.profile_snapshot?.name?.toLowerCase().includes(query);
    const matchesDate = formatDate(item.created_at).toLowerCase().includes(query);
    const matchesSchemes = item.results_snapshot?.schemes?.some((scheme) => 
      scheme.name_en?.toLowerCase().includes(query) || scheme.name_te?.toLowerCase().includes(query)
    );
    return matchesName || matchesDate || matchesSchemes;
  });

  // Filters for Documents / Contracts (Tab 2)
  const filteredDocuments = dbHistory.documents.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      doc.title?.toLowerCase().includes(query) ||
      doc.category?.toLowerCase().includes(query) ||
      formatDate(doc.created_at).toLowerCase().includes(query)
    );
  });

  // Filters for Live Chat Sessions (Tab 3)
  const filteredChats = dbHistory.chat_sessions.filter((chat) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      chat.title?.toLowerCase().includes(query) ||
      formatDate(chat.created_at).toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen pt-28 pb-16 max-w-4xl mx-auto px-4" id="history-viewport">
      {/* Page Header */}
      <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-border-subtle" id="history-header">
        <div className="w-12 h-12 rounded-2xl bg-accent-saffron/10 text-accent-saffron flex items-center justify-center border border-accent-saffron/20 shadow-lg shadow-accent-saffron/5">
          <History size={22} className="animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary">
            {t('history.title')}
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 font-semibold">
            {language === 'te' 
              ? 'పథకాలు, ఒప్పంద సమీక్షలు మరియు మునుపటి సంభాషణల చరిత్ర' 
              : 'Unified citizen dashboard timeline of diagnostic logs'}
          </p>
        </div>
      </div>

      {/* Database Error / Offline Warning banner */}
      {dbError && (
        <div className="mb-6 p-4 rounded-2xl bg-accent-gold/5 border border-accent-gold/20 text-accent-gold flex items-start space-x-2 text-xs font-bold animate-in fade-in">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span>{dbError}</span>
        </div>
      )}

      {/* Tabs Switcher Panels */}
      <div className="flex border-b border-border-subtle mb-6 gap-2 sm:gap-4 overflow-x-auto pb-1" id="history-tabs">
        <button
          onClick={() => { setActiveTab('wizard'); setSearchQuery(''); }}
          className={`pb-3 px-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'wizard'
              ? 'border-accent-saffron text-accent-saffron font-extrabold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          🔍 {language === 'te' ? 'అర్హత శోధనలు' : 'Profile Diagnostics'} ({historyList.length})
        </button>
        <button
          onClick={() => { setActiveTab('agreements'); setSearchQuery(''); }}
          className={`pb-3 px-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'agreements'
              ? 'border-accent-saffron text-accent-saffron font-extrabold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          📄 {language === 'te' ? 'తనిఖీ చేసిన పత్రాలు' : 'Audited Documents'} ({dbHistory.documents.length})
        </button>
        <button
          onClick={() => { setActiveTab('chats'); setSearchQuery(''); }}
          className={`pb-3 px-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'chats'
              ? 'border-accent-saffron text-accent-saffron font-extrabold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          💬 {language === 'te' ? 'సేవ్ చేసిన సంభాషణలు' : 'Saved Conversations'} ({dbHistory.chat_sessions.length})
        </button>
      </div>

      {/* General Search Input */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === 'wizard'
              ? (language === 'te' ? 'పేరు లేదా పథకంతో శోధించండి...' : 'Search past profile matches by name or scheme...')
              : (activeTab === 'agreements'
                ? (language === 'te' ? 'పత్రం శీర్షికతో శోధించండి...' : 'Search audited leases, affidavits or agreements by title...')
                : (language === 'te' ? 'సంభాషణ శీర్షికతో శోధించండి...' : 'Search saved bot conversation sessions...'))
          }
          className="w-full pl-11 pr-10 py-3 bg-bg-surface border border-border-main rounded-2xl text-text-primary placeholder:text-text-muted text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent-saffron/30 focus:border-accent-saffron transition-all shadow-sm"
          id="history-search-input"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {dbLoading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="text-accent-saffron animate-spin" size={28} />
          <span className="text-xs font-bold text-text-secondary">{language === 'te' ? 'సర్వర్ సర్వీస్ నుండి తాజా హిస్టరీ ఇండెక్స్‌లను సింక్ చేస్తోంది...' : 'Syncing live server database history indices...'}</span>
        </div>
      )}

      {!dbLoading && (
        <>
          {/* TAB 1: ELIGIBILITY WIZARD SEARCHES */}
          {activeTab === 'wizard' && (
            historyList.length > 0 ? (
              filteredWizardHistory.length > 0 ? (
                <div className="space-y-4" id="wizard-history-list">
                  {filteredWizardHistory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-bg-surface border border-border-main rounded-2xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-accent-saffron/30 hover:shadow-lg relative overflow-hidden"
                    >
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-accent-saffron/40" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 text-left">
                          <div className="flex items-center space-x-2 text-[11px] font-bold text-text-muted">
                            <Calendar size={12} />
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <p className="text-base font-extrabold text-text-primary capitalize">
                              {item.profile_snapshot?.name || (language === 'te' ? 'అజ్ఞాత పౌరుడు' : 'Anonymous User')}
                            </p>
                            <span className="text-xs font-bold bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded-full uppercase">
                              {item.profile_snapshot?.caste_category || 'General'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 text-xs text-text-secondary font-semibold">
                            <span>📍 {item.profile_snapshot?.district}</span>
                            <span>💼 {item.profile_snapshot?.occupation}</span>
                            <span>💰 ₹{(item.profile_snapshot?.income_annual ?? 0).toLocaleString('en-IN')}/{language === 'te' ? 'సం.' : 'yr'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-border-subtle shrink-0">
                          <div className="text-left md:text-right">
                            <span className="text-[11px] leading-tight font-black uppercase text-text-muted tracking-wide">{language === 'te' ? 'లభించిన పథకాలు' : 'Matches Found'}</span>
                            <p className="text-sm font-extrabold text-accent-saffron">
                              {item.results_snapshot?.schemes?.length || 0} {language === 'te' ? 'పథకాలు సరిపోలాయి' : 'Schemes Match'}
                            </p>
                          </div>
                          <button
                            onClick={() => onLoadHistoryItem(item)}
                            className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl font-bold text-xs flex items-center space-x-1 shadow-md cursor-pointer transition-colors"
                          >
                            <span>{t('history.view_results')}</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-bg-surface border border-border-main rounded-3xl p-12 text-center flex flex-col justify-center items-center">
                  <Search size={44} className="text-text-muted mb-3 stroke-1 animate-pulse" />
                  <h4 className="text-lg font-bold text-text-primary">{language === 'te' ? 'మీ శోధనకు తగిన అర్హతా ఫలితాలు ఏవీ లేవు' : 'No diagnostic searches match your query'}</h4>
                  <button onClick={() => setSearchQuery('')} className="mt-3 text-xs font-bold text-accent-blue hover:underline">{language === 'te' ? 'శోధనను రీసెట్ చేయండి' : 'Reset search criteria'}</button>
                </div>
              )
            ) : (
              <div className="bg-bg-surface border border-border-main rounded-3xl p-12 text-center flex flex-col justify-center items-center">
                <History size={48} className="text-text-muted mb-4 stroke-1 animate-pulse" />
                <h4 className="text-lg font-bold text-text-primary">{t('history.empty')}</h4>
                <p className="text-sm text-text-secondary mt-2 max-w-sm mb-6">
                  {language === 'te' ? 'ఈ ప్రాంతంలో హిస్టరీ కార్డ్‌లను నింపడానికి వివిధ పథకాల కోసం అర్హతను తనిఖీ చేయండి.' : 'Check eligibility on welfare schemes to populate diagnostic cards here.'}
                </p>
                <button
                  onClick={() => setView('wizard')}
                  className="saffron-gradient-btn px-6 py-2.5 rounded-full font-bold text-xs cursor-pointer shadow-md"
                >
                  {language === 'te' ? 'అర్హత విశ్లేషణను ప్రారంభించు 🔍' : 'Start Eligibility Wizard 🔍'}
                </button>
              </div>
            )
          )}

          {/* TAB 2: AUDITED AGREEMENTS & CONTRACTS */}
          {activeTab === 'agreements' && (
            dbHistory.documents.length > 0 ? (
              filteredDocuments.length > 0 ? (
                <div className="space-y-4" id="agreements-history-list">
                  {filteredDocuments.map((doc) => {
                    const gradeInfo = getRiskGrade(doc.risk_score ?? 100);
                    return (
                      <div
                        key={doc.id}
                        className="bg-bg-surface border border-border-main rounded-2xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-accent-saffron/30 hover:shadow-lg relative overflow-hidden"
                      >
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-accent-blue/40" />
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1.5 text-left">
                            <div className="flex items-center space-x-2 text-[11px] font-bold text-text-muted">
                              <Calendar size={12} />
                              <span>{formatDate(doc.created_at)}</span>
                            </div>
                            <h4 className="text-base font-extrabold text-text-primary truncate max-w-md">
                              {doc.title || (language === 'te' ? 'ఒప్పంద సమీక్ష లాగ్' : 'Agreement Review Log')}
                            </h4>
                            <div className="flex items-center space-x-2 text-xs font-semibold text-text-secondary">
                              <span className="bg-bg-base px-2.5 py-1 rounded-lg border border-border-subtle">{doc.category || (language === 'te' ? 'అద్దె ఒప్పందం' : 'Rental Deal')}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                            <div className="text-left md:text-right">
                              <span className="text-[11px] leading-tight font-black uppercase text-text-muted tracking-wide">{language === 'te' ? 'ఒప్పంద నాణ్యత' : 'Contract Quality'}</span>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${gradeInfo.color}`}>
                                  {language === 'te' ? 'గ్రేడ్' : 'Grade'} {gradeInfo.label}
                                </span>
                                <span className="text-xs font-extrabold text-text-secondary">{language === 'te' ? 'స్కోరు' : 'Score'}: {doc.risk_score}/100</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setView('legal')}
                              className="p-2.5 text-text-muted hover:text-text-primary border border-border-subtle rounded-xl cursor-pointer hover:bg-bg-base"
                              title={language === 'te' ? "లీగల్ ఆడిట్ పోర్టల్‌కు తిరిగి వెళ్ళండి" : "Go back to document audit advisor portal"}
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-bg-surface border border-border-main rounded-3xl p-12 text-center flex flex-col justify-center items-center">
                  <Search size={44} className="text-text-muted mb-3 stroke-1 animate-pulse" />
                  <h4 className="text-lg font-bold text-text-primary">{language === 'te' ? 'మీ శోధనకు సరిపోలిన ఆడిట్ ఫైల్‌లు ఏవీ లేవు' : 'No audited files match your query'}</h4>
                  <button onClick={() => setSearchQuery('')} className="mt-3 text-xs font-bold text-accent-blue hover:underline">{language === 'te' ? 'శోధనను రీసెట్ చేయండి' : 'Reset search criteria'}</button>
                </div>
              )
            ) : (
              <div className="bg-bg-surface border border-border-main rounded-3xl p-12 text-center flex flex-col justify-center items-center">
                <FileCheck size={48} className="text-text-muted mb-4 stroke-1 animate-pulse" />
                <h4 className="text-lg font-bold text-text-primary">{language === 'te' ? 'ఇంకా ఎటువంటి పత్రాలు విశ్లేషించబడలేదు' : 'No documents analyzed yet'}</h4>
                <p className="text-sm text-text-secondary mt-2 max-w-sm mb-6">
                  {language === 'te' ? 'సాంప్రదాయ నిబంధనల విశ్లేషణ మరియు తక్షణ సారాంశాల కోసం పత్రాలు లేదా అఫిడవిట్లను అప్‌లోడ్ చేయండి.' : 'Upload deeds, agreements, or affidavits to get instant summaries with Indian statutory clause evaluations.'}
                </p>
                <button
                  onClick={() => setView('legal')}
                  className="saffron-gradient-btn px-6 py-2.5 rounded-full font-bold text-xs cursor-pointer shadow-md"
                >
                  {language === 'te' ? 'ఒప్పంద పత్రాన్ని విశ్లేషించండి 📄' : 'Analyze Lease Contract 📄'}
                </button>
              </div>
            )
          )}

          {/* TAB 3: CHAT CONVERSATIONS */}
          {activeTab === 'chats' && (
            dbHistory.chat_sessions.length > 0 ? (
              filteredChats.length > 0 ? (
                <div className="space-y-4" id="chats-history-list">
                  {filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="bg-bg-surface border border-border-main rounded-2xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-accent-saffron/30 hover:shadow-lg relative overflow-hidden"
                    >
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-accent-gold/40" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 text-left">
                          <div className="flex items-center space-x-2 text-[11px] font-bold text-text-muted">
                            <Calendar size={12} />
                            <span>{formatDate(chat.created_at)}</span>
                          </div>
                          <h4 className="text-base font-extrabold text-text-primary truncate max-w-md">
                            {chat.title || (language === 'te' ? 'సహాయక చర్చలు' : 'Assistant chat discussion')}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0">
                          <button
                            onClick={() => setView('chat')}
                            className="px-4 py-2.5 bg-bg-surface border border-border-main hover:bg-bg-base text-text-primary rounded-xl font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-sm"
                          >
                            <MessageSquare size={13} className="text-accent-gold" />
                            <span>{language === 'te' ? 'చాట్ తెరవండి' : 'Open Smart Chat'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-bg-surface border border-border-main rounded-3xl p-12 text-center flex flex-col justify-center items-center">
                  <Search size={44} className="text-text-muted mb-3 stroke-1 animate-pulse" />
                  <h4 className="text-lg font-bold text-text-primary">{language === 'te' ? 'మీ శోధనకు తగిన సంభాషణలు ఏవీ లేవు' : 'No conversations match your query'}</h4>
                  <button onClick={() => setSearchQuery('')} className="mt-3 text-xs font-bold text-accent-blue hover:underline">{language === 'te' ? 'శోధనను రీసెట్ చేయండి' : 'Reset search criteria'}</button>
                </div>
              )
            ) : (
              <div className="bg-bg-surface border border-border-main rounded-3xl p-12 text-center flex flex-col justify-center items-center">
                <MessageSquare size={48} className="text-text-muted mb-4 stroke-1 animate-pulse" />
                <h4 className="text-lg font-bold text-text-primary">{language === 'te' ? 'గత సంభాషణలేవీ లేవు' : 'No previous chats recorded'}</h4>
                <p className="text-sm text-text-secondary mt-2 max-w-sm mb-6">
                  {language === 'te' ? 'పథకాలను అన్వేషించడానికి మరియు సులభంగా దరఖాస్తు చేసుకోవడానికి మా ద్విభాషా కౌన్సిలర్ బాట్‌తో మాట్లాడండి.' : 'Interact with our bilingual scheme counselor bot to explore policies and apply easily.'}
                </p>
                <button
                  onClick={() => setView('chat')}
                  className="saffron-gradient-btn px-6 py-2.5 rounded-full font-bold text-xs cursor-pointer shadow-md"
                >
                  {language === 'te' ? 'కొత్త చాట్ ప్రారంభించు 💬' : 'Start New Chat 💬'}
                </button>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};
