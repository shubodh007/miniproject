import React, { useState, useEffect } from 'react';
import { Globe, Check, AlertCircle, ChevronRight, Layers, ArrowRight } from 'lucide-react';
import '../styles/search.css';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useTranslation } from '../i18n';

export interface VisitedSite {
  favicon?: string;
  domain: string;
  title: string;
  status: 'Visiting...' | 'Done';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  searchStatus?: 'searching' | 'done' | 'failed';
  searchQueries?: string[];
  searchSources?: Array<{ title: string; url: string; snippet?: string; favicon?: string }>;
  searchStageKey?: string;
  searchStageMessage?: string;
  visitedSites?: VisitedSite[];
  sourceCount?: number;
}

interface SearchPanelProps {
  message: Message;
  isStreaming: boolean;
  onFollowUp?: (prompt: string) => void;
}

const SearchStatusPill = ({
  stage,
  isComplete,
  sourceCount,
  isFallback,
  isSearchNotice,
  stageMessage,
}: {
  stage?: string;
  isComplete: boolean;
  sourceCount: number;
  isFallback: boolean;
  isSearchNotice: boolean;
  stageMessage?: string;
}) => {
  return (
    <div className="flex items-center space-x-2.5 mb-4 animate-pillMorph search-status-transition text-[var(--font-source)] mt-2">
      {isFallback ? (
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[var(--status-fallback)]">
          <AlertCircle size={14} />
          <span className="font-semibold text-xs tracking-wide">Search unavailable</span>
        </div>
      ) : isComplete ? (
        <div className="flex items-center space-x-2 text-[var(--text-secondary)]">
          <Check size={16} className="text-text-muted" />
          <span className="font-medium text-[15px]">
            {sourceCount > 0 ? `Analyzed ${sourceCount} sources` : 'Analyzed sources'}
          </span>
        </div>
      ) : (
        <div className="flex items-center space-x-2 text-[var(--text-secondary)]">
          <Globe size={16} className="text-text-muted animate-spin" style={{ animationDuration: '3s' }} />
          <span className="font-medium text-[15px]">
            {sourceCount > 0 ? `Searching ${sourceCount} sources...` : 'Searching...'}
          </span>
        </div>
      )}
    </div>
  );
};

interface SourceCardProps {
  site: Partial<VisitedSite> & { url?: string; snippet?: string };
  index: number;
  isLive: boolean;
}

const SourceCard: React.FC<SourceCardProps> = ({ 
  site, 
  index,
  isLive 
}) => {
  const isSkeleton = site.title === '';
  const domain = site.domain || (site.url ? new URL(site.url).hostname : '');

  if (isSkeleton) {
    return (
      <div 
        className="shrink-0 w-[160px] h-[40px] rounded-lg border-subtle bg-card overflow-hidden flex items-center px-3"
      >
        <div className="animate-shimmerPulse w-full h-full absolute inset-0" />
      </div>
    );
  }

  return (
    <a
      href={site.url || '#'}
      target="_blank"
      rel="noreferrer"
      className="group shrink-0 h-[40px] rounded-lg flex items-center px-3 space-x-2 border border-subtle bg-card hover:bg-card-hover transition-colors cursor-pointer animate-cardIn relative max-w-[170px]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {site.favicon ? (
        <img src={site.favicon} alt="" className="w-[16px] h-[16px] rounded-sm shrink-0" />
      ) : (
        <div className="w-[16px] h-[16px] rounded-sm bg-[rgba(255,255,255,0.1)] shrink-0 flex items-center justify-center p-0.5">
          <Globe size={10} className="text-[var(--text-muted)]" />
        </div>
      )}
      <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate flex-1 leading-tight">
        {domain.replace(/^www\./, '') || site.title}
      </span>
      <span className="text-[11px] leading-tight font-mono text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors pl-1">
        {index + 1}
      </span>
    </a>
  );
};

const SourcesStrip = ({ sources, visitedSites, isComplete }: { sources: any[]; visitedSites: VisitedSite[]; isComplete: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Use final sources if done, else live visited sites, else placeholders
  const displayItems = isComplete && sources && sources.length > 0 
    ? sources 
    : (!isComplete && visitedSites && visitedSites.length > 0)
      ? visitedSites
      : [{ title: '' }, { title: '' }, { title: '' }]; // 3 skeletons
      
  const visibleItems = expanded ? displayItems : displayItems.slice(0, 4);
  const hiddenCount = Math.max(0, displayItems.length - 4);

  return (
    <div className={`mb-5 ${expanded ? 'grid grid-cols-2 sm:grid-cols-4 gap-2.5' : 'flex items-center space-x-2.5 overflow-x-auto no-scrollbar pb-1'}`}>
      {visibleItems.map((item, idx) => (
        <SourceCard 
          key={item.url || item.domain || idx} 
          site={item} 
          index={idx} 
          isLive={!isComplete}
        />
      ))}
      {!expanded && hiddenCount > 0 && (
        <button 
          onClick={() => setExpanded(true)}
          className="shrink-0 h-[40px] px-3 rounded-lg flex items-center space-x-1.5 border border-subtle bg-card hover:bg-card-hover transition-colors text-[12px] font-semibold text-[var(--text-secondary)]"
        >
          <Layers size={14} />
          <span>View {hiddenCount} more</span>
        </button>
      )}
    </div>
  );
};

const AnswerStream = ({ content, isStreaming, sources }: { content: string; isStreaming: boolean; sources: any[] }) => {
  return (
    <div className="relative pt-4 border-t border-[rgba(255,255,255,0.06)]">
      {content === 'Thinking...' || !content ? (
        <div className="space-y-3">
          <div className="h-4 bg-[rgba(255,255,255,0.04)] rounded w-3/4 animate-shimmerPulse"></div>
          <div className="h-4 bg-[rgba(255,255,255,0.04)] rounded w-1/2 animate-shimmerPulse" style={{ animationDelay: '200ms' }}></div>
          <div className="h-4 bg-[rgba(255,255,255,0.04)] rounded w-5/6 animate-shimmerPulse" style={{ animationDelay: '400ms' }}></div>
        </div>
      ) : (
        <div className="text-[var(--text-primary)]">
          <MarkdownRenderer content={content} sources={sources} />
          {isStreaming && (
            <span className="inline-block w-2.5 h-4 ml-1 bg-text-primary animate-bounce align-middle shadow-[0_0_8px_rgba(255,255,255,0.15)]" style={{ animationDuration: '0.8s' }} />
          )}
        </div>
      )}
    </div>
  );
};

const RelatedQuestions = ({ onFollowUp }: { onFollowUp?: (q: string) => void }) => {
  const [questions, setQuestions] = useState<string[]>([]);
  
  useEffect(() => {
    // Generate some contextual dummy questions for the UI pattern if none provided
    setQuestions([
      "What are the detailed eligibility criteria?",
      "How to apply for this directly?",
      "Are there alternative options?"
    ]);
  }, []);

  if (!questions.length) return null;

  return (
    <div className="mt-8 pt-6 border-t border-subtle animate-in fade-in duration-500 delay-300">
      <div className="flex items-center space-x-2 text-[var(--text-secondary)] mb-4">
        <Layers size={16} />
        <h4 className="text-[15px] font-medium tracking-wide">Related</h4>
      </div>
      <div className="flex flex-col space-y-2">
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onFollowUp?.(q)}
            className="group flex justify-between items-center w-full px-4 py-3 rounded-xl bg-card border border-subtle hover:bg-[rgba(255,255,255,0.1)] transition-all cursor-pointer text-left mx-0"
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            <span className="text-[15px] text-[var(--text-primary)] font-medium group-hover:text-white transition-colors">{q}</span>
            <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-white transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

export const SearchPanel: React.FC<SearchPanelProps> = ({ message, isStreaming, onFollowUp }) => {
  const isSearchNotice = message.searchStageKey === 'search_notice';
  const isFallback = message.searchStageKey === 'fallback_notice' || message.searchStageMessage?.includes('fallback model');
  
  const hasSearch = message.searchStatus !== undefined || message.visitedSites?.length || message.searchSources?.length;

  return (
    <div className="w-full flex justify-center py-2 relative">
      <div className="w-full">
        {hasSearch && (
          <>
            <SearchStatusPill 
              stage={message.searchStageKey} 
              isComplete={message.searchStatus === 'done' || (!isStreaming && message.searchStatus !== 'searching')}
              sourceCount={message.sourceCount || message.searchSources?.length || message.visitedSites?.length || 0}
              isFallback={isFallback}
              isSearchNotice={isSearchNotice}
              stageMessage={message.searchStageMessage}
            />
            
            {!isFallback && (
              <SourcesStrip 
                sources={message.searchSources || []} 
                visitedSites={message.visitedSites || []}
                isComplete={message.searchStatus === 'done'}
              />
            )}
          </>
        )}
        
        {/* If provider notice exists */}
        {isSearchNotice && !isFallback && message.searchStageMessage && (
          <div className="mb-4 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
            <span className="font-mono text-[11px] leading-tight uppercase font-bold tracking-widest">{message.searchStageMessage}</span>
          </div>
        )}

        <AnswerStream 
          content={message.content} 
          isStreaming={isStreaming} 
          sources={message.searchSources || []}
        />

        {!isStreaming && message.content && message.content !== 'Thinking...' && (
          <RelatedQuestions onFollowUp={onFollowUp} />
        )}
      </div>
    </div>
  );
};
