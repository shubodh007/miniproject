import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckSquare, Square, BookmarkCheck, ListChecks } from 'lucide-react';

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

interface ActionChecklistProps {
  flags: LegalFlag[];
}

interface ChecklistItem {
  id: string;
  title: string;
  remedy: string;
  severity: string;
  completed: boolean;
}

export default function ActionChecklist({ flags }: ActionChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);

  // Generate checklist on flags change
  useEffect(() => {
    if (!flags || flags.length === 0) {
      setItems([]);
      return;
    }

    const initialItems: ChecklistItem[] = flags.map((flag) => ({
      id: flag.flagId,
      title: `Negotiate: ${flag.title}`,
      remedy: flag.recommendation,
      severity: flag.severity,
      completed: false
    }));

    setItems(initialItems);
  }, [flags]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (totalCount === 0) return null;

  return (
    <div className="w-full text-left" id="action-checklist-wrapper">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4 mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
            <ListChecks size={14} />
          </div>
          <div>
            <h4 className="text-sm font-heading font-bold text-text-primary tracking-tight">Contract Negotiation Checklist</h4>
            <p className="text-[11px] leading-tight text-text-muted mt-0.5 font-bold uppercase tracking-wider">Strategic talking points to demand from the landowner</p>
          </div>
        </div>
        
        {/* Progress Tracker display */}
        <div className="flex items-center space-x-3 bg-bg-base/50 border border-border-subtle px-3 py-1.5 rounded-xl self-start sm:self-center" id="checklist-tracker-tag">
          <span className="text-xs font-heading font-black text-text-primary font-mono">{completedCount} of {totalCount} Resolved</span>
          <div className="w-20 h-2 bg-bg-base rounded-full overflow-hidden border border-border-subtle">
            <div 
              className="h-full bg-success transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dynamic transition styles for Micro-interaction */}
      <style>{`
        .checklist-item-transition {
          transition: opacity 200ms ease-out, transform 200ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .checklist-item-transition {
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* List items with transitions */}
      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1" id="checklist-items-scrollable">
        {[...items]
          .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))
          .map((item) => (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleItem(item.id);
                }
              }}
              tabIndex={0}
              className={`p-4 border rounded-xl cursor-pointer checklist-item-transition flex items-start space-x-3 bg-bg-base/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ${
                item.completed
                  ? 'border-success/20 bg-success/[0.02] opacity-60 line-through text-[var(--text-muted)] scale-98'
                  : 'border-border-subtle hover:border-text-secondary text-text-primary'
              }`}
              id={`checklist-item-${item.id}`}
              role="checkbox"
              aria-checked={item.completed}
            >
              <div className="text-text-muted shrink-0 transition-colors mt-0.5">
                {item.completed ? (
                  <CheckSquare size={17} className="text-success" />
                ) : (
                  <Square size={17} />
                )}
              </div>
              <div className="space-y-1">
                <span className={`text-xs font-bold tracking-tight block ${item.completed ? 'text-[var(--text-muted)]' : 'text-text-primary'}`}>
                  {item.title}
                </span>
                <p className="text-xs leading-relaxed">
                  <strong className="font-black block uppercase text-[11px] leading-tight tracking-wide mb-1">Requested remedy:</strong>
                  {item.remedy}
                </p>
              </div>
            </div>
          ))}
      </div>
      
      {/* Bottom checklist instructions */}
      <div className="pt-4 border-t border-border-subtle mt-4 text-[11px] leading-tight text-text-muted font-semibold flex items-center space-x-2">
        <BookmarkCheck size={14} className="text-success" />
        <span>Check off each point as you agree on revisions to verify overall covenant fairness.</span>
      </div>
    </div>
  );
}
