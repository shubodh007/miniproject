import React, { useState, useEffect } from 'react';
import { X, Copy, Download, Share2, Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { SchemeResult, ProfilePayload } from '../types';
import { useToast } from './ToastProvider';

interface SchemeChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheme: SchemeResult | null;
  checklist: string[] | null;
  loading: boolean;
  profileSnapshot: ProfilePayload | null;
  language: 'en' | 'te' | 'hi';
}

export const SchemeChecklistModal: React.FC<SchemeChecklistModalProps> = ({
  isOpen,
  onClose,
  scheme,
  checklist,
  loading,
  profileSnapshot,
  language
}) => {
  const { toast } = useToast();
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Reset checkboxes when modal opens or scheme changes
  useEffect(() => {
    if (isOpen) {
      setCheckedItems({});
    }
  }, [isOpen, scheme]);

  // Handle keyboard dismiss with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !scheme) return null;

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getChecklistString = () => {
    const items = checklist || scheme.documents_required || [];
    let text = `📋 ${language === 'te' ? 'వ్యక్తిగతీకరించిన పత్రాల చెక్‌లిస్ట్' : 'Personalized Document Checklist'}\n\n`;
    text += `${language === 'te' ? 'పథకం' : 'Scheme'}: ${language === 'te' ? scheme.name_te : scheme.name_en}\n`;
    text += `${language === 'te' ? 'లబ్ధిదారుడు' : 'Beneficiary'}: ${profileSnapshot?.name || (language === 'te' ? 'పౌరుడు' : 'Citizen')}\n`;
    text += `${"-".repeat(40)}\n\n`;
    
    items.forEach((item, idx) => {
      const isChecked = !!checkedItems[idx];
      text += `${isChecked ? '[✓]' : '[ ]'} ${item}\n`;
    });
    
    text += `\n📱 Generated via SchemeConnect AP — Smart Welfare Portal`;
    return text;
  };

  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getChecklistString());
      toast.success(language === 'te' ? 'చెక్‌లిస్ట్ క్లిప్‌బోర్డ్‌కు కాపీ చేయబడింది!' : 'Checklist copied to clipboard!');
    } catch (err) {
      toast.error(language === 'te' ? 'కాపీ చేయడం విఫలమైంది' : 'Failed to copy checklist');
    }
  };

  const handleShareWhatsApp = () => {
    const textMsg = encodeURIComponent(getChecklistString());
    window.open(`https://api.whatsapp.com/send?text=${textMsg}`, '_blank', 'noreferrer,noopener');
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors matching corporate theme style
      const saffronColor = [228, 122, 34];
      const navyColor = [15, 23, 42];
      const grayText = [71, 85, 105];

      // Accent top bar
      doc.setFillColor(228, 122, 34);
      doc.rect(0, 0, 210, 4, 'F');

      let y = 15;

      // Header Brand
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text("SCHEMECONNECT AP", 15, y);
      
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text("Smart Welfare & Eligibility Diagnostics Portal", 15, y + 5);

      y += 18;

      // Card border for document title
      doc.setFillColor(248, 250, 252); // soft slate bg
      doc.rect(15, y, 180, 25, 'F');
      
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, y, 180, 25, 'D');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(228, 122, 34);
      doc.text(language === 'te' ? "వ్యక్తిగతీకరించిన పత్రాల వివరాలు" : "PERSONALIZED APPLICATION CHECKLIST", 20, y + 8);
      
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${language === 'te' ? scheme.name_te : scheme.name_en}`, 20, y + 16);

      y += 35;

      // Profile details sub-box
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(language === 'te' ? "లబ్ధిదారుడి ప్రొఫైల్ వివరాలు:" : "Beneficiary Profile Summary:", 15, y);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const citizensName = profileSnapshot?.name || (language === 'te' ? 'పౌరుడు' : 'Citizen');
      const stateDist = `${profileSnapshot?.district || 'N/A'}, ${profileSnapshot?.state || 'AP'}`;
      doc.text(`* Name: ${citizensName} | Location: ${stateDist}`, 15, y + 5);
      doc.text(`* Caste Category: ${profileSnapshot?.caste_category || 'N/A'} | Land: ${profileSnapshot?.land_acres || '0'} acres | BPL: ${profileSnapshot?.bpl_card || 'No'}`, 15, y + 10);

      y += 20;

      // Checklist Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(15, y, 195, y);

      y += 10;

      // Document list title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(language === 'te' ? "సమర్పించాల్సిన పత్రాలు (సూచించినవి):" : "Documents Checklist (Personalized AI Diagnostics):", 15, y);

      y += 8;

      const items = checklist || scheme.documents_required || [];
      items.forEach((item, idx) => {
        // Prevent listing overflows page bounds
        if (y > 270) {
          doc.addPage();
          y = 20;
          doc.setFillColor(228, 122, 34);
          doc.rect(0, 0, 210, 4, 'F');
        }

        const isChecked = !!checkedItems[idx];
        
        // Draw checkbox square
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.5);
        doc.rect(16, y - 3.5, 4, 4, 'D');
        
        if (isChecked) {
          doc.setFillColor(22, 163, 74); // green tick
          doc.rect(17, y - 2.5, 2, 2, 'F');
        }

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        
        // Wrap text to avoid overflowing paper horizontal bounds
        const splitText = doc.splitTextToSize(item, 160);
        doc.text(splitText, 25, y);

        y += (splitText.length * 5) + 3;
      });

      y += 10;
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Disclaimer: Please carry originals and copy certifications to your local Ward Secretariat (Sachivalayam) or MRO Center.", 15, y);

      // Save PDF
      const pdfName = `Checklist_${scheme.name_en.replace(/\s+/g, '_')}.pdf`;
      doc.save(pdfName);
      toast.success(language === 'te' ? 'పిడిఎఫ్ విజయవంతంగా డౌన్‌లోడ్ చేయబడింది!' : 'PDF downloaded successfully!');
    } catch (err) {
      toast.error(language === 'te' ? 'పిడిఎఫ్ డౌన్‌లోడ్ విఫలమైంది' : 'Failed to download PDF');
      console.error(err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm"
      id="checklist-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        id="checklist-modal-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Dynamic header accent gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent-primary via-accent-saffron to-emerald-500" />

        {/* Modal Top Navigation */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] mt-1.5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-accent-primary/10 text-accent-primary rounded-2xl">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--text-primary)] leading-tight">
                {language === 'te' ? 'మీ వ్యక్తిగతీకరించిన పత్రాల వివరాలు' : 'Your Document Checklist'}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">
                {language === 'te' 
                  ? `${scheme.name_te} కోసం దరఖాస్తు చేసుకోడానికి కావలసినవి` 
                  : `Tailored guidelines to apply for ${scheme.name_en}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
            id="checklist-modal-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-6" id="checklist-modal-body-content">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-5" id="checklist-loading-state">
              <Loader2 className="animate-spin text-accent-primary" size={36} />
              <div className="text-center space-y-1.5 max-w-sm">
                <h4 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">
                  {language === 'te' ? 'చెక్‌లిస్ట్ రూపొందించబడుతోంది...' : 'Generating checklist...'}
                </h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {language === 'te'
                    ? 'మీ ప్రొఫైల్ వివరాలు, కులం, ఊరు మరియు వ్యవసాయ భూమి వివరాలను మా AI విశ్లేషిస్తోంది.'
                    : 'Our AI is analyzing your income, crop patterns, land deeds, and local MRO office guidelines.'}
                </p>
              </div>

              {/* Skeleton UI */}
              <div className="w-full space-y-3 mt-4 animate-pulse">
                {[1, 2, 3].map(n => (
                  <div key={n} className="flex items-center space-x-3 bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-subtle)]">
                    <div className="w-4 h-4 bg-[var(--border-default)] rounded" />
                    <div className="space-y-2 flex-1">
                      <div className="h-2.5 bg-[var(--border-default)] rounded w-3/4" />
                      <div className="h-2 bg-[var(--border-subtle)] rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4" id="checklist-ready-state">
              {/* Profile Snapshot Banner Badge */}
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col space-y-1.5">
                <div className="flex items-center space-x-2 text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                  <span>{language === 'te' ? 'AI వ్యక్తిగతీకరణ విశ్లేషణ' : 'AI personalization diagnostic'}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {language === 'te' 
                    ? `లబ్ధిదారుడు కులం: ${profileSnapshot?.caste_category || 'N/A'}, నివాసం: ${profileSnapshot?.district || 'AP'}, భూమి: ${profileSnapshot?.land_acres || '0'} ఎకరాల సమాచారం ఆధారంగా పత్రాలు రూపొందించబడ్డాయి.`
                    : `Evaluated for profile: Category=${profileSnapshot?.caste_category || 'General'}, Location=${profileSnapshot?.district || 'Andhra Pradesh'}, Land=${profileSnapshot?.land_acres || 'N/A'} acres.`}
                </p>
              </div>

              {/* Instructions checklist wrapper */}
              <div className="border border-[var(--border-subtle)] rounded-2xl overflow-hidden divide-y divide-[var(--border-subtle)]">
                {(checklist || scheme.documents_required || []).map((item, idx) => {
                  const isChecked = !!checkedItems[idx];
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleCheck(idx)}
                      className={`flex items-start space-x-3.5 p-4 cursor-pointer transition-all hover:bg-[var(--bg-base)]/35 select-none ${
                        isChecked ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <button 
                        type="button"
                        className={`mt-0.5 shrink-0 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-[var(--border-default)] hover:border-[var(--text-muted)] bg-[var(--bg-surface)]'
                        }`}
                        id={`chk-${scheme.scheme_id}-${idx}`}
                      >
                        {isChecked && <CheckCircle2 size={12} className="stroke-[3]" />}
                      </button>
                      <span className={`text-xs leading-relaxed font-semibold transition-all ${
                        isChecked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                      }`}>
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Checklist verification tips */}
              <div className="flex gap-2.5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium leading-relaxed">
                  {language === 'te'
                    ? 'దయచేసి అర్హత పత్రాల ఒరిజినల్ ప్రతులను తీసుకెళ్లండి మరియు గ్రామ సచివాలయంలో ధృవీకరించుకోండి.'
                    : 'Personalized checklists are recommendation guidelines. Please present original credentials directly at your local Grama Sachivalayam.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal footer control bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)]">
          {!loading && checklist ? (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopyClipboard}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-full border border-[var(--border-default)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer text-xs font-bold transition-all"
                title={language === 'te' ? 'కాపీ చేయండి' : 'Copy checklist raw text'}
                id="btn-copy-checklist"
              >
                <Copy size={13} />
                <span>{language === 'te' ? 'కాపీ' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs font-bold transition-all"
                title={language === 'te' ? 'వాట్సాప్ ద్వారా షేర్ చేయండి' : 'Share via WhatsApp'}
                id="btn-share-whatsapp"
              >
                <Share2 size={13} />
                <span>{language === 'te' ? 'వాట్సాప్ షేర్' : 'WhatsApp'}</span>
              </button>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            {!loading && (
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer text-xs font-bold transition-all"
                id="btn-pdf-checklist"
              >
                <Download size={13} />
                <span>{language === 'te' ? 'పిడిఎఫ్ డౌన్‌లోడ్' : 'Download PDF'}</span>
              </button>
            )}

            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-[var(--border-default)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer text-xs font-bold transition-all"
              id="checklist-modal-footer-close"
            >
              {language === 'te' ? 'మూసివేయి' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
