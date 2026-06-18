import React from 'react';
import { motion } from 'motion/react';
import { X, Award, ShieldCheck, Sparkles } from 'lucide-react';

interface SchemeContextBannerProps {
  scheme: string;
  match: number;
  category: string;
  onDismiss: () => void;
}

export const SchemeContextBanner: React.FC<SchemeContextBannerProps> = ({
  scheme,
  match,
  category,
  onDismiss
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mb-4 bg-bg-surface/75 border-l-4 border-l-accent-saffron border border-border-subtle rounded-r-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden"
      id="scheme-context-banner"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent-saffron/5 rounded-full blur-xl pointer-events-none" />
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 bg-accent-saffron/15 text-accent-saffron rounded-xl shrink-0 mt-0.5">
            <Award size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 text-[11px] leading-tight font-black bg-accent-saffron/10 text-accent-saffron border border-accent-saffron/20 rounded-full uppercase tracking-wider">
                {category}
              </span>
              <span className="px-2 py-0.5 text-[11px] leading-tight font-black bg-accent-blue/10 text-accent-blue border border-accent-blue/20 rounded-full uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={10} />
                <span>Eligibility Verified</span>
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-text-primary leading-snug tracking-tight">
              Active Context: <span className="text-accent-saffron">{scheme}</span>
            </h3>
            <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">
              <Sparkles size={12} className="text-accent-gold" />
              <span>You qualify for this scheme with a <strong className="text-success">{match}% match score</strong>! Ask questions below for a detailed briefing.</span>
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 hover:bg-bg-elevated text-text-muted hover:text-text-primary rounded-lg transition-colors cursor-pointer shrink-0"
          title="Dismiss Context"
          id="dismiss-context-btn"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};
