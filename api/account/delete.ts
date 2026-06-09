import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, getBearerToken, verifyToken, http } from '../lib/supabase-admin';

/**
 * Delete the calling user's own account.
 *
 * Security: the user id is derived ONLY from the verified access token — never
 * from the request body — so a caller can only ever delete themselves. The
 * service-role key stays server-side. FK cascades remove owned rows; storage
 * objects under the user's avatar folder are best-effort cleaned.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return http.methodNotAllowed(res);

  const token = getBearerToken(req.headers.authorization ?? null);
  if (!token) return http.unauthorized(res, 'Missing auth');

  const { user, error } = await verifyToken(token);
  if (error || !user) return http.unauthorized(res, 'Invalid token');

  // Best-effort: remove the user's avatar objects before deleting the account.
  try {
    const { data: files } = await supabaseAdmin.storage.from('avatars').list(user.id);
    if (files && files.length > 0) {
      await supabaseAdmin.storage.from('avatars').remove(files.map((f) => `${user.id}/${f.name}`));
    }
  } catch (e) {
    console.error('Avatar cleanup failed (non-fatal):', e);
  }

  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (delErr) return res.status(500).json({ error: delErr.message });

  return res.status(200).json({ ok: true });
}
