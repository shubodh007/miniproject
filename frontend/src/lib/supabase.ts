import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Try loading from Vite env variables first
  let url = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || '';
  let key = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || ((import.meta as any).env?.VITE_SUPABASE_KEY as string) || '';

  // If not in Vite env, fetch from secure server config endpoint
  if (!url || !key) {
    try {
      const res = await fetch('/api/admin/supabase-config');
      if (res.ok) {
        const data = await res.json();
        url = data.supabaseUrl;
        key = data.supabaseKey;
      }
    } catch (err) {
      console.error('Failed to fetch Supabase config from server:', err);
    }
  }

  if (!url || !key) {
    console.error('Supabase configuration is missing. Ensure SUPABASE_URL and SUPABASE_KEY are set.');
    // Return a dummy client or throw, let's throw to be clear
    throw new Error('Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_KEY.');
  }

  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}
