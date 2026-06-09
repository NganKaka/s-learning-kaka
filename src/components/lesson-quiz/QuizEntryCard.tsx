import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowRight, Eye } from 'lucide-react';
import {
  type Quiz,
  type QuizAttempt,
  aggregateGrade,
  formatTimeLeft,
  listUserAttempts,
  loadQuizForLesson,
} from '../../lib/quiz';
import { SkeletonLine } from '../ui/Skeleton';

/**
 * Compact quiz summary shown inside a lesson. Replaces the old inline quiz:
 * it surfaces the metadata (questions · time · attempts · best score) and links
 * to the dedicated focused quiz page. Renders nothing when the lesson has no quiz.
 */
export default function QuizEntryCard({
  lessonId,
  userId,
  courseSlug,
  lessonSlug,
}: {
  lessonId: string;
  userId: string;
  courseSlug: string;
  lessonSlug: string;
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { quiz: q, questions } = await loadQuizForLesson(lessonId);
      if (cancelled) return;
      if (!q) {
        setQuiz(null);
        setLoading(false);
        return;
      }
      const att = await listUserAttempts(q.id, userId);
      if (cancelled) return;
      setQuiz(q);
      setQuestionCount(questions.length);
      setAttempts(att);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, userId]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 space-y-3">
        <SkeletonLine width="40%" />
        <SkeletonLine width="60%" />
      </div>
    );
  }

  // No quiz for this lesson → render nothing (matches prior inline behavior).
  if (!quiz || questionCount === 0) return null;

  const quizPath = `/learn/${courseSlug}/${lessonSlug}/quiz`;
  const attemptsUsed = attempts.length;
  const attemptsRemaining = Math.max(0, quiz.max_attempts - attemptsUsed);
  const aggregate = aggregateGrade(attempts, quiz.grading_mode);
  const exhausted = attemptsRemaining === 0;

  return (
    <section className="glass-card rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
            <ClipboardList size={12} aria-hidden="true" />
            <span>{quiz.title ?? 'Kiểm tra hiểu bài'}</span>
          </p>
          <p className="text-sm text-secondary/70">
            {questionCount} câu hỏi
            {quiz.time_limit_seconds ? (
              <>
                {' · giới hạn '}
                <span className="text-cyan-200">{formatTimeLeft(quiz.time_limit_seconds)}</span>
              </>
            ) : null}
            {' · còn '}
            <span className="text-cyan-200 tabular-nums">{attemptsRemaining}</span>/
            <span className="tabular-nums">{quiz.max_attempts}</span> lượt
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
      </div>

      <Link
        to={quizPath}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-5 py-3 font-tech text-[11px] uppercase tracking-[0.16em] text-primary hover:bg-primary/25 hover:shadow-[0_0_18px_rgba(233,195,73,0.32)] transition-all"
      >
        {exhausted ? (
          <>
            <Eye size={14} aria-hidden="true" /> Xem lại kết quả
          </>
        ) : (
          <>
            Bắt đầu làm bài <ArrowRight size={14} aria-hidden="true" />
          </>
        )}
      </Link>
    </section>
  );
}
