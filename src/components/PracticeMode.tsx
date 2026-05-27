import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Sparkles } from 'lucide-react';
import type { QuizQuestion, AnswerValue } from '../lib/quiz';

/**
 * Practice mode: instant feedback per question, no grade recorded, infinite retakes.
 * Shuffles questions each round.
 */
export default function PracticeMode({
  questions: allQuestions,
  onExit,
}: {
  questions: QuizQuestion[];
  onExit: () => void;
}) {
  const [round, setRound] = useState(0);
  const questions = useMemo(
    () => [...allQuestions].sort(() => Math.random() - 0.5),
    [allQuestions, round],
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState<AnswerValue | undefined>(undefined);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const q = questions[currentIdx];
  if (!q) return null;

  const choices = q.choices_jsonb ?? [];
  const correct = q.correct_jsonb ?? [];

  const checkAnswer = () => {
    setRevealed(true);
    let isCorrect = false;
    if (q.type === 'single' || q.type === 'multi') {
      const picked = answer?.kind === 'choice' ? [...answer.choices].sort() : [];
      const expected = [...correct].sort();
      isCorrect = expected.length === picked.length && expected.every((v, i) => v === picked[i]);
    } else if (q.type === 'text' && q.expected_text) {
      const got = answer?.kind === 'text' ? answer.text.trim().toLowerCase() : '';
      isCorrect = got === q.expected_text.trim().toLowerCase();
    }
    setStats((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
  };

  const next = () => {
    setRevealed(false);
    setAnswer(undefined);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      // Round complete
      setCurrentIdx(0);
      setRound((r) => r + 1);
    }
  };

  const picked = answer?.kind === 'choice' ? answer.choices : [];

  const toggleChoice = (idx: number) => {
    if (revealed) return;
    if (q.type === 'single') {
      setAnswer({ kind: 'choice', choices: [idx] });
    } else {
      const cur = picked;
      const next = cur.includes(idx) ? cur.filter((c) => c !== idx) : [...cur, idx].sort();
      setAnswer({ kind: 'choice', choices: next });
    }
  };

  return (
    <section className="glass-card rounded-2xl p-6 md:p-8 space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-emerald-300">
          <Sparkles size={12} /> Chế độ luyện tập
        </p>
        <div className="flex items-center gap-3">
          <span className="font-tech text-[10px] tabular-nums text-secondary/55">
            {stats.correct}/{stats.total} đúng
          </span>
          <button
            onClick={onExit}
            className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/60 hover:text-cyan-200"
          >
            Thoát
          </button>
        </div>
      </header>

      <div className="space-y-3">
        <p className="font-headline text-base font-bold text-on-surface">
          <span className="text-primary mr-2 tabular-nums">{currentIdx + 1}/{questions.length}</span>
          {q.prompt_md}
        </p>

        {(q.type === 'single' || q.type === 'multi') && (
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
                  onClick={() => toggleChoice(ci)}
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
        )}

        {q.type === 'text' && (
          <div className="space-y-2">
            <textarea
              value={answer?.kind === 'text' ? answer.text : ''}
              onChange={(e) => setAnswer({ kind: 'text', text: e.target.value })}
              disabled={revealed}
              rows={2}
              placeholder="Nhập đáp án…"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none resize-y disabled:opacity-60"
            />
            {revealed && q.expected_text && (
              <p className="text-sm text-emerald-300/80">Đáp án đúng: {q.expected_text}</p>
            )}
          </div>
        )}

        {revealed && q.explanation_md && (
          <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/[0.04] px-3 py-2">
            <p className="font-tech text-[9px] uppercase tracking-[0.14em] text-cyan-300 mb-1">Giải thích</p>
            <p className="text-sm text-secondary/80">{q.explanation_md}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {!revealed ? (
          <button
            onClick={checkAnswer}
            disabled={!answer || answer.kind === 'empty'}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 disabled:opacity-50"
          >
            Kiểm tra
          </button>
        ) : (
          <button
            onClick={next}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25"
          >
            <RotateCcw size={12} /> Câu tiếp
          </button>
        )}
      </div>
    </section>
  );
}
