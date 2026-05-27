import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, FileText, ExternalLink } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { QuizAttempt, QuizQuestion } from '../lib/quiz';

interface PendingAttempt {
  attempt: QuizAttempt;
  student_name: string | null;
  course_title: string;
  lesson_title: string;
  questions: QuizQuestion[];
}

export default function TeacherGrading() {
  const { user } = useAuth();
  const [items, setItems] = useState<PendingAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { points: number; comment: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Get all submitted attempts for instructor's courses that need grading
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true });

      if (cancelled || !attempts) { setLoading(false); return; }

      const pending: PendingAttempt[] = [];
      for (const a of attempts as QuizAttempt[]) {
        // Get quiz + lesson + course info
        const { data: quiz } = await supabase
          .from('quizzes')
          .select('id, lesson_id, title')
          .eq('id', a.quiz_id)
          .single();
        if (!quiz) continue;

        const { data: lesson } = await supabase
          .from('lessons')
          .select('id, title, course_id')
          .eq('id', quiz.lesson_id)
          .single();
        if (!lesson) continue;

        const { data: course } = await supabase
          .from('courses')
          .select('title, instructor_id')
          .eq('id', lesson.course_id)
          .single();
        if (!course || course.instructor_id !== user.id) continue;

        // Check if has teacher-graded questions
        const { data: questions } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', a.quiz_id)
          .order('order_index', { ascending: true });

        const qs = (questions ?? []) as QuizQuestion[];
        const needsGrading = qs.some(
          (q) => q.type === 'file' || (q.type === 'text' && !(q.expected_text ?? '').trim()),
        );
        if (!needsGrading) continue;

        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', a.user_id)
          .single();

        pending.push({
          attempt: a,
          student_name: profile?.display_name ?? null,
          course_title: course.title,
          lesson_title: lesson.title,
          questions: qs,
        });
      }
      if (!cancelled) {
        setItems(pending);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const startGrading = (item: PendingAttempt) => {
    setActiveId(item.attempt.id);
    // Pre-fill feedback from existing teacher_feedback or empty
    const existing = item.attempt.teacher_feedback ?? {};
    const fb: Record<string, { points: number; comment: string }> = {};
    for (const q of item.questions) {
      if (q.type === 'file' || (q.type === 'text' && !(q.expected_text ?? '').trim())) {
        fb[q.id] = {
          points: (existing as Record<string, { points: number; comment: string | null }>)[q.id]?.points ?? 0,
          comment: (existing as Record<string, { points: number; comment: string | null }>)[q.id]?.comment ?? '',
        };
      }
    }
    setFeedback(fb);
  };

  const submitGrading = async (item: PendingAttempt) => {
    setSaving(true);
    // Calculate final score: auto-graded points + teacher-awarded points
    let totalPoints = 0;
    let awardedPoints = 0;
    const answers = item.attempt.answers_jsonb ?? {};

    for (const q of item.questions) {
      totalPoints += q.points;
      if (feedback[q.id] !== undefined) {
        awardedPoints += feedback[q.id].points;
      } else {
        // Auto-graded
        if (q.type === 'single' || q.type === 'multi') {
          const correct = [...(q.correct_jsonb ?? [])].sort();
          const a = answers[q.id];
          const picked = a?.kind === 'choice' ? [...a.choices].sort() : [];
          if (correct.length === picked.length && correct.every((v, i) => v === picked[i])) {
            awardedPoints += q.points;
          }
        } else if (q.type === 'text' && q.expected_text) {
          const got = answers[q.id]?.kind === 'text' ? (answers[q.id] as { kind: 'text'; text: string }).text.trim().toLowerCase() : '';
          if (got === q.expected_text.trim().toLowerCase()) awardedPoints += q.points;
        }
      }
    }

    const finalScore = totalPoints > 0 ? +((awardedPoints / totalPoints) * 100).toFixed(2) : 0;

    await supabase
      .from('quiz_attempts')
      .update({
        teacher_feedback: feedback,
        final_score: finalScore,
        status: 'graded',
      })
      .eq('id', item.attempt.id);

    setSaving(false);
    setActiveId(null);
    setItems((prev) => prev.filter((i) => i.attempt.id !== item.attempt.id));
  };

  if (loading) {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 flex justify-center">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="font-headline text-2xl font-extrabold text-on-surface">
          Chấm bài ({items.length} bài chờ)
        </h1>

        {items.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center text-secondary/65 text-sm">
            Không có bài nào cần chấm tay.
          </div>
        )}

        {items.map((item) => (
          <div key={item.attempt.id} className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-headline font-bold text-on-surface">
                  {item.student_name ?? 'Học viên'} — Lượt #{item.attempt.attempt_number}
                </p>
                <p className="text-xs text-secondary/60">
                  {item.course_title} · {item.lesson_title}
                </p>
              </div>
              {activeId !== item.attempt.id && (
                <button
                  onClick={() => startGrading(item)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25"
                >
                  Chấm điểm
                </button>
              )}
            </div>

            {activeId === item.attempt.id && (
              <div className="space-y-4">
                {item.questions
                  .filter((q) => q.type === 'file' || (q.type === 'text' && !(q.expected_text ?? '').trim()))
                  .map((q, qi) => {
                    const answer = (item.attempt.answers_jsonb ?? {})[q.id];
                    return (
                      <div key={q.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                        <p className="text-sm font-bold text-on-surface">
                          <span className="text-primary mr-2">{qi + 1}.</span>
                          {q.prompt_md}
                          <span className="ml-2 font-tech text-[9px] text-secondary/55">({q.points} đ)</span>
                        </p>

                        {q.type === 'text' && (
                          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                            {answer?.kind === 'text' ? answer.text || <em className="text-secondary/50">Trống</em> : <em className="text-secondary/50">Trống</em>}
                          </div>
                        )}

                        {q.type === 'file' && answer?.kind === 'file' && (
                          <div className="space-y-1">
                            {answer.file_ids.map((fid) => (
                              <p key={fid} className="inline-flex items-center gap-1 text-xs text-cyan-200">
                                <FileText size={11} /> {fid.slice(0, 8)}…
                                <ExternalLink size={10} />
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <label className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
                            Điểm:
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={q.points}
                            value={feedback[q.id]?.points ?? 0}
                            onChange={(e) =>
                              setFeedback((f) => ({
                                ...f,
                                [q.id]: { ...f[q.id], points: Math.min(q.points, Math.max(0, Number(e.target.value) || 0)) },
                              }))
                            }
                            className="w-20 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
                          />
                          <span className="text-xs text-secondary/45">/ {q.points}</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Nhận xét (tuỳ chọn)…"
                          value={feedback[q.id]?.comment ?? ''}
                          onChange={(e) =>
                            setFeedback((f) => ({ ...f, [q.id]: { ...f[q.id], points: f[q.id]?.points ?? 0, comment: e.target.value } }))
                          }
                          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
                        />
                      </div>
                    );
                  })}

                <div className="flex justify-end">
                  <button
                    onClick={() => submitGrading(item)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Hoàn tất chấm
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
