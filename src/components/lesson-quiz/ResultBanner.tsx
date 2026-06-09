import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { type QuizAttempt, type QuizQuestion, formatTimeLeft, gradeAttempt } from '../../lib/quiz';

interface ResultBannerProps {
  attempt: QuizAttempt;
  questions: QuizQuestion[];
}

/**
 * Shown immediately after a student submits an attempt.
 * Displays auto-grade summary, time spent, and tab-switch count.
 * If teacher-graded questions exist, notes that final score is pending.
 */
export default function ResultBanner({ attempt, questions }: ResultBannerProps) {
  const graded = gradeAttempt(questions, attempt.answers_jsonb ?? {});
  const score = attempt.final_score ?? attempt.auto_score;
  const pendingTeacher = attempt.final_score === null && graded.autoGradedMax < graded.totalMax;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-cyan-300/25 bg-cyan-950/15 px-4 py-4 space-y-2"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-cyan-200">
          <CheckCircle2 size={12} /> Đã nộp lượt #{attempt.attempt_number}
        </p>
        {score !== null && (
          <p className="font-headline text-xl font-extrabold text-primary tabular-nums">
            {score.toFixed(0)}%
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/65">
        <span>
          Tự chấm:{' '}
          <span className="text-cyan-200 tabular-nums">
            {graded.autoCorrectCount}/{graded.autoGradableCount} câu
          </span>
        </span>
        <span>
          Thời gian:{' '}
          <span className="text-cyan-200 tabular-nums">
            {formatTimeLeft(attempt.time_spent_seconds)}
          </span>
        </span>
        <span>
          Rời tab:{' '}
          <span className={attempt.tab_switches > 0 ? 'text-amber-300' : 'text-cyan-200'}>
            {attempt.tab_switches}×
          </span>
        </span>
      </div>
      {pendingTeacher && (
        <p className="text-xs text-secondary/65">
          Có câu hỏi cần giáo viên chấm tay. Điểm cuối cùng sẽ cập nhật khi giáo viên hoàn tất.
        </p>
      )}
      <AnimatePresence>
        {graded.perQuestion.some((g) => g.autoGradable && g.isCorrect === false) && (
          <p className="text-xs text-secondary/65">
            <XCircle size={11} className="inline mr-1 text-red-300" />
            Một số câu trắc nghiệm chưa chính xác. Bạn có thể xem lại và làm lại nếu còn lượt.
          </p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
