import React from 'react';
import { 
  IndianRupee, Bookmark, ExternalLink, Sparkles, Files, MessageSquare, Share2, CheckCircle
} from 'lucide-react';
import { SchemeResult } from '../../types';

export interface SchemeCardProps {
  scheme: SchemeResult;
  index: number;
  isSaved: boolean;
  compareSchemes: SchemeResult[];
  setCompareSchemes: React.Dispatch<React.SetStateAction<SchemeResult[]>>;
  onToggleSaveScheme: (schemeId: string) => void;
  handleShare: (scheme: SchemeResult) => void;
  handleGenerateChecklist: (scheme: SchemeResult) => void;
  handleSchemeCardClick: (scheme: SchemeResult) => void;
  shareToastId: string | null;
  language: string;
  t: (key: string, options?: any) => string;
  toast: any;
}

export const SchemeCard: React.FC<SchemeCardProps> = ({
  scheme,
  index,
  isSaved,
  compareSchemes,
  setCompareSchemes,
  onToggleSaveScheme,
  handleShare,
  handleGenerateChecklist,
  handleSchemeCardClick,
  shareToastId,
  language,
  t,
  toast,
}) => {

  const getConfidenceBadge = (score: number) => {
    const pct = score * 100;
    if (pct > 80) {
      return {
        className: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20',
        text: language === 'te' ? 'బలమైన పొంతన' : 'Strong Match'
      };
    } else if (pct >= 50) {
      return {
        className: 'bg-[var(--accent-saffron-bg)] text-[var(--accent-saffron)] border-[var(--accent-saffron)]/20',
        text: language === 'te' ? 'అవకాశం ఉంది' : 'Possible Match'
      };
    } else {
      return {
        className: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-default)]',
        text: language === 'te' ? 'అర్హత చూడండి' : 'Check Eligibility'
      };
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Agriculture': 
        return 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--border-subtle)]';
      case 'Health': 
        return 'bg-[var(--info-bg)] text-[var(--info)] border-[var(--border-subtle)]';
      case 'Education': 
        return 'bg-[var(--accent-bg)] text-[var(--text-accent)] border-[var(--border-subtle)]';
      case 'Employment': 
        return 'bg-[var(--accent-saffron-bg)] text-[var(--accent-saffron)] border-[var(--border-subtle)]';
      case 'Housing': 
        return 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
      case 'Women & Child':
      case 'Women & Child Development':
        return 'bg-[var(--accent-bg)] text-[var(--text-accent)] border-[var(--border-subtle)]';
      case 'Social Security':
      case 'Social Welfare':
        return 'bg-[var(--info-bg)] text-[var(--info)] border-[var(--border-subtle)]';
      default: 
        return 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
    }
  };

  const badge = getConfidenceBadge(scheme.similarity_score);
  const scorePct = Math.round(scheme.similarity_score * 100);
  
  let barColorClass = "bg-rose-500";
  let textColorClass = "text-rose-500";
  let scoreLabel = language === 'te' ? 'కనిష్ట సరిపోలిక' : 'Low Match Limit';
  
  if (scorePct >= 85) {
    barColorClass = "bg-emerald-500";
    textColorClass = "text-emerald-500";
    scoreLabel = language === 'te' ? 'అత్యంత బలమైన సరిపోలిక (ధృవీకరించబడింది)' : 'Strong Match (High Certainty)';
  } else if (scorePct >= 65) {
    barColorClass = "bg-amber-500";
    textColorClass = "text-amber-500";
    scoreLabel = language === 'te' ? 'తగిన సరిపోలిక (నివేదించబడింది)' : 'Optimal Match (Moderate Certainty)';
  } else if (scorePct >= 45) {
    barColorClass = "bg-sky-500";
    textColorClass = "text-sky-500";
    scoreLabel = language === 'te' ? 'సాధారణ సరిపోలిక' : 'Partial Match (Verification Recommended)';
  }

  return (
    <li
      tabIndex={0}
      className="animate-fade-up bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--accent-saffron)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] rounded-3xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between transition-colors shadow-md"
      style={{ 
        animationDelay: `${Math.min(index * 60, 420)}ms`,
        animationFillMode: 'both'
      }}
    >
      {/* Visual Subtle Accents */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--accent-saffron-bg)] rounded-full blur-2xl pointer-events-none" />

      {/* Card Top Row: Sector Badge details & Benefit */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-4.5">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className={`px-2.5 py-0.5 text-[11px] leading-tight font-black rounded border uppercase tracking-wider ${getCategoryColor(scheme.category)}`}>
            {scheme.category}
          </span>
          <span className="px-2.5 py-0.5 text-[11px] leading-tight font-black bg-[var(--accent-primary-bg)] text-[var(--accent-primary)] border border-[var(--border-subtle)] rounded uppercase tracking-wider">
            {scheme.source}
          </span>
          {/* Source Citation indicators */}
          <span className="text-[11px] leading-tight font-bold text-[var(--text-muted)] hidden sm:inline uppercase font-mono">
            {language === 'te' ? 'జీవో ఐడీ:' : 'Citation ID:'} G.O.{scheme.scheme_id.slice(-4).toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCompareSchemes(prev => {
                if (prev.find(s => s.scheme_id === scheme.scheme_id)) {
                  return prev.filter(s => s.scheme_id !== scheme.scheme_id);
                }
                if (prev.length >= 3) {
                  toast.warning(language === 'te' ? 'పరిమితి 3 పథకాలు మాత్రమే' : 'Compare up to 3 schemes at a time');
                  return prev;
                }
                return [...prev, scheme];
              });
            }}
            className={`text-[11px] font-bold px-2.5 py-1 min-h-[32px] rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
              compareSchemes.find(s => s.scheme_id === scheme.scheme_id)
                ? 'bg-accent-saffron/15 text-accent-saffron border-accent-saffron/40'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]'
            }`}
          >
            {compareSchemes.find(s => s.scheme_id === scheme.scheme_id) 
              ? (language === 'te' ? '✓ పోలుస్తోంది' : '✓ Comparing') 
              : (language === 'te' ? '+ పోల్చండి' : '+ Compare')}
          </button>

          {scheme.benefit_amount && (
            <div className="flex items-center space-x-1 text-xs font-black text-[var(--accent-saffron)] bg-[var(--accent-saffron-bg)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-lg">
              <IndianRupee size={12} />
              <span>{scheme.benefit_amount} / {language === 'te' ? 'సంవత్సరానికి' : 'Year'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Schemes Identification Headings */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <h3 className="text-[19px] sm:text-[22px] font-extrabold text-[var(--text-primary)] leading-snug tracking-tight font-heading">
            {language === 'te' ? scheme.name_te : scheme.name_en}
          </h3>
          <span className={`inline-flex items-center shrink-0 self-start sm:self-center px-2.5 py-1 text-[11px] leading-tight font-black rounded-full border tracking-wide uppercase ${badge.className}`}>
            {badge.text}
          </span>
        </div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">
          {language === 'te' ? `శాఖ: ${scheme.department} • కేంద్ర మంత్రిత్వ శాఖ: ${scheme.ministry}` : `Department of ${scheme.department} • Central Ministry of ${scheme.ministry}`}
        </p>
      </div>

      {/* Visual Confidence Score Indicator Row */}
      <div className="mb-5 border border-[var(--border-subtle)] p-3.5 bg-[var(--bg-base)]/30 rounded-2xl text-left space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] leading-tight font-black text-[var(--text-muted)] uppercase tracking-wider block">
              {language === 'te' ? 'ప్రొఫైల్ సరిపోలిక విశ్వసనీయత' : 'Profile Match Confidence'}
            </span>
            <span className={`text-[11px] font-bold ${textColorClass}`}>
              {scoreLabel}
            </span>
          </div>
          <div className="text-right">
            <span className={`text-lg font-black tracking-tight ${textColorClass}`}>
              {scorePct}%
            </span>
          </div>
        </div>
        
        {/* Color-Coded Percentage Bar */}
        <div className="w-full bg-[var(--bg-elevated)] rounded-full h-2.5 overflow-hidden border border-[var(--border-subtle)]/10">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
            style={{ width: `${scorePct}%` }}
          />
        </div>
      </div>

      {/* 3. Reasoning Chain Checklist */}
      <div className="mb-5 space-y-2.5 text-left">
        <h4 className="text-[11px] leading-tight font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center">
          <Sparkles size={12} className="text-accent-gold mr-1.5" />
          <span>{language === 'te' ? 'అర్హత కారణాల జాబితా' : 'Reasoning Chain Checklist'}</span>
        </h4>
        <ul className="space-y-2 pl-1">
          {scheme.eligibility_reasons.map((reason, rIdx) => (
            <li key={rIdx} className="text-[13px] font-semibold text-[var(--text-secondary)] flex items-start space-x-2.5 leading-relaxed">
              <CheckCircle size={14} className="text-[var(--success)] shrink-0 mt-0.5" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 4. Required Verification Documents */}
      <div className="mb-6 space-y-2.5 bg-[var(--bg-base)]/40 p-4 rounded-xl border border-[var(--border-subtle)] text-left">
        <h4 className="text-[11px] leading-tight font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center">
          <Files size={12} className="text-[var(--accent-primary)] mr-1.5" />
          <span>{language === 'te' ? 'సచివాలయం కోరిన పత్రాలు' : 'Documents Requested by secretariat'}</span>
        </h4>
        <div className="flex flex-wrap gap-1">
          {scheme.documents_required.map((doc, dIdx) => (
            <span key={dIdx} className="px-2.5 py-1 font-bold text-[11px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg">
              {doc}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom CTA triggers bar with touch-friendly sizes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-auto">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const url = scheme.apply_link || 'https://www.myscheme.gov.in';
              window.open(url, '_blank', 'noreferrer,noopener');
            }}
            className="saffron-gradient-btn text-xs font-black uppercase tracking-wider px-6 py-3.5 rounded-xl cursor-pointer flex items-center justify-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] min-h-[44px]"
          >
            <span>{t('scheme.apply')}</span>
            <ExternalLink size={14} />
          </button>

          <button
            onClick={() => handleGenerateChecklist(scheme)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-accent-primary hover:bg-accent-primary/10 px-3 py-2.5 rounded-xl transition-all border border-accent-primary/20 cursor-pointer min-h-[44px]"
            id={`btn-checklist-trigger-${scheme.scheme_id}`}
          >
            <Files size={13} />
            <span>{language === 'te' ? 'నా జాబితా' : 'My Checklist'}</span>
          </button>

          <button
            onClick={() => handleSchemeCardClick(scheme)}
            className="inline-flex items-center space-x-1.5 px-5 py-3.5 bg-[var(--accent-primary-bg)] border border-[var(--border-subtle)] hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] min-h-[44px]"
          >
            <MessageSquare size={14} />
            <span>{language === 'te' ? 'సహాయ్‌తో చాట్' : 'Ask Sahay AI'}</span>
          </button>
        </div>

        {/* Utility bookmark save and generic mobile share toggles */}
        <div className="flex items-center space-x-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--border-subtle)] justify-end">
          <button
            onClick={() => onToggleSaveScheme(scheme.scheme_id)}
            aria-pressed={isSaved}
            className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] min-h-[44px] ${
              isSaved
                ? 'bg-accent-gold/15 border-accent-gold text-accent-gold'
                : 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Bookmark size={15} className={isSaved ? 'fill-accent-gold' : ''} />
            <span>{isSaved ? (language === 'te' ? 'సేవ్ చేయబడింది' : 'Saved') : t('scheme.save')}</span>
          </button>

          <button
            onClick={() => handleShare(scheme)}
            className="p-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded-xl cursor-pointer transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] min-h-[44px]"
            title="Share Link"
          >
            <Share2 size={15} />
            {shareToastId === scheme.scheme_id && (
              <span className="absolute bottom-11 right-1/2 translate-x-1/2 whitespace-nowrap bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[11px] leading-tight font-bold text-[var(--accent-primary)] px-2 py-1 rounded-md shadow-lg animate-fade-in animate-duration-150">
                {t('scheme.link_copied')}
              </span>
            )}
          </button>
        </div>
      </div>
    </li>
  );
};
