import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, getBearerToken, verifyToken, http } from '../lib/supabase-admin';

/**
 * Delete the calling user's own account.
 *
 * Security: the user id is derived ONLY from the verified access token — never
 * from the request body — so a caller can only ever delete themselves. The
 * service-role key stays server-side. FK cascades remove owned DB rows; storage
 * objects are NOT cascaded, so they are removed explicitly (best-effort).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return http.methodNotAllowed(res);

  const token = getBearerToken(req.headers.authorization ?? null);
  if (!token) return http.unauthorized(res, 'Missing auth');

  const { user, error } = await verifyToken(token);
  if (error || !user) return http.unauthorized(res, 'Invalid token');

  // Best-effort: remove the user's storage objects (FK cascade covers DB rows
  // only). Avatars are flat (<uid>/file); quiz submissions are nested
  // (<uid>/<attemptId>/file) so we descend one level.
  try {
    await removeUserObjects('avatars', user.id);
    await removeUserObjects('quiz-submissions', user.id);
  } catch (e) {
    console.error('Storage cleanup failed (non-fatal):', e);
  }

  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (delErr) return res.status(500).json({ error: delErr.message });

  return res.status(200).json({ ok: true });
}

/** Remove every object under `<uid>/` in a bucket, descending one folder level
 *  (Supabase `list` is non-recursive; folder entries have a null `id`). */
async function removeUserObjects(bucket: string, uid: string): Promise<void> {
  const { data: entries } = await supabaseAdmin.storage.from(bucket).list(uid);
  if (!entries || entries.length === 0) return;
  const paths: string[] = [];
  for (const entry of entries) {
    if (entry.id) {
      paths.push(`${uid}/${entry.name}`); // a file
    } else {
      const { data: sub } = await supabaseAdmin.storage.from(bucket).list(`${uid}/${entry.name}`);
      for (const f of sub ?? []) paths.push(`${uid}/${entry.name}/${f.name}`);
    }
  }
  if (paths.length > 0) await supabaseAdmin.storage.from(bucket).remove(paths);
}
