import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { WelfareScheme } from '../types';

export function useSchemes() {
  const [schemes, setSchemes] = useState<WelfareScheme[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await getSupabaseClient();
      const { data, error: sbError } = await client
        .from('schemes')
        .select('*')
        .order('created_at', { ascending: false });

      if (sbError) throw sbError;
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
      const client = await getSupabaseClient();
      const { data, error: sbError } = await client
        .from('schemes')
        .insert([scheme])
        .select();

      if (sbError) throw sbError;
      if (data && data[0]) {
        setSchemes((prev) => [data[0], ...prev]);
        return data[0];
      }
      throw new Error('No data returned on create');
    } catch (err: any) {
      console.error('Error creating scheme:', err);
      setError(err.message || 'Failed to create scheme');
      throw err;
    }
  };

  const updateScheme = async (id: string, scheme: Partial<WelfareScheme>): Promise<WelfareScheme> => {
    setError(null);
    try {
      const client = await getSupabaseClient();
      // Remove fields that cannot be updated
      const { id: _, created_at: __, updated_at: ___, ...updatePayload } = scheme;
      const { data, error: sbError } = await client
        .from('schemes')
        .update(updatePayload)
        .eq('id', id)
        .select();

      if (sbError) throw sbError;
      if (data && data[0]) {
        setSchemes((prev) => prev.map((s) => (s.id === id ? data[0] : s)));
        return data[0];
      }
      throw new Error('No data returned on update');
    } catch (err: any) {
      console.error('Error updating scheme:', err);
      setError(err.message || 'Failed to update scheme');
      throw err;
    }
  };

  const deleteScheme = async (id: string): Promise<void> => {
    setError(null);
    try {
      const client = await getSupabaseClient();
      const { error: sbError } = await client
        .from('schemes')
        .delete()
        .eq('id', id);

      if (sbError) throw sbError;
      setSchemes((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      console.error('Error deleting scheme:', err);
      setError(err.message || 'Failed to delete scheme');
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
  };
}
