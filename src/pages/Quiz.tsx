import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Loader2 } from 'lucide-react';
import LessonQuiz from '../components/LessonQuiz';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useLessonAccess } from '../hooks/useLessonAccess';

type QuizState = 'loading' | 'present' | 'absent';

/**
 * Dedicated, focused quiz page — `/learn/:courseSlug/:lessonSlug/quiz`.
 *
 * Deliberately does NOT use `PageShell`, so there is no navbar/footer: a
 * distraction-free exam surface (the global decorative effects in App still
 * render behind it). Access is guarded by the shared `useLessonAccess` hook so
 * a direct URL can't bypass enrollment. The quiz machinery itself is reused
 * unchanged via `LessonQuiz`.
 */
export default function Quiz() {
  const { courseSlug, lessonSlug } = useParams<{ courseSlug: string; lessonSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const access = useLessonAccess(courseSlug, lessonSlug);

  const [attemptActive, setAttemptActive] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>('loading');

  const lessonPath = `/learn/${courseSlug}/${lessonSlug}`;
  const quizPath = `${lessonPath}/quiz`;

  // ----- Guards -----
  if (authLoading || access.loading) {
    return (
      <FocusedShell>
        <div className="flex justify-center py-24">
          <Loader2 size={24} className="animate-spin text-primary" aria-hidden="true" />
        </div>
      </FocusedShell>
    );
  }
  if (!user) return <Navigate to={`/login?next=${quizPath}`} replace />;
  if (access.notFound) return <Navigate to="/courses" replace />;
  // Locked (not preview, not enrolled) → bounce to the lesson (which handles its
  // own locked redirect). Never expose a quiz the user can't access.
  if (access.locked || !access.lesson) return <Navigate to={lessonPath} replace />;

  // ----- Focused quiz -----
  return (
    <FocusedShell>
      <header className="mb-6 flex items-center justify-between gap-4">
        {attemptActive ? (
          <span className="font-tech text-[11px] uppercase tracking-[0.16em] text-secondary/50">
            Đang làm bài — nộp để thoát
          </span>
        ) : (
          <Link
            to={lessonPath}
            className="inline-flex items-center gap-2 font-tech text-[11px] uppercase tracking-[0.16em] text-secondary/70 hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Quay lại bài học
          </Link>
        )}
        <span className="font-tech text-[11px] uppercase tracking-[0.16em] text-primary truncate">
          {access.lesson.title}
        </span>
      </header>

      {quizState === 'loading' && (
        <div className="flex justify-center py-24">
          <Loader2 size={24} className="animate-spin text-primary" aria-hidden="true" />
        </div>
      )}

      {quizState === 'absent' && (
        <div className="glass-card rounded-2xl">
          <EmptyState
            icon={<ClipboardList size={32} />}
            title="Bài học này chưa có bài kiểm tra"
            description="Khi giảng viên thêm bộ câu hỏi cho bài học, bạn sẽ làm bài tại đây."
            action={
              <Link
                to={lessonPath}
                className="inline-flex items-center gap-2 font-tech text-[11px] uppercase tracking-[0.16em] text-cyan-200 hover:text-cyan-100 transition-colors"
              >
                <ArrowLeft size={14} aria-hidden="true" /> Quay lại bài học
              </Link>
            }
          />
        </div>
      )}

      {/* Rendered unconditionally so its onLoaded fires; it returns null until
          data resolves (spinner above covers that) and when there is no quiz. */}
      <LessonQuiz
        lessonId={access.lesson.id}
        userId={user.id}
        onAttemptActiveChange={setAttemptActive}
        onLoaded={({ hasQuiz }) => setQuizState(hasQuiz ? 'present' : 'absent')}
      />
    </FocusedShell>
  );
}

/** Minimal full-screen container — no navbar/footer (focused exam surface). */
function FocusedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative text-on-surface selection:bg-primary/30 selection:text-primary">
      <main className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 pt-10 pb-20">{children}</main>
    </div>
  );
}
