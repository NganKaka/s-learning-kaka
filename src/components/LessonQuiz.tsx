import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  Clock,
  AlertCircle,
  Eye,
  Upload,
  FileText,
  X,
  RotateCcw,
  Zap,
  BookOpen,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import QuizReview from './QuizReview';
import PracticeMode from './PracticeMode';
import TimedDrill from './TimedDrill';
import { awardXp } from '../lib/xp';
import { checkAndAwardBadges } from '../lib/badges';
import { addMistake } from '../lib/mistakeNotebook';
import { incrementGoalProgress } from '../lib/studyGoals';
import { selectQuestions } from '../lib/questionBank';
import {
  type AnswerValue,
  type Quiz,
  type QuizAttempt,
  type QuizQuestion,
  aggregateGrade,
  formatTimeLeft,
  gradeAttempt,
  listUserAttempts,
  loadQuizForLesson,
  MAX_UPLOAD_BYTES,
  startAttempt,
  submitAttempt,
  uploadQuizFile,
} from '../lib/quiz';

interface PendingFile {
  // Files staged for a question, captured client-side until upload at submit time.
  fileId: string | null; // populated after upload
  file: File;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

/**
 * Lesson-attached quiz with full session tracking.
 *
 * Features:
 *   - Question types: single, multi, text (auto-graded if expected_text set,
 *     teacher-graded otherwise), file upload (teacher-graded).
 *   - Configurable time limit, max attempts, grading mode (max / mean).
 *   - Tab-switch detection: visibilitychange + window blur. Each event bumps
 *     a counter that is persisted with the attempt and shown to the teacher.
 *   - Auto-submit on timeout. The student also sees a live countdown.
 *
 * Server interaction is via `src/lib/quiz.ts`. RLS in 0010_quiz_advanced.sql
 * gates everything by lesson access (preview / enrollment / instructor).
 */
export default function LessonQuiz({ lessonId, userId }: { lessonId: string; userId: string }) {
  const { showToast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Active attempt state
  const [activeAttempt, setActiveAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, PendingFile[]>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState<QuizAttempt | null>(null);

  const startedAtRef = useRef<number | null>(null);
  const submittedRef = useRef(false); // guard against double-submission (e.g. timer + click)
  const [mode, setMode] = useState<'quiz' | 'review' | 'practice' | 'drill'>('quiz');
  const [reviewAttempt, setReviewAttempt] = useState<QuizAttempt | null>(null);
  const [retryWrongOnly, setRetryWrongOnly] = useState(false);

  const totalMaxPoints = useMemo(
    () => questions.reduce((s, q) => s + q.points, 0),
    [questions],
  );

  // ----- Load quiz + previous attempts -----
  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    setLoading(true);
    setActiveAttempt(null);
    setJustSubmitted(null);

    (async () => {
      const { quiz: q, questions: qs } = await loadQuizForLesson(lessonId);
      if (cancelled) return;
      setQuiz(q);
      setQuestions(qs);

      if (q && userId) {
        const attempts = await listUserAttempts(q.id, userId);
        if (cancelled) return;
        setPreviousAttempts(attempts);
      } else {
        setPreviousAttempts([]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId, userId]);

  // ----- Tab-switch tracking (only while a quiz is in-progress) -----
  const tabSwitchToastShown = useRef(false);
  useEffect(() => {
    if (!activeAttempt) {
      tabSwitchToastShown.current = false;
      return;
    }

    let lastFire = 0;
    const DEBOUNCE_MS = 300;

    const bump = () => {
      const now = Date.now();
      if (now - lastFire < DEBOUNCE_MS) return;
      lastFire = now;
      setTabSwitches((n) => n + 1);
      if (!tabSwitchToastShown.current) {
        tabSwitchToastShown.current = true;
        showToast(
          'Bạn đã rời tab khi đang làm bài. Hành vi này được ghi lại và gửi cho giáo viên.',
          'error',
        );
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') bump();
    };
    const onBlur = () => {
      if (document.visibilityState === 'visible') bump();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [activeAttempt, showToast]);

  // ----- Countdown timer -----
  useEffect(() => {
    if (!activeAttempt || !quiz?.time_limit_seconds) {
      setTimeLeft(null);
      return;
    }
    const startMs = Date.parse(activeAttempt.started_at);
    if (Number.isNaN(startMs)) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      const left = (quiz.time_limit_seconds ?? 0) - elapsed;
      setTimeLeft(left);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeAttempt, quiz?.time_limit_seconds]);

  // ----- Auto-submit when time runs out -----
  const handleSubmitRef = useRef<(reason: 'manual' | 'timeout') => void>(() => {});
  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0 && activeAttempt && !submittedRef.current) {
      showToast('Hết giờ. Bài làm được nộp tự động.', 'info');
      handleSubmitRef.current('timeout');
    }
  }, [timeLeft, activeAttempt, showToast]);

  // ----- Begin a new attempt -----
  const beginAttempt = useCallback(async () => {
    if (!quiz) return;
    const nextNumber =
      Math.max(0, ...previousAttempts.map((a) => a.attempt_number)) + 1;
    const created = await startAttempt({
      quizId: quiz.id,
      userId,
      attemptNumber: nextNumber,
      maxScore: totalMaxPoints,
    });
    if (!created) {
      showToast('Không thể bắt đầu lượt làm. Thử lại sau.', 'error');
      return;
    }
    submittedRef.current = false;
    startedAtRef.current = Date.now();
    setAnswers({});
    setPendingFiles({});
    setTabSwitches(0);
    setActiveAttempt(created);
    setJustSubmitted(null);
  }, [quiz, previousAttempts, userId, totalMaxPoints, showToast]);

  // ----- Submit -----
  const handleSubmit = useCallback(
    async (reason: 'manual' | 'timeout') => {
      if (!quiz || !activeAttempt || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);

      // Upload any staged files first (file-typed questions)
      const finalAnswers: Record<string, AnswerValue> = { ...answers };
      let uploadFailed = false;

      for (const q of questions) {
        if (q.type !== 'file') continue;
        const staged = pendingFiles[q.id] ?? [];
        if (staged.length === 0) continue;

        const uploadedIds: string[] = [];
        for (const item of staged) {
          if (item.status === 'uploaded' && item.fileId) {
            uploadedIds.push(item.fileId);
            continue;
          }
          const result = await uploadQuizFile({
            userId,
            attemptId: activeAttempt.id,
            questionId: q.id,
            file: item.file,
          });
          if ('error' in result) {
            uploadFailed = true;
            showToast(`Tải lên thất bại (${item.file.name}): ${result.error}`, 'error');
          } else {
            uploadedIds.push(result.id);
          }
        }
        if (uploadedIds.length > 0) {
          finalAnswers[q.id] = { kind: 'file', file_ids: uploadedIds };
        }
      }

      const elapsedSeconds = startedAtRef.current
        ? Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000))
        : 0;

      const graded = gradeAttempt(questions, finalAnswers);

      await submitAttempt(activeAttempt.id, {
        answers: finalAnswers,
        score: graded.autoCorrectCount,
        total: graded.autoGradableCount,
        auto_score: graded.autoGradedMax > 0 ? +graded.autoGradablePct.toFixed(2) : null,
        final_score:
          graded.finalPctIfNoTeacherGrading !== null
            ? +graded.finalPctIfNoTeacherGrading.toFixed(2)
            : null,
        time_spent_seconds: elapsedSeconds,
        tab_switches: tabSwitches,
      });

      const submittedAttempt: QuizAttempt = {
        ...activeAttempt,
        answers_jsonb: finalAnswers,
        score: graded.autoCorrectCount,
        total: graded.autoGradableCount,
        auto_score: graded.autoGradedMax > 0 ? +graded.autoGradablePct.toFixed(2) : null,
        final_score:
          graded.finalPctIfNoTeacherGrading !== null
            ? +graded.finalPctIfNoTeacherGrading.toFixed(2)
            : null,
        time_spent_seconds: elapsedSeconds,
        tab_switches: tabSwitches,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };

      setActiveAttempt(null);
      setJustSubmitted(submittedAttempt);
      setPreviousAttempts((prev) => [...prev, submittedAttempt]);
      setSubmitting(false);

      // Post-submission: XP, badges, mistakes, goals
      awardXp({ userId, source: 'quiz_submit', referenceId: activeAttempt.id }).then(({ streak }) => {
        const score = graded.finalPctIfNoTeacherGrading;
        checkAndAwardBadges(userId, { quizScore: score ?? undefined, streak });
      });
      incrementGoalProgress(userId, 'quizzes_done');
      // Log wrong answers to mistake notebook
      for (const pq of graded.perQuestion) {
        if (pq.autoGradable && pq.isCorrect === false) {
          const q = questions.find((qq) => qq.id === pq.questionId);
          if (q && quiz) {
            addMistake({ userId, questionId: q.id, quizId: quiz.id, courseId: '', wrongAnswer: finalAnswers[q.id] ?? { kind: 'empty' }, correctAnswer: { kind: 'empty' } });
          }
        }
      }

      if (!uploadFailed) {
        showToast(
          reason === 'timeout' ? 'Hết giờ — bài đã nộp.' : 'Đã nộp bài. Kết quả gửi tới giáo viên.',
          'success',
        );
      }
    },
    [activeAttempt, answers, pendingFiles, questions, quiz, showToast, tabSwitches, userId],
  );

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  if (loading) return null;
  if (!quiz || questions.length === 0) return null;

  // Mode-based rendering
  if (mode === 'review' && reviewAttempt) {
    return <QuizReview attempt={reviewAttempt} questions={questions} onClose={() => { setMode('quiz'); setReviewAttempt(null); }} />;
  }
  if (mode === 'practice') {
    return <PracticeMode questions={questions.filter((q) => q.type === 'single' || q.type === 'multi' || q.type === 'text')} onExit={() => setMode('quiz')} />;
  }
  if (mode === 'drill') {
    return <TimedDrill questions={questions} onComplete={(correct, total) => { awardXp({ userId, source: 'drill_complete' }); }} onExit={() => setMode('quiz')} />;
  }

  const attemptsUsed = previousAttempts.length;
  const attemptsRemaining = Math.max(0, quiz.max_attempts - attemptsUsed);
  const aggregate = aggregateGrade(previousAttempts, quiz.grading_mode);

  // ----- Render: results / start screen if no active attempt -----
  if (!activeAttempt) {
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
                  <button type="button" onClick={() => { setReviewAttempt(a); setMode('review'); }} className="font-tech text-[10px] uppercase tracking-[0.14em] text-cyan-300 hover:text-cyan-200">
                    Xem lại
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {justSubmitted && (
          <ResultBanner attempt={justSubmitted} questions={questions} />
        )}

        <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
          <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55">
            Còn lại{' '}
            <span className="text-cyan-200 tabular-nums">{attemptsRemaining}</span>/
            <span className="tabular-nums">{quiz.max_attempts}</span> lượt làm
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => setMode('practice')} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-tech uppercase tracking-[0.14em] text-emerald-200 hover:bg-emerald-500/20">
              <RotateCcw size={11} /> Luyện tập
            </button>
            <button type="button" onClick={() => setMode('drill')} className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-tech uppercase tracking-[0.14em] text-amber-200 hover:bg-amber-500/20">
              <Zap size={11} /> Drill
            </button>
            {attemptsRemaining > 0 ? (
              <button
                type="button"
                onClick={beginAttempt}
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

  // ----- Render: active attempt -----
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
            onAnswerChange={(next) => setAnswers((prev) => ({ ...prev, [q.id]: next }))}
            staged={pendingFiles[q.id] ?? []}
            onFilesAdded={(files) =>
              setPendingFiles((prev) => ({
                ...prev,
                [q.id]: [
                  ...(prev[q.id] ?? []),
                  ...files.map<PendingFile>((f) => ({ file: f, fileId: null, status: 'pending' })),
                ],
              }))
            }
            onFileRemove={(idx) =>
              setPendingFiles((prev) => ({
                ...prev,
                [q.id]: (prev[q.id] ?? []).filter((_, i) => i !== idx),
              }))
            }
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
        <p className="font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/55">
          {Object.values(answers).filter((a) => a && a.kind !== 'empty').length}/{questions.length} đã trả lời
        </p>
        <button
          type="button"
          onClick={() => handleSubmit('manual')}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Nộp bài
        </button>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.05] px-3 py-2 text-[11px] text-amber-200/90">
        <AlertCircle size={12} className="mt-0.5 shrink-0" />
        Hệ thống đang theo dõi nếu bạn rời tab hoặc mở cửa sổ khác. Số lần này sẽ được gửi tới giáo viên cùng bài làm.
      </p>
    </section>
  );
}

// ----- Subcomponents -----

function QuestionCard({
  index,
  question,
  answer,
  onAnswerChange,
  staged,
  onFilesAdded,
  onFileRemove,
}: {
  index: number;
  question: QuizQuestion;
  answer: AnswerValue | undefined;
  onAnswerChange: (next: AnswerValue) => void;
  staged: PendingFile[];
  onFilesAdded: (files: File[]) => void;
  onFileRemove: (idx: number) => void;
}) {
  const choices = question.choices_jsonb ?? [];
  const multi = question.type === 'multi';

  const toggleChoice = (idx: number) => {
    const cur = answer?.kind === 'choice' ? answer.choices : [];
    if (multi) {
      const next = cur.includes(idx) ? cur.filter((c) => c !== idx) : [...cur, idx].sort();
      onAnswerChange({ kind: 'choice', choices: next });
    } else {
      onAnswerChange({ kind: 'choice', choices: [idx] });
    }
  };

  const picked = answer?.kind === 'choice' ? answer.choices : [];

  return (
    <div className="space-y-3">
      <p className="font-headline text-base font-bold text-on-surface">
        <span className="text-primary mr-2 tabular-nums">{String(index + 1).padStart(2, '0')}.</span>
        {question.prompt_md}
        <span className="ml-2 font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/55">
          ({question.points} điểm
          {multi
            ? ' · chọn nhiều'
            : question.type === 'text'
              ? ' · điền đáp án'
              : question.type === 'file'
                ? ' · nộp tệp'
                : ''}
          )
        </span>
      </p>

      {(question.type === 'single' || question.type === 'multi') && (
        <div className="space-y-2">
          {choices.map((choice, ci) => {
            const isPicked = picked.includes(ci);
            return (
              <button
                key={ci}
                type="button"
                onClick={() => toggleChoice(ci)}
                className={`w-full flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-all text-sm ${
                  isPicked
                    ? 'border-cyan-300/50 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/10 bg-white/[0.03] hover:border-cyan-300/30'
                }`}
              >
                <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55 tabular-nums shrink-0">
                  {String.fromCharCode(65 + ci)}
                </span>
                <span className="flex-1">{choice}</span>
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'text' && (
        <textarea
          value={answer?.kind === 'text' ? answer.text : ''}
          onChange={(e) => onAnswerChange({ kind: 'text', text: e.target.value })}
          rows={3}
          placeholder="Nhập đáp án của bạn…"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none resize-y"
        />
      )}

      {question.type === 'file' && (
        <FileDropZone staged={staged} onFilesAdded={onFilesAdded} onRemove={onFileRemove} />
      )}
    </div>
  );
}

function FileDropZone({
  staged,
  onFilesAdded,
  onRemove,
}: {
  staged: PendingFile[];
  onFilesAdded: (files: File[]) => void;
  onRemove: (idx: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const filtered = Array.from(list).filter((f) => {
      if (f.size > MAX_UPLOAD_BYTES) {
        return false;
      }
      return true;
    });
    if (filtered.length > 0) onFilesAdded(filtered);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragOver
            ? 'border-cyan-300/60 bg-cyan-400/[0.06]'
            : 'border-white/15 bg-white/[0.02] hover:border-cyan-300/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <Upload size={20} className="mx-auto text-cyan-300/80 mb-1.5" />
        <p className="text-sm text-secondary/75">
          Kéo thả tệp vào đây hoặc <span className="text-cyan-200 underline">chọn tệp</span>
        </p>
        <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/45 mt-1">
          Tối đa {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB / tệp
        </p>
      </div>

      {staged.length > 0 && (
        <ul className="space-y-1.5">
          {staged.map((s, i) => (
            <li
              key={`${s.file.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-cyan-300 shrink-0" />
                <span className="truncate">{s.file.name}</span>
                <span className="font-tech text-[10px] tabular-nums text-secondary/45 shrink-0">
                  {(s.file.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-secondary/55 hover:text-red-300"
                aria-label="Xoá tệp"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultBanner({
  attempt,
  questions,
}: {
  attempt: QuizAttempt;
  questions: QuizQuestion[];
}) {
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
