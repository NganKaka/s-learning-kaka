import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { QuizQuestion, AnswerValue } from '../lib/quiz';

interface TopicStat {
  tag: string;
  total: number;
  correct: number;
  pct: number;
}

/**
 * Shows student's weak topics based on tags on quiz questions.
 * Analyzes all submitted attempts for a given course.
 */
export default function WeakTopicAnalysis({ userId, courseId }: { userId: string; courseId: string }) {
  const [stats, setStats] = useState<TopicStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !courseId) return;
    let cancelled = false;
    (async () => {
      // Get lessons in course
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);
      if (!lessons || cancelled) { setLoading(false); return; }

      const lessonIds = lessons.map((l) => l.id);
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, lesson_id')
        .in('lesson_id', lessonIds);
      if (!quizzes || cancelled) { setLoading(false); return; }

      const quizIds = quizzes.map((q) => q.id);
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('*')
        .in('quiz_id', quizIds);
      if (!questions || cancelled) { setLoading(false); return; }

      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('answers_jsonb, quiz_id')
        .eq('user_id', userId)
        .in('quiz_id', quizIds)
        .in('status', ['submitted', 'graded']);
      if (cancelled) { setLoading(false); return; }

      // Aggregate by tag
      const tagStats: Record<string, { total: number; correct: number }> = {};
      const qs = questions as QuizQuestion[];

      for (const attempt of (attempts ?? [])) {
        const answers = (attempt.answers_jsonb ?? {}) as Record<string, AnswerValue>;
        for (const q of qs.filter((qq) => qq.quiz_id === attempt.quiz_id)) {
          if (q.tags.length === 0) continue;
          const isCorrect = checkCorrect(q, answers[q.id]);
          for (const tag of q.tags) {
            if (!tagStats[tag]) tagStats[tag] = { total: 0, correct: 0 };
            tagStats[tag].total += 1;
            if (isCorrect) tagStats[tag].correct += 1;
          }
        }
      }

      const result: TopicStat[] = Object.entries(tagStats)
        .map(([tag, s]) => ({ tag, ...s, pct: s.total > 0 ? (s.correct / s.total) * 100 : 0 }))
        .sort((a, b) => a.pct - b.pct);

      if (!cancelled) {
        setStats(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, courseId]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary" /></div>;
  if (stats.length === 0) return <p className="text-sm text-secondary/60 text-center py-4">Chưa có dữ liệu phân tích chủ đề.</p>;

  const weak = stats.filter((s) => s.pct < 60);

  return (
    <div className="space-y-3">
      <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-amber-300">
        <Target size={12} /> Phân tích điểm yếu
      </p>

      {weak.length > 0 && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.05] px-4 py-3 space-y-1">
          <p className="inline-flex items-center gap-1.5 text-xs text-amber-200">
            <AlertTriangle size={12} /> Cần cải thiện:
          </p>
          <div className="flex flex-wrap gap-2">
            {weak.map((s) => (
              <span key={s.tag} className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 font-tech text-[10px] text-amber-200">
                {s.tag} ({s.pct.toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {stats.map((s) => (
          <div key={s.tag} className="flex items-center gap-3">
            <span className="text-sm text-on-surface w-28 truncate">{s.tag}</span>
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  s.pct >= 80 ? 'bg-emerald-400' : s.pct >= 60 ? 'bg-cyan-400' : 'bg-amber-400'
                }`}
                style={{ width: `${s.pct}%` }}
              />
            </div>
            <span className="font-tech text-[10px] tabular-nums text-secondary/60 w-12 text-right">
              {s.correct}/{s.total}
            </span>
          </div>
        ))}
      </div>
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
