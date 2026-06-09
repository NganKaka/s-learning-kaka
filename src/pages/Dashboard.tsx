import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, Brain, Flame } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import StudentAnnouncements from '../components/StudentAnnouncements';
import StudyPlanner from '../components/StudyPlanner';
import StudyHeatmap from '../components/StudyHeatmap';
import BadgeDisplay from '../components/BadgeDisplay';
import { SkeletonCard, SkeletonLine } from '../components/ui/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CourseCard, XpWidget, FocusAreas, UpNext } from '../components/dashboard';

interface EnrolledCourse {
  id: string;
  slug: string;
  title: string;
  cover_image: string | null;
  duration_minutes: number;
  granted_at: string;
  total_lessons: number;
  completed_lessons: number;
}

interface PendingOrder {
  id: string;
  course_slug: string;
  course_title: string;
  amount_vnd: number;
  memo_code: string;
  created_at: string;
}

interface DailyStats {
  streak: number;
  cardsDueToday: number;
}

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const [enrolled, setEnrolled] = useState<EnrolledCourse[] | null>(null);
  const [pending, setPending] = useState<PendingOrder[] | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onFocus = () => setTick((n) => n + 1);
    const onVis = () => {
      if (!document.hidden) setTick((n) => n + 1);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchData = async () => {
      const [{ data: enr }, { data: ord }] = await Promise.all([
        supabase
          .from('enrollments')
          .select('granted_at, courses(id, slug, title, cover_image, duration_minutes)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('granted_at', { ascending: false }),
        supabase
          .from('orders')
          .select('id, amount_vnd, memo_code, created_at, courses(slug, title)')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;

      const baseRows = (enr ?? [])
        .map((row) => {
          const c = (Array.isArray(row.courses) ? row.courses[0] : row.courses) as
            | {
                id: string;
                slug: string;
                title: string;
                cover_image: string | null;
                duration_minutes: number;
              }
            | undefined;
          if (!c) return null;
          return {
            id: c.id,
            slug: c.slug,
            title: c.title,
            cover_image: c.cover_image,
            duration_minutes: c.duration_minutes,
            granted_at: row.granted_at as string,
          };
        })
        .filter(
          (r): r is Omit<EnrolledCourse, 'total_lessons' | 'completed_lessons'> => r !== null,
        );

      const courseIds = baseRows.map((r) => r.id);
      const totalsByCourse = new Map<string, number>();
      const completedByCourse = new Map<string, number>();
      if (courseIds.length > 0) {
        const [{ data: allLessons }, { data: progress }] = await Promise.all([
          supabase.from('lessons').select('id, course_id').in('course_id', courseIds),
          supabase
            .from('lesson_progress')
            .select('course_id')
            .eq('user_id', user.id)
            .not('completed_at', 'is', null)
            .in('course_id', courseIds),
        ]);
        for (const l of allLessons ?? []) {
          const cid = l.course_id as string;
          totalsByCourse.set(cid, (totalsByCourse.get(cid) ?? 0) + 1);
        }
        for (const p of progress ?? []) {
          const cid = p.course_id as string;
          completedByCourse.set(cid, (completedByCourse.get(cid) ?? 0) + 1);
        }
      }

      const enrolledRows: EnrolledCourse[] = baseRows.map((r) => ({
        ...r,
        total_lessons: totalsByCourse.get(r.id) ?? 0,
        completed_lessons: completedByCourse.get(r.id) ?? 0,
      }));

      const pendingRows: PendingOrder[] = (ord ?? [])
        .map((row) => {
          const c = (Array.isArray(row.courses) ? row.courses[0] : row.courses) as
            | { slug: string; title: string }
            | undefined;
          if (!c) return null;
          return {
            id: row.id as string,
            course_slug: c.slug,
            course_title: c.title,
            amount_vnd: row.amount_vnd as number,
            memo_code: row.memo_code as string,
            created_at: row.created_at as string,
          };
        })
        .filter((r): r is PendingOrder => r !== null);

      const { data: activity } = await supabase
        .from('lesson_progress')
        .select('updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      let streak = 0;
      if (activity && activity.length > 0) {
        const dayKeys = new Set(
          activity.map((a) => new Date(a.updated_at as string).toISOString().slice(0, 10)),
        );
        const today = new Date();
        for (let i = 0; i < 365; i += 1) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          if (dayKeys.has(key)) streak += 1;
          else break;
        }
      }

      let cardsDueToday = 0;
      if (courseIds.length > 0) {
        const [{ data: cards }, { data: futureReviews }] = await Promise.all([
          supabase.from('flashcards').select('id').in('course_id', courseIds),
          supabase
            .from('card_reviews')
            .select('card_id, due_at')
            .eq('user_id', user.id)
            .gt('due_at', new Date().toISOString()),
        ]);
        const futureSet = new Set((futureReviews ?? []).map((r) => r.card_id as string));
        cardsDueToday = (cards ?? []).filter((c) => !futureSet.has(c.id as string)).length;
      }

      setEnrolled(enrolledRows);
      setPending(pendingRows);
      setStats({ streak, cardsDueToday });
    };

    void fetchData();

    let pollId: number | null = null;
    if (pending && pending.length > 0) {
      pollId = window.setInterval(() => setTick((n) => n + 1), 8000);
    }

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
    };
  }, [user?.id, tick, pending?.length]);

  if (loading) {
    return (
      <PageShell>
        {/* Skeleton mirrors heading + stat grid + course cards to reduce CLS */}
        <div className="space-y-6">
          <div className="space-y-2">
            <SkeletonLine width="20%" />
            <SkeletonLine width="45%" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-5 h-24 animate-pulse" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!user) return <Navigate to="/login?next=/dashboard" replace />;

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Dashboard"
        title={`Chào ${profile?.display_name ?? 'bạn'}`}
        subtitle="Khoá học đang học và đơn hàng chờ duyệt — tất cả ở một nơi."
      />

      <StudentAnnouncements />

      {user && (
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <StudyPlanner userId={user.id} />
          <div className="glass-card rounded-2xl p-5">
            <StudyHeatmap userId={user.id} />
          </div>
        </div>
      )}
      {user && (
        <div className="mt-4 glass-card rounded-2xl p-5">
          <BadgeDisplay userId={user.id} />
        </div>
      )}

      {/* Reserve stat-widget space whether or not data has loaded to prevent CLS */}
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[120px]">
        {stats && user && (
          <>
            <XpWidget userId={user.id} />
            {enrolled && enrolled.length > 0 && (
              <UpNext userId={user.id} courseId={enrolled[0].id} />
            )}
            {enrolled && enrolled.length > 0 && (
              <FocusAreas userId={user.id} courseId={enrolled[0].id} />
            )}
          </>
        )}
        {/* Neutral stub when enrollments have loaded but user has none (no CLS) */}
        {stats && enrolled && enrolled.length === 0 && (
          <>
            <Link
              to="/cards"
              className="glass-card rounded-2xl p-5 space-y-2 hover:border-cyan-300/35 transition-colors"
            >
              <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
                <Brain size={12} className="text-cyan-300" aria-hidden="true" />
                <span>Flashcard cần ôn</span>
              </div>
              <p className="font-headline text-2xl font-extrabold tabular-nums text-on-surface">
                {stats.cardsDueToday}
              </p>
            </Link>
            <div className="glass-card rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
                <Flame size={12} className="text-primary" aria-hidden="true" />
                <span>Chuỗi ngày học</span>
              </div>
              <p className="font-headline text-2xl font-extrabold tabular-nums text-on-surface">
                {stats.streak} ngày
              </p>
            </div>
            <div className="glass-card rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
                <BookOpen size={12} className="text-cyan-300" aria-hidden="true" />
                <span>Khoá học</span>
              </div>
              <p className="font-headline text-2xl font-extrabold tabular-nums text-on-surface">
                0
              </p>
            </div>
          </>
        )}
      </div>

      {pending && pending.length > 0 && (
        <section className="mt-8 space-y-3">
          <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
            Đang chờ duyệt
          </p>
          {pending.map((order) => (
            <div
              key={order.id}
              className="glass-card rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap border border-amber-400/40"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={15}
                  className="text-amber-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-headline font-bold text-on-surface">{order.course_title}</p>
                  <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/60 mt-1">
                    Mã đơn: <span className="text-primary">{order.memo_code}</span>
                  </p>
                </div>
              </div>
              <Link
                to={`/cart?course=${order.course_slug}`}
                aria-label={`Xem trạng thái đơn hàng khoá học ${order.course_title}`}
                className="font-tech text-[10px] uppercase tracking-[0.14em] text-cyan-300 hover:text-cyan-200"
              >
                Xem trạng thái →
              </Link>
            </div>
          ))}
        </section>
      )}

      <section className="mt-10">
        <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
          Khoá học của bạn
        </p>

        {!enrolled && (
          <div className="mt-3 grid md:grid-cols-2 gap-5">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {enrolled && enrolled.length === 0 && (
          <div className="mt-3 glass-card rounded-2xl p-10 text-center space-y-3">
            <BookOpen size={28} className="text-cyan-300 mx-auto" />
            <p className="text-secondary/80">Bạn chưa đăng ký khoá học nào.</p>
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 underline"
            >
              Xem khoá học có sẵn <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {enrolled && enrolled.length > 0 && (
          <div className="mt-3 grid md:grid-cols-2 gap-5">
            {enrolled.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                studentName={profile?.display_name ?? 'Học viên'}
              />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
