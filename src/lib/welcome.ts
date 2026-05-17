import { supabase } from './supabase';

/**
 * Trigger the welcome email Vercel function. Idempotent on the server side
 * (auth.users.user_metadata.welcome_sent_at gates re-sends), so calling
 * twice is safe. Fire-and-forget — never blocks the UI.
 */
export async function sendWelcomeIfNeeded(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch('/api/notify/welcome', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // best-effort; UI continues regardless
  }
}
