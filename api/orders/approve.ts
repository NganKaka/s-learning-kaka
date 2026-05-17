import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

/**
 * Approve a pending order — the only path that creates an enrollment.
 * Service-role key is used so we bypass RLS; we still gate by checking
 * the caller's auth.uid() is an instructor.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PUBLIC_SITE_URL = process.env.VITE_PUBLIC_SITE_URL ?? 'https://s-learning-kaka.vercel.app';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  // Will be caught at runtime; surface a clear error
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify caller is signed in + is an instructor.
  const accessToken = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!accessToken) return res.status(401).json({ error: 'Missing auth' });

  const { data: userData, error: authErr } = await admin.auth.getUser(accessToken);
  if (authErr || !userData.user) return res.status(401).json({ error: 'Invalid token' });

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('is_instructor')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileErr || !profile?.is_instructor) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { orderId } = (req.body ?? {}) as { orderId?: string };
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  // Fetch order + course + student email atomically via select.
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, user_id, course_id, amount_vnd, memo_code, status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'pending') {
    return res.status(409).json({ error: `Order is ${order.status}, not pending` });
  }

  // Insert enrollment (idempotent via unique user_id+course_id)
  const { error: enrollErr } = await admin
    .from('enrollments')
    .upsert(
      {
        user_id: order.user_id,
        course_id: order.course_id,
        order_id: order.id,
        status: 'active',
        granted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_id' },
    );
  if (enrollErr) return res.status(500).json({ error: enrollErr.message });

  // Mark order confirmed
  const { error: confirmErr } = await admin
    .from('orders')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: userData.user.id,
    })
    .eq('id', order.id);
  if (confirmErr) return res.status(500).json({ error: confirmErr.message });

  // Receipt email (best effort — don't fail approval if email fails)
  if (resend) {
    try {
      const { data: studentUser } = await admin.auth.admin.getUserById(order.user_id);
      const { data: course } = await admin
        .from('courses')
        .select('title, slug')
        .eq('id', order.course_id)
        .maybeSingle();

      if (studentUser.user?.email && course) {
        const learnUrl = `${PUBLIC_SITE_URL}/courses/${course.slug}`;
        await resend.emails.send({
          from: 'sLearningKaka <onboarding@resend.dev>',
          to: studentUser.user.email,
          subject: `Đã kích hoạt khoá học — ${course.title}`,
          html: receiptHtml({
            studentName: studentUser.user.user_metadata?.display_name ?? 'bạn',
            courseTitle: course.title,
            amountVnd: order.amount_vnd,
            memo: order.memo_code,
            learnUrl,
          }),
        });
      }
    } catch (e) {
      console.error('Resend send failed (non-fatal):', e);
    }
  }

  return res.status(200).json({ ok: true });
}

function receiptHtml({
  studentName,
  courseTitle,
  amountVnd,
  memo,
  learnUrl,
}: {
  studentName: string;
  courseTitle: string;
  amountVnd: number;
  memo: string;
  learnUrl: string;
}): string {
  const formatted = new Intl.NumberFormat('vi-VN').format(amountVnd) + ' ₫';
  return `
<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #0d1b2a; color: #e1e2e7; border-radius: 12px;">
  <h1 style="color: #e9c349; font-size: 22px; margin: 0 0 12px;">Đã kích hoạt khoá học!</h1>
  <p style="line-height: 1.6;">Xin chào ${escapeHtml(studentName)},</p>
  <p style="line-height: 1.6;">Cảm ơn bạn đã đăng ký khoá <strong>${escapeHtml(courseTitle)}</strong>. Thanh toán <strong>${formatted}</strong> đã được xác nhận.</p>
  <div style="border-top: 1px solid #283444; margin: 20px 0;"></div>
  <p style="line-height: 1.6;">Mã đơn hàng: <code style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">${escapeHtml(memo)}</code></p>
  <a href="${learnUrl}" style="display: inline-block; background: #e9c349; color: #0d1b2a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 12px;">Bắt đầu học</a>
  <p style="margin-top: 32px; font-size: 12px; color: #bbc9d0;">— sLearningKaka, dạy bởi Vo Hoang Ngan</p>
</div>`.trim();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
