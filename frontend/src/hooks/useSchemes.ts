import { useState, useEffect, useCallback } from 'react';
import { WelfareScheme } from '../types';

export function useSchemes() {
  const [schemes, setSchemes] = useState<WelfareScheme[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/schemes');
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      setSchemes(data || []);
    } catch (err: any) {
      console.error('Error fetching schemes:', err);
      setError(err.message || 'Failed to fetch schemes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  const createScheme = async (scheme: Omit<WelfareScheme, 'id' | 'created_at' | 'updated_at'>): Promise<WelfareScheme> => {
    setError(null);
    try {
      const res = await fetch('/api/admin/schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheme)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to create scheme (Status ${res.status})`);
      }
      const newScheme = await res.json();
      setSchemes((prev) => [newScheme, ...prev]);
      return newScheme;
    } catch (err: any) {
      console.error('Error creating scheme:', err);
      setError(err.message || 'Failed to create scheme');
      throw err;
    }
  };

  const updateScheme = async (id: string, scheme: Partial<WelfareScheme>): Promise<WelfareScheme> => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/schemes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheme)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to update scheme (Status ${res.status})`);
      }
      const updated = await res.json();
      setSchemes((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    } catch (err: any) {
      console.error('Error updating scheme:', err);
      setError(err.message || 'Failed to update scheme');
      throw err;
    }
  };

  const deleteScheme = async (id: string): Promise<void> => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/schemes/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to delete scheme`);
      }
      setSchemes((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      console.error('Error deleting scheme:', err);
      setError(err.message || 'Failed to delete scheme');
      throw err;
    }
  };

  const getSchemeVersions = async (id: string): Promise<any[]> => {
    try {
      const res = await fetch(`/api/admin/schemes/${id}/versions`);
      if (!res.ok) throw new Error("Failed to fetch versions");
      return await res.json();
    } catch (err: any) {
      console.error('Error fetching scheme versions:', err);
      return [];
    }
  };

  const rollbackScheme = async (id: string, versionId: string): Promise<WelfareScheme> => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/schemes/${id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Rollback failed`);
      }
      const reverted = await res.json();
      setSchemes((prev) => prev.map((s) => (s.id === id ? reverted : s)));
      return reverted;
    } catch (err: any) {
      console.error('Error rolling back scheme:', err);
      setError(err.message || 'Failed to roll back scheme');
      throw err;
    }
  };

  return {
    schemes,
    loading,
    error,
    refetch: fetchSchemes,
    createScheme,
    updateScheme,
    deleteScheme,
    getSchemeVersions,
    rollbackScheme
  };
}
