import { useState, useEffect, useCallback, useRef } from 'react';
import { getSecuredStorage } from '../utils/security';

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface SavedMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  widgets?: any;
  sources?: any;
  created_at: string;
}

export function useChatSession() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, _setCurrentSessionId] = useState<string | null>(null);
  
  // Use a ref to prevent race conditions and closures capturing stale Null states
  const currentSessionIdRef = useRef<string | null>(null);

  const setCurrentSessionId = useCallback((id: string | null) => {
    currentSessionIdRef.current = id;
    _setCurrentSessionId(id);
  }, []);

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Retrieve active user from secured storage
  const activeUser = getSecuredStorage<any>('sc_active_user');

  // Deterministic stable UUID generator based on email to support mock sessions cleanly
  const getStableUuid = useCallback((input: string): string => {
    if (!input) return "00000000-0000-0000-0000-000000000001";
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash = hash & hash;
    }
    let hash2 = 0;
    for (let i = input.length - 1; i >= 0; i--) {
      hash2 = (hash2 << 5) - hash2 + input.charCodeAt(i);
      hash2 = hash2 & hash2;
    }
    const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
    const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
    const hex3 = Math.abs(hash ^ hash2).toString(16).padStart(8, '0');
    const hex4 = Math.abs(hash + hash2).toString(16).padStart(8, '0');
    const combined = (hex1 + hex2 + hex3 + hex4).substring(0, 32).padEnd(32, '0');
    return [
      combined.substring(0, 8),
      combined.substring(8, 12),
      combined.substring(12, 16),
      combined.substring(16, 20),
      combined.substring(20, 32)
    ].join('-');
  }, []);

  const userId = activeUser?.id || (activeUser?.email ? getStableUuid(activeUser.email) : '');

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userId) {
      headers['Authorization'] = `Bearer ${userId}`;
    }
    return headers;
  }, [userId]);

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions', {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching chat sessions:', err);
    }
  }, [getHeaders]);

  // Load messages for a given session
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch session messages');
      const dbMessages = await res.json();
      
      // Map database messages to frontend Message shape
      const mapped = (dbMessages || []).map((msg: any) => {
        let blocks = undefined;
        let follow_up_suggestions = undefined;
        if (msg.widgets) {
          blocks = msg.widgets.blocks;
          follow_up_suggestions = msg.widgets.follow_up_suggestions;
        }
        
        let citations = undefined;
        if (msg.sources) {
          citations = msg.sources;
        }

        return {
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          blocks,
          citations,
          follow_up_suggestions,
          timestamp: new Date(msg.created_at).getTime()
        };
      });

      setMessages(mapped);
      setCurrentSessionId(sessionId);
    } catch (err) {
      console.error(`Error loading messages for session ${sessionId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders, setCurrentSessionId]);

  // Create a new session
  const createSession = useCallback(async (title?: string) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title: title || 'New Conversation' }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const session = await res.json();
      setSessions(prev => [session, ...prev]);
      setCurrentSessionId(session.id);
      setMessages([]);
      return session.id;
    } catch (err) {
      console.error('Error creating chat session:', err);
      throw err;
    }
  }, [getHeaders, setCurrentSessionId]);

  // Save a message in the active session
  const saveMessage = useCallback(async (
    role: 'user' | 'assistant',
    content: string,
    blocks?: any[],
    citations?: any[],
    followUpSuggestions?: string[],
    replaceTempId?: string
  ) => {
    let activeSessionId = currentSessionIdRef.current;
    const isFirstUserMsg = role === 'user' && (!activeSessionId || !messages.some(m => m.role === 'user'));
    
    // Create session on-the-fly if not existing
    if (!activeSessionId) {
      const firstLine = content.length > 30 ? `${content.substring(0, 30)}...` : content;
      try {
        activeSessionId = await createSession(firstLine);
      } catch (err) {
        console.error('Failed to auto-create session during message save:', err);
        return;
      }
    }

    if (!activeSessionId) return;

    const widgets = blocks || followUpSuggestions ? {
      blocks,
      follow_up_suggestions: followUpSuggestions
    } : null;

    const sources = citations || null;

    try {
      const res = await fetch(`/api/sessions/${activeSessionId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          role,
          content,
          widgets,
          sources
        }),
      });
      if (!res.ok) throw new Error('Failed to save message');
      const savedMsg = await res.json();

      // Update local message list safely
      const formattedMsg = {
        id: savedMsg.id,
        role: savedMsg.role as 'user' | 'assistant',
        content: savedMsg.content,
        blocks: savedMsg.widgets?.blocks,
        citations: savedMsg.sources,
        follow_up_suggestions: savedMsg.widgets?.follow_up_suggestions,
        timestamp: new Date(savedMsg.created_at).getTime()
      };

      setMessages(prev => {
        // Prevent duplicate append if already optimistically added
        const exists = prev.some(m => 
          m.id === savedMsg.id || 
          (replaceTempId && String(m.id) === String(replaceTempId)) ||
          (m.role === role && m.content === content && !String(m.id).includes('-') && Math.abs(m.timestamp - Date.now()) < 5000)
        );

        if (exists) {
          return prev.map(m => {
            const isMatch = m.id === savedMsg.id || 
                            (replaceTempId && String(m.id) === String(replaceTempId)) ||
                            (m.role === role && m.content === content && !String(m.id).includes('-') && Math.abs(m.timestamp - Date.now()) < 5000);
            return isMatch ? { ...m, ...formattedMsg } : m;
          });
        }
        return [...prev, formattedMsg];
      });

      // If this was the first user message, generate title via LLM
      if (isFirstUserMsg) {
        try {
          const titleRes = await fetch(`/api/sessions/${activeSessionId}/title`, {
            method: 'PATCH',
            headers: getHeaders(),
          });
          if (titleRes.ok) {
            const updatedSession = await titleRes.json();
            setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: updatedSession.title } : s));
          }
        } catch (titleErr) {
          console.error('Failed to generate LLM title:', titleErr);
        }
      }

      // Refresh session list to bump updated_at
      fetchSessions();
    } catch (err) {
      console.error('Error saving chat message:', err);
    }
  }, [createSession, fetchSessions, getHeaders, messages]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete session');
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionIdRef.current === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error(`Error deleting chat session ${sessionId}:`, err);
    }
  }, [getHeaders, setCurrentSessionId]);

  // Fetch session history list on mount or when userID changes
  useEffect(() => {
    if (userId) {
      fetchSessions();
    } else {
      setSessions([]);
      setCurrentSessionId(null);
      setMessages([]);
    }
  }, [userId, fetchSessions, setCurrentSessionId]);

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    messages,
    setMessages,
    loading,
    createSession,
    loadSessionMessages,
    saveMessage,
    deleteSession,
    refreshSessions: fetchSessions
  };
}
