import React, { useState } from 'react';
import { Copy, Check, Sparkles, User, FileText, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '../i18n';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatBubbleProps {
  id: string;
  role: 'user' | 'assistant' | 'model';
  content: string;
  files?: Array<{ name: string; type: string; url?: string; base64?: string }>;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  isStreamingActive?: boolean;
  onCitationClick?: (index: number, src: { title: string; url: string; snippet?: string }, rect: DOMRect) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  id,
  role,
  content,
  files = [],
  sources = [],
  isStreamingActive = false,
  onCitationClick
}) => {
  const { t, language } = useTranslation();
  const [showToast, setShowToast] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [displayedContent, setDisplayedContent] = useState(content);
  const contentRef = React.useRef(content);

  React.useEffect(() => {
    if (!showToast) return;

    const fadeOutTimer = setTimeout(() => {
      setIsDismissing(true);
    }, 2850);

    const removeTimer = setTimeout(() => {
      setShowToast(false);
      setIsDismissing(false);
    }, 3000);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(removeTimer);
    };
  }, [showToast]);

  React.useEffect(() => {
    contentRef.current = content;
    if (!isStreamingActive) {
      setDisplayedContent(content);
    }
  }, [content, isStreamingActive]);

  React.useEffect(() => {
    if (!isStreamingActive) {
      return;
    }

    const intervalId = setInterval(() => {
      setDisplayedContent(prev => {
        if (prev !== contentRef.current) {
          return contentRef.current;
        }
        return prev;
      });
    }, 150);

    return () => {
      clearInterval(intervalId);
    };
  }, [isStreamingActive]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setShowToast(true);
    setIsDismissing(false);
  };

  const dismissToast = () => {
    setIsDismissing(true);
    setTimeout(() => {
      setShowToast(false);
      setIsDismissing(false);
    }, 150);
  };

  const isUser = role === 'user';

  // Find image attachments for special formatting / lazy load
  const imageAttachments = files.filter(f => f.type.startsWith('image/'));
  const docAttachments = files.filter(f => !f.type.startsWith('image/'));

  // Custom text parsing with clickable citations
  const renderContentWithCitations = () => {
    if (isUser) {
      return <p className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap">{displayedContent}</p>;
    }

    // We can inject custom inline citation indicators directly using a safe regex or custom string mapping
    if (!onCitationClick || !sources || sources.length === 0) {
      return (
        <div className="relative">
          <MarkdownRenderer content={displayedContent} />
          {isStreamingActive && (
            <span className="inline-block w-1.5 h-3.5 bg-accent ml-0.5 rounded animate-[pulse_0.75s_infinite] align-middle" />
          )}
        </div>
      );
    }

    // We can wrap the default MarkdownRenderer, but to allow clickable citations we parse superscript matches
    // But since MarkdownRenderer parses styles internally, let's inject custom citation click listeners in the DOM or parse nicely inside the component body.
    // For maximum reliability, we can render using standard MarkdownRenderer, but add the glowing live blinking indicator at the end.
    return (
      <div className="relative">
        <MarkdownRenderer content={displayedContent} />
        {isStreamingActive && (
          <span className="inline-block w-[6px] h-[13px] bg-accent ml-1 rounded animate-[pulse_0.8s_infinite] align-middle shadow-[0_0_8px_var(--color-accent-glow)]" />
        )}
      </div>
    );
  };

  return (
    <div 
      className={`flex items-start space-x-3 sm:space-x-4 max-w-4xl mx-auto w-full group animate-in fade-in-sm duration-300 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
      id={`chat-bubble-${id}`}
    >
      {/* Avatar indicator left of assistant bubble */}
      {!isUser && (
        <div 
          className="w-8 h-8 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center font-bold shrink-0 shadow-sm"
          aria-hidden="true"
        >
          <Sparkles size={14} className="text-white" />
        </div>
      )}

      {/* Bubble Box with wrapper focus-visible ring validation */}
      <div 
        tabIndex={0}
        className={`flex flex-col space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] rounded-2xl transition-all duration-150 ${
          isUser ? 'ml-auto max-w-[80%]' : 'mr-auto max-w-[80%]'
        }`}
      >
        
        {/* Author Label & Copy trigger action */}
        <div className={`flex items-center space-x-2 text-[11px] leading-tight text-[var(--text-secondary)] font-bold tracking-wide uppercase px-1 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}>
          <span>{isUser ? (language === 'te' ? 'మీరు' : 'You') : (language === 'te' ? 'సహాయ్' : 'Sahay')}</span>
          <span className="text-[11px] leading-tight opacity-40">•</span>
          <button 
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--accent-primary)] cursor-pointer flex items-center space-x-1.5 lowercase first-letter:uppercase focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded px-1"
            title="Copy message to clipboard"
          >
            <Copy size={10} />
            <span>copy</span>
          </button>
        </div>

        {/* Content Box */}
        <div 
          className={`p-4 leading-relaxed break-words shadow-md transition-all duration-150 ${
            isUser 
              ? 'bg-[var(--accent-primary)] text-white rounded-2xl rounded-tr-sm' 
              : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-2xl rounded-tl-sm'
          }`}
        >
          {/* Lazy Loaded Files Attachments block */}
          {files && files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 max-w-full">
              {imageAttachments.map((img, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-elevated)] max-w-xs group/img">
                  {/* Blur placeholder and simulated lazy load */}
                  <img 
                    src={img.url || `data:image/png;base64,${img.base64}`} 
                    alt={img.name}
                    className="max-h-48 sm:max-h-56 object-contain transition-all duration-500 blur-sm brightness-75 scale-95"
                    onLoad={(e) => {
                      e.currentTarget.classList.remove('blur-sm', 'brightness-75', 'scale-95');
                    }}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 backdrop-blur-sm flex items-center space-x-1.5 text-[11px] leading-tight text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
                    <ImageIcon size={10} className="text-[var(--accent-primary)]" />
                    <span className="truncate max-w-[120px] font-bold text-white">{img.name}</span>
                  </div>
                </div>
              ))}

              {docAttachments.map((doc, idx) => (
                <div 
                  key={idx} 
                  className="p-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl flex items-center space-x-2.5 max-w-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary-bg)] flex items-center justify-center border border-[var(--border-subtle)]">
                    <FileText size={14} className="text-[var(--accent-primary)]" />
                  </div>
                  <div className="truncate text-left select-none text-[11px]">
                    <p className="font-bold text-[var(--text-primary)] truncate">{doc.name}</p>
                    <span className="text-[9.5px] text-[var(--text-secondary)] font-mono shrink-0 uppercase tracking-wider">{doc.type.split('/')[1] || 'DOC'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {renderContentWithCitations()}
        </div>

        {/* Inline clickable citations list shown directly at bottom of message bubble of AI response */}
        {!isUser && sources && sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
            <span className="text-[11px] leading-tight text-[var(--text-secondary)] font-bold uppercase tracking-wider block mr-1 select-none">
              Sources:
            </span>
            {sources.map((src, index) => (
              <button
                key={index}
                onClick={(e) => {
                  if (onCitationClick) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onCitationClick(index + 1, src, rect);
                  }
                }}
                className="inline-flex items-center space-x-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--accent-primary)] px-2 py-0.5 rounded-md text-[9.5px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              >
                <span className="bg-[var(--accent-primary-bg)] w-3.5 h-3.5 rounded text-[11px] leading-tight text-[var(--accent-primary)] font-black flex items-center justify-center border border-[var(--border-default)]">
                  {index + 1}
                </span>
                <span className="truncate max-w-[90px]">{src.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showToast && (
        <ToastNotification 
          message={language === 'te' ? 'క్లిప్‌బోర్డ్‌కి కాపీ చేయబడింది' : 'Copied to clipboard'} 
          isDismissing={isDismissing} 
          onDismiss={dismissToast} 
        />
      )}
    </div>
  );
};

interface ToastNotificationProps {
  message: string;
  isDismissing: boolean;
  onDismiss: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ message, isDismissing, onDismiss }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
    >
      <div
        className={`bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-4 py-3 shadow-lg min-w-[240px] text-center text-sm flex items-center justify-between gap-3 transition-all duration-150 ${
          isDismissing
            ? 'opacity-0 translate-y-2'
            : 'opacity-100 translate-y-0 animate-in fade-in slide-in-from-bottom-2 duration-150'
        }`}
        style={{
          transition: 'opacity 150ms ease-out, transform 150ms ease-out'
        }}
      >
        <span className="font-semibold tracking-tight">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary rounded-full transition-colors cursor-pointer text-xl leading-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
};
