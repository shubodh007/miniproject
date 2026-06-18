import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Share2, ExternalLink, FileText, CheckCircle, Award, Sparkles, IndianRupee } from 'lucide-react';
import { getSecuredStorage, setSecuredStorage } from '../../../utils/security';

export interface SchemeHandoffPayload {
  trigger: "scheme_card_click";
  scheme_name: string;
  citation_id: string;
  department: string;
  category: string;
  state: string;
  benefit_amount: string;
  eligibility_match: number;
  match_certainty: string;
  reasoning_chain: string[];
  documents_needed: string[];
  apply_url: string;
}

interface SchemeSummaryCardProps {
  handoff?: SchemeHandoffPayload | null;
}

export const SchemeSummaryCard: React.FC<SchemeSummaryCardProps> = ({ handoff }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  // If no handoff context is loaded, render a beautiful fallback placeholder matching the active context
  const activeData: SchemeHandoffPayload = handoff || {
    trigger: "scheme_card_click",
    scheme_name: "YSR Asara Pension Scheme",
    citation_id: "G.O.MS_No.056",
    department: "Rural Development Department",
    category: "SOCIAL SECURITY",
    state: "ANDHRA PRADESH",
    benefit_amount: "₹3,000 per month",
    eligibility_match: 95,
    match_certainty: "HIGH (Verified)",
    reasoning_chain: ["Verified residency in Andhra Pradesh", "Household income within specified limit", "Age criteria fully satisfied"],
    documents_needed: ["Aadhaar Card", "White Ration Card", "Residence Certificate"],
    apply_url: "https://gswsvolunteer.ap.gov.in"
  };

  // Sync state with local bookmarks
  useEffect(() => {
    const bookmarks = getSecuredStorage<string[]>('sc_bookmarks') || [];
    setIsSaved(bookmarks.includes(activeData.citation_id));
  }, [activeData.citation_id]);

  const handleToggleSave = () => {
    const bookmarks = getSecuredStorage<string[]>('sc_bookmarks') || [];
    let nextBookmarks = [...bookmarks];
    const isSaving = !nextBookmarks.includes(activeData.citation_id);

    if (nextBookmarks.includes(activeData.citation_id)) {
      nextBookmarks = nextBookmarks.filter(id => id !== activeData.citation_id);
      setIsSaved(false);
    } else {
      nextBookmarks.push(activeData.citation_id);
      setIsSaved(true);
    }
    setSecuredStorage('sc_bookmarks', nextBookmarks);

    // Sync saved objects on the chatbot side
    const savedObjects = getSecuredStorage<any[]>('sc_bookmarks_objects') || [];
    let nextObjects = [...savedObjects];

    if (isSaving) {
      const newScheme = {
        scheme_id: activeData.citation_id,
        name_en: activeData.scheme_name,
        name_te: activeData.scheme_name,
        ministry: activeData.department,
        department: activeData.department,
        category: activeData.category,
        source: activeData.state,
        eligibility_reasons: activeData.reasoning_chain,
        documents_required: activeData.documents_needed,
        apply_link: activeData.apply_url,
        benefit_amount: activeData.benefit_amount,
        similarity_score: activeData.eligibility_match / 100
      };
      if (!nextObjects.some(s => s.scheme_id === activeData.citation_id)) {
        nextObjects.push(newScheme);
      }
    } else {
      nextObjects = nextObjects.filter(s => s.scheme_id !== activeData.citation_id);
    }
    setSecuredStorage('sc_bookmarks_objects', nextObjects);

    // Dispatch state update so other parts of the application know to refresh bookmarks
    window.dispatchEvent(new StorageEvent('storage', { key: 'sc_bookmarks' }));
  };

  const handleShare = async () => {
    const textToCopy = `Scheme Briefing: ${activeData.scheme_name}
Department: ${activeData.department}
State: ${activeData.state}
Benefit Amount: ${activeData.benefit_amount}
Eligibility Match: ${activeData.eligibility_match}%
Required Documents: ${activeData.documents_needed.join(', ')}
Apply here: ${activeData.apply_url}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-bg-surface border border-border-main hover:border-accent-saffron/30 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden my-4"
      id="scheme-summary-card-renderer"
    >
      {/* Background Decoratives */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-accent-saffron/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Grid */}
      <div className="flex flex-wrap items-center gap-2 justify-between mb-4.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-0.5 text-[11px] leading-tight font-black bg-accent-saffron/15 text-accent-saffron border border-accent-saffron/20 rounded uppercase tracking-wider">
            {activeData.category}
          </span>
          <span className="px-2.5 py-0.5 text-[11px] leading-tight font-black bg-accent-blue/10 text-accent-blue border border-accent-blue/15 rounded uppercase tracking-wider animate-pulse">
            {activeData.state}
          </span>
          <span className="text-[11px] leading-tight font-mono font-bold text-text-muted hidden sm:inline uppercase">
            Citation ID: {activeData.citation_id}
          </span>
        </div>
      </div>

      {/* Scheme Identification */}
      <div className="mb-5 text-left">
        <h3 className="text-xl sm:text-2xl font-extrabold text-text-primary leading-tight tracking-tight font-heading">
          {activeData.scheme_name}
        </h3>
        <p className="text-xs font-semibold text-text-secondary mt-1">
          {activeData.department}
        </p>
      </div>

      {/* Match & Benefit Stats Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 border-t border-b border-border-subtle py-4 bg-bg-base/30 px-3.5 rounded-2xl">
        {/* Eligibility Percent Column */}
        <div className="text-left flex flex-col justify-center">
          <span className="text-[11px] leading-tight font-black text-text-muted uppercase tracking-wider block mb-1">
            Your Eligibility Fit
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-base font-extrabold text-success">{activeData.eligibility_match}%</span>
            <div className="w-24 h-2 bg-bg-elevated rounded-full overflow-hidden shrink-0">
              <div 
                className="h-full bg-success rounded-full transition-all duration-500" 
                style={{ width: `${activeData.eligibility_match}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] leading-tight text-accent-blue font-extrabold mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 bg-accent-blue rounded-full animate-pulse" />
            {activeData.match_certainty}
          </span>
        </div>

        {/* Benefits Amount Column */}
        <div className="text-left sm:border-l border-border-subtle sm:pl-4.5 flex flex-col justify-center">
          <span className="text-[11px] leading-tight font-black text-text-muted uppercase tracking-wider block mb-1">
            Benefit Amount
          </span>
          <div className="flex items-center space-x-1.5 text-accent-saffron">
            <IndianRupee size={16} className="shrink-0" />
            <span className="text-sm font-black uppercase tracking-tight">{activeData.benefit_amount}</span>
          </div>
        </div>
      </div>

      {/* Documentation Checklist Section */}
      <div className="mb-6 bg-bg-base/40 p-4 rounded-xl border border-border-subtle text-left">
        <h4 className="text-[11px] leading-tight font-black text-text-muted uppercase tracking-wider flex items-center mb-2.5">
          <FileText size={12} className="text-accent-blue mr-1.5" />
          <span>Verification Documents Needed</span>
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {activeData.documents_needed.map((doc, dIdx) => (
            <span 
              key={dIdx} 
              className="px-2.5 py-1 font-bold text-[11px] bg-bg-surface border border-border-main text-text-secondary rounded-lg flex items-center space-x-1"
            >
              <CheckCircle size={10} className="text-success shrink-0" />
              <span>{doc}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Bottom CTA triggers action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => window.open(activeData.apply_url, '_blank', 'noreferrer,noopener')}
          className="saffron-gradient-btn text-xs font-black uppercase tracking-wider px-6 py-3.5 rounded-xl cursor-pointer flex items-center justify-center space-x-1.5"
        >
          <span>APPLY NOW →</span>
          <ExternalLink size={14} />
        </button>

        {/* Utility saves and copy sharing toggles */}
        <div className="flex items-center space-x-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-border-subtle justify-end">
          <button
            onClick={handleToggleSave}
            className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
              isSaved
                ? 'bg-accent-gold/15 border-accent-gold text-accent-gold'
                : 'bg-bg-surface border-border-main text-text-secondary hover:text-text-primary'
            }`}
          >
            <Bookmark size={15} className={isSaved ? 'fill-accent-gold' : ''} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          <button
            onClick={handleShare}
            className="p-2.5 bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-main rounded-xl cursor-pointer transition-colors relative"
            title="Share Briefing"
          >
            <Share2 size={15} />
            {shareFeedback && (
              <span className="absolute bottom-11 right-1/2 translate-x-1/2 whitespace-nowrap bg-bg-elevated border border-border-main text-[11px] leading-tight font-bold text-accent-blue px-2.5 py-1 rounded-md shadow-lg">
                Link copied!
              </span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
