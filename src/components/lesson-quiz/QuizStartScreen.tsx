import { Sparkles, Eye, RotateCcw, Zap } from 'lucide-react';
import {
  type Quiz,
  type QuizAttempt,
  type QuizQuestion,
  aggregateGrade,
  formatTimeLeft,
} from '../../lib/quiz';
import ResultBanner from './ResultBanner';

interface QuizStartScreenProps {
  quiz: Quiz;
  questions: QuizQuestion[];
  previousAttempts: QuizAttempt[];
  justSubmitted: QuizAttempt | null;
  totalMaxPoints: number;
  onBeginAttempt: () => void;
  onReviewAttempt: (attempt: QuizAttempt) => void;
  onPractice: () => void;
  onDrill: () => void;
}

/**
 * Shown when there is no active attempt in progress.
 * Displays: quiz metadata, previous-attempt history, result banner (if just
 * submitted), and action buttons (start/retry, practice, drill).
 */
export default function QuizStartScreen({
  quiz,
  questions,
  previousAttempts,
  justSubmitted,
  totalMaxPoints,
  onBeginAttempt,
  onReviewAttempt,
  onPractice,
  onDrill,
}: QuizStartScreenProps) {
  const attemptsUsed = previousAttempts.length;
  const attemptsRemaining = Math.max(0, quiz.max_attempts - attemptsUsed);
  const aggregate = aggregateGrade(previousAttempts, quiz.grading_mode);

  return (
    <section className="glass-card rounded-2xl p-6 md:p-8 space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
            <Sparkles size={12} />
            <span>{quiz.title ?? 'Kiểm tra hiểu bài'}</span>
          </p>
          <p className="text-sm text-secondary/70">
            {questions.length} câu hỏi · {totalMaxPoints} điểm · cách tính:{' '}
            <span className="text-cyan-200">
              {quiz.grading_mode === 'max' ? 'Điểm cao nhất' : 'Điểm trung bình'}
            </span>
            {quiz.time_limit_seconds ? (
              <>
                {' '}
                · giới hạn{' '}
                <span className="text-cyan-200">{formatTimeLeft(quiz.time_limit_seconds)}</span>
              </>
            ) : null}
          </p>
        </div>
        {aggregate.effectivePct !== null && (
          <div className="text-right">
            <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55">
              Điểm hiện tại
            </p>
            <p className="font-headline text-2xl font-extrabold text-primary tabular-nums">
              {aggregate.effectivePct.toFixed(0)}%
            </p>
          </div>
        )}
      </header>

      {previousAttempts.length > 0 && (
        <div className="space-y-2">
          <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
            Lượt đã làm
          </p>
          <ul className="space-y-1.5">
            {previousAttempts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55 tabular-nums">
                    Lượt #{a.attempt_number}
                  </span>
                  <span className="text-on-surface tabular-nums">
                    {a.final_score !== null
                      ? `${a.final_score.toFixed(0)}%`
                      : a.auto_score !== null
                        ? `${a.auto_score.toFixed(0)}% tự chấm`
                        : 'Chờ chấm'}
                  </span>
                  {a.tab_switches > 0 && (
                    <span className="inline-flex items-center gap-1 font-tech text-[10px] uppercase tracking-[0.14em] text-amber-300">
                      <Eye size={10} /> rời tab {a.tab_switches}×
                    </span>
                  )}
                </div>
                <span className="font-tech text-[10px] tabular-nums text-secondary/45">
                  {formatTimeLeft(a.time_spent_seconds)}
                </span>
                <button
                  type="button"
                  onClick={() => onReviewAttempt(a)}
                  className="font-tech text-[10px] uppercase tracking-[0.14em] text-cyan-300 hover:text-cyan-200"
                >
                  Xem lại
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {justSubmitted && <ResultBanner attempt={justSubmitted} questions={questions} />}

      <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
        <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55">
          Còn lại <span className="text-cyan-200 tabular-nums">{attemptsRemaining}</span>/
          <span className="tabular-nums">{quiz.max_attempts}</span> lượt làm
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onPractice}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-tech uppercase tracking-[0.14em] text-emerald-200 hover:bg-emerald-500/20"
          >
            <RotateCcw size={11} /> Luyện tập
          </button>
          <button
            type="button"
            onClick={onDrill}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-tech uppercase tracking-[0.14em] text-amber-200 hover:bg-amber-500/20"
          >
            <Zap size={11} /> Drill
          </button>
          {attemptsRemaining > 0 ? (
            <button
              type="button"
              onClick={onBeginAttempt}
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 transition-colors"
            >
              <Sparkles size={12} />
              {previousAttempts.length === 0 ? 'Bắt đầu làm bài' : 'Làm lại'}
            </button>
          ) : (
            <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-amber-300">
              Đã hết lượt làm
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
