import React from 'react';

interface LoadingIndicatorProps {
  type?: 'typing' | 'skeleton';
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ type = 'typing' }) => {
  if (type === 'typing') {
    return (
      <div 
        className="flex items-center space-x-1 py-2 px-3 bg-surface-raised border border-border rounded-full w-max shadow-sm"
        id="typing-indicator"
        aria-label="Sahay is typing"
      >
        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
      </div>
    );
  }

  // Shimmering response areas corresponding exactly with normal layout boundaries (no sudden visual jumps!)
  return (
    <div className="space-y-4 w-full" id="response-skeleton-shimmer">
      <div className="space-y-2">
        <div className="h-4 bg-border rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-border rounded w-5/6 animate-pulse" />
        <div className="h-3 bg-border rounded w-2/3 animate-pulse" />
      </div>
      
      {/* Visual references row skeletons */}
      <div className="flex gap-2.5 overflow-x-auto py-1 pr-1 border-t border-border pt-3">
        {[1, 2, 3].map((s) => (
          <div key={s} className="bg-surface-raised border border-border p-3 rounded-card min-w-[200px] space-y-2 animate-pulse">
            <div className="flex items-center space-x-1.5">
              <div className="w-4 h-4 bg-border rounded" />
              <div className="h-3 bg-border rounded w-2/3" />
            </div>
            <div className="h-2.5 bg-border rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  );
};
