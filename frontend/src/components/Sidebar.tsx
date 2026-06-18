import React, { useState } from 'react';
import { 
  Plus, MessageSquare, Trash2, Edit3, Check, X,
  Sparkles, PanelLeftClose, PanelLeft, Settings, User, LogOut, ChevronDown, FolderSync 
} from 'lucide-react';
import { useTranslation } from '../i18n';

interface Session {
  id: string;
  title: string;
  timestamp: string;
}

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onLogout?: () => void;
  onToggleProfileSettings?: () => void;
  profileSnapshot?: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onLogout,
  onToggleProfileSettings,
  profileSnapshot
}) => {
  const { t, language } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [dropdownSessionId, setDropdownSessionId] = useState<string | null>(null);

  const startRename = (sess: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(sess.id);
    setEditTitle(sess.title);
    setDropdownSessionId(null);
  };

  const handleRenameSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleRenameCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const toggleSidebarCollapse = () => {
    setIsCollapsed(p => !p);
  };

  return (
    <aside 
      className={`bg-surface border-r border-border flex flex-col justify-between transition-all duration-[var(--transition-smooth)] relative shrink-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      id="sessions-sidebar-aside"
    >
      {/* Upper Brand / Toggle */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <span className="w-7 h-7 bg-gradient-to-tr from-accent to-accent/80 rounded-lg border border-accent/20 flex items-center justify-center text-[var(--color-surface)] shadow-[0_0_12px_var(--color-accent-glow)]">
              <Sparkles size={14} className="animate-pulse" />
            </span>
            <div>
              <h1 className="font-heading font-black text-xs text-text-primary leading-tight uppercase tracking-wider">
                Sahay Gateway
              </h1>
              <span className="text-[11px] leading-tight text-accent font-bold font-mono text-shadow-glow">v1.2 PRO</span>
            </div>
          </div>
        )}
        <button 
          onClick={toggleSidebarCollapse}
          className="p-1 text-text-muted hover:text-text-primary border border-border rounded-lg hover:bg-surface-raised cursor-pointer ml-auto transition-[var(--transition-fast)]"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Main Actions: New Session */}
      <div className="p-3">
        <button
          onClick={onNewSession}
          className={`w-full flex items-center justify-center p-3 sm:py-2.5 bg-accent/20 hover:bg-accent/30 border border-accent/25 text-text-primary rounded-2xl shadow-lg hover:shadow-[0_4px_16px_var(--color-accent-glow)] transition-all duration-[var(--transition-fast)] cursor-pointer group shrink-0 ${
            isCollapsed ? 'px-0' : 'space-x-2 text-xs font-bold'
          }`}
          title="Start fresh conversation"
          id="new-chat-btn"
        >
          <Plus size={14} className="group-hover:rotate-90 transition-transform text-accent" />
          {!isCollapsed && <span>{language === 'te' ? 'కొత్త చాట్' : 'New Chat'}</span>}
        </button>
      </div>

      {/* Session directory list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1 max-h-[60vh] scrollbar-thin">
        {sessions.map((sess) => {
          const isActive = sess.id === activeSessionId;
          const isEditing = sess.id === editingId;
          const showDropdown = sess.id === dropdownSessionId;

          if (isCollapsed) {
            return (
              <button
                key={sess.id}
                onClick={() => onSelectSession(sess.id)}
                className={`w-full p-2.5 rounded-2xl flex items-center justify-center transition-[var(--transition-fast)] cursor-pointer relative group/collapsed ${
                  isActive ? 'bg-accent/10 border border-accent/20 text-accent' : 'hover:bg-surface-raised text-text-muted'
                }`}
              >
                <MessageSquare size={15} />
                {/* collapsed hover tooltip */}
                <span className="absolute left-16 z-50 bg-surface border border-border px-2.5 py-1.5 rounded-2xl text-[11px] leading-tight text-text-primary whitespace-nowrap opacity-0 group-hover/collapsed:opacity-100 transition-all pointer-events-none translate-x-2 group-hover/collapsed:translate-x-0 shadow-xl font-bold">
                  {sess.title}
                </span>
              </button>
            );
          }

          return (
            <div
              key={sess.id}
              onClick={() => onSelectSession(sess.id)}
              className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-[var(--transition-fast)] cursor-pointer group relative ${
                isActive 
                  ? 'bg-accent/10 border-accent/25 text-text-primary font-bold shadow-[inset_0_2px_12px_var(--color-accent-glow)]' 
                  : 'bg-transparent border-transparent hover:bg-surface-raised text-text-muted hover:text-text-primary'
              }`}
            >
              <div className="flex items-center space-x-2.5 w-4/5 text-xs">
                {isActive ? (
                  <Sparkles size={13} className="text-accent shrink-0" />
                ) : (
                  <MessageSquare size={13} className="text-text-muted/60 shrink-0" />
                )}
                
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-surface border border-accent/35 p-1 rounded-md text-xs text-text-primary focus:outline-none w-full shadow-[0_0_8px_var(--color-accent-glow)]"
                    autoFocus
                  />
                ) : (
                  <span className="truncate pr-1">{sess.title}</span>
                )}
              </div>

              {/* Action triggers rename/delete */}
              {!isEditing && (
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity space-x-1 shrink-0">
                  <button
                    onClick={(e) => startRename(sess, e)}
                    className="p-1 hover:bg-surface rounded text-text-muted hover:text-text-primary cursor-pointer transition-[var(--transition-fast)]"
                    title="Rename session"
                  >
                    <Edit3 size={11} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(sess.id);
                    }}
                    className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400 cursor-pointer transition-[var(--transition-fast)]"
                    title="Delete session"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}

              {isEditing && (
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={(e) => handleRenameSave(sess.id, e)}
                    className="p-1 hover:bg-success/10 rounded text-success cursor-pointer"
                  >
                    <Check size={11} />
                  </button>
                  <button
                    onClick={(e) => handleRenameCancel(e)}
                    className="p-1 hover:bg-surface-raised rounded text-error cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Settings & Account */}
      <div className="p-3 border-t border-border bg-surface-raised/40 shrink-0">
        {!isCollapsed ? (
          <div className="space-y-2">
            {profileSnapshot && (
              <div className="bg-surface-raised p-2 rounded-2xl flex items-center space-x-2 border border-border hover:border-accent/20 transition-[var(--transition-fast)] cursor-pointer" onClick={onToggleProfileSettings}>
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-xs text-accent font-bold uppercase border border-accent/15">
                  {(profileSnapshot.state || 'IN').slice(0, 2)}
                </div>
                <div className="truncate text-[11px] leading-tight">
                  <p className="font-extrabold text-text-primary text-[11px] truncate">{profileSnapshot.occupation || 'Welfare Citizen'}</p>
                  <span className="text-text-muted font-mono select-none truncate block">District: {profileSnapshot.district || 'All States'}</span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              <button 
                onClick={onToggleProfileSettings}
                className="w-full py-2 border border-border hover:border-accent/25 rounded-2xl flex items-center justify-center space-x-1 bg-transparent text-text-muted hover:text-text-primary cursor-pointer transition-[var(--transition-fast)]"
              >
                <Settings size={11} />
                <span>Settings</span>
              </button>
              <button 
                onClick={onLogout}
                className="w-full py-2 border border-border hover:border-error/25 rounded-2xl flex items-center justify-center space-x-1 bg-transparent text-text-muted hover:text-error cursor-pointer transition-[var(--transition-fast)]"
              >
                <LogOut size={11} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={onToggleProfileSettings}
              className="p-2 border border-border hover:border-accent/25 rounded-2xl bg-transparent text-text-muted hover:text-text-primary cursor-pointer transition-[var(--transition-fast)]"
              title="Profile Settings"
            >
              <Settings size={14} />
            </button>
            <button 
              onClick={onLogout}
              className="p-2 border border-border hover:border-error/25 rounded-2xl bg-transparent text-text-muted hover:text-error cursor-pointer transition-[var(--transition-fast)]"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
