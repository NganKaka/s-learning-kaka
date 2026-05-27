import { useEffect, useState } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cacheGet, cacheSet, CACHE_KEYS, TTL } from '../lib/cache';

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_score: number;
  quizzes_completed: number;
  xp_total: number;
}

export default function Leaderboard({ courseId }: { courseId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    (async () => {
      const cached = await cacheGet<LeaderboardEntry[]>(CACHE_KEYS.leaderboard(courseId));
      if (cached && !cancelled) { setEntries(cached); setLoading(false); return; }

      const { data } = await supabase
        .from('course_leaderboard')
        .select('*')
        .eq('course_id', courseId)
        .order('total_score', { ascending: false })
        .limit(20);
      if (!cancelled) {
        const entries = (data ?? []) as LeaderboardEntry[];
        setEntries(entries);
        setLoading(false);
        cacheSet(CACHE_KEYS.leaderboard(courseId), entries, TTL.leaderboard);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-primary" /></div>;
  }

  if (entries.length === 0) {
    return <p className="text-sm text-secondary/60 text-center py-4">Chưa có dữ liệu bảng xếp hạng.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-amber-300">
        <Trophy size={12} /> Bảng xếp hạng
      </p>
      <div className="space-y-2">
        {entries.map((e, i) => (
          <div
            key={e.user_id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              i === 0
                ? 'border-amber-400/40 bg-amber-500/10'
                : i === 1
                  ? 'border-gray-300/30 bg-gray-400/5'
                  : i === 2
                    ? 'border-orange-400/30 bg-orange-500/5'
                    : 'border-white/8 bg-white/[0.02]'
            }`}
          >
            <span className={`font-tech text-sm font-bold tabular-nums w-8 ${
              i === 0 ? 'text-amber-300' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-300' : 'text-secondary/55'
            }`}>
              #{i + 1}
            </span>
            {e.avatar_url ? (
              <img src={e.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                {(e.display_name ?? '?')[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-on-surface truncate">{e.display_name ?? 'Học viên'}</p>
              <p className="font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/50">
                {e.quizzes_completed} quiz · {e.xp_total} XP
              </p>
            </div>
            <span className="font-headline text-lg font-extrabold text-primary tabular-nums">
              {e.total_score.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
