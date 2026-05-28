import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

/**
 * Email drip campaign. Called daily by cron.
 * Sends contextual emails based on user signup age and activity.
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PUBLIC_URL = process.env.VITE_PUBLIC_SITE_URL ?? 'https://s-learning-kaka.vercel.app';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Missing env vars');
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!resend) return res.status(503).json({ error: 'Email not configured' });
  const secret = req.headers['x-cron-secret'] ?? req.query.secret;
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const { data: users } = await admin.auth.admin.listUsers();
  let sent = 0;

  for (const user of users?.users ?? []) {
    const createdAt = new Date(user.created_at);
    const daysSinceSignup = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
    const email = user.email;
    if (!email) continue;

    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    const dripSent = meta.drip_sent ?? '';

    // Day 3: nudge if no progress
    if (daysSinceSignup === 3 && !dripSent.includes('d3')) {
      const { count } = await admin.from('lesson_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      if ((count ?? 0) === 0) {
        await resend.emails.send({
          from: 'sLearning <noreply@s-learning-kaka.vercel.app>', to: email,
          subject: 'Bạn chưa bắt đầu học — hãy thử ngay!',
          html: `<p>Chào bạn! Bạn đã đăng ký 3 ngày nhưng chưa xem bài nào. <a href="${PUBLIC_URL}/courses">Bắt đầu ngay →</a></p>`,
        });
        await admin.auth.admin.updateUserById(user.id, { user_metadata: { ...meta, drip_sent: dripSent + ',d3' } });
        sent++;
      }
    }

    // Day 7: weekly tip
    if (daysSinceSignup === 7 && !dripSent.includes('d7')) {
      await resend.emails.send({
        from: 'sLearning <noreply@s-learning-kaka.vercel.app>', to: email,
        subject: '💡 Mẹo học hiệu quả trên sLearning',
        html: `<p>Sử dụng flashcard mỗi ngày và đặt mục tiêu tuần để duy trì streak! <a href="${PUBLIC_URL}/dashboard">Xem dashboard →</a></p>`,
      });
      await admin.auth.admin.updateUserById(user.id, { user_metadata: { ...meta, drip_sent: dripSent + ',d7' } });
      sent++;
    }

    // Day 14: new content reminder
    if (daysSinceSignup === 14 && !dripSent.includes('d14')) {
      await resend.emails.send({
        from: 'sLearning <noreply@s-learning-kaka.vercel.app>', to: email,
        subject: '📚 Nội dung mới đang chờ bạn',
        html: `<p>Có bài học mới trên sLearning. <a href="${PUBLIC_URL}/courses">Khám phá ngay →</a></p>`,
      });
      await admin.auth.admin.updateUserById(user.id, { user_metadata: { ...meta, drip_sent: dripSent + ',d14' } });
      sent++;
    }
  }

  return res.status(200).json({ sent });
}
