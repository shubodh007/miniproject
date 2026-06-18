import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, AlertTriangle, Code, Plus, Minus } from 'lucide-react';

interface LegalFlag {
  id?: string;
  flagId: string;
  severity: "critical" | "high" | "medium" | "low" | string;
  clauseType: string;
  title: string;
  description: string;
  risk: string;
  recommendation: string;
  pageNumber: number;
  originalText: string;
}

interface ClauseHighlighterProps {
  flag: LegalFlag | null;
}

export default function ClauseHighlighter({ flag }: ClauseHighlighterProps) {
  if (!flag) {
    return (
      <div className="border border-border-main rounded-2xl p-8 text-center text-text-muted bg-bg-surface/30" id="clauses-highlighter-empty">
        <div className="w-10 h-10 bg-bg-base border border-border-subtle rounded-full flex items-center justify-center mx-auto mb-3">
          <Code size={16} className="text-text-muted" />
        </div>
        Select a risk flag from the timeline or advisor list to review comparative audit highlights.
      </div>
    );
  }

  const getSeverityStyle = (severity: string) => {
    const s = String(severity).toLowerCase();
    switch (s) {
      case 'critical':
        return {
          titleColor: 'text-error',
          badgeClass: 'bg-error/10 text-error border-error/15',
          originalClass: 'bg-error/[0.03] text-red-200 border-error/15'
        };
      case 'high':
      case 'warning':
        return {
          titleColor: 'text-warning',
          badgeClass: 'bg-warning/10 text-warning border-warning/15',
          originalClass: 'bg-warning/[0.03] text-amber-200 border-warning/15'
        };
      default:
        return {
          titleColor: 'text-accent',
          badgeClass: 'bg-accent/10 text-accent border-accent/15',
          originalClass: 'bg-accent/[0.03] text-indigo-200 border-accent/15'
        };
    }
  };

  const style = getSeverityStyle(flag.severity);

  return (
    <div className="w-full text-left space-y-4" id={`clause-highlighter-${flag.flagId}`}>
      {/* Side-by-Side Review Section with code-level visual contrasts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Original Draft section (Red / Deletion state) */}
        <div className={`rounded-xl p-4.5 text-left border relative overflow-hidden flex flex-col justify-between min-h-[140px] ${style.originalClass}`}>
          <div className="absolute top-0 right-0 bg-error/10 text-error text-[11px] leading-tight font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl select-none border-b border-l border-error/15">
            Original Text
          </div>
          <div className="font-mono text-xs leading-relaxed space-y-2 mt-3">
            <div className="flex items-center space-x-1 text-error font-extrabold select-none text-[11px] leading-tight uppercase tracking-wider">
              <Minus size={11} />
              <span>Unfair Covenant:</span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed font-telugu text-[13px] text-text-primary/90 font-medium">
              {flag.originalText}
            </p>
          </div>
        </div>

        {/* Proposed Safe section (Green / Addition state) */}
        <div className="bg-success/[0.03] border border-success/15 rounded-xl p-4.5 text-left relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 bg-success/10 text-success text-[11px] leading-tight font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl select-none border-b border-l border-success/15">
            Remediated draft
          </div>
          <div className="font-mono text-xs leading-relaxed space-y-2 mt-3">
            <div className="flex items-center space-x-1 text-success font-extrabold select-none text-[11px] leading-tight uppercase tracking-wider">
              <Plus size={11} />
              <span>Remediated Clause:</span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-success text-[13px] font-semibold">
              {flag.recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
