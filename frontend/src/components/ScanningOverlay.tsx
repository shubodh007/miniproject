import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Sparkles, Check, Circle } from 'lucide-react';

interface ScanningOverlayProps {
  isOpen: boolean;
  language?: string;
  apiResolved: boolean;
  onComplete: () => void;
}

const stepsData: Record<string, string[]> = {
  en: [
    "Ingesting demographic profile & income parameters...",
    "Filtering regional limits & Central/State welfare models...",
    "Parsing caste, age & occupational constraints...",
    "Running localized eligibility rule engine validation...",
    "Formatting matchmaking rankings & priority payouts..."
  ],
  te: [
    "మీ వివరాలు మరియు ఆదాయ సమాచారాన్ని విశ్లేషిస్తోంది...",
    "ప్రాంతీయ పరిమితులు మరియు కేంద్ర/రాష్ట్ర ప్రభుత్వ పథకాలను పరిశీలిస్తోంది...",
    "కులం, వయస్సు మరియు వృత్తిపరమైన నిబంధనలను పరిశీలిస్తోంది...",
    "అర్హత నమూనాల నియమ నిశ్చయతను తనిఖీ చేస్తోంది...",
    "పథకాల అమరికలను క్రమబద్ధీకరించి నివేదిక సిద్ధం చేస్తోంది..."
  ],
  hi: [
    "जनसांख्यिकीय प्रोफ़ाइल और आय मापदंडों का विश्लेषण किया जा रहा है...",
    "क्षेत्रीय सीमाओं और केंद्रीय/राज्य कल्याणकारी योजनाओं को फ़िल्टर किया जा रहा है...",
    "जाति, आयु और व्यावसायिक बाधाओं का आकलन किया जा रहा है...",
    "स्थानीय पात्रता नियम इंजन सत्यापन चलाया जा रहा है...",
    "मिलान रैंकिंग को प्रारूपित किया जा रहा है और प्राथमिकताओं को अंतिम रूप दिया जा रहा है..."
  ]
};

const titleData: Record<string, string> = {
  en: "Civic Welfare Matchmaking",
  te: "సంక్షేమ పథకాల అమరిక ప్రక్రియ",
  hi: "कल्याणकारी योजना मिलान प्रक्रिया"
};

export const ScanningOverlay: React.FC<ScanningOverlayProps> = ({
  isOpen,
  language = 'en',
  apiResolved,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);

  // Normalize language to the keys available
  const activeLang = stepsData[language] ? language : 'en';
  const steps = stepsData[activeLang];
  const title = titleData[activeLang];

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      return;
    }

    let intervalId: NodeJS.Timeout;

    const tick = () => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(intervalId);
          return 100;
        }

        // If the API has already resolved, speed up to 100%
        if (apiResolved) {
          const next = prev + Math.floor(Math.random() * 15) + 10;
          return next >= 100 ? 100 : next;
        }

        // Otherwise, smoothly progress towards 90% and hold
        if (prev < 90) {
          // Progress increments by 2% to 6%
          const increment = Math.floor(Math.random() * 5) + 2;
          const next = prev + increment;
          return next >= 90 ? 89 : next;
        }

        return prev;
      });
    };

    intervalId = setInterval(tick, 140);

    return () => clearInterval(intervalId);
  }, [isOpen, apiResolved]);

  // Hook to monitor when progress reaches 100% to call onComplete
  useEffect(() => {
    if (progress === 100 && isOpen) {
      const delay = setTimeout(() => {
        onComplete();
      }, 500); // Small professional pause to register 100%
      return () => clearTimeout(delay);
    }
  }, [progress, isOpen, onComplete]);

  if (!isOpen) return null;

  // Determine standard indices based on progress percentage
  let currentStepIndex = 0;
  if (progress >= 20 && progress < 45) {
    currentStepIndex = 1;
  } else if (progress >= 45 && progress < 70) {
    currentStepIndex = 2;
  } else if (progress >= 70 && progress < 90) {
    currentStepIndex = 3;
  } else if (progress >= 90) {
    currentStepIndex = 4;
  }

  return (
    <div className="fixed inset-0 bg-bg-base/95 backdrop-blur-lg z-50 flex flex-col justify-center items-center text-center px-4 animate-in fade-in duration-300">
      <div 
        id="scanning-overlay-card"
        className="bg-bg-surface border border-border-main p-8 md:p-10 rounded-3xl shadow-2xl flex flex-col items-center max-w-xl w-full mx-auto"
      >
        {/* Animated Top Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-accent-saffron/10 text-accent-saffron flex items-center justify-center animate-pulse">
            <Loader2 className="animate-spin text-accent-saffron" size={40} />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-accent-gold text-bg-surface p-1.5 rounded-full border border-bg-surface shadow">
            <Sparkles size={16} />
          </div>
        </div>

        {/* Title and Progress Bar */}
        <h3 className="text-2xl font-bold text-text-primary mb-1 flex items-center justify-center space-x-2">
          {title}
        </h3>
        
        {/* Dynamic Percentage */}
        <span className="font-mono text-3xl font-extrabold text-accent-saffron tracking-tight mb-4">
          {progress}%
        </span>

        {/* Progress Bar Container */}
        <div className="w-full bg-bg-subtle/70 rounded-full h-3 border border-border-subtle/50 overflow-hidden mb-8 relative">
          <div 
            id="matchmaking-progress-track"
            className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-accent-saffron rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Matchmaking Process Steps Status Checklist */}
        <div className="w-full text-left bg-bg-base/40 border border-border-subtle/30 rounded-2xl p-6 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 border-b border-border-subtle pb-2">
            {language === 'te' ? 'జరుగుతున్న తనిఖీ వ్యవస్థ:' : 'Active Matchmaking Pipeline:'}
          </div>
          {steps.map((stepText, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const isPending = idx > currentStepIndex;

            return (
              <div 
                key={idx}
                className="flex items-start space-x-3.5 transition-all duration-300"
              >
                {/* Status Icon Indicator */}
                <div className="mt-0.5 flex-shrink-0">
                  {isCompleted && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <Check size={12} className="stroke-[3]" />
                    </div>
                  )}
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-accent-saffron/10 text-accent-saffron flex items-center justify-center animate-spin">
                      <Loader2 size={12} className="stroke-[3]" />
                    </div>
                  )}
                  {isPending && (
                    <div className="w-5 h-5 rounded-full border border-border-subtle text-text-muted flex items-center justify-center">
                      <Circle size={8} className="fill-current text-text-muted/30" />
                    </div>
                  )}
                </div>

                {/* Step Text Label */}
                <div className="flex-1">
                  <p 
                    className={`text-sm leading-tight transition-colors duration-350 ${
                      isActive 
                        ? 'text-text-primary font-bold shadow-sm' 
                        : isCompleted 
                        ? 'text-text-secondary line-through opacity-70 font-medium' 
                        : 'text-text-muted opacity-50 font-normal'
                    }`}
                  >
                    {stepText}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
