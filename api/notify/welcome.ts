import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

/**
 * Welcome email sent right after signup. Idempotent: writes a row into
 * profiles.metadata.welcome_sent_at on success so a double-call won't
 * spam the user. We also gate by checking that field before sending.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PUBLIC_SITE_URL = process.env.VITE_PUBLIC_SITE_URL ?? 'https://s-learning-kaka.vercel.app';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!resend) return res.status(503).json({ error: 'Email not configured' });

  const accessToken = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!accessToken) return res.status(401).json({ error: 'Missing auth' });

  const { data: userData, error: authErr } = await admin.auth.getUser(accessToken);
  if (authErr || !userData.user || !userData.user.email) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const userId = userData.user.id;
  const email = userData.user.email;
  const displayName =
    (userData.user.user_metadata as { display_name?: string } | undefined)?.display_name ?? 'bạn';

  // Idempotency: check the auth.users metadata for welcome_sent_at
  const meta = userData.user.user_metadata as { welcome_sent_at?: string } | undefined;
  if (meta?.welcome_sent_at) {
    return res.status(200).json({ ok: true, skipped: 'already_sent' });
  }

  try {
    await resend.emails.send({
      from: 'sLearningKaka <onboarding@resend.dev>',
      to: email,
      subject: 'Chào mừng bạn đến với sLearningKaka',
      html: welcomeHtml({ displayName, coursesUrl: `${PUBLIC_SITE_URL}/courses` }),
    });
  } catch (e) {
    console.error('Welcome email send failed:', e);
    return res.status(500).json({ error: 'send_failed' });
  }

  // Stamp metadata so we don't resend
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...(userData.user.user_metadata ?? {}), welcome_sent_at: new Date().toISOString() },
  });

  return res.status(200).json({ ok: true });
}

function welcomeHtml({ displayName, coursesUrl }: { displayName: string; coursesUrl: string }): string {
  return `
<div style="font-family: -apple-system, system-ui, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0d1b2a; color: #e1e2e7; border-radius: 14px;">
  <div style="border-top: 1px solid rgba(233,195,73,0.4); border-bottom: 1px solid rgba(34,211,238,0.3); padding: 4px 0; margin-bottom: 20px; text-align: center;">
    <span style="font-family: ui-monospace, 'SF Mono', monospace; font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase; color: #e9c349;">sLEARNINGKAKA</span>
  </div>
  <h1 style="color: #e9c349; font-size: 26px; margin: 0 0 12px; line-height: 1.2;">Chào mừng ${escapeHtml(displayName)} 👋</h1>
  <p style="line-height: 1.7; margin: 0 0 14px; color: #bbc9d0;">
    Cảm ơn bạn đã tạo tài khoản trên <strong style="color: #e1e2e7;">sLearningKaka</strong> — nền tảng học tập do
    <strong style="color: #22d3ee;">Vo Hoang Ngan</strong> xây dựng dành cho học sinh Việt Nam.
  </p>
  <p style="line-height: 1.7; margin: 0 0 20px; color: #bbc9d0;">
    Mỗi khoá học gồm <strong>video bài giảng có cấu trúc</strong>, <strong>flashcard ôn tập theo phương pháp lặp lại ngắt quãng</strong>,
    <strong>quiz cuối bài</strong>, và <strong>chứng chỉ hoàn thành</strong>.
  </p>
  <a href="${coursesUrl}" style="display: inline-block; background: #e9c349; color: #0d1b2a; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 0 24px; letter-spacing: 0.06em;">
    Xem khoá học
  </a>
  <p style="line-height: 1.6; margin: 24px 0 0; font-size: 13px; color: #6b7785;">
    Có câu hỏi? Trả lời email này hoặc liên hệ
    <a href="mailto:vohoangngan85@gmail.com" style="color: #22d3ee;">vohoangngan85@gmail.com</a>.
  </p>
  <p style="margin-top: 20px; font-size: 11px; color: #4b5563;">— Built with care, in HCMC</p>
</div>`.trim();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
