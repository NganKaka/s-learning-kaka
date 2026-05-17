import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuizQuestion {
  id: string;
  prompt_md: string;
  type: 'single' | 'multi' | 'text';
  choices_jsonb: string[] | null;
  correct_jsonb: number[] | string | null;
  explanation_md: string | null;
  order_index: number;
}

interface QuizRow {
  id: string;
  title: string | null;
  questions: QuizQuestion[];
}

/**
 * Lesson-attached quiz. Single-select / multi-select supported (text-type
 * skipped for MVP since auto-grading is harder). Renders below the video,
 * scores client-side, then writes the attempt to Supabase.
 */
export default function LessonQuiz({ lessonId, userId }: { lessonId: string; userId: string }) {
  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    (async () => {
      const { data: quizRow } = await supabase
        .from('quizzes')
        .select('id, title')
        .eq('lesson_id', lessonId)
        .maybeSingle();
      if (cancelled || !quizRow) return;

      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizRow.id)
        .order('order_index', { ascending: true });

      if (cancelled) return;
      setQuiz({
        id: quizRow.id as string,
        title: quizRow.title as string | null,
        questions: (questions ?? []) as QuizQuestion[],
      });
      setAnswers({});
      setSubmitted(false);
      setScore(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const filteredQuestions = useMemo(
    () => quiz?.questions.filter((q) => q.type === 'single' || q.type === 'multi') ?? [],
    [quiz],
  );

  if (!quiz || filteredQuestions.length === 0) return null;

  const toggleAnswer = (qid: string, choice: number, multi: boolean) => {
    if (submitted) return;
    setAnswers((prev) => {
      const cur = prev[qid] ?? [];
      if (multi) {
        return { ...prev, [qid]: cur.includes(choice) ? cur.filter((c) => c !== choice) : [...cur, choice].sort() };
      }
      return { ...prev, [qid]: [choice] };
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    let correctCount = 0;
    for (const q of filteredQuestions) {
      const userAns = (answers[q.id] ?? []).slice().sort();
      const correctAns = (Array.isArray(q.correct_jsonb) ? q.correct_jsonb : []).slice().sort();
      if (
        userAns.length === correctAns.length &&
        userAns.every((v, i) => v === correctAns[i])
      ) {
        correctCount += 1;
      }
    }
    const total = filteredQuestions.length;
    setScore({ correct: correctCount, total });
    setSubmitted(true);

    // Persist attempt (best-effort)
    await supabase.from('quiz_attempts').insert({
      user_id: userId,
      quiz_id: quiz.id,
      answers_jsonb: answers,
      score: correctCount,
      total,
    });
    setSubmitting(false);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
  };

  return (
    <section className="glass-card rounded-2xl p-6 md:p-8 space-y-5">
      <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
        <Sparkles size={12} />
        <span>{quiz.title ?? 'Kiểm tra hiểu bài'}</span>
      </div>

      <div className="space-y-5">
        {filteredQuestions.map((q, qi) => {
          const choices = Array.isArray(q.choices_jsonb) ? q.choices_jsonb : [];
          const correctAns = Array.isArray(q.correct_jsonb) ? q.correct_jsonb : [];
          const userAns = answers[q.id] ?? [];
          const multi = q.type === 'multi';
          return (
            <div key={q.id} className="space-y-3">
              <p className="font-headline text-base font-bold text-on-surface">
                <span className="text-primary mr-2">{String(qi + 1).padStart(2, '0')}.</span>
                {q.prompt_md}
                {multi && (
                  <span className="ml-2 font-tech text-[9px] uppercase tracking-[0.16em] text-cyan-300/85">
                    (chọn nhiều)
                  </span>
                )}
              </p>

              <div className="space-y-2">
                {choices.map((choice, ci) => {
                  const isPicked = userAns.includes(ci);
                  const isCorrect = correctAns.includes(ci);
                  let toneClass = 'border-white/10 bg-white/[0.03] hover:border-cyan-300/30';
                  if (submitted) {
                    if (isCorrect) toneClass = 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
                    else if (isPicked) toneClass = 'border-red-400/40 bg-red-500/10 text-red-200';
                  } else if (isPicked) {
                    toneClass = 'border-cyan-300/50 bg-cyan-400/10 text-cyan-100';
                  }
                  return (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => toggleAnswer(q.id, ci, multi)}
                      disabled={submitted}
                      className={`w-full flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-all text-sm ${toneClass}`}
                    >
                      <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55 tabular-nums shrink-0">
                        {String.fromCharCode(65 + ci)}
                      </span>
                      <span className="flex-1">{choice}</span>
                      {submitted && isCorrect && <CheckCircle2 size={14} className="text-emerald-300 shrink-0" />}
                      {submitted && isPicked && !isCorrect && <XCircle size={14} className="text-red-300 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {submitted && q.explanation_md && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-cyan-300/20 bg-cyan-950/15 px-4 py-3 text-sm text-cyan-100/85 whitespace-pre-line"
                  >
                    <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-cyan-200 mb-1">Giải thích</p>
                    {q.explanation_md}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        {submitted && score ? (
          <div className="flex items-center gap-3 font-tech text-[12px] uppercase tracking-[0.16em]">
            <span className="text-secondary/60">Điểm:</span>
            <span className="font-headline text-2xl font-extrabold text-primary tabular-nums">
              {score.correct} / {score.total}
            </span>
          </div>
        ) : (
          <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55">
            {Object.keys(answers).length}/{filteredQuestions.length} đã trả lời
          </p>
        )}

        {submitted ? (
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/20"
          >
            Làm lại
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={Object.keys(answers).length === 0 || submitting}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Nộp bài
          </button>
        )}
      </div>
    </section>
  );
}
