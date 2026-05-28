import { supabase } from './supabase';

// ---- Audit Log ----
export async function logAudit(actorId: string, action: string, targetType?: string, targetId?: string, metadata?: Record<string, unknown>) {
  await supabase.from('audit_log').insert({ actor_id: actorId, action, target_type: targetType ?? null, target_id: targetId ?? null, metadata: metadata ?? null });
}

// ---- Content Moderation ----
export async function flagContent(reporterId: string, contentType: string, contentId: string, reason?: string) {
  await supabase.from('content_flags').insert({ reporter_id: reporterId, content_type: contentType, content_id: contentId, reason: reason ?? null });
}

export async function getFlags(): Promise<Array<{ id: string; content_type: string; content_id: string; reason: string | null; status: string; created_at: string }>> {
  const { data } = await supabase.from('content_flags').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  return (data ?? []) as Array<{ id: string; content_type: string; content_id: string; reason: string | null; status: string; created_at: string }>;
}

export async function resolveFlag(id: string, status: 'resolved' | 'dismissed') {
  await supabase.from('content_flags').update({ status }).eq('id', id);
}

// ---- Leaderboard Seasons ----
export async function archiveLeaderboardSeason(courseId: string) {
  const month = new Date().toISOString().slice(0, 7) + '-01'; // first of month
  const { data } = await supabase.from('course_leaderboard').select('*').eq('course_id', courseId).order('total_score', { ascending: false }).limit(10);
  await supabase.from('leaderboard_seasons').upsert({ course_id: courseId, month, rankings: data ?? [] }, { onConflict: 'course_id,month' });
}

// ---- Social Sharing ----
export function getShareUrl(type: 'quiz_score' | 'certificate', params: { score?: number; code?: string; courseTitle?: string }) {
  const base = window.location.origin;
  if (type === 'certificate' && params.code) return `${base}/verify/${params.code}`;
  return base;
}

export function shareToFacebook(url: string) {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
}

export function shareToZalo(url: string, title: string) {
  window.open(`https://zalo.me/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank');
}

// ---- Rate Limiting (simple in-memory for client) ----
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) ?? [];
  const recent = timestamps.filter((t) => now - t < 60000);
  if (recent.length >= maxPerMinute) return false;
  recent.push(now);
  rateLimitMap.set(key, recent);
  return true;
}

// ---- Progress Animations (confetti trigger) ----
export function triggerConfetti() {
  // Simple CSS-based confetti burst
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
  document.body.appendChild(container);
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    const colors = ['#67e8f9', '#fbbf24', '#34d399', '#f472b6', '#a78bfa'];
    piece.style.cssText = `position:absolute;width:8px;height:8px;background:${colors[i % 5]};border-radius:2px;top:-10px;left:${Math.random() * 100}%;animation:confetti-fall ${1.5 + Math.random()}s ease-out forwards;animation-delay:${Math.random() * 0.3}s`;
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 3000);
}

// Add confetti keyframes to document if not present
if (typeof document !== 'undefined' && !document.getElementById('confetti-style')) {
  const style = document.createElement('style');
  style.id = 'confetti-style';
  style.textContent = `@keyframes confetti-fall{to{transform:translateY(100vh) rotate(720deg);opacity:0}}`;
  document.head.appendChild(style);
}
