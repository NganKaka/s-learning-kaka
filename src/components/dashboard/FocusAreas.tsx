/**
 * Focus Areas — prominent card surfacing weak topics with direct links to relevant lessons.
 * Replaces the inline WeakTopicAnalysis on the dashboard for better UX.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, Target, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { QuizQuestion, AnswerValue } from '../../lib/quiz';

interface TopicStat {
  tag: string;
  total: number;
  correct: number;
  pct: number;
  lessonId?: string;
  lessonSlug?: string;
}

interface FocusAreasProps {
  userId: string;
  courseId: string;
}

export default function FocusAreas({ userId, courseId }: FocusAreasProps) {
  const [stats, setStats] = useState<TopicStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !courseId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, slug')
        .eq('course_id', courseId);

      if (!lessons || cancelled) { setLoading(false); return; }
      const lessonIds = lessons.map((l) => l.id);
      const lessonSlugMap = new Map(lessons.map((l) => [l.id, l.slug]));

      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, lesson_id')
        .in('lesson_id', lessonIds);

      if (!quizzes || cancelled) { setLoading(false); return; }
      const quizIds = quizzes.map((q) => q.id);

      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('id, quiz_id, tags')
        .in('quiz_id', quizIds);

      if (!questions || cancelled) { setLoading(false); return; }

      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('answers_jsonb, quiz_id')
        .eq('user_id', userId)
        .in('quiz_id', quizIds)
        .in('status', ['submitted', 'graded']);

      if (cancelled) { setLoading(false); return; }

      // Build tag → { correct, total, lessonId }
      const tagStats: Record<string, { total: number; correct: number; lessonId?: string }> = {};
      const qs = questions as QuizQuestion[];

      for (const attempt of (attempts ?? [])) {
        const answers = (attempt.answers_jsonb ?? {}) as Record<string, AnswerValue>;
        const qids = new Set(qs.filter((q) => q.quiz_id === attempt.quiz_id).map((q) => q.id));

        for (const q of qs.filter((q) => q.quiz_id === attempt.quiz_id)) {
          if (q.tags.length === 0) continue;
          const isCorrect = checkCorrect(q, answers[q.id]);

          // Determine lessonId for this question
          const quiz = quizzes.find((qu) => qu.id === q.quiz_id);
          const lid = quiz?.lesson_id;

          for (const tag of q.tags) {
            if (!tagStats[tag]) tagStats[tag] = { total: 0, correct: 0, lessonId: lid };
            tagStats[tag].total += 1;
            if (isCorrect) tagStats[tag].correct += 1;
            // Prefer the first lessonId found
            if (!tagStats[tag].lessonId && lid) tagStats[tag].lessonId = lid;
          }
        }
      }

      const result: TopicStat[] = Object.entries(tagStats)
        .map(([tag, s]) => ({
          tag,
          total: s.total,
          correct: s.correct,
          pct: s.total > 0 ? (s.correct / s.total) * 100 : 0,
          lessonId: s.lessonId,
          lessonSlug: lessonSlugMap.get(s.lessonId ?? '') ?? undefined,
        }))
        .sort((a, b) => a.pct - b.pct);

      if (!cancelled) { setStats(result); setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [userId, courseId]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5 flex items-center justify-center h-32">
        <Loader2 size={16} className="animate-spin text-primary" />
      </div>
    );
  }

  const weak = stats.filter((s) => s.pct < 60);
  const totalAttempts = stats.reduce((sum, s) => sum + s.total, 0);

  if (totalAttempts === 0) {
    return (
      <div className="glass-card rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-amber-300" />
          <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-amber-300">Điểm yếu cần cải thiện</span>
        </div>
        <p className="text-sm text-secondary/60">Hoàn thành vài bài quiz để xem phân tích điểm mạnh/yếu.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-amber-300" />
          <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-amber-300">Điểm yếu cần cải thiện</span>
        </div>
        <span className="font-tech text-[9px] text-secondary/45">{stats.length} chủ đề</span>
      </div>

      {weak.length > 0 ? (
        <div className="space-y-2">
          {weak.slice(0, 4).map((s) => (
            <div key={s.tag} className="flex items-center gap-3">
              <AlertTriangle size={11} className="text-amber-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-sm text-on-surface truncate font-medium">{s.tag}</span>
                  <span className="font-tech text-[9px] tabular-nums text-secondary/60 shrink-0">
                    {s.pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
              {s.lessonSlug && (
                <Link
                  to={`/courses/${courseId}/learn/${s.lessonSlug}`}
                  className="shrink-0 text-cyan-300 hover:text-cyan-200"
                  title="Học bài này"
                >
                  <ArrowRight size={12} />
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-emerald-300/80">Tuyệt vời! Bạn không có điểm yếu nào dưới 60%.</p>
      )}

      {weak.length > 4 && (
        <p className="font-tech text-[9px] text-secondary/45 text-right">
          +{weak.length - 4} chủ đề khác
        </p>
      )}
    </div>
  );
}

function checkCorrect(q: QuizQuestion, answer: AnswerValue | undefined): boolean {
  if (!answer || answer.kind === 'empty') return false;
  if (q.type === 'single' || q.type === 'multi') {
    const correct = [...(q.correct_jsonb ?? [])].sort();
    const picked = answer.kind === 'choice' ? [...answer.choices].sort() : [];
    return correct.length === picked.length && correct.every((v, i) => v === picked[i]);
  }
  if (q.type === 'text' && q.expected_text) {
    const got = answer.kind === 'text' ? answer.text.trim().toLowerCase() : '';
    return got === q.expected_text.trim().toLowerCase();
  }
  return false;
}
