import React from 'react';
import { Award, Files } from 'lucide-react';

export interface ResultsHeaderProps {
  filteredSchemesCount: number;
  summaryMessage: string | null;
  handleDownloadPDF: () => void;
  handleDownloadSummary: () => void;
  language: string;
  t: (key: string, options?: any) => string;
}

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  filteredSchemesCount,
  summaryMessage,
  handleDownloadPDF,
  handleDownloadSummary,
  language,
  t,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--bg-surface)]/60 border border-[var(--border-subtle)] p-5 rounded-3xl backdrop-blur-md relative overflow-hidden" id="results-header-subcomponent">
      <div>
        <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)] flex items-center">
          <Award className="text-accent-gold mr-2" size={20} />
          <span>
            {t('results.found', { count: filteredSchemesCount })}
          </span>
        </h3>
        <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
          {summaryMessage || t('results.scanning')}
        </p>
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
  );
};
