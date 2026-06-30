import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Sparkles, CheckCircle, CircleDot } from 'lucide-react';

interface ThinkingStageStreamerProps {
  thinkingSteps: string[];
  isLive: boolean; // if true, loading is still active
}

export const ThinkingStageStreamer: React.FC<ThinkingStageStreamerProps> = ({
  thinkingSteps,
  isLive
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Automatically collapse when final response is ready (i.e. isLive changes from true to false)
  useEffect(() => {
    if (!isLive) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [isLive]);

  return (
    <div className="border border-amber-500/15 rounded-xl bg-amber-500/5 overflow-hidden my-4 max-w-[640px]">
      {/* Header bar that user can click to expand/collapse if not live */}
      <button
        onClick={() => !isLive && setIsExpanded(!isExpanded)}
        disabled={isLive}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold select-none ${
          isLive ? 'cursor-default' : 'cursor-pointer hover:bg-amber-500/8'
        } transition`}
      >
        <div className="flex items-center gap-2">
          {isLive ? (
            <div className="flex gap-1.5 items-center mr-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 bg-amber-500 rounded-full"
                />
              ))}
            </div>
          ) : (
            <CheckCircle size={14} className="text-amber-500 shrink-0" />
          )}

          <span className="text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={12} className="animate-pulse" />
            {isLive ? 'Sahay AI is Reasoning...' : 'AI Reasoning Accomplished'}
          </span>
        </div>

        {!isLive && (
          <div className="text-amber-500/60 hover:text-amber-500 transition">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        )}
      </button>

      {/* Accordion List Body */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="px-4 pb-3 pt-1 border-t border-amber-500/10 space-y-2 mt-1">
              {thinkingSteps.map((step, idx) => {
                const isLast = idx === thinkingSteps.length - 1;
                const isCompleted = !isLive || idx < thinkingSteps.length - 1;

                return (
                  <motion.div
                    key={`step-${idx}`}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-2.5 text-xs text-text-secondary"
                  >
                    <div className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckCircle size={12} className="text-emerald-500" />
                      ) : (
                        <CircleDot size={12} className="text-amber-500 animate-pulse" />
                      )}
                    </div>
                    <span className={`font-mono text-[11px] leading-tight ${isLast && isLive ? 'text-amber-400 font-bold' : 'text-text-secondary'}`}>
                      {step}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
