import React from 'react';
import { ExternalLink } from 'lucide-react';

interface SourceCardProps {
  index: number;
  url: string;
  title: string;
  snippet?: string;
  isLoading?: boolean;
}

export const SourceCard: React.FC<SourceCardProps> = ({
  index,
  url,
  title,
  snippet,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="bg-surface-raised border border-border p-3 rounded-2xl space-y-2.5 animate-pulse select-none min-w-[200px]">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-border shrink-0" />
          <div className="h-3 bg-border rounded w-3/4" />
        </div>
        <div className="space-y-1">
          <div className="h-2.5 bg-border rounded w-full" />
          <div className="h-2.5 bg-border rounded w-5/6" />
        </div>
        <div className="flex items-center space-x-1 pt-1.5 border-t border-border mt-auto">
          <div className="w-3 h-3 rounded-full bg-border" />
          <div className="h-2 bg-border rounded w-1/3" />
        </div>
      </div>
    );
  }

  const cleanUrl = url.replace(/^https?:\/\/(www\.)?/, '');
  const domainInitials = cleanUrl.slice(0, 2).toUpperCase();

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-block bg-surface-raised hover:bg-border border border-border hover:border-accent/40 p-3.5 rounded-2xl text-left text-xs flex flex-col justify-between cursor-pointer transition-all duration-[var(--transition-smooth)] hover:-translate-y-1 shadow-lg hover:shadow-[0_4px_24px_var(--color-accent-glow)] relative group overflow-hidden max-w-[280px] min-w-[220px]"
      title={snippet}
      id={`source-card-${index}`}
    >
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <span className="bg-accent/10 text-accent w-5 h-5 rounded-lg text-[11px] leading-tight font-black flex items-center justify-center shrink-0 border border-accent/15">
            {index}
          </span>
          <span className="font-semibold truncate text-text-primary text-[11px] group-hover:text-accent transition-colors leading-tight">
            {title}
          </span>
        </div>
        {snippet && (
          <p className="text-[11px] leading-tight text-text-muted line-clamp-2 leading-relaxed mb-2.5 group-hover:line-clamp-none transition-all duration-[var(--transition-smooth)]">
            {snippet}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between pt-1.5 border-t border-border mt-auto">
        <div className="flex items-center space-x-1.5">
          <span className="w-4 h-4 rounded-full bg-surface flex items-center justify-center text-[7px] font-extrabold border border-border text-accent shrink-0">
            {domainInitials}
          </span>
          <span className="text-[11px] leading-tight text-text-muted truncate block font-mono max-w-[120px]">
            {cleanUrl}
          </span>
        </div>
        <ExternalLink size={10} className="text-text-muted opacity-0 group-hover:opacity-100 transition-[var(--transition-fast)]" />
      </div>
    </a>
  );
};
