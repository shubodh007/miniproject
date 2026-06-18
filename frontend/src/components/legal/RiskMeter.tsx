import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

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

interface RiskMeterProps {
  flags: LegalFlag[];
  customScore?: number;
}

export default function RiskMeter({ flags, customScore }: RiskMeterProps) {
  const [score, setScore] = useState(0);

  // Calculate score from flags unless customScore is provided
  const calculatedScore = (() => {
    if (typeof customScore === 'number') return customScore;
    let total = 0;
    flags.forEach(flag => {
      const sev = String(flag.severity).toLowerCase();
      if (sev === 'critical') total += 25;
      else if (sev === 'high' || sev === 'warning') total += 15;
      else if (sev === 'medium') total += 8;
      else if (sev === 'low' || sev === 'notice') total += 3;
    });
    return Math.min(100, total);
  })();

  useEffect(() => {
    // Animate from 0 to calculatedScore
    const duration = 1500;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setScore(Math.round(easeProgress * calculatedScore));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [calculatedScore]);

  const getZone = (val: number) => {
    if (val <= 30) {
      return { 
        label: 'LOW RISK — Standard agreement', 
        color: 'text-success', 
        stroke: 'var(--success)', 
        bg: 'bg-success/5', 
        border: 'border-success/15' 
      };
    }
    if (val <= 60) {
      return { 
        label: 'REVIEW REQUIRED — Negotiate before signing', 
        color: 'text-accent', 
        stroke: 'var(--color-accent)', 
        bg: 'bg-accent/5', 
        border: 'border-accent/15' 
      };
    }
    if (val <= 85) {
      return { 
        label: 'HIGH RISK — Major revisions needed', 
        color: 'text-warning', 
        stroke: 'var(--warning)', 
        bg: 'bg-warning/5', 
        border: 'border-warning/15' 
      };
    }
    return { 
      label: 'CRITICAL — Do not sign without legal help', 
      color: 'text-error', 
      stroke: 'var(--error)', 
      bg: 'bg-error/5', 
      border: 'border-error/15' 
    };
  };

  const zone = getZone(score);

  // SVG parameters for standard high-accuracy gauge
  const radius = 54;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full text-left" id="risk-meter-wrapper">
      <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left w-full md:w-auto">
        {/* Animated Radial Gauge */}
        <div className="relative w-32 h-32 flex items-center justify-center shrink-0" id="gauge-container">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background path with fine high contrast design */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="var(--color-border)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Foreground path */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke={zone.stroke}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-100 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col justify-center items-center">
            <span className="text-3xl font-heading font-bold text-text-primary tracking-tight">{score}</span>
            <span className="text-[11px] leading-tight font-mono font-bold text-text-muted uppercase tracking-wider">/ 100 Risk</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] leading-tight font-bold font-mono uppercase border select-none tracking-wider ${zone.color} ${zone.bg} ${zone.border}`} id="risk-badge">
              {zone.label}
            </span>
            <span className="text-xs font-semibold text-text-muted font-mono" id="flags-count">
              {flags.length} Risk Flags Found
            </span>
          </div>
          <h3 className="text-lg font-heading font-bold text-text-primary tracking-tight">
            Overall Document Risk Score
          </h3>
          <p className="text-xs leading-relaxed text-text-secondary max-w-md font-sans">
            {score <= 30
              ? 'This document displays standard protective bounds and holds very minor, manageable hazards. Safe to execute with routine watchfulness.'
              : score <= 60
              ? 'Several clauses have been flagged as one-sided. Review the active timeline and negotiate safer additions before signature.'
              : score <= 85
              ? 'Attention required. Multiple high-severity clauses limit your remedies and create high liability. Engage in thorough rewriting.'
              : 'CRITICAL WARNING. Punitive forfeiture and severe unilateral powers present extreme exposure. We strongly recommend rejecting this draft.'}
          </p>
        </div>
      </div>
      
      {/* Risk indicator icon box */}
      <div className={`p-4 rounded-xl border hidden md:flex items-center justify-center ${zone.color} ${zone.bg} ${zone.border} w-[160px] shrink-0`}>
        {score <= 30 ? (
          <div className="flex flex-col items-center text-center space-y-1">
            <ShieldCheck size={20} className="text-success" />
            <span className="text-[11px] leading-tight font-bold font-heading uppercase tracking-wider text-text-primary">Standard Safety</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-1">
            <AlertTriangle size={20} className="text-warning animate-pulse" />
            <span className="text-[11px] leading-tight font-bold font-heading uppercase tracking-wider text-text-primary">Exposed Clauses</span>
          </div>
        )}
      </div>
    </div>
  );
}
