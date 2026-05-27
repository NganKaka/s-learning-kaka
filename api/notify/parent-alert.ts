import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

/**
 * Send parent alerts:
 * - On quiz submit (called by client after submission)
 * - On inactivity (called by cron daily, alerts if student inactive 3+ days)
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Missing env vars');
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!resend) return res.status(503).json({ error: 'Email not configured' });

  const { type } = req.body ?? {};

  if (type === 'quiz_submit') {
    const { studentId, score, quizTitle } = req.body;
    const { data: links } = await admin.from('parent_links').select('parent_email').eq('notify_email', true).not('parent_email', 'is', null);
    // Find links for this student
    const { data: parentLinks } = await admin.from('parent_links').select('parent_email, enrollment_id').eq('notify_email', true).not('parent_email', 'is', null);
    const { data: enrollments } = await admin.from('enrollments').select('id, user_id').eq('user_id', studentId);
    const enrollmentIds = new Set((enrollments ?? []).map((e) => e.id));
    const relevantLinks = (parentLinks ?? []).filter((l) => enrollmentIds.has(l.enrollment_id));

    let sent = 0;
    for (const link of relevantLinks) {
      if (!link.parent_email) continue;
      await resend.emails.send({
        from: 'sLearning <noreply@s-learning-kaka.vercel.app>',
        to: link.parent_email,
        subject: `Kết quả quiz: ${quizTitle ?? 'Bài kiểm tra'} — ${score?.toFixed(0) ?? '?'}%`,
        html: `<p>Con bạn vừa hoàn thành bài kiểm tra <strong>${quizTitle}</strong> với điểm <strong>${score?.toFixed(0)}%</strong>.</p>`,
      });
      sent++;
    }
    return res.status(200).json({ sent });
  }

  if (type === 'inactivity_check') {
    const secret = req.headers['x-cron-secret'] ?? req.query.secret;
    if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' });

    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const { data: links } = await admin.from('parent_links').select('parent_email, enrollment_id').eq('notify_email', true).not('parent_email', 'is', null);
    let sent = 0;

    for (const link of links ?? []) {
      const { data: enr } = await admin.from('enrollments').select('user_id, course_id').eq('id', link.enrollment_id).single();
      if (!enr) continue;
      const { data: recent } = await admin.from('lesson_progress').select('updated_at').eq('user_id', enr.user_id).order('updated_at', { ascending: false }).limit(1);
      const lastActive = recent?.[0]?.updated_at;
      if (lastActive && lastActive > threeDaysAgo) continue;

      const { data: profile } = await admin.from('profiles').select('display_name').eq('id', enr.user_id).single();
      if (link.parent_email) {
        await resend.emails.send({
          from: 'sLearning <noreply@s-learning-kaka.vercel.app>',
          to: link.parent_email,
          subject: `⚠️ ${profile?.display_name ?? 'Con bạn'} chưa học trong 3 ngày`,
          html: `<p><strong>${profile?.display_name ?? 'Con bạn'}</strong> chưa hoạt động trên sLearning trong hơn 3 ngày.</p>`,
        });
        sent++;
      }
    }
    return res.status(200).json({ sent });
  }

  return res.status(400).json({ error: 'Unknown type' });
}
