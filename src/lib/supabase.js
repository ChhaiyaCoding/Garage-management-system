// ─── Supabase client (singleton) ───
// Returns null if env vars are missing — App.jsx falls back to in-memory mode.
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = !!(URL && KEY);

export const supabase = isConfigured
  ? createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
