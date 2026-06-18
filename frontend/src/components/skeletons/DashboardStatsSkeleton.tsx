import React from 'react';

/**
 * High-fidelity Skeleton loader for Dashboard Statistics Row.
 * Restores 4-column layout constraints (grid-cols-2 md:grid-cols-4 gap-4) and mimics real statistics layouts.
 */
export const DashboardStatsSkeleton: React.FC = () => {
  return (
    <div 
      className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full select-none pointer-events-none"
      aria-hidden="true"
      aria-label="Loading statistics..."
    >
      {[1, 2, 3, 4].map((index) => (
        <div 
          key={index}
          className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between h-[115px]"
        >
          {/* Subtle pulse/wave overlay */}
          <div className="absolute inset-0 animate-shimmer-wave opacity-40 pointer-events-none" />

          {/* Top Label Placeholder */}
          <div className="h-3.5 bg-[var(--bg-elevated)] rounded-md w-4/5 animate-pulse" />

          {/* Value Display Placeholder (Big number counter) */}
          <div className="flex items-baseline space-x-2 mt-4">
            <div className="h-8 bg-[var(--bg-elevated)] rounded-md w-14 animate-pulse" />
            <div className="h-3.5 bg-[var(--bg-elevated)]/60 rounded w-8 animate-pulse" />
          </div>

          {/* Bottom Live Link / Status indicator */}
          <div className="flex items-center space-x-1.5 mt-2">
            <div className="w-2 h-2 rounded-full bg-[var(--bg-elevated)] animate-pulse" />
            <div className="h-2.5 bg-[var(--bg-elevated)]/50 rounded w-20 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};
