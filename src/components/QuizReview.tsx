import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import type { AnswerValue, QuizAttempt, QuizQuestion } from '../lib/quiz';

/**
 * Read-only review of a submitted quiz attempt.
 * Shows each question with the student's answer, correct answer, and explanation.
 */
export default function QuizReview({
  attempt,
  questions,
  onClose,
}: {
  attempt: QuizAttempt;
  questions: QuizQuestion[];
  onClose: () => void;
}) {
  const answers = attempt.answers_jsonb ?? {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
          Xem lại lượt #{attempt.attempt_number}
        </p>
        <button
          onClick={onClose}
          className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/60 hover:text-cyan-200"
        >
          Đóng
        </button>
      </div>

      {questions.map((q, qi) => (
        <ReviewQuestion key={q.id} index={qi} question={q} answer={answers[q.id]} />
      ))}
    </div>
  );
}

function ReviewQuestion({
  index,
  question,
  answer,
}: {
  index: number;
  question: QuizQuestion;
  answer: AnswerValue | undefined;
}) {
  const choices = question.choices_jsonb ?? [];
  const correct = question.correct_jsonb ?? [];
  const picked = answer?.kind === 'choice' ? answer.choices : [];

  const isAutoGradable =
    question.type === 'single' ||
    question.type === 'multi' ||
    (question.type === 'text' && (question.expected_text ?? '').trim().length > 0);

  let isCorrect: boolean | null = null;
  if (question.type === 'single' || question.type === 'multi') {
    const sortedCorrect = [...correct].sort();
    const sortedPicked = [...picked].sort();
    isCorrect =
      sortedCorrect.length === sortedPicked.length &&
      sortedCorrect.every((v, i) => v === sortedPicked[i]);
  } else if (question.type === 'text' && question.expected_text) {
    const got = answer?.kind === 'text' ? answer.text.trim().toLowerCase() : '';
    isCorrect = got === question.expected_text.trim().toLowerCase();
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-start gap-2">
        {isAutoGradable && isCorrect !== null && (
          isCorrect
            ? <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
            : <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
        )}
        {!isAutoGradable && <HelpCircle size={16} className="text-amber-300 mt-0.5 shrink-0" />}
        <p className="font-headline text-sm font-bold text-on-surface">
          <span className="text-primary mr-2 tabular-nums">{String(index + 1).padStart(2, '0')}.</span>
          {question.prompt_md}
          <span className="ml-2 font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/55">
            ({question.points} đ)
          </span>
        </p>
      </div>

      {(question.type === 'single' || question.type === 'multi') && (
        <div className="space-y-1.5 ml-6">
          {choices.map((choice, ci) => {
            const wasPicked = picked.includes(ci);
            const isRight = correct.includes(ci);
            let cls = 'border-white/10 bg-white/[0.02]';
            if (isRight) cls = 'border-emerald-400/40 bg-emerald-500/10';
            else if (wasPicked && !isRight) cls = 'border-red-400/40 bg-red-500/10';

            return (
              <div key={ci} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${cls}`}>
                <span className="font-tech text-[10px] text-secondary/55">{String.fromCharCode(65 + ci)}</span>
                <span className="flex-1">{choice}</span>
                {isRight && <CheckCircle2 size={12} className="text-emerald-400" />}
                {wasPicked && !isRight && <XCircle size={12} className="text-red-400" />}
              </div>
            );
          })}
        </div>
      )}

      {question.type === 'text' && (
        <div className="ml-6 space-y-1">
          <p className="text-sm text-secondary/70">
            Đáp án của bạn: <span className="text-on-surface">{answer?.kind === 'text' ? answer.text || '(trống)' : '(trống)'}</span>
          </p>
          {question.expected_text && (
            <p className="text-sm text-emerald-300/80">
              Đáp án đúng: {question.expected_text}
            </p>
          )}
        </div>
      )}

      {question.type === 'file' && (
        <p className="ml-6 text-sm text-secondary/60">
          {answer?.kind === 'file' ? `Đã nộp ${answer.file_ids.length} tệp` : 'Chưa nộp tệp'}
          {' · '}Giáo viên chấm tay
        </p>
      )}

      {question.explanation_md && (
        <div className="ml-6 rounded-lg border border-cyan-300/20 bg-cyan-400/[0.04] px-3 py-2">
          <p className="font-tech text-[9px] uppercase tracking-[0.14em] text-cyan-300 mb-1">Giải thích</p>
          <p className="text-sm text-secondary/80">{question.explanation_md}</p>
        </div>
      )}
    </div>
  );
}
