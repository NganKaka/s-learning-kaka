/**
 * UpNext — quick-action widget: next lesson, due flashcards, pending quizzes.
 * Guides the student to the most impactful next action.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, Loader2, CheckCircle2, CalendarClock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NextLesson {
  id: string;
  slug: string;
  title: string;
  module_title: string;
  course_slug: string;
}

interface UpNextData {
  lesson: NextLesson | null;
  dueCards: number;
  pendingMistakes: number;
  goalMet: boolean;
  nextDue?: Date;
}

export default function UpNext({ userId, courseId }: { userId: string; courseId: string }) {
  const [data, setData] = useState<UpNextData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !courseId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      // Fetch next incomplete lesson
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, slug, title, order_index, modules(title), course_id')
        .eq('course_id', courseId)
        .eq('is_preview', false)
        .order('order_index', { ascending: true });

      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .not('completed_at', 'is', null);

      const completedSet = new Set((progress ?? []).map((p) => p.lesson_id as string));
      const incomplete = (lessons ?? []).filter((l) => !completedSet.has(l.id as string));

      // Get course slug
      const { data: course } = await supabase
        .from('courses')
        .select('slug')
        .eq('id', courseId)
        .single();

      let nextLesson: NextLesson | null = null;
      if (incomplete[0]) {
        const first = incomplete[0] as {
          id: string;
          slug: string;
          title: string;
          modules?: { title: string }[];
        };
        nextLesson = {
          id: first.id,
          slug: first.slug,
          title: first.title,
          module_title: first.modules?.[0]?.title ?? '',
          course_slug: (course?.slug as string) ?? '',
        };
      }

      // Due cards count
      const { data: allCards } = await supabase
        .from('flashcards')
        .select('id')
        .eq('course_id', courseId);

      if (cancelled) {
        setLoading(false);
        return;
      }

      const cardIds = (allCards ?? []).map((c) => c.id as string);
      let dueCards = 0;
      if (cardIds.length > 0) {
        const { data: reviews } = await supabase
          .from('card_reviews')
          .select('card_id, due_at')
          .eq('user_id', userId)
          .in('card_id', cardIds)
          .lte('due_at', new Date().toISOString());

        dueCards = (reviews ?? []).length;

        // Cards without any review are also due
        const reviewedSet = new Set((reviews ?? []).map((r) => r.card_id as string));
        dueCards += cardIds.filter((id) => !reviewedSet.has(id)).length;
      }

      // Pending mistakes
      const { data: mistakes } = await supabase
        .from('mistakes')
        .select('id')
        .eq('user_id', userId)
        .eq('is_resolved', false);

      // Study goal
      const monday = getMonday();
      const { data: goal } = await supabase
        .from('study_goals')
        .select(
          'lessons_done, lessons_target, flashcards_done, flashcards_target, quizzes_done, quizzes_target, met',
        )
        .eq('user_id', userId)
        .eq('week_start', monday)
        .maybeSingle();

      if (!cancelled) {
        setData({
          lesson: nextLesson,
          dueCards,
          pendingMistakes: (mistakes ?? []).length,
          goalMet: goal?.met ?? false,
        });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, courseId]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5 flex items-center justify-center h-32">
        <Loader2 size={16} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const actions: {
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    href: string;
    urgent?: boolean;
  }[] = [];

  if (data.lesson) {
    actions.push({
      label: 'Tiếp tục học',
      sublabel: data.lesson.title,
      icon: <BookOpen size={14} className="text-cyan-300" />,
      href: `/learn/${data.lesson.course_slug}/${data.lesson.slug}`,
    });
  }

  if (data.dueCards > 0) {
    actions.push({
      label: `Ôn ${data.dueCards} thẻ`,
      sublabel: 'Flashcard đến hạn',
      icon: <Brain size={14} className="text-cyan-300" />,
      href: '/cards',
      urgent: data.dueCards > 20,
    });
  }

  if (data.pendingMistakes > 0) {
    actions.push({
      label: `Sửa ${data.pendingMistakes} lỗi`,
      sublabel: 'Chưa hiểu rõ',
      icon: <CalendarClock size={14} className="text-amber-300" />,
      href: '/mistakes',
      urgent: true,
    });
  }

  if (actions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-emerald-400">
            Tất cả đã xong!
          </span>
        </div>
        <p className="text-sm text-secondary/60">
          Bạn đã hoàn thành mọi thứ hôm nay. Hãy nghỉ ngơi hoặc khám phá thêm khoá học khác.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={14} className="text-primary" />
        <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-primary">
          Việc cần làm
        </span>
      </div>

      <div className="space-y-2">
        {actions.map((action, i) => (
          <Link
            key={i}
            to={action.href}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:border-cyan-300/40 ${
              action.urgent
                ? 'border-amber-400/30 bg-amber-500/[0.04]'
                : 'border-white/8 bg-white/[0.02]'
            }`}
          >
            <div className="shrink-0">{action.icon}</div>
            <div className="flex-1 min-w-0">
              <p
                className={`font-headline text-sm font-bold ${action.urgent ? 'text-amber-200' : 'text-on-surface'}`}
              >
                {action.label}
              </p>
              <p className="font-tech text-[9px] uppercase tracking-[0.12em] text-secondary/55 truncate">
                {action.sublabel}
              </p>
            </div>
            <ArrowRight size={12} className="text-secondary/40 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}
