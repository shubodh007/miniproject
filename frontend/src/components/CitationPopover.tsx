import React, { useEffect, useRef } from 'react';
import { ExternalLink, X } from 'lucide-react';

interface CitationPopoverProps {
  index: number;
  url: string;
  title: string;
  snippet?: string;
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
}

export const CitationPopover: React.FC<CitationPopoverProps> = ({
  index,
  url,
  title,
  snippet,
  isOpen,
  onClose,
  x,
  y
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null); // Changed: Added a ref for the first focusable element inside the popover (close button)

  // Focus trigger handling on open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      const activeEl = document.activeElement as HTMLElement; // Changed: Safely retrieve current active element (the trigger)
      triggerRef.current = activeEl; // Changed: Cache the trigger button element reference
      
      if (activeEl) {
        // Fix 1 & Fix 4: Ensure the trigger has the correct interactive properties for a dialog and is fully accessible
        activeEl.setAttribute('aria-expanded', 'true'); // Changed: Mark trigger as expanded when popover is open
        activeEl.setAttribute('aria-haspopup', 'dialog'); // Changed: Inform AT that clicking this trigger opens a dialog
      }

      // Fix 2: Move focus inside the popover automatically to the first focusable element (close button)
      setTimeout(() => {
        firstFocusableRef.current?.focus(); // Changed: programmatically focus the close button upon mounting for assistive technology
      }, 50);
    } else {
      if (triggerRef.current) {
        // Fix 4: Restore aria-expanded state to false on trigger
        triggerRef.current.setAttribute('aria-expanded', 'false'); // Changed: Reset expanded state of trigger upon popover dismissal
        // Fix 3: Return focus to the trigger button automatically
        triggerRef.current.focus(); // Changed: Return focus to the captured trigger button
        triggerRef.current = null; // Changed: Reset cached reference
      }
    }
  }, [isOpen]);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (triggerRef.current) {
        triggerRef.current.setAttribute('aria-expanded', 'false'); // Changed: Reset ARIA state of the trigger when unmounting
        triggerRef.current.focus(); // Changed: Move focus back to the trigger button when unmounted to avoid losing focus
      }
    };
  }, []);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Fix 3: Handle ESC key to dismiss the popover and restore focus to trigger button
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose(); // Changed: Call onClose to dismiss the dialog in parent, which triggers focus restoration to trigger
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown); // Changed: Add global ESC keydown listener when dialog is active
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${y}px`,
    left: `${x}px`,
    transform: 'translate(-50%, -105%)', // Centered above source anchor
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key === 'Tab' && popoverRef.current) {
      const focusableElements = popoverRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    }
  };

  return (
    <div
      ref={popoverRef}
      style={style}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      className="z-50 w-64 bg-bg-surface/95 backdrop-blur-[var(--blur-glass)] border border-accent-saffron/30 shadow-[0_4px_24px_var(--color-accent-glow)] p-3 rounded-2xl text-xs space-y-2 animate-in fade-in zoom-in-95 duration-[var(--transition-fast)] focus:outline-none"
      role="dialog" // Changed: Fix 4 - Explicitly added role dialog for assistive technologies
      aria-modal="true" // Changed: Fix 4 - Explicitly marked active dialog container as aria-modal to screen readers
      aria-label={`Source reference details for citation ${index}`}
    >
      <div className="flex items-center justify-between border-b border-border-subtle pb-1.5">
        <span className="font-bold text-accent-saffron flex items-center space-x-1 font-heading">
          <span>Source Reference</span>
          <span className="bg-accent-saffron/10 w-4 h-4 rounded text-[11px] leading-tight text-center flex items-center justify-center font-black">
            {index}
          </span>
        </span>
        <button
          ref={firstFocusableRef} // Changed: Fix 2 - Attach the ref to the close button (the first focusable item in popover)
          onClick={onClose}
          className="text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer transition-colors"
          aria-label="Close reference detail"
        >
          <X size={12} />
        </button>
      </div>

      <div className="space-y-1">
        <h4 className="font-bold text-text-primary leading-tight text-[11px] font-heading">{title}</h4>
        {snippet && (
          <p className="text-[11px] leading-tight text-text-muted leading-relaxed line-clamp-3">
            {snippet}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
        <span className="text-[8.5px] font-mono text-text-muted truncate max-w-[140px] block">
          {url.replace(/^https?:\/\/(www\.)?/, '')}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center space-x-0.5 text-accent-saffron hover:underline font-bold text-[11px] leading-tight cursor-pointer"
        >
          <span>Visit portal</span>
          <ExternalLink size={8} />
        </a>
      </div>
    </div>
  );
};
