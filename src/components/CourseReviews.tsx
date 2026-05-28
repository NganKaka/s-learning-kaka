import { useEffect, useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Review {
  id: string;
  user_id: string;
  rating: number;
  content: string | null;
  instructor_reply: string | null;
  created_at: string;
  display_name?: string;
}

export default function CourseReviews({ courseId, userId, enrolled }: { courseId: string; userId?: string; enrolled?: boolean }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myContent, setMyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('course_reviews').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
      const revs = (data ?? []) as Review[];
      if (revs.length > 0) {
        const uids = [...new Set(revs.map((r) => r.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', uids);
        const pMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
        for (const r of revs) r.display_name = pMap.get(r.user_id) ?? undefined;
      }
      setReviews(revs);
      if (userId) setHasReviewed(revs.some((r) => r.user_id === userId));
      setLoading(false);
    })();
  }, [courseId, userId]);

  const submit = async () => {
    if (!userId || myRating === 0) return;
    setSubmitting(true);
    await supabase.from('course_reviews').insert({ user_id: userId, course_id: courseId, rating: myRating, content: myContent.trim() || null });
    setSubmitting(false);
    setHasReviewed(true);
    setReviews((prev) => [{ id: 'new', user_id: userId, rating: myRating, content: myContent.trim() || null, instructor_reply: null, created_at: new Date().toISOString(), display_name: 'Bạn' }, ...prev]);
  };

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-amber-300">Đánh giá</p>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={12} className={s <= Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-secondary/30'} />)}
            <span className="font-tech text-[10px] text-secondary/55 ml-1">{avg.toFixed(1)} ({reviews.length})</span>
          </div>
        )}
      </div>

      {enrolled && !hasReviewed && userId && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setMyRating(s)} className="p-0.5">
                <Star size={20} className={s <= myRating ? 'text-amber-400 fill-amber-400' : 'text-secondary/30'} />
              </button>
            ))}
          </div>
          <textarea value={myContent} onChange={(e) => setMyContent(e.target.value)} rows={2} placeholder="Nhận xét (tuỳ chọn)…" className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none resize-y" />
          <button onClick={submit} disabled={submitting || myRating === 0} className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-amber-200 hover:bg-amber-500/25 disabled:opacity-50">
            Gửi đánh giá
          </button>
        </div>
      )}

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-on-surface">{r.display_name ?? 'Học viên'}</span>
              <div className="flex">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={10} className={s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-secondary/30'} />)}</div>
            </div>
            {r.content && <p className="text-sm text-secondary/80">{r.content}</p>}
            {r.instructor_reply && <p className="text-xs text-cyan-200/80 mt-1 pl-3 border-l-2 border-cyan-300/30">{r.instructor_reply}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
