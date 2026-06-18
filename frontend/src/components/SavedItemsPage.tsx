import React, { useState } from 'react';
import { 
  Bookmark, 
  Trash2, 
  ChevronRight, 
  ExternalLink,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { SchemeResult } from '../types';
import { SEED_SCHEMES } from '../utils/schemeEngine';
import { router } from '../utils/router';
import { getSecuredStorage } from '../utils/security';

interface SavedItemsPageProps {
  savedSchemeIds: string[];
  onToggleSaveScheme: (id: string) => void;
  setView: (v: string) => void;
  user: { name: string; email: string } | null;
}

export const SavedItemsPage: React.FC<SavedItemsPageProps> = ({
  savedSchemeIds,
  onToggleSaveScheme,
  setView,
  user
}) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'schemes' | 'reports' | 'conversations'>('schemes');

  // Filter bookmarked SchemeResult records
  const savedObjects = getSecuredStorage<SchemeResult[]>('sc_bookmarks_objects') || [];
  
  const savedSchemes = savedSchemeIds.map(id => {
    const fromObjects = savedObjects.find(s => s.scheme_id === id);
    if (fromObjects) return fromObjects;
    const fromSeed = SEED_SCHEMES.find(s => s.scheme_id === id);
    if (fromSeed) return fromSeed;
    return null;
  }).filter((s): s is SchemeResult => s !== null);

  const handleSchemeCardClick = (scheme: SchemeResult) => {
    // 1. Guard against event or invalid objects passing in
    if (!scheme || typeof scheme !== 'object' || 'preventDefault' in scheme || 'target' in scheme) {
      console.warn('[SchemeCard] Invalid scheme object passed to click handler:', scheme);
      return;
    }

    // 2. Extract and sanitize only strict primitive values
    const safePayload = {
      trigger: "scheme_card_click" as const,
      scheme_name: scheme.name_en ? String(language === 'te' ? (scheme.name_te || scheme.name_en) : scheme.name_en) : '',
      citation_id: scheme.scheme_id ? String(scheme.scheme_id) : '',
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

  return (
    <div className="relative min-h-screen bg-bg-base pt-6 pb-24 md:pb-12" id="saved-items-container">
      {/* Mesh Ambient Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--bg-surface)_1px,transparent_1px),linear-gradient(to_bottom,var(--bg-surface)_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_10%,black_80%,transparent_100%)] pointer-events-none z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Page title header */}
        <div id="saved-items-header">
          <div className="inline-flex items-center space-x-1 text-[11px] font-black tracking-widest uppercase text-accent-saffron">
            <Bookmark size={12} />
            <span>{language === 'te' ? 'భద్రపరిచిన అంశాలు' : 'SECURED REPOSITORIES'}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary font-heading mt-1">
            {language === 'te' ? 'సేవ్ చేయబడిన లైబ్రరీ' : 'Saved Items'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {language === 'te' 
              ? 'మీరు భద్రపరిచిన పథకాలు, పత్ర విశ్లేషణ నివేదికలు మరియు మునుపటి సంభాషణల సారాంశం.'
              : 'Configure preferences, manage bookmark indexes, and revisit analytical records.'}
          </p>
        </div>

        {/* Categories Tab Navigation */}
        <div className="flex border-b border-border-main" id="saved-items-tabs">
          <button
            onClick={() => setActiveTab('schemes')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'schemes'
                ? 'border-accent-saffron text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {language === 'te' ? 'పథకాలు' : 'Schemes'} ({savedSchemes.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'reports'
                ? 'border-accent-saffron text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {language === 'te' ? 'లిగల్ నివేదికలు' : 'Legal Audits'} (1)
          </button>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'conversations'
                ? 'border-accent-saffron text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {language === 'te' ? 'సంభాషణలు' : 'Conversations'} (0)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="pt-2" id="saved-items-content">
          
          {/* Schemes Tab */}
          {activeTab === 'schemes' && (
            <div className="space-y-4">
              {savedSchemes.length === 0 ? (
                <div className="border border-dashed border-border-main p-12 text-center rounded-3xl bg-bg-surface/20 flex flex-col items-center justify-center">
                  <Bookmark size={36} className="text-text-muted mb-3 opacity-30" />
                  <h3 className="text-sm font-bold text-text-secondary">{language === 'te' ? 'భద్రపరచిన పథకాలు ఏవీ లేవు' : 'No bookmarked schemes'}</h3>
                  <p className="text-xs text-text-muted mt-1 max-w-sm">
                    {language === 'te' 
                      ? 'అర్హత విగ్గీలో ప్రొఫైల్ తనిఖీ చేసి, పథకాల పక్కన ఉన్న బుక్‌మార్క్ చిహ్నాన్ని నొక్కండి.'
                      : 'Use the Eligibility Wizard to calculate fits and bookmark matching schemes.'}
                  </p>
                  <button
                    onClick={() => setView('wizard')}
                    className="mt-6 px-4 py-2 bg-accent-saffron text-white rounded-xl text-xs font-bold shadow-md shadow-accent-saffron/10 hover:bg-accent-saffron/90 cursor-pointer transition-colors"
                  >
                    {language === 'te' ? 'అర్హత తనిఖీని ప్రారంభించండి' : 'Open Eligibility Wizard'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedSchemes.map(scheme => (
                    <div 
                      key={scheme.scheme_id}
                      className="bg-bg-surface border border-border-main p-5 rounded-2xl flex flex-col justify-between hover:border-accent-saffron/20 transition-all shadow-sm group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] leading-tight font-black uppercase tracking-wider bg-accent-saffron/10 text-accent-saffron px-2.5 py-0.5 rounded-full">
                            {scheme.category}
                          </span>
                          <span className="text-xs font-mono font-bold text-text-secondary">{scheme.benefit_amount || 'Subsidy'}</span>
                        </div>
                        <h3 className="text-base font-bold font-heading text-text-primary tracking-wide leading-tight group-hover:text-accent-saffron transition-colors">
                          {language === 'te' ? scheme.name_te : scheme.name_en}
                        </h3>
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                          {scheme.ministry} • {scheme.department}
                        </p>
                      </div>

                      <div className="border-t border-border-subtle pt-4 mt-5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted">{scheme.source}</span>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleChatHandoff(scheme)}
                            className="text-xs font-bold text-accent-saffron hover:underline inline-flex items-center space-x-0.5 cursor-pointer bg-accent-saffron/5 border border-accent-saffron/10 px-2.5 py-1 rounded"
                            title="Chat with Sahay Advisor"
                          >
                            <MessageSquare size={12} />
                            <span>{language === 'te' ? 'సహాయ్‌తో చాట్' : 'Ask Sahay'}</span>
                          </button>
                          <button
                            onClick={() => onToggleSaveScheme(scheme.scheme_id)}
                            className="p-1.5 text-text-muted hover:text-error rounded-lg hover:bg-error/5 cursor-pointer transition-all"
                            title="Remove bookmark"
                          >
                            <Trash2 size={15} />
                          </button>
                          <a 
                            href={scheme.apply_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-accent-blue hover:underline inline-flex items-center space-x-0.5 cursor-pointer"
                          >
                            <span>{language === 'te' ? 'దరఖాస్తు చేసుకోవడానికి' : 'Official Portal'}</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="bg-bg-surface border border-border-main p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-accent-blue/10 text-accent-blue flex items-center justify-center font-bold">
                    84%
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wide uppercase text-text-primary">{language === 'te' ? 'కౌలు రైతు ఒప్పంద విశ్లేషణ' : 'TENANT FARMER RENTAL DEED'}</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Medium contractual liability warning flagged • AP Agri-Lease Template v1</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 self-start sm:self-center">
                  <span className="text-[11px] leading-tight text-text-muted font-mono uppercase">2 days ago</span>
                  <button 
                    onClick={() => setView('legal')}
                    className="px-3.5 py-1.5 bg-bg-elevated border border-border-main hover:border-accent-blue/30 text-text-primary rounded-xl text-xs font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <span>{language === 'te' ? 'పరిశీలించు' : 'Audit Details'}</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conversations Tab */}
          {activeTab === 'conversations' && (
            <div className="space-y-4">
              <div className="border border-dashed border-border-main p-12 text-center rounded-3xl bg-bg-surface/20 flex flex-col items-center justify-center">
                <Calendar size={36} className="text-text-muted mb-3 opacity-30" />
                <h3 className="text-sm font-bold text-text-secondary">{language === 'te' ? 'ఎటువంటి సంభాషణలు సేవ్ చేయబడలేదు' : 'No saved conversations'}</h3>
                <p className="text-xs text-text-muted mt-1 max-w-sm">
                  {language === 'te' 
                    ? 'AI చాట్ అసిస్టెంట్‌తో సంభాషణలను ఇక్కడ భద్రపరచవచ్చు.'
                    : 'Discussions with the civic-welfare chatbot are archived secure across sessions here.'}
                </p>
                <button
                  onClick={() => setView('chat')}
                  className="mt-6 px-4 py-2 bg-accent-saffron text-white rounded-xl text-xs font-bold shadow-md shadow-accent-saffron/10 hover:bg-accent-saffron/90 cursor-pointer transition-colors"
                >
                  {language === 'te' ? 'సహాయకుడిని అడగండి' : 'Chat with AI'}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
