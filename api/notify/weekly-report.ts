import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

/**
 * Weekly progress report email for parents.
 * Called by a cron job (e.g. Vercel Cron) every Sunday.
 * Sends a summary to each parent with notify_email=true.
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

  // Verify cron secret or admin call
  const secret = req.headers['x-cron-secret'] ?? req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get all parent links with notify_email=true and parent_email set
  const { data: links } = await admin
    .from('parent_links')
    .select('*, enrollments(user_id, course_id)')
    .eq('notify_email', true)
    .not('parent_email', 'is', null);

  if (!links || links.length === 0) {
    return res.status(200).json({ sent: 0 });
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  let sent = 0;

  for (const link of links) {
    const enrollment = link.enrollments as { user_id: string; course_id: string } | null;
    if (!enrollment) continue;

    const { user_id: studentId, course_id: courseId } = enrollment;

    // Get student name
    const { data: profile } = await admin
      .from('profiles')
      .select('display_name, streak_current, xp_total')
      .eq('id', studentId)
      .single();

    // Get course title
    const { data: course } = await admin
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single();

    // Lessons completed this week
    const { count: lessonsCount } = await admin
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', studentId)
      .eq('course_id', courseId)
      .gte('updated_at', weekAgo);

    // Quiz attempts this week
    const { data: attempts } = await admin
      .from('quiz_attempts')
      .select('auto_score, final_score')
      .eq('user_id', studentId)
      .in('status', ['submitted', 'graded'])
      .gte('submitted_at', weekAgo);

    const scores = (attempts ?? []).map((a) => a.final_score ?? a.auto_score ?? 0);
    const avgScore = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null;

    // Study time this week
    const { data: sessions } = await admin
      .from('study_sessions')
      .select('duration_seconds')
      .eq('user_id', studentId)
      .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));

    const totalMinutes = Math.round(
      (sessions ?? []).reduce((s, sess) => s + (sess.duration_seconds ?? 0), 0) / 60,
    );

    const studentName = profile?.display_name ?? 'Học viên';
    const courseName = course?.title ?? 'Khoá học';

    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0891b2;">📊 Báo cáo tuần — ${studentName}</h2>
        <p style="color: #64748b;">Khoá: <strong>${courseName}</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">📚 Bài học hoàn thành</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${lessonsCount ?? 0}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">📝 Bài kiểm tra</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${scores.length} lượt</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">📈 Điểm trung bình</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${avgScore !== null ? avgScore.toFixed(0) + '%' : '—'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">⏱️ Thời gian học</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${totalMinutes} phút</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">🔥 Streak</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${profile?.streak_current ?? 0} ngày</td></tr>
          <tr><td style="padding: 8px;">⭐ Tổng XP</td><td style="padding: 8px; text-align: right; font-weight: bold;">${profile?.xp_total ?? 0}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 14px;">
          <a href="${PUBLIC_SITE_URL}/parent" style="color: #0891b2;">Xem chi tiết →</a>
        </p>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'sLearning <noreply@s-learning-kaka.vercel.app>',
        to: link.parent_email,
        subject: `Báo cáo tuần: ${studentName} — ${courseName}`,
        html,
      });
      sent++;
    } catch (e) {
      console.error('Failed to send weekly report:', e);
    }
  }

  return res.status(200).json({ sent });
}
