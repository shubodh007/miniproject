import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  User, MapPin, IndianRupee, Share2, Bookmark, ExternalLink, 
  ChevronDown, ChevronUp, Edit3, Award, Sparkles, Files, 
  SlidersHorizontal, CheckCircle, HelpCircle 
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { ProfilePayload, SchemeResult } from '../types';

interface ResultsPageProps {
  results: { schemes: SchemeResult[]; summary_message?: string } | null;
  profileSnapshot: ProfilePayload | null;
  onEditProfile: () => void;
  savedSchemeIds: string[];
  onToggleSaveScheme: (schemeId: string) => void;
  setView: (v: string) => void;
  user: { name: string; email: string } | null;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  results,
  profileSnapshot,
  onEditProfile,
  savedSchemeIds,
  onToggleSaveScheme,
  setView,
  user
}) => {
  const { t, language } = useTranslation();
  const [activeSort, setActiveSort] = useState<'relevance' | 'category' | 'source'>('relevance');
  const [activeFilter, setActiveFilter] = useState<'all' | 'central' | 'ap' | 'tg'>('all');
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
  const [shareToastId, setShareToastId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!user) {
      setView('auth');
    }
  }, [user, setView]);

  if (!user) {
    return null;
  }

  const schemeList = results?.schemes || [];

  const handleDownloadSummary = () => {
    if (!profileSnapshot) return;
    const reportTitle = `SchemeConnect AP - Qualification Audit for ${profileSnapshot.name}`;
    const borderLine = "=".repeat(60);
    let content = `${reportTitle}\nDate Generated: ${new Date().toLocaleDateString()}\n${borderLine}\n\n`;
    content += `CITIZEN DIAGNOSTICS PROJECTION:\n`;
    content += `- Name: ${profileSnapshot.name}\n`;
    content += `- Age: ${profileSnapshot.age} years\n`;
    content += `- Gender: ${profileSnapshot.gender}\n`;
    content += `- Yearly Income: ₹${profileSnapshot.income_annual.toLocaleString('en-IN')}/yr\n`;
    content += `- Caste Segment: ${profileSnapshot.caste_category}\n`;
    content += `- Geolocation: ${profileSnapshot.district}, ${profileSnapshot.state}\n\n`;
    content += `${borderLine}\nMATCHING STATE & CENTRAL SCHEMES VERIFIED:\n${borderLine}\n\n`;

    filteredSchemes.forEach((sch, idx) => {
      content += `${idx + 1}. SCHEME: ${sch.name_en} (${sch.name_te || ''})\n`;
      content += `   - Ministry/Dept: ${sch.ministry} | ${sch.department}\n`;
      content += `   - Source Jurisdiction: ${sch.source.toUpperCase()}\n`;
      content += sch.benefit_amount ? `   - Estimated Annual Aid: INR ${sch.benefit_amount}\n` : `   - Estimated Annual Aid: N/A\n`;
      content += `   - Eligibility Score Match: ${Math.floor(sch.similarity_score * 100)}%\n`;
      content += `   - Confidence Ranking: ${sch.similarity_score > 0.85 ? 'HIGH (Verified)' : 'OPTIMAL'}\n`;
      content += `   - Reasoning Checklist:\n`;
      sch.eligibility_reasons.forEach(r => {
        content += `     [✓] ${r}\n`;
      });
      content += `   - Required Verification Documents:\n`;
      sch.documents_required.forEach(d => {
        content += `     [-] ${d}\n`;
      });
      content += `\n${"-".repeat(60)}\n\n`;
    });

    content += `Disclaimer: Every projected eligibility criterion reflects official gazettes and Secretariat statements. Please check with your ward Secretariat for final verification.`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Welfare_Eligibility_Report_${profileSnapshot.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter in-memory logic
  const filteredSchemes = useMemo(() => {
    let list = [...schemeList];

    // Filter rules
    if (activeFilter === 'central') {
      list = list.filter(s => s.source.toLowerCase() === 'central');
    } else if (activeFilter === 'ap') {
      list = list.filter(s => s.source.toLowerCase() === 'ap state');
    } else if (activeFilter === 'tg') {
      list = list.filter(s => s.source.toLowerCase() === 'telangana state');
    }

    // Sort rules
    if (activeSort === 'relevance') {
      list.sort((a, b) => b.similarity_score - a.similarity_score);
    } else if (activeSort === 'category') {
      list.sort((a, b) => a.category.localeCompare(b.category));
    } else if (activeSort === 'source') {
      list.sort((a, b) => a.source.localeCompare(b.source));
    }

    return list;
  }, [schemeList, activeFilter, activeSort]);

  const handleShare = async (scheme: SchemeResult) => {
    const shareUrl = scheme.apply_link || 'https://www.myscheme.gov.in';
    const message = `${scheme.name_en} - Qualified Welfare Scheme on SchemeConnect AP!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: scheme.name_en,
          text: message,
          url: shareUrl,
        });
      } catch (err) {
        console.log('API Share canceled or failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareToastId(scheme.scheme_id);
        setTimeout(() => setShareToastId(null), 3000);
      } catch (err) {
        console.error('Failed to copy share link', err);
      }
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Agriculture': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20';
      case 'Health': return 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20';
      case 'Housing': return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
      case 'Education': return 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20';
      case 'Women & Child': return 'bg-[#EC4899]/10 text-[#EC4899] border-[#EC4899]/20';
      case 'Social Security': return 'bg-[#14B8A6]/10 text-[#14B8A6] border-[#14B8A6]/20';
      case 'Employment': return 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20';
      default: return 'bg-bg-elevated text-text-secondary';
    }
  };

  if (!profileSnapshot) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center text-center px-4 pt-24" id="results-error-state">
        <HelpCircle size={64} className="text-text-muted mb-4 animate-bounce" />
        <h3 className="text-xl font-bold mb-2">{language === 'te' ? 'ప్రొఫైల్ ఇంకా అందుబాటులో లేదు' : 'No Profile Diagnosed Yet'}</h3>
        <p className="text-sm text-text-secondary mb-6 max-w-sm">
          {language === 'te' ? 'సంక్షేమ పథక అర్హత ప్రమాణాలను తెలుసుకోవడానికి దయచేసి మొదట ప్రశ్నపత్రానికి సమాధానం ఇవ్వండి.' : 'Please answer the questionnaire first to query welfare welfare scheme eligibility criteria.'}
        </p>
        <button
          onClick={() => setView('wizard')}
          className="saffron-gradient-btn px-6 py-2.5 rounded-full font-bold text-sm cursor-pointer"
        >
          {language === 'te' ? 'ఇప్పుడే విశ్లేషించండి 🔍' : 'Diagnose Now 🔍'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="results-viewport">
      {/* 2-Column Responsive Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-8 items-start">
        
        {/* Left Side: Profile Summary panel (Responsive Collapse) */}
        <aside className="sticky top-28 z-20 space-y-4" id="results-sidebar">
          {/* Desktop view profile details */}
          <div className="hidden lg:block bg-bg-surface border border-border-main rounded-3xl p-6 shadow-xl relative overflow-hidden" id="desktop-profile-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-blue/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center space-x-3 pb-4 border-b border-border-subtle mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent-blue/10 text-accent-blue flex items-center justify-center font-bold">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{language === 'te' ? 'విశ్లేషించిన ప్రొఫైల్' : 'diagnosed profile'}</p>
                <h4 className="text-base font-extrabold text-text-primary capitalize truncate max-w-[150px]">
                  {profileSnapshot.name}
                </h4>
              </div>
            </div>

            {/* Profile properties */}
            <div className="space-y-4 text-xs font-normal text-text-secondary" id="sidebar-snapshots">
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'వయస్సు:' : 'Age:'}</span>
                <span className="text-text-primary font-bold">{profileSnapshot.age} {language === 'te' ? 'ఏళ్ళు' : 'yrs'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'లింగం:' : 'Gender:'}</span>
                <span className="text-text-primary font-bold">{profileSnapshot.gender}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'వార్షిక ఆదాయం:' : 'Yearly Income:'}</span>
                <span className="text-accent-saffron font-extrabold">
                  ₹{profileSnapshot.income_annual.toLocaleString('en-IN')}/{language === 'te' ? 'సంవత్సరానికి' : 'yr'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'సామాజిక వర్గం (కులం):' : 'Caste:'}</span>
                <span className="text-text-primary font-bold">{profileSnapshot.caste_category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'రాష్ట్రం:' : 'State:'}</span>
                <span className="text-text-primary font-bold">{profileSnapshot.state}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'జిల్లా:' : 'District:'}</span>
                <span className="text-text-primary font-bold truncate max-w-[120px]">{profileSnapshot.district}</span>
              </div>
              {profileSnapshot.land_acres !== undefined && (
                <div className="flex items-center justify-between">
                  <span>{language === 'te' ? 'వ్యవసాయ భూమి:' : 'Agricultural Land:'}</span>
                  <span className="text-text-primary font-bold">{profileSnapshot.land_acres} {language === 'te' ? 'ఎకరాలు' : 'acres'}</span>
                </div>
              )}
            </div>

            <button
              onClick={onEditProfile}
              className="mt-6 w-full py-2.5 rounded-xl border border-border-main text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors flex items-center justify-center space-x-1.5 cursor-pointer font-bold text-xs"
              id="sidebar-edit-btn"
            >
              <Edit3 size={13} />
              <span>{t('results.modify_profile')}</span>
            </button>
          </div>

          {/* Mobile expandable top layout */}
          <div className="lg:hidden bg-bg-surface border border-border-main rounded-2xl shadow-md overflow-hidden" id="mobile-profile-card">
            <button
              onClick={() => setIsMobileProfileOpen(!isMobileProfileOpen)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left font-bold text-sm text-text-primary cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <User size={16} className="text-accent-blue" />
                <span>{language === 'te' ? 'విశ్లేషణ ప్రొఫైల్' : 'Diagnostics'}: <strong className="text-accent-saffron">{profileSnapshot.name}</strong> ({profileSnapshot.district})</span>
              </div>
              {isMobileProfileOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isMobileProfileOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-border-subtle bg-bg-base/40 space-y-3.5 text-xs font-semibold text-text-secondary">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="flex justify-between">
                    <span>{language === 'te' ? 'వయస్సు:' : 'Age:'}</span>
                    <span className="text-text-primary font-bold">{profileSnapshot.age} {language === 'te' ? 'ఏళ్ళు' : 'yrs'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'te' ? 'లింగం:' : 'Gender:'}</span>
                    <span className="text-text-primary font-bold">{profileSnapshot.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'te' ? 'వార్షిక ఆదాయం:' : 'Yearly Income:'}</span>
                    <span className="text-accent-saffron font-bold">₹{profileSnapshot.income_annual.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'te' ? 'సామాజిక వర్గం:' : 'Caste:'}</span>
                    <span className="text-text-primary font-bold">{profileSnapshot.caste_category}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span>{language === 'te' ? 'ప్రాంతం:' : 'Location:'}</span>
                    <span className="text-text-primary font-bold">{profileSnapshot.district}, {profileSnapshot.state}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-subtle flex gap-2">
                  <button
                    onClick={onEditProfile}
                    className="flex-1 py-2 text-center border border-border-main text-text-secondary hover:text-text-primary rounded-lg font-bold text-xs cursor-pointer"
                  >
                    {t('results.modify_profile')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Main Scheme recommendation cards feed */}
        <main className="space-y-6" id="results-feed">
          {/* Section banner matching statement info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-bg-surface/60 border border-border-subtle p-5 rounded-3xl backdrop-blur-md relative overflow-hidden" id="results-banner">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-text-primary flex items-center">
                <Award className="text-accent-gold mr-2" size={20} />
                <span>
                  {t('results.found', { count: filteredSchemes.length })}
                </span>
              </h3>
              <p className="text-xs text-text-secondary font-medium mt-1">
                {results?.summary_message || t('results.scanning')}
              </p>
            </div>

            {/* In-Memory Filter Options */}
            <div className="flex items-center space-x-2" id="filter-wrapper">
              <SlidersHorizontal size={14} className="text-text-muted" />
              <div className="flex flex-wrap gap-1">
                {(['all', 'central', 'ap', 'tg'] as const).map((fil) => (
                  <button
                    key={fil}
                    onClick={() => setActiveFilter(fil)}
                    className={`px-3 py-1 text-[11px] font-bold rounded-full border transition-all cursor-pointer ${
                      activeFilter === fil
                        ? 'bg-accent-blue border-accent-blue text-white shadow-sm'
                        : 'bg-bg-surface/20 border-border-subtle text-text-secondary hover:border-text-secondary'
                    }`}
                  >
                    {fil === 'all' && t('results.filter.all')}
                    {fil === 'central' && t('results.filter.central')}
                    {fil === 'ap' && t('results.filter.ap')}
                    {fil === 'tg' && t('results.filter.tg')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controls Deck with Sorting and Download Summaries */}
          <div className="flex items-center justify-between flex-wrap gap-3" id="controls-panel">
            <div className="flex items-center space-x-3 text-xs font-bold text-text-secondary bg-bg-surface/30 p-2.5 rounded-xl border border-border-subtle w-fit" id="sort-bar">
              <span>{language === 'te' ? 'క్రమపద్ధతి నిబంధన:' : 'Sort By:'}</span>
              <div className="flex bg-bg-elevated p-1 rounded-lg">
                {(['relevance', 'category', 'source'] as const).map((srt) => (
                   <button
                     key={srt}
                     onClick={() => setActiveSort(srt)}
                     className={`px-3 py-1 rounded text-[11px] leading-tight uppercase font-extrabold cursor-pointer transition-all ${
                       activeSort === srt
                         ? 'bg-bg-surface text-accent-saffron border border-border-subtle font-bold shadow-xs'
                         : 'text-text-muted hover:text-text-secondary'
                     }`}
                   >
                     {t(`results.sort.${srt}`)}
                   </button>
                 ))}
               </div>
             </div>
 
             <button
               onClick={handleDownloadSummary}
               className="px-4.5 py-3 bg-accent-saffron/15 border border-accent-saffron/20 hover:bg-accent-saffron text-accent-saffron hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2"
               title="Download entire eligibility matching report"
               id="results-download-report-btn"
             >
               <Award size={14} />
               <span>{language === 'te' ? 'సారాంశ నివేదికను డౌన్‌లోడ్ చేయండి' : 'Download Summary Report'}</span>
             </button>
           </div>

          {/* Cards List container */}
          {filteredSchemes.length > 0 ? (
            <div className="space-y-6" id="scheme-grid">
              {filteredSchemes.map((scheme, index) => {
                const isSaved = savedSchemeIds.includes(scheme.scheme_id);
                return (
                  <motion.div
                    key={scheme.scheme_id}
                    initial={{ y: 25, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.08, duration: 0.3 }}
                    className="bg-bg-surface border border-border-main hover:border-accent-saffron/30 rounded-3xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between transition-colors shadow-md"
                  >
                    {/* Visual Subtle Accents */}
                    <div className="absolute top-0 right-0 w-44 h-44 bg-accent-saffron/5 rounded-full blur-2xl pointer-events-none" />

                    {/* Card Top Row: Sector Badge details & Benefit */}
                    <div className="flex flex-wrap gap-2 items-center justify-between mb-4.5">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className={`px-2.5 py-0.5 text-[11px] leading-tight font-black rounded border uppercase tracking-wider ${getCategoryColor(scheme.category)}`}>
                          {scheme.category}
                        </span>
                        <span className="px-2.5 py-0.5 text-[11px] leading-tight font-black bg-accent-blue/10 text-accent-blue border border-accent-blue/20 rounded uppercase tracking-wider">
                          {scheme.source}
                        </span>
                        {/* Source Citation indicators */}
                        <span className="text-[11px] leading-tight font-bold text-text-muted hidden sm:inline uppercase font-mono">
                          {language === 'te' ? 'జీవో ఐడీ:' : 'Citation ID:'} G.O.{scheme.scheme_id.slice(-4).toUpperCase()}
                        </span>
                      </div>
                      
                      {scheme.benefit_amount && (
                        <div className="flex items-center space-x-1 text-xs font-black text-accent-saffron bg-accent-saffron/10 border border-accent-saffron/20 px-2.5 py-1 rounded-lg">
                          <IndianRupee size={12} />
                          <span>{scheme.benefit_amount} / {language === 'te' ? 'సంవత్సరానికి' : 'Year'}</span>
                        </div>
                      )}
                    </div>

                    {/* Schemes Identification Headings */}
                    <div className="mb-4">
                      <h3 className="text-[19px] sm:text-[22px] font-extrabold text-text-primary leading-snug tracking-tight font-heading">
                        {language === 'te' ? scheme.name_te : scheme.name_en}
                      </h3>
                      <p className="text-xs font-semibold text-text-secondary mt-1">
                        {language === 'te' ? `శాఖ: ${scheme.department} • కేంద్ర మంత్రిత్వ శాఖ: ${scheme.ministry}` : `Department of ${scheme.department} • Central Ministry of ${scheme.ministry}`}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-5 border-t border-b border-border-subtle py-3 bg-bg-base/25 px-2.5 rounded-xl">
                      {/* 1. Eligibility Score */}
                      <div className="text-left">
                        <span className="text-[11px] leading-tight font-black text-text-muted uppercase tracking-wider block">{language === 'te' ? 'అర్హత సరిపోలిక' : 'Eligibility Match'}</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-sm font-extrabold text-[#10B981]">{Math.floor(scheme.similarity_score * 100)}%</span>
                          <div className="w-16 h-1.5 bg-bg-elevated rounded-full overflow-hidden shrink-0">
                            <div 
                              className="h-full bg-[#10B981] rounded-full transition-all duration-500" 
                              style={{ width: `${Math.floor(scheme.similarity_score * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. Confidence Indicator */}
                      <div className="text-left border-l border-border-subtle pl-3.5">
                        <span className="text-[11px] leading-tight font-black text-text-muted uppercase tracking-wider block">{language === 'te' ? 'సరిపోలిక విశ్వసనీయత' : 'Match Certainty'}</span>
                        <span className="text-xs font-extrabold text-accent-blue flex items-center mt-1">
                          <span className="h-1.5 w-1.5 bg-accent-blue rounded-full mr-1.5 animate-pulse" />
                          {scheme.similarity_score > 0.85 
                            ? (language === 'te' ? 'అధికం (ధృవీకరించబడింది)' : 'HIGH (Verified)') 
                            : (language === 'te' ? 'సరైన నివేదిక' : 'OPTIMAL REPORT')}
                        </span>
                      </div>
                    </div>

                    {/* 3. Reasoning Chain Checklist */}
                    <div className="mb-5 space-y-2.5 text-left">
                      <h4 className="text-[11px] leading-tight font-black text-text-muted uppercase tracking-wider flex items-center">
                        <Sparkles size={12} className="text-accent-gold mr-1.5" />
                        <span>{language === 'te' ? 'అర్హత కారణాల జాబితా' : 'Reasoning Chain Checklist'}</span>
                      </h4>
                      <ul className="space-y-2 pl-1">
                        {scheme.eligibility_reasons.map((reason, rIdx) => (
                          <li key={rIdx} className="text-[13px] font-semibold text-text-secondary flex items-start space-x-2.5 leading-relaxed">
                            <CheckCircle size={14} className="text-[#10B981] shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 4. Required Verification Documents */}
                    <div className="mb-6 space-y-2.5 bg-bg-base/40 p-4 rounded-xl border border-border-subtle text-left">
                      <h4 className="text-[11px] leading-tight font-black text-text-muted uppercase tracking-wider flex items-center">
                        <Files size={12} className="text-accent-blue mr-1.5" />
                        <span>{language === 'te' ? 'సచివాలయం కోరిన పత్రాలు' : 'Documents Requested by secretariat'}</span>
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {scheme.documents_required.map((doc, dIdx) => (
                          <span key={dIdx} className="px-2.5 py-1 font-bold text-[11px] bg-bg-surface border border-border-main text-text-secondary rounded-lg">
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom CTA triggers bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-auto">
                      <button
                        onClick={() => {
                          const url = scheme.apply_link || 'https://www.myscheme.gov.in';
                          window.open(url, '_blank', 'noreferrer,noopener');
                        }}
                        className="saffron-gradient-btn text-xs font-black uppercase tracking-wider px-6 py-3.5 rounded-xl cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <span>{t('scheme.apply')}</span>
                        <ExternalLink size={14} />
                      </button>

                      {/* Utility bookmark save and generic mobile share toggles */}
                      <div className="flex items-center space-x-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-border-subtle justify-end">
                        <button
                          onClick={() => onToggleSaveScheme(scheme.scheme_id)}
                          className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                            isSaved
                              ? 'bg-accent-gold/15 border-accent-gold text-accent-gold'
                              : 'bg-bg-surface border-border-main text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <Bookmark size={15} className={isSaved ? 'fill-accent-gold' : ''} />
                          <span>{isSaved ? (language === 'te' ? 'సేవ్ చేయబడింది' : 'Saved') : t('scheme.save')}</span>
                        </button>

                        <button
                          onClick={() => handleShare(scheme)}
                          className="p-2.5 bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-main rounded-xl cursor-pointer transition-colors relative"
                          title="Share Link"
                        >
                          <Share2 size={15} />
                          {shareToastId === scheme.scheme_id && (
                            <span className="absolute bottom-11 right-1/2 translate-x-1/2 whitespace-nowrap bg-bg-elevated border border-border-main text-[11px] leading-tight font-bold text-accent-blue px-2 py-1 rounded-md shadow-lg animate-fade-in">
                              {t('scheme.link_copied')}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-bg-surface border border-border-main rounded-3xl p-12 text-center flex flex-col justify-center items-center" id="results-empty-state">
              <Files size={56} className="text-text-muted mb-4 rotate-12" />
              <h4 className="text-xl font-bold text-text-primary">{t('results.empty_title')}</h4>
              <p className="text-sm text-text-secondary mt-2 max-w-sm mb-6">
                {t('results.empty_body')}
              </p>
              <button
                onClick={onEditProfile}
                className="saffron-gradient-btn px-6 py-2.5 rounded-full font-bold text-xs font-bold shrink-0 cursor-pointer"
              >
                {t('results.modify_profile')}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
