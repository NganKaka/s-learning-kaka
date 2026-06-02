/**
 * Shared Supabase admin client for API routes.
 * Eliminates duplicate admin client setup across all API routes.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Extract Bearer token from Authorization header.
 */
export function getBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+/i);
  return match ? authorization.slice(match[0].length) : null;
}

/**
 * Verify an access token and return the user data.
 */
export async function verifyToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: error?.message ?? 'Invalid token' };
  }
  return { user: data.user, error: null };
}

/**
 * Common HTTP response helpers.
 */
export const http = {
  unauthorized: (res: { status: (code: number) => { json: (body: unknown) => unknown } }, message = 'Unauthorized') =>
    res.status(401).json({ error: message }),

  forbidden: (res: { status: (code: number) => { json: (body: unknown) => unknown } }, message = 'Forbidden') =>
    res.status(403).json({ error: message }),

  notFound: (res: { status: (code: number) => { json: (body: unknown) => unknown } }, message = 'Not found') =>
    res.status(404).json({ error: message }),

  badRequest: (res: { status: (code: number) => { json: (body: unknown) => unknown } }, message: string) =>
    res.status(400).json({ error: message }),

  methodNotAllowed: (res: { status: (code: number) => { json: (body: unknown) => unknown } }) =>
    res.status(405).json({ error: 'Method not allowed' }),
};
