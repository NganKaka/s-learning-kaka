import { useCallback, useEffect, useId, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, Loader2, Sparkles, Clock, BookOpen } from 'lucide-react';
import PageShell from '../components/PageShell';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { QuizQuestion, AnswerValue } from '../lib/quiz';
import { gradeAttempt, formatTimeLeft } from '../lib/quiz';

export default function ExamSimulation() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  // Tracks whether the low-time warning has been announced once (avoid repeat).
  const [lowTimeAnnounced, setLowTimeAnnounced] = useState(false);

  // Stable ID for the live-region node so it isn't re-created on each render.
  const liveRegionId = useId();

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!course) {
        setLoading(false);
        return;
      }
      setCourseId(course.id);
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', course.id);
      if (!lessons) {
        setLoading(false);
        return;
      }
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id')
        .in(
          'lesson_id',
          lessons.map((l) => l.id),
        );
      if (!quizzes || quizzes.length === 0) {
        setLoading(false);
        return;
      }
      const { data: qs } = await supabase
        .from('quiz_questions')
        .select('*')
        .in(
          'quiz_id',
          quizzes.map((q) => q.id),
        );
      // Shuffle and pick up to 30
      const shuffled = ((qs ?? []) as QuizQuestion[])
        .filter((q) => q.type === 'single' || q.type === 'multi')
        .sort(() => Math.random() - 0.5)
        .slice(0, 30);
      setQuestions(shuffled);
      setLoading(false);
    })();
  }, [slug]);

  // Timer — unchanged logic; only aria-live annotation added below.
  useEffect(() => {
    if (!started || submitted) return;
    const duration = questions.length * 60; // 1 min per question
    setTimeLeft(duration);
    setLowTimeAnnounced(false);
    const id = setInterval(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearInterval(id);
  }, [started, submitted, questions.length]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0 && started && !submitted) handleSubmit();
  }, [timeLeft]);

  // Announce the low-time warning once via the live region when crossing 60 s.
  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 60 && timeLeft > 0 && !lowTimeAnnounced) {
      setLowTimeAnnounced(true);
    }
  }, [timeLeft, lowTimeAnnounced]);

  const handleSubmit = useCallback(() => {
    const graded = gradeAttempt(questions, answers);
    const pct = graded.totalMax > 0 ? (graded.autoGradedPoints / graded.totalMax) * 100 : 0;
    setScore(pct);
    setSubmitted(true);
    if (user && courseId) {
      supabase.from('exam_simulations').insert({
        user_id: user.id,
        course_id: courseId,
        question_ids: questions.map((q) => q.id),
        answers_jsonb: answers,
        score: pct,
        total_questions: questions.length,
        time_limit_seconds: questions.length * 60,
        time_spent_seconds: questions.length * 60 - (timeLeft ?? 0),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });
    }
  }, [answers, questions, user, courseId, timeLeft]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (loading)
    return (
      <PageShell>
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      </PageShell>
    );

  // EmptyState replaces terse "no questions" text — VN copy, preserves meaning.
  if (questions.length === 0)
    return (
      <PageShell>
        <div className="glass-card rounded-2xl">
          <EmptyState
            icon={<BookOpen size={32} />}
            title="Khoá học chưa có câu hỏi trắc nghiệm"
            description="Giảng viên chưa thêm câu hỏi cho khoá học này. Hãy quay lại sau."
          />
        </div>
      </PageShell>
    );

  if (!started) {
    // Duration computed the same way as the timer so students know before starting.
    const durationMinutes = questions.length;
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto glass-card rounded-2xl p-8 text-center space-y-4">
          <Sparkles size={32} className="mx-auto text-primary" />
          <h1 className="font-headline text-2xl font-extrabold text-on-surface">Thi thử</h1>
          <p className="text-secondary/70">
            {questions.length} câu · {durationMinutes} phút · Trắc nghiệm từ toàn bộ khoá học
          </p>
          {/* Explicit time-limit reminder so it isn't a surprise during the exam */}
          <p className="text-xs text-secondary/55">
            Thời gian giới hạn: <strong className="text-on-surface">{durationMinutes} phút</strong>.
            Bài thi sẽ tự động nộp khi hết giờ.
          </p>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-6 py-3 text-sm font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25"
          >
            Bắt đầu thi
          </button>
        </div>
      </PageShell>
    );
  }

  if (submitted) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto glass-card rounded-2xl p-8 text-center space-y-4">
          <h1 className="font-headline text-3xl font-extrabold text-primary tabular-nums">
            {score?.toFixed(0)}%
          </h1>
          <p className="text-secondary/70">{questions.length} câu · Hoàn thành</p>
        </div>
      </PageShell>
    );
  }

  const isLowTime = timeLeft !== null && timeLeft <= 60 && timeLeft > 0;

  return (
    <PageShell>
      {/*
        aria-live="polite" region announces timer warnings to screen readers
        without interrupting ongoing speech. Visually hidden; content updated
        once when timeLeft crosses the 60-second threshold.
      */}
      <div id={liveRegionId} aria-live="polite" aria-atomic="true" className="sr-only">
        {lowTimeAnnounced ? 'Còn dưới 1 phút. Bài thi sẽ tự động nộp khi hết giờ.' : ''}
      </div>

      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Thi thử</p>
          {timeLeft !== null && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-tech text-[11px] tabular-nums ${isLowTime ? 'border-red-400/50 text-red-200 animate-pulse' : 'border-cyan-300/40 text-cyan-200'}`}
              aria-label={`Thời gian còn lại: ${formatTimeLeft(timeLeft)}`}
            >
              {/* Non-color warning icon visible when time is running low */}
              {isLowTime ? (
                <AlertTriangle size={11} aria-hidden="true" />
              ) : (
                <Clock size={11} aria-hidden="true" />
              )}
              {formatTimeLeft(timeLeft)}
            </span>
          )}
        </div>

        {questions.map((q, qi) => {
          const picked =
            answers[q.id]?.kind === 'choice'
              ? (answers[q.id] as { kind: 'choice'; choices: number[] }).choices
              : [];

          const isMulti = q.type === 'multi';
          // Stable ID for the radiogroup label (single-choice questions).
          const groupId = `q-${q.id}`;

          return (
            <div key={q.id} className="glass-card rounded-2xl p-5 space-y-3">
              <p id={groupId} className="font-headline text-sm font-bold text-on-surface">
                <span className="text-primary mr-2">{qi + 1}.</span>
                {q.prompt_md}
              </p>
              {/*
                Single-choice: role="radiogroup" + aria-checked on each option.
                Multi-choice: no group role; aria-pressed conveys toggle state.
                No logic change — onClick handlers are identical to before.
              */}
              <div
                role={isMulti ? undefined : 'radiogroup'}
                aria-labelledby={isMulti ? undefined : groupId}
                className="space-y-2"
              >
                {(q.choices_jsonb ?? []).map((choice, ci) => {
                  const isSelected = picked.includes(ci);
                  return (
                    <button
                      key={ci}
                      type="button"
                      role={isMulti ? undefined : 'radio'}
                      aria-checked={isMulti ? undefined : isSelected}
                      aria-pressed={isMulti ? isSelected : undefined}
                      onClick={() => {
                        if (q.type === 'single')
                          setAnswers((a) => ({ ...a, [q.id]: { kind: 'choice', choices: [ci] } }));
                        else
                          setAnswers((a) => ({
                            ...a,
                            [q.id]: {
                              kind: 'choice',
                              choices: isSelected
                                ? picked.filter((x) => x !== ci)
                                : [...picked, ci],
                            },
                          }));
                      }}
                      className={`w-full flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-all ${isSelected ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-white/10 bg-white/[0.03] hover:border-cyan-300/30'}`}
                    >
                      <span className="font-tech text-[10px] text-secondary/55">
                        {String.fromCharCode(65 + ci)}
                      </span>
                      <span>{choice}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-6 py-3 text-sm font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25"
        >
          Nộp bài thi
        </button>
      </div>
    </PageShell>
  );
}
