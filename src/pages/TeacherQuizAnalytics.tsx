import { useEffect, useState } from 'react';
import { Loader2, BarChart3 } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { QuizAttempt, QuizQuestion } from '../lib/quiz';

interface QuizStat {
  quizId: string;
  quizTitle: string;
  lessonTitle: string;
  courseTitle: string;
  attempts: QuizAttempt[];
  questions: QuizQuestion[];
}

export default function TeacherQuizAnalytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<QuizStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Get instructor's courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', user.id);
      if (!courses || cancelled) { setLoading(false); return; }

      const courseIds = courses.map((c) => c.id);
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title, course_id')
        .in('course_id', courseIds);
      if (!lessons || cancelled) { setLoading(false); return; }

      const lessonIds = lessons.map((l) => l.id);
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, lesson_id')
        .in('lesson_id', lessonIds);
      if (!quizzes || cancelled) { setLoading(false); return; }

      const quizIds = quizzes.map((q) => q.id);
      const [{ data: attempts }, { data: questions }] = await Promise.all([
        supabase.from('quiz_attempts').select('*').in('quiz_id', quizIds).in('status', ['submitted', 'graded']),
        supabase.from('quiz_questions').select('*').in('quiz_id', quizIds),
      ]);
      if (cancelled) { setLoading(false); return; }

      const result: QuizStat[] = quizzes.map((q) => {
        const lesson = lessons.find((l) => l.id === q.lesson_id)!;
        const course = courses.find((c) => c.id === lesson.course_id)!;
        return {
          quizId: q.id,
          quizTitle: q.title ?? 'Quiz',
          lessonTitle: lesson.title,
          courseTitle: course.title,
          attempts: ((attempts ?? []) as QuizAttempt[]).filter((a) => a.quiz_id === q.id),
          questions: ((questions ?? []) as QuizQuestion[]).filter((qq) => qq.quiz_id === q.id),
        };
      }).filter((s) => s.attempts.length > 0);

      if (!cancelled) { setStats(result); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return <PageShell><div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-primary" /></div></PageShell>;
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="font-headline text-2xl font-extrabold text-on-surface inline-flex items-center gap-3">
          <BarChart3 size={22} className="text-primary" /> Phân tích quiz
        </h1>

        {stats.length === 0 && (
          <p className="text-sm text-secondary/60 text-center py-8">Chưa có dữ liệu.</p>
        )}

        {stats.map((s) => {
          const scores = s.attempts.map((a) => a.final_score ?? a.auto_score ?? 0);
          const avg = scores.reduce((sum, v) => sum + v, 0) / scores.length;
          const times = s.attempts.map((a) => a.time_spent_seconds);
          const avgTime = times.reduce((sum, v) => sum + v, 0) / times.length;

          // Hardest questions: lowest correct rate
          const qStats = s.questions.map((q) => {
            let correct = 0;
            for (const a of s.attempts) {
              const ans = (a.answers_jsonb ?? {})[q.id];
              if (!ans || ans.kind === 'empty') continue;
              if (q.type === 'single' || q.type === 'multi') {
                const exp = [...(q.correct_jsonb ?? [])].sort();
                const got = ans.kind === 'choice' ? [...ans.choices].sort() : [];
                if (exp.length === got.length && exp.every((v, i) => v === got[i])) correct++;
              }
            }
            return { prompt: q.prompt_md, rate: s.attempts.length > 0 ? (correct / s.attempts.length) * 100 : 0 };
          }).sort((a, b) => a.rate - b.rate);

          // Score distribution buckets
          const buckets = [0, 0, 0, 0, 0]; // 0-20, 20-40, 40-60, 60-80, 80-100
          for (const sc of scores) {
            const idx = Math.min(4, Math.floor(sc / 20));
            buckets[idx]++;
          }
          const maxBucket = Math.max(...buckets, 1);

          return (
            <div key={s.quizId} className="glass-card rounded-2xl p-5 space-y-4">
              <div>
                <p className="font-headline font-bold text-on-surface">{s.quizTitle}</p>
                <p className="text-xs text-secondary/60">{s.courseTitle} · {s.lessonTitle}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Lượt làm" value={String(s.attempts.length)} />
                <StatBox label="Điểm TB" value={`${avg.toFixed(0)}%`} />
                <StatBox label="Thời gian TB" value={`${Math.round(avgTime / 60)}p`} />
              </div>

              {/* Score distribution */}
              <div className="space-y-2">
                <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">Phân bố điểm</p>
                <div className="flex items-end gap-1 h-16">
                  {buckets.map((count, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-cyan-400/60"
                        style={{ height: `${(count / maxBucket) * 100}%`, minHeight: count > 0 ? 4 : 0 }}
                      />
                      <span className="font-tech text-[8px] text-secondary/45">{i * 20}-{(i + 1) * 20}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hardest questions */}
              {qStats.length > 0 && (
                <div className="space-y-2">
                  <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">Câu khó nhất</p>
                  {qStats.slice(0, 3).map((qs, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-on-surface truncate flex-1">{qs.prompt.slice(0, 60)}</span>
                      <span className={`font-tech text-[10px] tabular-nums ${qs.rate < 40 ? 'text-red-300' : 'text-secondary/60'}`}>
                        {qs.rate.toFixed(0)}% đúng
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-center">
      <p className="font-headline text-lg font-extrabold text-primary tabular-nums">{value}</p>
      <p className="font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/55">{label}</p>
    </div>
  );
}
