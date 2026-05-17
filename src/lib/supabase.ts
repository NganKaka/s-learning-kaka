import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    'Supabase env vars missing. Copy .env.example to .env.local and fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.',
  );
}

/**
 * Storage shim that lets us swap between localStorage (persists across
 * browser restarts) and sessionStorage (clears on tab close), driven by
 * the "Remember me" checkbox on /login. Default is localStorage.
 *
 * If the user un-checks Remember, Login.tsx calls setSessionPersistence
 * (false) before signIn so the resulting session lands in sessionStorage.
 */
const noopStore: Storage = {
  length: 0,
  clear: () => {},
  getItem: () => null,
  key: () => null,
  removeItem: () => {},
  setItem: () => {},
};

let currentStore: Storage = typeof window === 'undefined' ? noopStore : window.localStorage;

if (typeof window !== 'undefined') {
  const saved = window.localStorage.getItem('sLearningKaka.rememberMe');
  if (saved === '0') currentStore = window.sessionStorage;
}

const storage = {
  getItem: (key: string) => currentStore.getItem(key),
  setItem: (key: string, value: string) => currentStore.setItem(key, value),
  removeItem: (key: string) => currentStore.removeItem(key),
};

export function setSessionPersistence(persist: boolean) {
  if (typeof window === 'undefined') return;
  const next = persist ? window.localStorage : window.sessionStorage;
  if (next === currentStore) return;
  // Migrate existing supabase auth keys so the active session survives.
  const keys: string[] = [];
  for (let i = 0; i < currentStore.length; i += 1) {
    const k = currentStore.key(i);
    if (k && (k.startsWith('sb-') || k === 'supabase.auth.token')) keys.push(k);
  }
  for (const k of keys) {
    const v = currentStore.getItem(k);
    if (v !== null) next.setItem(k, v);
    currentStore.removeItem(k);
  }
  currentStore = next;
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage,
  },
});
