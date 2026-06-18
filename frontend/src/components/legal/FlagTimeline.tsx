import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flag, Calendar } from 'lucide-react';

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

interface FlagTimelineProps {
  flags: LegalFlag[];
  selectedFlagId: string | null;
  onSelectFlag: (id: string) => void;
}

export default function FlagTimeline({ flags, selectedFlagId, onSelectFlag }: FlagTimelineProps) {
  if (!flags || flags.length === 0) return null;

  // Group or sort flags by page number, then clause index
  const sortedFlags = [...flags].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
    return a.flagId.localeCompare(b.flagId);
  });

  const buttonRefs = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    buttonRefs.current = buttonRefs.current.slice(0, sortedFlags.length);
  }, [sortedFlags]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        e.preventDefault();
        const nextIndex = (index + 1) % sortedFlags.length;
        buttonRefs.current[nextIndex]?.focus();
        break;
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        e.preventDefault();
        const prevIndex = (index - 1 + sortedFlags.length) % sortedFlags.length;
        buttonRefs.current[prevIndex]?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        buttonRefs.current[0]?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        buttonRefs.current[sortedFlags.length - 1]?.focus();
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        onSelectFlag(sortedFlags[index].flagId);
        break;
      }
      default:
        break;
    }
  };

  const getSeverityColors = (severity: string) => {
    const s = String(severity).toLowerCase();
    if (s === 'critical') {
      return { 
        dot: 'bg-error shadow-error/50', 
        border: 'border-error/20', 
        text: 'text-error font-extrabold tracking-tight text-[11px] leading-tight', 
        bg: 'bg-error/10' 
      };
    }
    if (s === 'high' || s === 'warning') {
      return { 
        dot: 'bg-warning shadow-warning/50', 
        border: 'border-warning/20', 
        text: 'text-warning font-extrabold text-[11px] leading-tight', 
        bg: 'bg-warning/10' 
      };
    }
    if (s === 'medium') {
      return { 
        dot: 'bg-accent-blue shadow-accent-blue/50', 
        border: 'border-accent-blue/20', 
        text: 'text-accent-blue font-extrabold text-[11px] leading-tight', 
        bg: 'bg-accent-blue/10' 
      };
    }
    return { 
      dot: 'bg-text-secondary shadow-text-secondary/50', 
      border: 'border-border-default', 
      text: 'text-text-secondary font-mono text-[11px] leading-tight font-bold', 
      bg: 'bg-bg-elevated' 
    };
  };

  return (
    <div className="w-full text-left space-y-4" id="flag-timeline-container">
      {/* Horizontal timeline track */}
      <div className="relative border border-border-main bg-bg-base/20 rounded-2xl p-5" id="timeline-track-outer">
        {/* Connection Line */}
        <div className="absolute top-1/2 left-8 right-8 h-[1px] bg-border-main -translate-y-1/2 z-0" />

        <div 
          className="flex items-center space-x-6 overflow-x-auto pb-4 pt-2 shrink-0 scrollbar-thin scrollbar-thumb-border-main relative z-10" 
          id="timeline-scrollable-row"
          role="tree"
        >
          {sortedFlags.map((flag, index) => {
            const isSelected = flag.flagId === selectedFlagId;
            const colors = getSeverityColors(flag.severity);

            return (
              <button
                type="button"
                role="treeitem"
                aria-expanded={isSelected}
                key={flag.flagId}
                ref={(el) => {
                  if (el) buttonRefs.current[index] = el;
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onClick={() => onSelectFlag(flag.flagId)}
                className={`relative flex flex-col items-center min-w-[124px] text-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] rounded-xl ${
                  isSelected ? 'scale-105' : 'opacity-70 hover:opacity-100'
                }`}
                id={`timeline-node-${flag.flagId}`}
              >
                {/* Node marker */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all relative z-10 ${
                    isSelected
                      ? `${colors.border} ${colors.bg} ring-2 ring-accent/35 scale-110`
                      : 'border-border-main bg-bg-surface hover:border-text-secondary'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${colors.dot} shadow-md`} />
                </div>

                {/* Vertical offset flag info */}
                <span className="text-[11px] leading-tight font-bold font-mono text-text-muted mt-2 uppercase">
                  Page {flag.pageNumber || 1}
                </span>
                
                <span className={`text-[11px] leading-tight font-heading font-bold mt-1 line-clamp-1 max-w-[110px] ${isSelected ? colors.text : 'text-text-secondary'}`} title={flag.title}>
                  {flag.title}
                </span>

                {/* Connectors / Severity Text indicators */}
                <span className="text-[11px] leading-tight font-bold font-mono text-text-muted mt-0.5 uppercase tracking-wider">
                  {flag.severity}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
