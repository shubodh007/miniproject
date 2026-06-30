import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, FileText, Sparkles, Award, FileCheck, MessageSquare, 
  History, Bookmark, Settings, Home, ArrowRight, X, Clock
} from 'lucide-react';
import { useTranslation } from '../../i18n';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setView: (view: string) => void;
  currentView: string;
}

interface CommandItem {
  id: string;
  labelEn: string;
  labelTe: string;
  category: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  setView,
  currentView
}) => {
  const { language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentActions, setRecentActions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const commandItems: CommandItem[] = [
    {
      id: 'dashboard',
      labelEn: 'Dashboard Home',
      labelTe: 'డాష్‌బోర్డ్ హోమ్',
      category: 'Navigation',
      icon: Home
    },
    {
      id: 'wizard',
      labelEn: 'Eligibility Wizard',
      labelTe: 'అర్హత విగ్గీ',
      category: 'Navigation',
      icon: Sparkles
    },
    {
      id: 'results',
      labelEn: 'Evaluation Results',
      labelTe: 'నివేదిక ఫలితాలు',
      category: 'Navigation',
      icon: Award
    },
    {
      id: 'legal',
      labelEn: 'Legal Analyzer',
      labelTe: 'న్యాయ అనలైజర్',
      category: 'Navigation',
      icon: FileCheck
    },
    {
      id: 'chat',
      labelEn: 'Smart Assistance Chat',
      labelTe: 'సంక్షేమ AI సహాయం',
      category: 'Navigation',
      icon: MessageSquare
    },
    {
      id: 'history',
      labelEn: 'Audit Histories',
      labelTe: 'శోధన చరిత్ర',
      category: 'Navigation',
      icon: History
    },
    {
      id: 'saved',
      labelEn: 'Saved Items',
      labelTe: 'సేవ్ చేసిన జాబితా',
      category: 'Navigation',
      icon: Bookmark
    },
    {
      id: 'settings',
      labelEn: 'Profile Settings',
      labelTe: 'ఖాతా అమరికలు',
      category: 'Navigation',
      icon: Settings
    }
  ];

  // Load recent actions on mount/open
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('nyaya_recent_actions');
        if (stored) {
          setRecentActions(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Error loading recent items:', err);
      }
      setSearchQuery('');
      setSelectedIndex(0);
      // Autofocus the search search field after modal mount transition
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keep focus in input
  const keepInputFocus = () => {
    inputRef.current?.focus();
  };

  // Keyboard listeners for navigation + close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelectCommand(filteredItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, searchQuery]);

  // Close palette on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Search logic filtering
  const filteredItems = commandItems.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesEn = item.labelEn.toLowerCase().includes(q);
    const matchesTe = item.labelTe.toLowerCase().includes(q);
    const matchesCategory = item.category.toLowerCase().includes(q);
    return matchesEn || matchesTe || matchesCategory;
  });

  const handleSelectCommand = (item: CommandItem) => {
    // Navigate safely
    setView(item.id);

    // Save/update recent items limit to 4
    try {
      const stored = localStorage.getItem('nyaya_recent_actions');
      let arr: string[] = stored ? JSON.parse(stored) : [];
      arr = arr.filter(x => x !== item.id);
      arr.unshift(item.id);
      arr = arr.slice(0, 4);
      localStorage.setItem('nyaya_recent_actions', JSON.stringify(arr));
    } catch (err) {
      console.error(err);
    }

    onClose();
  };

  const getRecentItems = () => {
    return commandItems.filter(item => recentActions.includes(item.id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 select-none bg-black/60 backdrop-blur-md"
          onClick={keepInputFocus}
        >
          {/* Main card panel - Dark Glassmorphism container */}
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
            className="w-full max-w-lg bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[480px] text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Search bar wrapper */}
            <div className="px-4 py-3 bg-zinc-950/60 border-b border-white/5 flex items-center gap-3 shrink-0">
              <Search size={16} className="text-zinc-400 shrink-0 select-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder={language === 'te' ? 'ద్వారమును శోధించండి... (ఉదా: న్యాయ)' : 'Search routes... (e.g., Legal, Chat)'}
                className="w-full bg-transparent text-sm text-zinc-100 border-0 outline-none p-0 focus:ring-0 placeholder:text-zinc-500 font-sans"
                autoComplete="off"
                spellCheck="false"
              />
              <button 
                onClick={onClose}
                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-100 transition cursor-pointer"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Results Scroll body */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin divide-y divide-white/5">
              {/* Recent items - show if search query is empty and we have recents */}
              {searchQuery === '' && recentActions.length > 0 && (
                <div className="pb-2">
                  <div className="px-3 pt-2 pb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
                    <Clock size={10} />
                    <span>{language === 'te' ? 'ఇటీవలి సందర్శనలు' : 'Recent Actions'}</span>
                  </div>
                  <div className="space-y-0.5">
                    {getRecentItems().map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={`recent-${item.id}`}
                          onClick={() => handleSelectCommand(item)}
                          className="group mx-1 flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer text-zinc-300 hover:text-zinc-100 hover:bg-white/5 transition duration-150"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-zinc-800/80 text-zinc-400 rounded-lg group-hover:scale-105 group-hover:text-amber-500 transition-colors">
                              <Icon size={14} />
                            </div>
                            <span>{language === 'te' ? item.labelTe : item.labelEn}</span>
                          </div>
                          <ArrowRight size={12} className="opacity-0 group-hover:opacity-60 text-zinc-400 transition" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Main Command Registry list */}
              <div className="pt-2">
                <div className="px-3 pt-1.5 pb-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
                  {language === 'te' ? 'అందుబాటులో ఉన్న విభాగాలు' : 'Portal Quick Actions'}
                </div>

                {filteredItems.length > 0 ? (
                  <div className="space-y-0.5">
                    {filteredItems.map((item, index) => {
                      const Icon = item.icon;
                      const isSelected = index === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectCommand(item)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`group mx-1 flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 ${
                            isSelected 
                              ? 'bg-zinc-800/80 text-white border border-white/5 shadow-inner' 
                              : 'text-zinc-300 hover:text-zinc-100 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg transition-colors ${
                              isSelected 
                                ? 'bg-amber-500/10 text-amber-500' 
                                : 'bg-zinc-800/80 text-zinc-400 group-hover:text-amber-500'
                            }`}>
                              <Icon size={14} />
                            </div>
                            <span>{language === 'te' ? item.labelTe : item.labelEn}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="text-[10px] leading-tight px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-black uppercase tracking-wider">
                                ENTER
                              </span>
                            )}
                            <ArrowRight size={12} className={`transition ${
                              isSelected ? 'opacity-90 transform translate-x-0.5 text-amber-500' : 'opacity-0 group-hover:opacity-40 text-zinc-400'
                            }`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Keyboard shortcuts footer bar */}
            <div className="px-4 py-2.5 bg-zinc-950/40 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-semibold select-none font-sans mt-auto">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-white/5 text-zinc-400">↑↓</kbd>
                  {language === 'te' ? 'కదల్చడానికి' : 'to navigate'}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-white/5 text-zinc-400">Enter</kbd>
                  {language === 'te' ? 'ఎంచుకోవడానికి' : 'to select'}
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-white/5 text-zinc-400">Esc</kbd>
                {language === 'te' ? 'మూసివేయడానికి' : 'to close'}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
