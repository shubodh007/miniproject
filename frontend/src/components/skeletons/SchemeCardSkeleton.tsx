import React from 'react';

/**
 * High-fidelity Skeleton loader for Scheme Result Cards.
 * Strictly replicates dimensions and layout mapping of a real matching scheme card to avoid layouter shift.
 */
export const SchemeCardSkeleton: React.FC = () => {
  return (
    <div 
      className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-md select-none pointer-events-none"
      aria-hidden="true"
      aria-label="Loading..."
    >
      {/* Wave shimmer effect container using infinite BG translation */}
      <div className="absolute inset-0 animate-shimmer-wave opacity-40 pointer-events-none" />

      {/* Card Top Row: Sector Badge details & Benefit */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-5">
        <div className="flex flex-wrap gap-1.5 items-center">
          {/* Category badge */}
          <div className="h-4.5 w-24 bg-[var(--bg-elevated)] rounded-md animate-pulse" />
          {/* Source jurisdiction badge */}
          <div className="h-4.5 w-16 bg-[var(--bg-elevated)] rounded-md animate-pulse" />
          {/* Citation code */}
          <div className="h-3 w-20 bg-[var(--bg-elevated)]/60 rounded hidden sm:inline-block animate-pulse" />
        </div>
        
        {/* Benefit Amount Pill */}
        <div className="h-7 w-32 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
      </div>

      {/* Schemes Identification Headings */}
      <div className="mb-5 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          {/* Title - double line simulation */}
          <div className="space-y-2 w-full max-w-[420px]">
            <div className="h-6 bg-[var(--bg-elevated)] rounded-md w-full animate-pulse" />
            <div className="h-6 bg-[var(--bg-elevated)] rounded-md w-2/3 animate-pulse" />
          </div>
          {/* Confidence status badge right-aligned */}
          <div className="h-6 w-24 bg-[var(--bg-elevated)] rounded-full shrink-0 animate-pulse" />
        </div>
        {/* Department / Ministry subtitle */}
        <div className="h-4 bg-[var(--bg-elevated)]/50 rounded-md w-80 animate-pulse" />
      </div>

      {/* Visual Confidence Score Indicator Row replica box */}
      <div className="mb-6 border border-[var(--border-subtle)] p-4 bg-[var(--bg-base)]/30 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            {/* Label */}
            <div className="h-3.5 w-36 bg-[var(--bg-elevated)] rounded animate-pulse" />
            {/* Value description */}
            <div className="h-4 w-48 bg-[var(--bg-elevated)] rounded animate-pulse" />
          </div>
          <div className="text-right">
            {/* Numeric match percentage */}
            <div className="h-6 w-12 bg-[var(--bg-elevated)] rounded animate-pulse" />
          </div>
        </div>
        
        {/* Percentage bar shell */}
        <div className="w-full bg-[var(--bg-elevated)] rounded-full h-2.5 overflow-hidden border border-[var(--border-subtle)]/10">
          <div className="h-full bg-gradient-to-r from-[var(--bg-base)] to-[var(--bg-elevated)] w-3/4 animate-pulse" />
        </div>
      </div>

      {/* Bottom action bar buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-[var(--border-subtle)]/40 pt-4.5">
        <div className="flex items-center space-x-3">
          {/* Ask Sahay AI query button skeleton */}
          <div className="h-11 w-36 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
        </div>

        <div className="flex items-center space-x-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--border-subtle)]/40 justify-end">
          {/* Save button skeleton */}
          <div className="h-10 w-24 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
          {/* Share button circle skeleton */}
          <div className="h-10 w-10 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
};
