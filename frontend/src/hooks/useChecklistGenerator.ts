import { useState, useCallback } from 'react';
import { ProfilePayload } from '../types';

interface ChecklistModalState {
  scheme: any;
  checklist: string[] | null;
  loading: boolean;
}

export function useChecklistGenerator(profileSnapshot: ProfilePayload | null) {
  const [checklistModal, setChecklistModal] = useState<ChecklistModalState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);

  const handleGenerateChecklist = useCallback(async (scheme: any) => {
    if (!scheme) return;

    const schemeId = scheme.scheme_id || scheme.id || 'unknown';
    const schemeName = scheme.name_en || scheme.scheme_name || scheme.name || 'Scheme';
    const baseDocs = scheme.documents_required || scheme.documents_needed || [];

    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(`checklist-${schemeId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChecklistModal({ scheme, checklist: parsed, loading: false });
          return;
        }
      }
    } catch (e) {
      console.warn('SessionStorage failed to parse:', e);
    }

    setChecklistModal({ scheme, checklist: null, loading: true });
    setIsGenerating(true);
    setChecklistError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: `Generate a personalized document checklist for ${profileSnapshot?.name || 'a citizen'} to apply for ${schemeName}. 
          Their profile: State=${profileSnapshot?.state || 'AP'}, District=${profileSnapshot?.district || 'N/A'}, Occupation=${profileSnapshot?.occupation || 'N/A'}, 
          Caste=${profileSnapshot?.caste_category || 'N/A'}, Land=${profileSnapshot?.land_acres || 'N/A'} acres, BPL=${profileSnapshot?.bpl_card || 'N/A'}.
          The base required documents are: ${baseDocs.join(', ')}.
          Generate a specific, personalized checklist mentioning their exact district MRO office, their specific situation (e.g., "Since you're a tenant farmer, include your CCRC card"). 
          Format as a JSON array of strings: ["Document 1 — specific note", "Document 2 — specific note"]
          Respond ONLY with the JSON array, no other text.`,
          profile_snapshot: profileSnapshot,
          streaming: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported on this response');
      }

      let accumulatedText = '';
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6).trim();
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.token) {
                accumulatedText += parsed.token;
              }
            } catch (err) {
              console.warn('Failed to parse SSE partial line:', jsonStr, err);
            }
          }
        }
      }

      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.token) {
              accumulatedText += parsed.token;
            }
          } catch (err) {
            console.warn('Failed to parse remaining buffer line:', jsonStr, err);
          }
        }
      }

      const clean = accumulatedText.replace(/```json|```/g, '').trim();
      const checklist = JSON.parse(clean);
      
      if (Array.isArray(checklist) && checklist.length > 0) {
        try {
          sessionStorage.setItem(`checklist-${schemeId}`, JSON.stringify(checklist));
        } catch (e) {
          console.warn('SessionStorage save failed:', e);
        }
        setChecklistModal(prev => prev ? { ...prev, checklist, loading: false } : null);
      } else {
        throw new Error('Invalid JSON format');
      }
    } catch (e: any) {
      console.error('AI checklist generation failed, falling back to static list:', e);
      setChecklistError(e.message || 'AI checklist generation failed');
      // Fallback to static list
      const staticChecklist = baseDocs;
      try {
        sessionStorage.setItem(`checklist-${schemeId}`, JSON.stringify(staticChecklist));
      } catch (err) {
        // Safe check
      }
      setChecklistModal(prev => prev ? { 
        ...prev, 
        checklist: staticChecklist, 
        loading: false 
      } : null);
    } finally {
      setIsGenerating(false);
    }
  }, [profileSnapshot]);

  return {
    handleGenerateChecklist,
    isGenerating,
    checklistError,
    checklistModal,
    setChecklistModal,
  };
}
