import React, { useEffect, useMemo } from 'react';
import { X, ExternalLink, ShieldCheck, Award, AlertCircle } from 'lucide-react';
import { SchemeResult } from '../types';

interface SchemeComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  schemes: SchemeResult[];
  onRemoveScheme: (schemeId: string) => void;
  language: 'en' | 'te' | 'hi';
}

export const SchemeComparisonModal: React.FC<SchemeComparisonModalProps> = ({
  isOpen,
  onClose,
  schemes,
  onRemoveScheme,
  language
}) => {
  // Escape key handler to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Prevent scroll propagation
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Helper parser for benefit text to facilitate numeric comparison
  const parseBenefitValue = (benefitStr?: string): number => {
    if (!benefitStr) return 0;
    // Replace commas and extract the first contiguous sequence of numbers
    const cleaned = benefitStr.replace(/,/g, '');
    const match = cleaned.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Determine winners
  const comparisonWinners = useMemo(() => {
    if (schemes.length === 0) return { benefitIndex: -1, scoreIndex: -1 };

    let maxBenefitValue = -1;
    let benefitIndex = -1;
    let maxScore = -1;
    let scoreIndex = -1;

    schemes.forEach((scheme, idx) => {
      // Parse benefit amount
      const val = parseBenefitValue(scheme.benefit_amount);
      if (val > maxBenefitValue) {
        maxBenefitValue = val;
        benefitIndex = idx;
      }

      // Check similarity score
      if (scheme.similarity_score > maxScore) {
        maxScore = scheme.similarity_score;
        scoreIndex = idx;
      }
    });

    // If all benefit amounts parsed are zero or identical, don't show specific highlights unless there's an actual winner
    const allBenefitsIdentical = schemes.every(
      s => parseBenefitValue(s.benefit_amount) === parseBenefitValue(schemes[0].benefit_amount)
    );
    if (allBenefitsIdentical) {
      benefitIndex = -1;
    }

    const allScoresIdentical = schemes.every(s => s.similarity_score === schemes[0].similarity_score);
    if (allScoresIdentical) {
      scoreIndex = -1;
    }

    return { benefitIndex, scoreIndex };
  }, [schemes]);

  if (!isOpen) return null;

  // Custom helper to translate scheme category names if needed
  const getCategoryTranslation = (cat: string) => {
    if (language !== 'te') return cat;
    switch (cat) {
      case 'Agriculture': return 'వ్యవసాయం';
      case 'Health': return 'ఆరోగ్యం';
      case 'Housing': return 'గృహ నిర్మాణం';
      case 'Education': return 'విద్య';
      case 'Women & Child':
      case 'Women & Child Development':
        return 'మహిళా & శిశు సంక్షేమం';
      case 'Social Security': return 'సామాజిక భద్రత';
      case 'Employment': return 'ఉపాధి సేవలు';
      default: return cat;
    }
  };

  // Helper to extract a concise agricultural land description
  const getLandRequirement = (scheme: SchemeResult) => {
    const reasons = scheme.eligibility_reasons || [];
    const keywords = ['acre', 'land', 'భూమి', 'ఎకరా', 'రైతు'];
    const landReason = reasons.find(r => 
      keywords.some(keyword => r.toLowerCase().includes(keyword))
    );

    if (landReason) {
      // Return a trimmed/clean string or translation
      return landReason.length > 35 ? landReason.substring(0, 32) + '...' : landReason;
    }
    
    // Default fallback descriptions
    return language === 'te' ? 'ప్రత్యేక నిబంధన లేదు' : 'No specific land criteria';
  };

  // Generate visual match dots for eligibility e.g. ●●●●○ 87%
  const renderMatchDots = (score: number) => {
    const stars = Math.round(score * 5);
    const dotsArray = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= stars) {
        dotsArray.push('●');
      } else {
        dotsArray.push('○');
      }
    }
    return (
      <span className="font-mono tracking-wider font-extrabold text-accent-saffron mr-2">
        {dotsArray.join('')}
      </span>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm"
      id="scheme-compare-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        id="scheme-compare-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent-blue via-accent-saffron to-emerald-500" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] mt-1.5">
          <div>
            <h3 className="text-lg font-black text-[var(--text-primary)] leading-snug">
              {language === 'te' ? 'రూపకల్పన పోలిక పట్టిక' : 'Welfare Scheme Comparison Matrix'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
              {language === 'te' 
                ? 'వ్యక్తిగత ప్రయోజనాలు మరియు అర్హత పరామితుల పక్కపక్క పోలిక.'
                : 'Bilingual side-by-side analysis of key eligibility terms and financial aids.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
            id="compare-modal-close-btn"
            aria-label="Close Comparison modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Main Core Content Area */}
        <div className="flex-1 overflow-y-auto p-6" id="compare-modal-table-container">
          {schemes.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center" id="compare-modal-insufficient-data">
              <AlertCircle className="text-accent-saffron mb-4" size={48} />
              <h4 className="text-base font-bold text-[var(--text-primary)]">
                {language === 'te' ? 'పోల్చడానికి కనీసం 2 పథకాలు కావలెను' : 'Add at least 2 schemes to compare'}
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-sm">
                {language === 'te' 
                  ? 'కార్డుల పైభాగంలో ఉన్న "+ Compare" బటన్‌ను క్లిక్ చేసి మరిన్ని పథకాలను జోడించండి.'
                  : 'Click on the "+ Compare" button on scheme cards to build an eligibility side-by-side view.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] shadow-sm">
              <table className="w-full text-left border-collapse min-w-[650px] table-fixed">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                    <th className="w-1/4 p-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">
                      {language === 'te' ? 'పథకం అంశాలు' : 'Feature Checklist'}
                    </th>
                    {schemes.map((scheme, idx) => (
                      <th 
                        key={scheme.scheme_id} 
                        className="w-1/4 p-4 border-l border-[var(--border-subtle)] relative group"
                      >
                        <div className="flex flex-col justify-between h-full space-y-4">
                          <button
                            onClick={() => onRemoveScheme(scheme.scheme_id)}
                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-rose-500/10 border border-[var(--border-default)] text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer self-end"
                            title={language === 'te' ? 'తొలగించు' : 'Remove from comparison'}
                            id={`remove-scheme-${scheme.scheme_id}`}
                          >
                            <X size={12} />
                          </button>
                          
                          <div className="pt-2">
                            <span className="inline-block px-2 py-0.5 text-[9px] font-extrabold bg-[var(--accent-primary-bg)] text-[var(--accent-primary)] rounded border border-[var(--border-subtle)] uppercase tracking-wider mb-2">
                              {scheme.source}
                            </span>
                            <h4 className="text-xs font-black text-[var(--text-primary)] leading-snug line-clamp-2">
                              {language === 'te' ? scheme.name_te : scheme.name_en}
                            </h4>
                            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                              ID: G.O.{scheme.scheme_id.slice(-4).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </th>
                    ))}
                    {/* Empty placeholder column if < 3 schemes to maintain layout grid widths */}
                    {schemes.length < 3 && Array.from({ length: 3 - schemes.length }).map((_, i) => (
                      <th key={`empty-h-${i}`} className="w-1/4 p-4 border-l border-[var(--border-subtle)] bg-slate-500/5 select-none">
                        <div className="flex flex-col items-center justify-center py-6 text-[var(--text-muted)] font-bold text-xs border-2 border-dashed border-[var(--border-subtle)] rounded-xl">
                          {language === 'te' ? '+ పథకాన్ని చేర్చండి' : '+ Add Scheme'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {/* Row 1: Benefit Amount */}
                  <tr className="hover:bg-[var(--bg-base)]/40 transition-colors">
                    <td className="p-4 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)]">
                      <div>
                        <span className="block font-extrabold text-[var(--text-primary)]">
                          {language === 'te' ? 'ఆర్థిక సహాయం' : 'Benefit Amount'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {language === 'te' ? 'నిధుల బదిలీ / సబ్సిడీ' : 'Direct benefit transfer value'}
                        </span>
                      </div>
                    </td>
                    {schemes.map((scheme, idx) => {
                      const isWinner = idx === comparisonWinners.benefitIndex;
                      return (
                        <td 
                          key={scheme.scheme_id} 
                          className={`p-4 text-xs border-l border-[var(--border-subtle)] transition-colors ${
                            isWinner ? 'bg-emerald-500/10 text-emerald-600 font-extrabold dark:text-emerald-400' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            {isWinner && <Award size={14} className="text-emerald-500 animate-pulse shrink-0" />}
                            <span className={`text-sm ${isWinner ? 'font-black' : 'font-bold'}`}>
                              {scheme.benefit_amount || (language === 'te' ? 'ఆర్థిక సహాయం / సబ్సిడీ' : 'Subsidy/Benefit')}
                            </span>
                          </div>
                          {isWinner && (
                            <span className="text-[9px] text-emerald-500 font-black tracking-wider uppercase block mt-1">
                              ★ {language === 'te' ? 'అత్యధిక సాయం' : 'Highest Benefit'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {schemes.length < 3 && Array.from({ length: 3 - schemes.length }).map((_, i) => (
                      <td key={`empty-r1-${i}`} className="p-4 border-l border-[var(--border-subtle)] bg-slate-500/5 text-[var(--text-muted)] italic text-xs">
                        -
                      </td>
                    ))}
                  </tr>

                  {/* Row 2: Category */}
                  <tr className="hover:bg-[var(--bg-base)]/40 transition-colors">
                    <td className="p-4 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)]">
                      <div>
                        <span className="block font-extrabold text-[var(--text-primary)]">
                          {language === 'te' ? 'వర్గం / విభాగం' : 'Category'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {language === 'te' ? 'పథకం రకం' : 'Policy focal segment'}
                        </span>
                      </div>
                    </td>
                    {schemes.map((scheme) => (
                      <td key={scheme.scheme_id} className="p-4 text-xs border-l border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                          {getCategoryTranslation(scheme.category)}
                        </span>
                      </td>
                    ))}
                    {schemes.length < 3 && Array.from({ length: 3 - schemes.length }).map((_, i) => (
                      <td key={`empty-r2-${i}`} className="p-4 border-l border-[var(--border-subtle)] bg-slate-500/5 text-[var(--text-muted)] text-xs">
                        -
                      </td>
                    ))}
                  </tr>

                  {/* Row 3: State Govt / Source Agency */}
                  <tr className="hover:bg-[var(--bg-base)]/40 transition-colors">
                    <td className="p-4 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)]">
                      <div>
                        <span className="block font-extrabold text-[var(--text-primary)]">
                          {language === 'te' ? 'ప్రభుత్వ పరిధి' : 'Government/Jurisdiction'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {language === 'te' ? 'రాష్ట్ర లేదా కేంద్ర పథకం' : 'Source accountability level'}
                        </span>
                      </div>
                    </td>
                    {schemes.map((scheme) => (
                      <td key={scheme.scheme_id} className="p-4 text-xs border-l border-[var(--border-subtle)] text-[var(--text-primary)] font-bold">
                        {scheme.source}
                      </td>
                    ))}
                    {schemes.length < 3 && Array.from({ length: 3 - schemes.length }).map((_, i) => (
                      <td key={`empty-r3-${i}`} className="p-4 border-l border-[var(--border-subtle)] bg-slate-500/5 text-[var(--text-muted)] text-xs">
                        -
                      </td>
                    ))}
                  </tr>

                  {/* Row 4: Land Criteria / Agriculture terms */}
                  <tr className="hover:bg-[var(--bg-base)]/40 transition-colors">
                    <td className="p-4 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)]">
                      <div>
                        <span className="block font-extrabold text-[var(--text-primary)]">
                          {language === 'te' ? 'వ్యవసాయ అవసరాలు / భూమి' : 'Agricultural/Land Criteria'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {language === 'te' ? 'భూమి కలిగి ఉన్న అర్హత' : 'Landholding details matched'}
                        </span>
                      </div>
                    </td>
                    {schemes.map((scheme) => {
                      const landDesc = getLandRequirement(scheme);
                      return (
                        <td key={scheme.scheme_id} className="p-4 text-xs border-l border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium leading-relaxed">
                          {landDesc}
                        </td>
                      );
                    })}
                    {schemes.length < 3 && Array.from({ length: 3 - schemes.length }).map((_, i) => (
                      <td key={`empty-r4-${i}`} className="p-4 border-l border-[var(--border-subtle)] bg-slate-500/5 text-[var(--text-muted)] text-xs">
                        -
                      </td>
                    ))}
                  </tr>

                  {/* Row 5: Eligibility confidence score % */}
                  <tr className="hover:bg-[var(--bg-base)]/40 transition-colors">
                    <td className="p-4 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)]">
                      <div>
                        <span className="block font-extrabold text-[var(--text-primary)]">
                          {language === 'te' ? 'అర్హత పోలిక %' : 'Eligibility Match'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {language === 'te' ? 'వ్యక్తిగత ప్రొఫైల్ సరిపోలిక' : 'Profile diagnostics certitude'}
                        </span>
                      </div>
                    </td>
                    {schemes.map((scheme, idx) => {
                      const isWinner = idx === comparisonWinners.scoreIndex;
                      const pct = Math.round(scheme.similarity_score * 100);
                      return (
                        <td 
                          key={scheme.scheme_id} 
                          className={`p-4 text-xs border-l border-[var(--border-subtle)] transition-colors ${
                            isWinner ? 'bg-emerald-500/10 text-emerald-600 font-extrabold dark:text-emerald-400' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center">
                            {renderMatchDots(scheme.similarity_score)}
                            <span className="text-sm font-black">{pct}%</span>
                          </div>
                          {isWinner && (
                            <span className="text-[9px] text-emerald-500 font-black tracking-wider uppercase block mt-1.5 flex items-center gap-1">
                              <ShieldCheck size={12} /> {language === 'te' ? 'అత్యధిక అనుకూలత' : 'Best Profile Fit'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {schemes.length < 3 && Array.from({ length: 3 - schemes.length }).map((_, i) => (
                      <td key={`empty-r5-${i}`} className="p-4 border-l border-[var(--border-subtle)] bg-slate-500/5 text-[var(--text-muted)] text-xs">
                        -
                      </td>
                    ))}
                  </tr>

                  {/* Row 6: Required Documents */}
                  <tr className="hover:bg-[var(--bg-base)]/40 transition-colors">
                    <td className="p-4 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)]">
                      <div>
                        <span className="block font-extrabold text-[var(--text-primary)]">
                          {language === 'te' ? 'కావలసిన పత్రాలు' : 'Required Documents'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {language === 'te' ? 'అప్లై చేయడానికి కావలసిన పత్రాలు' : 'Secretariat processing aids'}
                        </span>
                      </div>
                    </td>
                    {schemes.map((scheme) => (
                      <td key={scheme.scheme_id} className="p-4 text-xs border-l border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
                        <div className="flex flex-wrap gap-1">
                          {scheme.documents_required.map((doc, docIdx) => (
                            <span 
                              key={docIdx} 
                              className="px-1.5 py-0.5 text-[9px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] font-bold truncate max-w-full"
                              title={doc}
                            >
                              {doc}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                    {schemes.length < 3 && Array.from({ length: 3 - schemes.length }).map((_, i) => (
                      <td key={`empty-r6-${i}`} className="p-4 border-l border-[var(--border-subtle)] bg-slate-500/5 text-[var(--text-muted)] text-xs">
                        -
                      </td>
                    ))}
                  </tr>

                  {/* Row 7: Action Apply buttons */}
                  <tr className="hover:bg-[var(--bg-base)]/40 transition-colors">
                    <td className="p-4 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)]">
                      <div>
                        <span className="block font-extrabold text-[var(--text-primary)]">
                          {language === 'te' ? 'పోర్టల్ లింక్' : 'Official Portal'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {language === 'te' ? 'కనెక్ట్ చేసి అప్లై చేయండి' : 'Apply link routing'}
                        </span>
                      </div>
                    </td>
                    {schemes.map((scheme) => (
                      <td key={scheme.scheme_id} className="p-4 border-l border-[var(--border-subtle)]">
                        <button
                          onClick={() => {
                            const url = scheme.apply_link || 'https://www.myscheme.gov.in';
                            window.open(url, '_blank', 'noreferrer,noopener');
                          }}
                          className="saffron-gradient-btn flex items-center justify-center space-x-1 w-full px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider cursor-pointer text-white shadow-sm border border-accent-saffron/20 hover:brightness-105 active:scale-95 transition-all text-center"
                        >
                          <span>{language === 'te' ? 'ధృవీకరించండి ➔' : 'Apply ➔'}</span>
                          <ExternalLink size={10} />
                        </button>
                      </td>
                    ))}
                    {schemes.length < 3 && Array.from({ length: 3 - schemes.length }).map((_, i) => (
                      <td key={`empty-r7-${i}`} className="p-4 border-l border-[var(--border-subtle)] bg-slate-500/5 text-[var(--text-muted)] text-xs">
                        -
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="flex items-center justify-end px-6 py-4.5 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)]">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-[var(--border-default)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer text-xs font-bold transition-all"
            id="compare-modal-footer-close-btn"
          >
            {language === 'te' ? 'మూసివేయి' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
