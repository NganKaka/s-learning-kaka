import { Sparkles, Loader2, Clock, Eye, AlertCircle } from 'lucide-react';
import {
  type AnswerValue,
  type QuizAttempt,
  type QuizQuestion,
  formatTimeLeft,
} from '../../lib/quiz';
import { type PendingFile } from './types';
import QuestionCard from './QuestionCard';

interface QuizActiveViewProps {
  quiz: { title: string | null };
  activeAttempt: QuizAttempt;
  questions: QuizQuestion[];
  answers: Record<string, AnswerValue>;
  pendingFiles: Record<string, PendingFile[]>;
  tabSwitches: number;
  timeLeft: number | null;
  submitting: boolean;
  onAnswerChange: (questionId: string, next: AnswerValue) => void;
  onFilesAdded: (questionId: string, files: File[]) => void;
  onFileRemove: (questionId: string, idx: number) => void;
  onSubmit: () => void;
}

/**
 * Renders the in-progress quiz: header with timer/tab-switch badge,
 * one QuestionCard per question, answer-count footer, and submit button.
 */
export default function QuizActiveView({
  quiz,
  activeAttempt,
  questions,
  answers,
  pendingFiles,
  tabSwitches,
  timeLeft,
  submitting,
  onAnswerChange,
  onFilesAdded,
  onFileRemove,
  onSubmit,
}: QuizActiveViewProps) {
  const answeredCount = Object.values(answers).filter((a) => a && a.kind !== 'empty').length;

  return (
    <section className="glass-card rounded-2xl p-6 md:p-8 space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
          <Sparkles size={12} />
          <span>
            {quiz.title ?? 'Kiểm tra hiểu bài'} · Lượt #{activeAttempt.attempt_number}
          </span>
        </p>
        <div className="flex items-center gap-3">
          {tabSwitches > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 font-tech text-[10px] uppercase tracking-[0.14em] text-amber-200">
              <Eye size={11} /> Rời tab {tabSwitches}×
            </span>
          )}
          {timeLeft !== null && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-tech text-[11px] tabular-nums ${
                timeLeft <= 30
                  ? 'border-red-400/50 bg-red-500/10 text-red-200 animate-pulse'
                  : 'border-cyan-300/40 bg-cyan-400/10 text-cyan-200'
              }`}
            >
              <Clock size={11} /> {formatTimeLeft(timeLeft)}
            </span>
          )}
        </div>
      </header>

      <div className="space-y-5">
        {questions.map((q, qi) => (
          <QuestionCard
            key={q.id}
            index={qi}
            question={q}
            answer={answers[q.id]}
            onAnswerChange={(next) => onAnswerChange(q.id, next)}
            staged={pendingFiles[q.id] ?? []}
            onFilesAdded={(files) => onFilesAdded(q.id, files)}
            onFileRemove={(idx) => onFileRemove(q.id, idx)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
        <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55">
          {answeredCount}/{questions.length} đã trả lời
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Nộp bài
        </button>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.05] px-3 py-2 text-[11px] text-amber-200/90">
        <AlertCircle size={12} className="mt-0.5 shrink-0" />
        Hệ thống đang theo dõi nếu bạn rời tab hoặc mở cửa sổ khác. Số lần này sẽ được gửi tới giáo
        viên cùng bài làm.
      </p>
    </section>
  );
}
