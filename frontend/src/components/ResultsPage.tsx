import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  User, MapPin, IndianRupee, Share2, Bookmark, ExternalLink, 
  ChevronDown, ChevronUp, Edit3, Award, Sparkles, Files, 
  SlidersHorizontal, CheckCircle, HelpCircle, MessageSquare, X,
  FileText
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { ProfilePayload, SchemeResult, MatchResponse } from '../types';
import { router } from '../utils/router';
import { EmptyState } from './EmptyState';
import { WelfareDashboard } from './WelfareDashboard';
import { SchemeCardSkeleton } from './skeletons/SchemeCardSkeleton';
import { useToast } from './ToastProvider';
import { SchemeComparisonModal } from './SchemeComparisonModal';
import { SchemeChecklistModal } from './SchemeChecklistModal';

interface ResultsPageProps {
  results: MatchResponse | null;
  profileSnapshot: ProfilePayload | null;
  onEditProfile: () => void;
  savedSchemeIds: string[];
  onToggleSaveScheme: (schemeId: string) => void;
  setView: (v: string) => void;
  user: { name: string; email: string } | null;
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
  const [checklistModal, setChecklistModal] = useState<{
    scheme: SchemeResult;
    checklist: string[] | null;
    loading: boolean;
  } | null>(null);

  const handleGenerateChecklist = async (scheme: SchemeResult) => {
    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(`checklist-${scheme.scheme_id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChecklistModal({ scheme, checklist: parsed, loading: false });
          return;
        }
      }
    } catch (e) {
      console.warn('SessionStorage failed to parse:', e);
    }

    setChecklistModal({ scheme, checklist: null, loading: true });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: `Generate a personalized document checklist for ${profileSnapshot?.name || 'a citizen'} to apply for ${scheme.name_en}. 
          Their profile: State=${profileSnapshot?.state}, District=${profileSnapshot?.district}, Occupation=${profileSnapshot?.occupation}, 
          Caste=${profileSnapshot?.caste_category}, Land=${profileSnapshot?.land_acres || 'N/A'} acres, BPL=${profileSnapshot?.bpl_card}.
          The base required documents are: ${scheme.documents_required?.join(', ')}.
          Generate a specific, personalized checklist mentioning their exact district MRO office, their specific situation (e.g., "Since you're a tenant farmer, include your CCRC card"). 
          Format as a JSON array of strings: ["Document 1 — specific note", "Document 2 — specific note"]
          Respond ONLY with the JSON array, no other text.`,
          profile_snapshot: profileSnapshot,
          streaming: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported on this response');
      }

      let accumulatedText = '';
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6).trim();
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.token) {
                accumulatedText += parsed.token;
              }
            } catch (err) {
              console.warn('Failed to parse SSE partial line:', jsonStr, err);
            }
          }
        }
      }

      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.token) {
              accumulatedText += parsed.token;
            }
          } catch (err) {
            console.warn('Failed to parse remaining buffer line:', jsonStr, err);
          }
        }
      }

      const clean = accumulatedText.replace(/```json|```/g, '').trim();
      const checklist = JSON.parse(clean);
      
      if (Array.isArray(checklist) && checklist.length > 0) {
        try {
          sessionStorage.setItem(`checklist-${scheme.scheme_id}`, JSON.stringify(checklist));
        } catch (e) {
          console.warn('SessionStorage save failed:', e);
        }
        setChecklistModal(prev => prev ? { ...prev, checklist, loading: false } : null);
      } else {
        throw new Error('Invalid JSON format');
      }
    } catch (e) {
      console.error('AI checklist generation failed, falling back to static list:', e);
      // Fallback to static list
      const staticChecklist = scheme.documents_required || [];
      try {
        sessionStorage.setItem(`checklist-${scheme.scheme_id}`, JSON.stringify(staticChecklist));
      } catch (err) {
        // Safe check
      }
      setChecklistModal(prev => prev ? { 
        ...prev, 
        checklist: staticChecklist, 
        loading: false 
      } : null);
    }
  };

  React.useEffect(() => {
    if (!user) {
      setView('auth');
    }
  }, [user, setView]);

  if (!user) {
    return null;
  }

  const handleSchemeCardClick = (scheme: SchemeResult) => {
    if (!scheme || typeof scheme !== 'object' || 'preventDefault' in scheme || 'target' in scheme) {
      console.warn('[SchemeCard] Invalid scheme object passed to click handler:', scheme);
      return;
    }

    const safePayload = {
      trigger: "scheme_card_click" as const,
      scheme_name: scheme.name_en ? String(language === 'te' ? (scheme.name_te || scheme.name_en) : scheme.name_en) : '',
      citation_id: scheme.scheme_id ? String(scheme.scheme_id) : '',
      department: scheme.department ? String(scheme.department) : '',
      category: scheme.category ? String(scheme.category) : '',
      state: scheme.source ? String(scheme.source) : '',
      benefit_amount: String(scheme.benefit_amount || (language === 'te' ? "ఆర్థిక సహాయం / సబ్సిడీ" : "Financial Benefit / Subsidy")),
      eligibility_match: typeof scheme.similarity_score === 'number' ? Number(Math.floor(scheme.similarity_score * 100)) : 0,
      match_certainty: String((scheme.similarity_score || 0) > 0.85 
        ? (language === 'te' ? "అధికం (ధృవీకరించబడింది)" : "HIGH (Verified)") 
        : (language === 'te' ? "సరైన నివేదిక" : "OPTIMAL")),
      reasoning_chain: Array.isArray(scheme.eligibility_reasons)
        ? scheme.eligibility_reasons.filter(item => typeof item === 'string' || typeof item === 'number').map(String)
        : [],
      documents_needed: Array.isArray(scheme.documents_required)
        ? scheme.documents_required.filter(item => typeof item === 'string' || typeof item === 'number').map(String)
        : [],
      apply_url: scheme.apply_link ? String(scheme.apply_link) : "https://www.myscheme.gov.in"
    };

    const navigate = (path: string, options?: { state?: any }) => {
      router.push(path, options);
    };

    try {
      console.log('[SchemeCard] Safe payload successfully sanitized and validated:', safePayload);
      
      navigate('/chat', {
        state: { schemeHandoff: safePayload }
      });
      setView('chat');
    } catch (err) {
      console.error('[SchemeCard] Failed to handle navigation for safe payload:', err);
    }
  };

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

  const schemeList = results?.schemes || [];

  const filteredSchemes = useMemo(() => {
    let list = [...schemeList];

    if (activeFilter === 'central') {
      list = list.filter(s => s.source.toLowerCase() === 'central');
    } else if (activeFilter === 'ap') {
      list = list.filter(s => s.source.toLowerCase() === 'ap state');
    } else if (activeFilter === 'tg') {
      list = list.filter(s => s.source.toLowerCase() === 'telangana state');
    }

    if (activeSort === 'relevance') {
      list.sort((a, b) => b.similarity_score - a.similarity_score);
    } else if (activeSort === 'category') {
      list.sort((a, b) => a.category.localeCompare(b.category));
    } else if (activeSort === 'source') {
      list.sort((a, b) => a.source.localeCompare(b.source));
    }

    return list;
  }, [schemeList, activeFilter, activeSort]);

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
      // Initialize document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Page decoration helper
      const addPageDecoration = (pageNumNum: number) => {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(`Page ${pageNumNum}`, 210 / 2, 287, { align: 'center' });
        doc.text("SchemeConnect AP • Verified Welfare Scheme Eligibility Report", 15, 287);
        
        if (pageNumNum > 1) {
          doc.setDrawColor(226, 232, 240); // Slate-200
          doc.setLineWidth(0.3);
          doc.line(15, 12, 195, 12);
          doc.text("Welfare Schemes Diagnostic Report", 15, 10);
        }
      };

      // Color constants
      const brandyColor = [228, 122, 34]; // Saffron rgb: (228, 122, 34)
      const primaryColor = [59, 130, 246]; // Blue rgb: (59, 130, 246)
      const darkText = [15, 23, 42]; // Slate-900 rgb
      const secondaryText = [71, 85, 105]; // Slate-600 rgb
      const mutedText = [148, 163, 184]; // Slate-400 rgb
      const lightBg = [248, 250, 252]; // Slate-50 rgb
      const successColor = [22, 163, 74]; // Green rgb: (22, 163, 74)

      let y = 15; // Vertical cursor
      let pageNum = 1;

      // Helper to start a new page
      const performPageBreak = () => {
        addPageDecoration(pageNum);
        doc.addPage();
        pageNum++;
        y = 20;
      };

      // Helper to check if a block of height will fit
      const ensureSpace = (spaceNeeded: number) => {
        if (y + spaceNeeded > 265) {
          performPageBreak();
        }
      };

      // --- PAGE 1: HEADER & PROFILE SNAPSHOT ---
      
      // Top color accent bar
      doc.setFillColor(brandyColor[0], brandyColor[1], brandyColor[2]);
      doc.rect(15, y, 180, 4, 'F');
      y += 10;

      // App Brand & Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text("SchemeConnect AP", 15, y);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      doc.text("Personalized Welfare Scheme Matching Diagnostic Report", 15, y + 5.5);
      
      // Date badge
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.setFontSize(8);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(`Generated: ${dateStr}`, 195, y, { align: 'right' });
      y += 12;

      // Divider line
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 8;

      // Profile snapshot panel title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(brandyColor[0], brandyColor[1], brandyColor[2]);
      doc.text("CITIZEN PROFILE SCHEMATIC", 15, y);
      y += 5;

      // Build background box for the profile details
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 42, 3, 3, 'FD');

      // Fill profile fields
      doc.setFontSize(9);
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      
      const col1X = 20;
      const col2X = 110;
      
      // Row 1
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

      // Row 2
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

      // Row 3
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

      // Row 4
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

      // Found summary banner
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(`ELIGIBLE SCHEMES LISTING (${filteredSchemes.length} matched)`, 15, y);
      y += 6;

      // Scan message
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

      // --- SCHEME MATCH DETAILS LIST ---
      filteredSchemes.forEach((sch, index) => {
        const reasoningPoints = Array.isArray(sch.eligibility_reasons) ? sch.eligibility_reasons : [];
        const requiredDocs = Array.isArray(sch.documents_required) ? sch.documents_required : [];
        
        const numReasoningPoints = reasoningPoints.length;
        const cardHeightEst = 48 + (numReasoningPoints * 5.2) + Math.max(1, Math.ceil(requiredDocs.length / 3)) * 6.5;

        ensureSpace(cardHeightEst);

        // Start rendering scheme card
        const cardStartY = y;
        
        // Card Frame box with round border
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240); // Slate-200 border
        doc.setLineWidth(0.4);
        doc.roundedRect(15, y, 180, cardHeightEst - 4, 2, 2, 'FD');
        
        // Card header tag
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(15, y, 180, 8, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(15, y + 8, 195, y + 8);

        // Badge content in header
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(brandyColor[0], brandyColor[1], brandyColor[2]);
        doc.text(`${(sch.source || 'State').toUpperCase()} GOVERNMENT SCHEME`, 20, y + 5.5);
        
        // Benefit amount in header
        if (sch.benefit_amount) {
          doc.setTextColor(successColor[0], successColor[1], successColor[2]);
          doc.text(`BENEFIT: ₹${sch.benefit_amount}/Yr`, 190, y + 5.5, { align: 'right' });
        } else {
          doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
          doc.text(`BENEFIT: ECONOMIC AID / SUBSIDY`, 190, y + 5.5, { align: 'right' });
        }

        y += 14;

        // Card Title: Scheme Name
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        
        // Always use English name to avoid box render crashes in standard PDF viewers
        const wrapNameStr = sch.name_en || 'Welfare Scheme';
        const wrappedName = doc.splitTextToSize(wrapNameStr, 170);
        wrappedName.forEach((nLine: string) => {
          doc.text(nLine, 20, y);
          y += 5;
        });
        y += 1;

        // Department & Ministry subtext
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
        doc.text(`Department: ${sch.department || 'N/A'}  |  Ministry: ${sch.ministry || 'N/A'}`, 20, y);
        y += 6.5;

        // horizontal parameters block
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

        // Reasoning list title
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
        doc.text("Reasoning checklist & compliance reasons:", 20, y);
        y += 4.5;

        // Print reasons checklist
        reasoningPoints.forEach((reason) => {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(darkText[0], darkText[1], darkText[2]);
          doc.text("-", 22, y + 0.2); // safe bullet character
          
          doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
          const wrappedReasonLine = doc.splitTextToSize(reason, 158);
          wrappedReasonLine.forEach((reLine: string, idx: number) => {
            doc.text(reLine, 29, y);
            if (idx < wrappedReasonLine.length - 1) {
              y += 4.2;
            }
          });
          y += 4.8;
        });

        y += 1;

        // Documents REQUIRED Title and badge elements listing
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
        doc.text("Secretariat Verification Documents:", 20, y);
        y += 4.5;

        // Documents chips
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
          
          doc.setFillColor(241, 245, 249); // slate-100 Chip Background
          doc.roundedRect(chipX, y - 3, textW - 2, 4.5, 0.8, 0.8, 'F');
          doc.text(docName, chipX + 2, y);
          chipX += textW;
        });
        
        y = cardStartY + cardHeightEst + 5;
      });

      // Disclaimer block at end
      const disclaimerHeight = 15;
      ensureSpace(disclaimerHeight);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(15, y, 195, y);
      y += 5;
      
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
      const disclaimerLines = doc.splitTextToSize(
        "Disclaimer: Every projected eligibility criterion reflects official state gazettes and Secretariat declarations. Please consult your local Ward / Grama Secretariat or visit official MyScheme portals (myscheme.gov.in) for final verification before applying.",
        180
      );
      disclaimerLines.forEach((dLine: string) => {
        doc.text(dLine, 15, y);
        y += 3.8;
      });

      // Add final page decorations
      addPageDecoration(pageNum);

      // Save document
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
          className="saffron-gradient-btn px-6 py-2.5 rounded-full font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
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
        <aside 
          role="complementary" 
          aria-label="Diagnosed Profile Snapshot" 
          className="sticky top-28 z-20 space-y-4" 
          id="results-sidebar"
        >
          {/* Desktop view profile details */}
          <div className="hidden lg:block bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-xl relative overflow-hidden" id="desktop-profile-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-primary-bg)] rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center space-x-3 pb-4 border-b border-[var(--border-subtle)] mb-5">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary-bg)] text-[var(--accent-primary)] flex items-center justify-center font-bold">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{language === 'te' ? 'విశ్లేషించిన ప్రొఫైల్' : 'diagnosed profile'}</p>
                <h4 className="text-base font-extrabold text-[var(--text-primary)] capitalize truncate max-w-[150px]">
                  {profileSnapshot.name}
                </h4>
              </div>
            </div>

            {/* Profile properties */}
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
                <span className="text-[var(--accent-saffron)] font-extrabold">
                  ₹{profileSnapshot.income_annual.toLocaleString('en-IN')}/{language === 'te' ? 'సంవత్సరానికి' : 'yr'}
                </span>
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
              className="mt-6 w-full py-2.5 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-center space-x-1.5 cursor-pointer font-bold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
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
              className="w-full px-5 py-3.5 flex items-center justify-between text-left font-bold text-sm text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
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
                  className="w-full py-2.5 mt-2 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-center space-x-1.5 cursor-pointer font-bold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
                >
                  <Edit3 size={13} />
                  <span>{t('results.modify_profile')}</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Main Scheme recommendation cards feed */}
        <main 
          role="main" 
          aria-label="Matching Welfare Schemes Feed" 
          className="space-y-6" 
          id="results-feed"
        >
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
                aria-label="Dismiss offline notification"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}

          {/* Section banner matching statement info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--bg-surface)]/60 border border-[var(--border-subtle)] p-5 rounded-3xl backdrop-blur-md relative overflow-hidden" id="results-banner">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)] flex items-center">
                <Award className="text-accent-gold mr-2" size={20} />
                <span>
                  {t('results.found', { count: filteredSchemes.length })}
                </span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
                {results?.summary_message || t('results.scanning')}
              </p>
            </div>
 
            {/* In-Memory Filter Options with Touch Target Sizes */}
            <div className="flex items-center space-x-2" id="filter-wrapper">
              <SlidersHorizontal size={14} className="text-[var(--text-muted)]" />
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter Schemes Navigation">
                {(['all', 'central', 'ap', 'tg'] as const).map((fil) => (
                  <button
                    key={fil}
                    onClick={() => setActiveFilter(fil)}
                    className={`py-2.5 px-4 min-h-[44px] text-[11px] font-bold rounded-full border transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ${
                      activeFilter === fil
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-sm'
                        : 'bg-[var(--bg-surface)]/20 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]'
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

          {/* Welfare Dashboard visualizer */}
          <WelfareDashboard schemes={filteredSchemes} language={language} />
 
          {/* Controls Deck with Sorting and Download Summaries with Touch-Friendly Targets */}
          <div className="flex items-center justify-between flex-wrap gap-3" id="controls-panel" role="toolbar" aria-label="List Control Deck">
            <div className="flex items-center space-x-3 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)]/30 p-2.5 rounded-xl border border-[var(--border-subtle)] w-fit" id="sort-bar">
              <span>{language === 'te' ? 'క్రమపద్ధతి నిబంధన:' : 'Sort By:'}</span>
              <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg" role="radiogroup" aria-label="Scheme sorting selection">
                {(['relevance', 'category', 'source'] as const).map((srt) => (
                   <button
                     key={srt}
                     role="radio"
                     aria-checked={activeSort === srt}
                     onClick={() => setActiveSort(srt)}
                     className={`px-4 py-3 min-h-[44px] rounded text-[11px] leading-tight uppercase font-extrabold cursor-pointer transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ${
                       activeSort === srt
                         ? 'bg-[var(--bg-surface)] text-[var(--accent-saffron)] border border-[var(--border-subtle)] font-bold shadow-xs'
                         : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                     }`}
                   >
                     {t(`results.sort.${srt}`)}
                   </button>
                 ))}
               </div>
             </div>
 
             <div className="flex items-center gap-2 flex-wrap" id="export-buttons-group">
               <button
                 onClick={handleDownloadPDF}
                 className="px-4.5 py-3 min-h-[44px] bg-[var(--accent-saffron)] hover:brightness-110 text-white border border-[var(--border-subtle)] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
                 title="Export personalized eligibility matching results as an official PDF report"
                 id="results-export-pdf-btn"
               >
                 <Files size={14} />
                 <span>{language === 'te' ? 'పీడీఎఫ్ నివేదికను డౌన్‌లోడ్ చేయండి' : 'Export as PDF'}</span>
               </button>

               <button
                 onClick={handleDownloadSummary}
                 className="px-4.5 py-3 min-h-[44px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
                 title="Download summary report as a raw text document"
                 id="results-download-report-btn"
               >
                 <Award size={14} />
                 <span>{language === 'te' ? 'టెక్స్ట్ డైలాగ్' : 'Download Text'}</span>
               </button>
             </div>
          </div>

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
                  <li
                    key={scheme.scheme_id}
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
                        {(() => {
                          const badge = getConfidenceBadge(scheme.similarity_score);
                          return (
                            <span className={`inline-flex items-center shrink-0 self-start sm:self-center px-2.5 py-1 text-[11px] leading-tight font-black rounded-full border tracking-wide uppercase ${badge.className}`}>
                              {badge.text}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">
                        {language === 'te' ? `శాఖ: ${scheme.department} • కేంద్ర మంత్రిత్వ శాఖ: ${scheme.ministry}` : `Department of ${scheme.department} • Central Ministry of ${scheme.ministry}`}
                      </p>
                    </div>
 
                    {/* Visual Confidence Score Indicator Row */}
                    {(() => {
                      const scorePct = Math.round(scheme.similarity_score * 100);
                      
                      // Dynamic color-coding based on the match percentage scale
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
                      );
                    })()}
 
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
                          <FileText size={13} />
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
              })}
            </ul>
          ) : (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl p-12 text-center flex flex-col justify-center items-center w-full" id="results-empty-state">
              <EmptyState 
                onSelectSuggestion={(prompt) => {
                  if (onStartChatWithQuery) {
                    onStartChatWithQuery(prompt);
                  } else {
                    setView('chat');
                  }
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
            className="saffron-gradient-btn flex items-center space-x-2 px-6 py-4.5 rounded-2xl shadow-2xl text-sm font-black uppercase tracking-wider cursor-pointer hover:brightness-110 active:scale-95 transition-all text-white border border-accent-saffron/30 animate-pulse-subtle"
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

      {/* Scheme Comparison Modal */}
      <SchemeComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        schemes={compareSchemes}
        onRemoveScheme={(schemeId) => {
          setCompareSchemes(prev => prev.filter(s => s.scheme_id !== schemeId));
        }}
        language={language}
      />

      {/* Personalized AI Checklist Modal */}
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
