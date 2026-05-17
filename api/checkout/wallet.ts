import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Pay for a course using the student's wallet balance.
 * Atomic: debits wallet via SECURITY DEFINER RPC, then upserts enrollment.
 * The wallet_debit RPC raises if balance is insufficient, so the enrollment
 * insert only runs after the debit succeeds.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const accessToken = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!accessToken) return res.status(401).json({ error: 'Missing auth' });

  const { data: userData, error: authErr } = await admin.auth.getUser(accessToken);
  if (authErr || !userData.user) return res.status(401).json({ error: 'Invalid token' });

  const { courseId } = (req.body ?? {}) as { courseId?: string };
  if (!courseId) return res.status(400).json({ error: 'courseId required' });

  const userId = userData.user.id;

  // Fetch course price
  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select('id, slug, title, price_vnd, status')
    .eq('id', courseId)
    .maybeSingle();
  if (courseErr || !course) return res.status(404).json({ error: 'Course not found' });
  if (course.status !== 'published') return res.status(400).json({ error: 'Course not available' });

  // Already enrolled?
  const { data: existing } = await admin
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  if (existing) {
    return res.status(409).json({ error: 'Bạn đã đăng ký khoá này rồi.' });
  }

  // Create the order row first so we have an id to attach to the wallet tx
  const memo = `WALLET-${course.slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const { data: orderRow, error: orderErr } = await admin
    .from('orders')
    .insert({
      user_id: userId,
      course_id: courseId,
      amount_vnd: course.price_vnd,
      payment_method: 'wallet',
      memo_code: memo,
      kind: 'purchase',
      status: 'pending',
    })
    .select('id')
    .single();
  if (orderErr || !orderRow) return res.status(500).json({ error: orderErr?.message ?? 'Order create failed' });

  // Debit wallet (raises if balance insufficient)
  const { error: debitErr } = await admin.rpc('wallet_debit', {
    p_user_id: userId,
    p_amount: course.price_vnd,
    p_kind: 'purchase',
    p_order_id: orderRow.id,
    p_memo: `Mua khoá ${course.title}`,
  });
  if (debitErr) {
    // Roll back the empty order
    await admin.from('orders').delete().eq('id', orderRow.id);
    return res.status(400).json({ error: 'Số dư không đủ. Vui lòng nạp thêm tiền vào tài khoản.' });
  }

  // Insert enrollment
  const { error: enrollErr } = await admin
    .from('enrollments')
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        order_id: orderRow.id,
        status: 'active',
        granted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_id' },
    );
  if (enrollErr) return res.status(500).json({ error: enrollErr.message });

  // Mark order confirmed
  await admin
    .from('orders')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', orderRow.id);

  return res.status(200).json({ ok: true, courseSlug: course.slug });
}
