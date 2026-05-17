import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    'Supabase env vars missing. Copy .env.example to .env.local and fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.',
  );
}

/**
 * Browser-safe Supabase client. Uses the anon key — RLS policies in the
 * database enforce who can read/write what. Never use the service_role
 * key in client code (it'd bypass RLS).
 */
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
