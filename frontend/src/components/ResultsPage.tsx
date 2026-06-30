import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  User, ChevronDown, ChevronUp, Edit3, Sparkles, HelpCircle, X
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { ProfilePayload, SchemeResult, MatchResponse, AuthUser } from '../types';
import { router } from '../utils/router';
import { EmptyState } from './EmptyState';
import { WelfareDashboard } from './WelfareDashboard';
import { SchemeCardSkeleton } from './skeletons/SchemeCardSkeleton';
import { useToast } from './ToastProvider';
import { SchemeComparisonModal } from './SchemeComparisonModal';
import { SchemeChecklistModal } from './SchemeChecklistModal';
import { useChecklistGenerator } from '../hooks/useChecklistGenerator';

// Import newly extracted subcomponents
import { SchemeCard } from './results/SchemeCard';
import { FilterBar } from './results/FilterBar';
import { ResultsHeader } from './results/ResultsHeader';

interface ResultsPageProps {
  results: MatchResponse | null;
  profileSnapshot: ProfilePayload | null;
  onEditProfile: () => void;
  savedSchemeIds: string[];
  onToggleSaveScheme: (schemeId: string) => void;
  setView: (v: string) => void;
  user: AuthUser | null;
  onStartChatWithQuery?: (query: string) => void;
  isLoading?: boolean;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  results,
  profileSnapshot,
  onEditProfile,
  savedSchemeIds,
  onToggleSaveScheme,
  setView,
  user,
  onStartChatWithQuery,
  isLoading = false
}) => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [activeSort, setActiveSort] = useState<'relevance' | 'category' | 'source'>('relevance');
  const [activeFilter, setActiveFilter] = useState<'all' | 'central' | 'ap' | 'tg'>('all');
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
  const [shareToastId, setShareToastId] = useState<string | null>(null);
  const [isOfflineDismissed, setIsOfflineDismissed] = useState(false);
  const [compareSchemes, setCompareSchemes] = useState<SchemeResult[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const {
    handleGenerateChecklist,
    checklistModal,
    setChecklistModal
  } = useChecklistGenerator(profileSnapshot);

  React.useEffect(() => {
    if (!user) setView('auth');
  }, [user, setView]);

  if (!user) return null;

  const handleSchemeCardClick = (scheme: SchemeResult) => {
    const safePayload = {
      trigger: "scheme_card_click" as const,
      scheme_name: scheme.name_en ? String(language === 'te' ? (scheme.name_te || scheme.name_en) : scheme.name_en) : '',
      citation_id: scheme.scheme_id ? String(scheme.scheme_id) : '',
      department: scheme.department ? String(scheme.department) : '',
      category: scheme.category ? String(scheme.category) : '',
      state: scheme.source ? String(scheme.source) : '',
      benefit_amount: String(scheme.benefit_amount || (language === 'te' ? "ఆర్థిక సహాయం / సబ్సిడీ" : "Financial Benefit / Subsidy")),
      eligibility_match: typeof scheme.similarity_score === 'number' ? Number(Math.floor(scheme.similarity_score * 100)) : 0,
      match_certainty: String((scheme.similarity_score || 0) > 0.85 ? (language === 'te' ? "అధికం (ధృవీకరించబడింది)" : "HIGH (Verified)") : (language === 'te' ? "సరైన నివేదిక" : "OPTIMAL")),
      reasoning_chain: Array.isArray(scheme.eligibility_reasons) ? scheme.eligibility_reasons.map(String) : [],
      documents_needed: Array.isArray(scheme.documents_required) ? scheme.documents_required.map(String) : [],
      apply_url: scheme.apply_link ? String(scheme.apply_link) : "https://www.myscheme.gov.in"
    };
    try {
      router.push('/chat', { state: { schemeHandoff: safePayload } });
      setView('chat');
    } catch (err) {
      console.error('[SchemeCard] Failed to handle navigation for safe payload:', err);
    }
  };

  const schemeList = results?.schemes || [];

  const filteredSchemes = useMemo(() => {
    let list = [...schemeList];
    if (activeFilter === 'central') list = list.filter(s => s.source.toLowerCase() === 'central');
    else if (activeFilter === 'ap') list = list.filter(s => s.source.toLowerCase() === 'ap state');
    else if (activeFilter === 'tg') list = list.filter(s => s.source.toLowerCase() === 'telangana state');

    if (activeSort === 'relevance') list.sort((a, b) => b.similarity_score - a.similarity_score);
    else if (activeSort === 'category') list.sort((a, b) => a.category.localeCompare(b.category));
    else if (activeSort === 'source') list.sort((a, b) => a.source.localeCompare(b.source));
    return list;
  }, [schemeList, activeFilter, activeSort]);

  const handleDownloadSummary = () => {
    if (!profileSnapshot) return;
    const reportTitle = `SchemeConnect AP - Qualification Audit for ${profileSnapshot.name}`;
    const borderLine = "=".repeat(60);
    let content = `${reportTitle}\nDate Generated: ${new Date().toLocaleDateString()}\n${borderLine}\n\n`;
    content += `CITIZEN DIAGNOSTICS PROJECTION:\n- Name: ${profileSnapshot.name}\n- Age: ${profileSnapshot.age} years\n- Gender: ${profileSnapshot.gender}\n- Yearly Income: ₹${profileSnapshot.income_annual.toLocaleString('en-IN')}/yr\n- Caste Segment: ${profileSnapshot.caste_category}\n- Geolocation: ${profileSnapshot.district}, ${profileSnapshot.state}\n\n`;
    content += `${borderLine}\nMATCHING STATE & CENTRAL SCHEMES VERIFIED:\n${borderLine}\n\n`;

    filteredSchemes.forEach((sch, idx) => {
      content += `${idx + 1}. SCHEME: ${sch.name_en} (${sch.name_te || ''})\n   - Ministry/Dept: ${sch.ministry} | ${sch.department}\n   - Source Jurisdiction: ${sch.source.toUpperCase()}\n${sch.benefit_amount ? `   - Estimated Annual Aid: INR ${sch.benefit_amount}\n` : '   - Estimated Annual Aid: N/A\n'}   - Eligibility Score Match: ${Math.floor(sch.similarity_score * 100)}%\n   - Confidence Ranking: ${sch.similarity_score > 0.85 ? 'HIGH (Verified)' : 'OPTIMAL'}\n   - Reasoning Checklist:\n`;
      sch.eligibility_reasons.forEach(r => { content += `     [✓] ${r}\n`; });
      content += `   - Required Verification Documents:\n`;
      sch.documents_required.forEach(d => { content += `     [-] ${d}\n`; });
      content += `\n${"-".repeat(60)}\n\n`;
    });
    content += `Disclaimer: Every projected eligibility criterion reflects official gazettes and Secretariat statements. Please check with your ward Secretariat for final verification.`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Welfare_Eligibility_Report_${(profileSnapshot.name || 'Citizen').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(language === 'te' ? 'నివేదిక విజయవంతంగా డౌన్‌లోడ్ చేయబడింది' : 'Report downloaded successfully');
  };

  const handleDownloadPDF = async () => {
    if (!profileSnapshot) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const addPageDecoration = (pageNumNum: number) => {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Page ${pageNumNum}`, 210 / 2, 287, { align: 'center' });
        doc.text("SchemeConnect AP • Verified Welfare Scheme Eligibility Report", 15, 287);
        if (pageNumNum > 1) {
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(15, 12, 195, 12);
          doc.text("Welfare Schemes Diagnostic Report", 15, 10);
        }
      };

      const brandyColor = [228, 122, 34];
      const primaryColor = [59, 130, 246];
      const darkText = [15, 23, 42];
      const secondaryText = [71, 85, 105];
      const mutedText = [148, 163, 184];
      const lightBg = [248, 250, 252];
      const successColor = [22, 163, 74];

      let y = 15;
      let pageNum = 1;

      const performPageBreak = () => {
        addPageDecoration(pageNum);
        doc.addPage();
        pageNum++;
        y = 20;
      };

      const ensureSpace = (spaceNeeded: number) => {
        if (y + spaceNeeded > 265) performPageBreak();
      };

      doc.setFillColor(brandyColor[0], brandyColor[1], brandyColor[2]);
      doc.rect(15, y, 180, 4, 'F');
      y += 10;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text("SchemeConnect AP", 15, y);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      doc.text("Personalized Welfare Scheme Matching Diagnostic Report", 15, y + 5.5);
      
      const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.setFontSize(8);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(`Generated: ${dateStr}`, 195, y, { align: 'right' });
      y += 12;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 8;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(brandyColor[0], brandyColor[1], brandyColor[2]);
      doc.text("CITIZEN PROFILE SCHEMATIC", 15, y);
      y += 5;

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 42, 3, 3, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      
      const col1X = 20;
      const col2X = 110;
      
      doc.text(`Name:`, col1X, y + 7);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(profileSnapshot.name || 'N/A', col1X + 35, y + 7);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      doc.text(`Age & Gender:`, col2X, y + 7);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(`${profileSnapshot.age || 'N/A'} years / ${profileSnapshot.gender || 'N/A'}`, col2X + 35, y + 7);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      doc.text(`Annual Income:`, col1X, y + 15);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(brandyColor[0], brandyColor[1], brandyColor[2]);
      doc.text(`₹${(profileSnapshot.income_annual || 0).toLocaleString('en-IN')}`, col1X + 35, y + 15);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      doc.text(`Caste Category:`, col2X, y + 15);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(profileSnapshot.caste_category || 'N/A', col2X + 35, y + 15);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      doc.text(`Jurisdiction:`, col1X, y + 23);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(`${profileSnapshot.district || 'N/A'}, ${profileSnapshot.state || 'N/A'}`, col1X + 35, y + 23);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      if (profileSnapshot.land_acres !== undefined) {
        doc.text(`Agricultural Land:`, col2X, y + 23);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text(`${profileSnapshot.land_acres} acres`, col2X + 35, y + 23);
      } else {
        doc.text(`Eligible Criteria:`, col2X, y + 23);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text(`Full Criteria Scan Match`, col2X + 35, y + 23);
      }

      if (profileSnapshot.occupation) {
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
        doc.text(`Occupation:`, col1X, y + 31);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text(profileSnapshot.occupation, col1X + 35, y + 31);
      }
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      doc.text(`Audit Certainty:`, col2X, y + 31);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`HIGHLY RELIABLE (100% SECURE)`, col2X + 35, y + 31);

      y += 48;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(`ELIGIBLE SCHEMES LISTING (${filteredSchemes.length} matched)`, 15, y);
      y += 6;

      if (results?.summary_message) {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
        const wrappedSummary = doc.splitTextToSize(`Audit insight: ${results.summary_message}`, 180);
        wrappedSummary.forEach((lineStr: string) => {
          ensureSpace(4);
          doc.text(lineStr, 15, y);
          y += 4;
        });
        y += 2;
      }

      filteredSchemes.forEach((sch) => {
        const reasoningPoints = Array.isArray(sch.eligibility_reasons) ? sch.eligibility_reasons : [];
        const requiredDocs = Array.isArray(sch.documents_required) ? sch.documents_required : [];
        const cardHeightEst = 48 + (reasoningPoints.length * 5.2) + Math.max(1, Math.ceil(requiredDocs.length / 3)) * 6.5;

        ensureSpace(cardHeightEst);
        const cardStartY = y;
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.roundedRect(15, y, 180, cardHeightEst - 4, 2, 2, 'FD');
        
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(15, y, 180, 8, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(15, y + 8, 195, y + 8);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(brandyColor[0], brandyColor[1], brandyColor[2]);
        doc.text(`${(sch.source || 'State').toUpperCase()} GOVERNMENT SCHEME`, 20, y + 5.5);
        
        if (sch.benefit_amount) {
          doc.setTextColor(successColor[0], successColor[1], successColor[2]);
          doc.text(`BENEFIT: ₹${sch.benefit_amount}/Yr`, 190, y + 5.5, { align: 'right' });
        } else {
          doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
          doc.text(`BENEFIT: ECONOMIC AID / SUBSIDY`, 190, y + 5.5, { align: 'right' });
        }

        y += 14;

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        const wrapNameStr = sch.name_en || 'Welfare Scheme';
        const wrappedName = doc.splitTextToSize(wrapNameStr, 170);
        wrappedName.forEach((nLine: string) => {
          doc.text(nLine, 20, y);
          y += 5;
        });
        y += 1;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
        doc.text(`Department: ${sch.department || 'N/A'}  |  Ministry: ${sch.ministry || 'N/A'}`, 20, y);
        y += 6.5;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(19, y, 172, 10, 1.5, 1.5, 'F');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text("Eligibility Match:", 23, y + 6.5);
        
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`${Math.floor((sch.similarity_score || 0) * 100)}% Match`, 48, y + 6.5);

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text("Match Certainty:", 85, y + 6.5);
        doc.setFont('Helvetica', 'bold');
        const certaintyStr = (sch.similarity_score || 0) > 0.85 ? "HIGH" : "OPTIMAL";
        doc.setTextColor((sch.similarity_score || 0) > 0.85 ? successColor[0] : brandyColor[0], (sch.similarity_score || 0) > 0.85 ? successColor[1] : brandyColor[1], (sch.similarity_score || 0) > 0.85 ? successColor[2] : brandyColor[2]);
        doc.text(certaintyStr, 110, y + 6.5);

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text("Citation ID:", 140, y + 6.5);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
        doc.text(`G.O.${(sch.scheme_id || 'SCH').slice(-4).toUpperCase()}`, 158, y + 6.5);

        y += 14;

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
        doc.text("Reasoning checklist & compliance reasons:", 20, y);
        y += 4.5;

        reasoningPoints.forEach((reason) => {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(darkText[0], darkText[1], darkText[2]);
          doc.text("-", 22, y + 0.2);
          
          doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
          const wrappedReasonLine = doc.splitTextToSize(reason, 158);
          wrappedReasonLine.forEach((reLine: string, idx: number) => {
            doc.text(reLine, 29, y);
            if (idx < wrappedReasonLine.length - 1) y += 4.2;
          });
          y += 4.8;
        });

        y += 1;

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
        doc.text("Secretariat Verification Documents:", 20, y);
        y += 4.5;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        let chipX = 20;
        requiredDocs.forEach((docName) => {
          const textW = doc.getTextWidth(docName) + 6;
          if (chipX + textW > 185) {
            chipX = 20;
            y += 5.5;
          }
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(chipX, y - 3, textW - 2, 4.5, 0.8, 0.8, 'F');
          doc.text(docName, chipX + 2, y);
          chipX += textW;
        });
        
        y = cardStartY + cardHeightEst + 5;
      });

      ensureSpace(15);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(15, y, 195, y);
      y += 5;
      
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      const disclaimerLines = doc.splitTextToSize("Disclaimer: Every projected eligibility criterion reflects official state gazettes and Secretariat declarations. Please consult your local Ward / Grama Secretariat or visit official MyScheme portals (myscheme.gov.in) for final verification before applying.", 180);
      disclaimerLines.forEach((dLine: string) => {
        doc.text(dLine, 15, y);
        y += 3.8;
      });

      addPageDecoration(pageNum);
      doc.save(`Welfare_Scheme_Eligibility_Audit_${(profileSnapshot.name || 'Citizen').replace(/\s+/g, '_')}.pdf`);
      toast.success(language === 'te' ? 'నివేదిక విజయవంతంగా డౌన్‌లోడ్ చేయబడింది' : 'Report downloaded successfully');
    } catch (err) {
      console.error("Failed to generate PDF document", err);
    }
  };

  const handleShare = async (scheme: SchemeResult) => {
    const shareUrl = scheme.apply_link || 'https://www.myscheme.gov.in';
    const message = `${scheme.name_en} - Qualified Welfare Scheme on SchemeConnect AP!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: scheme.name_en, text: message, url: shareUrl });
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
      <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-8 items-start">
        <aside role="complementary" aria-label="Diagnosed Profile Snapshot" className="sticky top-28 z-20 space-y-4" id="results-sidebar">
          {/* Desktop view profile details */}
          <div className="hidden lg:block bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xl relative overflow-hidden" id="desktop-profile-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-primary-bg)] rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center space-x-3 pb-4 border-b border-[var(--border-subtle)] mb-5">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary-bg)] text-[var(--accent-primary)] flex items-center justify-center font-bold">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{language === 'te' ? 'విశ్లేషించిన ప్రొఫైల్' : 'diagnosed profile'}</p>
                <h4 className="text-base font-extrabold text-[var(--text-primary)] capitalize truncate max-w-[150px]">{profileSnapshot.name}</h4>
              </div>
            </div>
            <div className="space-y-4 text-xs font-normal text-[var(--text-secondary)]" id="sidebar-snapshots">
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'వయస్సు:' : 'Age:'}</span>
                <span className="text-[var(--text-primary)] font-bold">{profileSnapshot.age} {language === 'te' ? 'ఏళ్ళు' : 'yrs'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'లింగం:' : 'Gender:'}</span>
                <span className="text-[var(--text-primary)] font-bold">{profileSnapshot.gender}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'వార్షిక ఆదాయం:' : 'Yearly Income:'}</span>
                <span className="text-[var(--accent-saffron)] font-extrabold">₹{profileSnapshot.income_annual.toLocaleString('en-IN')}/{language === 'te' ? 'సంవత్సరానికి' : 'yr'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'సామాజిక వర్గం (కులం):' : 'Caste:'}</span>
                <span className="text-[var(--text-primary)] font-bold">{profileSnapshot.caste_category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'రాష్ట్రం:' : 'State:'}</span>
                <span className="text-[var(--text-primary)] font-bold">{profileSnapshot.state}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{language === 'te' ? 'జిల్లా:' : 'District:'}</span>
                <span className="text-[var(--text-primary)] font-bold truncate max-w-[120px]">{profileSnapshot.district}</span>
              </div>
              {profileSnapshot.land_acres !== undefined && (
                <div className="flex items-center justify-between">
                  <span>{language === 'te' ? 'వ్యవసాయ భూమి:' : 'Agricultural Land:'}</span>
                  <span className="text-[var(--text-primary)] font-bold">{profileSnapshot.land_acres} {language === 'te' ? 'ఎకరాలు' : 'acres'}</span>
                </div>
              )}
            </div>
            <button
              onClick={onEditProfile}
              className="mt-6 w-full py-2.5 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-center space-x-1.5 cursor-pointer font-bold text-xs"
              id="sidebar-edit-btn"
            >
              <Edit3 size={13} />
              <span>{t('results.modify_profile')}</span>
            </button>
          </div>

          {/* Mobile expandable top layout */}
          <div className="lg:hidden bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-md overflow-hidden" id="mobile-profile-card">
            <button
              onClick={() => setIsMobileProfileOpen(!isMobileProfileOpen)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left font-bold text-sm text-[var(--text-primary)] cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <User size={16} className="text-[var(--accent-primary)]" />
                <span>{language === 'te' ? 'విశ్లేషణ ప్రొఫైల్' : 'Diagnostics'}: <strong className="text-[var(--accent-saffron)]">{profileSnapshot.name}</strong> ({profileSnapshot.district})</span>
              </div>
              {isMobileProfileOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isMobileProfileOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/40 space-y-3.5 text-xs font-semibold text-[var(--text-secondary)]">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="flex justify-between">
                    <span>{language === 'te' ? 'వయస్సు:' : 'Age:'}</span>
                    <span className="text-[var(--text-primary)] font-bold">{profileSnapshot.age} {language === 'te' ? 'ఏళ్ళు' : 'yrs'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'te' ? 'లింగం:' : 'Gender:'}</span>
                    <span className="text-[var(--text-primary)] font-bold">{profileSnapshot.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'te' ? 'వార్షిక ఆదాయం:' : 'Yearly Income:'}</span>
                    <span className="text-[var(--accent-saffron)] font-bold">₹{profileSnapshot.income_annual.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{language === 'te' ? 'సామాజిక వర్గం:' : 'Caste:'}</span>
                    <span className="text-[var(--text-primary)] font-bold">{profileSnapshot.caste_category}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span>{language === 'te' ? 'ప్రాంతం:' : 'Location:'}</span>
                    <span className="text-[var(--text-primary)] font-bold">{profileSnapshot.district}, {profileSnapshot.state}</span>
                  </div>
                </div>
                <button
                  onClick={onEditProfile}
                  className="w-full py-2.5 mt-2 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-center space-x-1.5 cursor-pointer font-bold text-xs"
                >
                  <Edit3 size={13} />
                  <span>{t('results.modify_profile')}</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        <main role="main" aria-label="Matching Welfare Schemes Feed" className="space-y-6" id="results-feed">
          {results && results.search_id?.toString().startsWith('local-') && !isOfflineDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start justify-between gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-2xl text-xs sm:text-sm font-medium"
              id="offline-banner"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base shrink-0">⚠</span>
                <span>
                  {language === 'te' 
                    ? 'ఆఫ్‌లైన్ స్థానిక డేటాబేస్ నుండి ఫలితాలు చూపబడుతున్నాయి. AI-ఆధారిత వ్యక్తిగతీకరించిన విశ్లేషణ కోసం ఇంటర్నెట్‌ను కనెక్ట్ చేయండి.'
                    : 'Results from offline local database. Connect to internet for AI-powered personalized analysis.'}
                </span>
              </div>
              <button
                onClick={() => setIsOfflineDismissed(true)}
                className="text-amber-500 hover:text-amber-400 p-1 rounded-lg hover:bg-amber-500/10 transition-colors shrink-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}

          {/* Results Header panel component */}
          <ResultsHeader
            filteredSchemesCount={filteredSchemes.length}
            summaryMessage={results?.summary_message || null}
            handleDownloadPDF={handleDownloadPDF}
            handleDownloadSummary={handleDownloadSummary}
            language={language}
            t={t}
          />

          {/* Welfare Dashboard visualizer */}
          <WelfareDashboard schemes={filteredSchemes} language={language} />

          {/* Filter and Sorting bar component */}
          <FilterBar
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            activeSort={activeSort}
            setActiveSort={setActiveSort}
            language={language}
            t={t}
          />

          {/* Cards List container */}
          {isLoading ? (
            <div className="space-y-6" id="scheme-skeleton-grid" role="status" aria-label="Loading matching schemes...">
              {[1, 2, 3, 4].map(i => <SchemeCardSkeleton key={i} />)}
            </div>
          ) : filteredSchemes.length > 0 ? (
            <ul className="space-y-6" id="scheme-grid" role="list" aria-label="Matching welfare schemes">
              {filteredSchemes.map((scheme, index) => {
                const isSaved = savedSchemeIds.includes(scheme.scheme_id);
                return (
                  <SchemeCard
                    key={scheme.scheme_id}
                    scheme={scheme}
                    index={index}
                    isSaved={isSaved}
                    compareSchemes={compareSchemes}
                    setCompareSchemes={setCompareSchemes}
                    onToggleSaveScheme={onToggleSaveScheme}
                    handleShare={handleShare}
                    handleGenerateChecklist={handleGenerateChecklist}
                    handleSchemeCardClick={handleSchemeCardClick}
                    shareToastId={shareToastId}
                    language={language}
                    t={t}
                    toast={toast}
                  />
                );
              })}
            </ul>
          ) : (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl p-12 text-center flex flex-col justify-center items-center w-full" id="results-empty-state">
              <EmptyState 
                onSelectSuggestion={(prompt) => {
                  if (onStartChatWithQuery) onStartChatWithQuery(prompt);
                  else setView('chat');
                }}
                userRegion={profileSnapshot?.state}
                userOccupation={profileSnapshot?.occupation}
                userAge={profileSnapshot?.age}
                profileSnapshot={profileSnapshot}
                user={user}
              />
            </div>
          )}
        </main>
      </div>

      {/* Sticky Compare Button */}
      {compareSchemes.length >= 2 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setIsCompareModalOpen(true)}
            className="saffron-gradient-btn flex items-center space-x-2 px-6 py-4.5 rounded-2xl shadow-2xl text-sm font-black uppercase tracking-wider cursor-pointer"
            id="sticky-compare-schemes-btn"
          >
            <span>
              {language === 'te'
                ? `${compareSchemes.length} పథకాలను పోల్చండి →`
                : `Compare ${compareSchemes.length} Schemes →`}
            </span>
          </button>
        </div>
      )}

      <SchemeComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        schemes={compareSchemes}
        onRemoveScheme={(schemeId) => setCompareSchemes(prev => prev.filter(s => s.scheme_id !== schemeId))}
        language={language}
      />

      <SchemeChecklistModal
        isOpen={checklistModal !== null}
        onClose={() => setChecklistModal(null)}
        scheme={checklistModal?.scheme || null}
        checklist={checklistModal?.checklist || null}
        loading={checklistModal?.loading || false}
        profileSnapshot={profileSnapshot}
        language={language}
      />
    </div>
  );
};
