import { useCallback, useEffect, useRef, useState } from 'react';
import { Zap, CheckCircle2, XCircle } from 'lucide-react';
import type { QuizQuestion } from '../lib/quiz';

const PER_QUESTION_SECONDS = 30;

/**
 * Timed drill: quick-fire MCQ questions with a per-question countdown.
 * Auto-advances on timeout or answer. Shows results at end.
 */
export default function TimedDrill({
  questions: allQuestions,
  onComplete,
  onExit,
}: {
  questions: QuizQuestion[];
  onComplete: (correct: number, total: number) => void;
  onExit: () => void;
}) {
  // Filter to auto-gradable MCQ only
  const questions = allQuestions.filter((q) => q.type === 'single' || q.type === 'multi');
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PER_QUESTION_SECONDS);
  const [results, setResults] = useState<boolean[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const advancedRef = useRef(false);

  const q = questions[idx];

  // Timer
  useEffect(() => {
    if (done || revealed) return;
    setTimeLeft(PER_QUESTION_SECONDS);
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [idx, done, revealed]);

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft <= 0 && !revealed && !done) {
      submitAnswer();
    }
  }, [timeLeft]);

  const submitAnswer = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    const correct = [...(q?.correct_jsonb ?? [])].sort();
    const got = [...picked].sort();
    const isCorrect = correct.length === got.length && correct.every((v, i) => v === got[i]);
    setResults((r) => [...r, isCorrect]);
    setRevealed(true);

    // Auto-advance after 1.2s
    setTimeout(() => {
      if (idx < questions.length - 1) {
        setIdx((i) => i + 1);
        setPicked([]);
        setRevealed(false);
        advancedRef.current = false;
      } else {
        const finalResults = [...results, isCorrect];
        const correctCount = finalResults.filter(Boolean).length;
        setDone(true);
        onComplete(correctCount, questions.length);
      }
    }, 1200);
  }, [idx, picked, q, questions.length, results, onComplete]);

  if (questions.length === 0) {
    return <p className="text-sm text-secondary/60">Không có câu hỏi trắc nghiệm cho drill.</p>;
  }

  if (done) {
    const correctCount = results.filter(Boolean).length;
    return (
      <section className="glass-card rounded-2xl p-6 md:p-8 space-y-5 text-center">
        <Zap size={32} className="mx-auto text-amber-300" />
        <p className="font-headline text-2xl font-extrabold text-on-surface">
          {correctCount}/{questions.length} đúng
        </p>
        <p className="text-sm text-secondary/70">
          Tỉ lệ: {((correctCount / questions.length) * 100).toFixed(0)}%
        </p>
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25"
        >
          Đóng
        </button>
      </section>
    );
  }

  if (!q) return null;
  const choices = q.choices_jsonb ?? [];
  const correct = q.correct_jsonb ?? [];

  return (
    <section className="glass-card rounded-2xl p-6 md:p-8 space-y-5">
      <header className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-amber-300">
          <Zap size={12} /> Drill · {idx + 1}/{questions.length}
        </p>
        <div className="flex items-center gap-3">
          <span className={`font-tech text-sm tabular-nums font-bold ${timeLeft <= 5 ? 'text-red-300 animate-pulse' : 'text-cyan-200'}`}>
            {timeLeft}s
          </span>
          <button onClick={onExit} className="font-tech text-[10px] uppercase text-secondary/60 hover:text-cyan-200">
            Thoát
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / PER_QUESTION_SECONDS) * 100}%` }}
        />
      </div>

      <p className="font-headline text-base font-bold text-on-surface">{q.prompt_md}</p>

      <div className="space-y-2">
        {choices.map((choice, ci) => {
          const isPicked = picked.includes(ci);
          const isRight = correct.includes(ci);
          let cls = 'border-white/10 bg-white/[0.03] hover:border-cyan-300/30';
          if (revealed && isRight) cls = 'border-emerald-400/40 bg-emerald-500/10';
          else if (revealed && isPicked && !isRight) cls = 'border-red-400/40 bg-red-500/10';
          else if (isPicked) cls = 'border-cyan-300/50 bg-cyan-400/10';

          return (
            <button
              key={ci}
              type="button"
              onClick={() => {
                if (revealed) return;
                if (q.type === 'single') setPicked([ci]);
                else setPicked((p) => p.includes(ci) ? p.filter((x) => x !== ci) : [...p, ci].sort());
              }}
              disabled={revealed}
              className={`w-full flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-all ${cls}`}
            >
              <span className="font-tech text-[10px] text-secondary/55">{String.fromCharCode(65 + ci)}</span>
              <span className="flex-1">{choice}</span>
              {revealed && isRight && <CheckCircle2 size={14} className="text-emerald-400" />}
              {revealed && isPicked && !isRight && <XCircle size={14} className="text-red-400" />}
            </button>
          );
        })}
      </div>

      {!revealed && (
        <div className="flex justify-end">
          <button
            onClick={submitAnswer}
            disabled={picked.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
          >
            Xác nhận
          </button>
        </div>
      )}
    </section>
  );
}
