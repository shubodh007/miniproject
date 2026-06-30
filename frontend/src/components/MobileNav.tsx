import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface MobileNavProps {
  items: Array<{ id: string; label: string }>;
  onSelect: (id: string) => void;
  activeId?: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ items, onSelect, activeId }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-menu"
        aria-label="Toggle navigation menu"
        className="p-2 text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-saffron rounded-lg cursor-pointer"
      >
        {isOpen ? <X size={24} data-testid="close-icon" /> : <Menu size={24} data-testid="hamburger-icon" />}
      </button>

      {isOpen && (
        <div
          id="mobile-nav-menu"
          role="navigation"
          className="absolute right-0 top-full mt-2 w-48 bg-bg-surface border border-border-main rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <ul className="space-y-1 px-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    onSelect(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeId === item.id
                      ? 'bg-accent-saffron/12 text-accent-saffron'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/40'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
