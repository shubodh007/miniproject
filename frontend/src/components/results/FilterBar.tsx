import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export interface FilterBarProps {
  activeFilter: 'all' | 'central' | 'ap' | 'tg';
  setActiveFilter: (val: 'all' | 'central' | 'ap' | 'tg') => void;
  activeSort: 'relevance' | 'category' | 'source';
  setActiveSort: (val: 'relevance' | 'category' | 'source') => void;
  language: string;
  t: (key: string, options?: any) => string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeFilter,
  setActiveFilter,
  activeSort,
  setActiveSort,
  language,
  t,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--bg-surface)]/60 border border-[var(--border-subtle)] p-4 rounded-3xl backdrop-blur-md relative" id="filter-bar-subcomponent">
      {/* Filters group */}
      <div className="flex items-center space-x-2" id="filter-wrapper">
        <SlidersHorizontal size={14} className="text-[var(--text-muted)]" />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter Schemes Navigation">
          {(['all', 'central', 'ap', 'tg'] as const).map((fil) => (
            <button
              key={fil}
              onClick={() => setActiveFilter(fil)}
              className={`py-2.5 px-4 min-h-[44px] text-[11px] font-bold rounded-full border transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ${
                activeFilter === fil
                  ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white shadow-sm'
                  : 'bg-[var(--bg-surface)]/20 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {fil === 'all' && t('results.filter.all')}
              {fil === 'central' && t('results.filter.central')}
              {fil === 'ap' && t('results.filter.ap')}
              {fil === 'tg' && t('results.filter.tg')}
            </button>
          ))}
        </div>
      </div>

      {/* Sorting choices */}
      <div className="flex items-center space-x-3 text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)]/30 p-2 rounded-xl border border-[var(--border-subtle)] w-fit" id="sort-bar">
        <span>{language === 'te' ? 'క్రమపద్ధతి నిబంధన:' : 'Sort By:'}</span>
        <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg" role="radiogroup" aria-label="Scheme sorting selection">
          {(['relevance', 'category', 'source'] as const).map((srt) => (
            <button
              key={srt}
              role="radio"
              aria-checked={activeSort === srt}
              onClick={() => setActiveSort(srt)}
              className={`px-4 py-3 min-h-[44px] rounded text-[11px] leading-tight uppercase font-extrabold cursor-pointer transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ${
                activeSort === srt
                  ? 'bg-[var(--bg-surface)] text-[var(--accent-saffron)] border border-[var(--border-subtle)] font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t(`results.sort.${srt}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
