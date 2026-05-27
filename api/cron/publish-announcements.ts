import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Publish scheduled announcements whose scheduled_at has passed.
 * Called by Vercel Cron every 15 minutes.
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Missing env vars');

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = req.headers['x-cron-secret'] ?? req.query.secret;
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('announcements')
    .update({ is_published: true })
    .eq('is_published', false)
    .lte('scheduled_at', now)
    .select('id');

  return res.status(200).json({ published: data?.length ?? 0, error: error?.message ?? null });
}
