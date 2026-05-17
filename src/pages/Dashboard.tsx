import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Trophy, Flame, Brain, Award, Loader2 } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import StudentAnnouncements from '../components/StudentAnnouncements';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDuration } from '../lib/courses';

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

interface DailyStats {
  streak: number;
  cardsDueToday: number;
}

interface PendingOrder {
  id: string;
  course_slug: string;
  course_title: string;
  amount_vnd: number;
  memo_code: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const [enrolled, setEnrolled] = useState<EnrolledCourse[] | null>(null);
  const [pending, setPending] = useState<PendingOrder[] | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [tick, setTick] = useState(0);

  // Refetch on focus / page reshow so returning to the tab after teacher
  // approval pulls the new enrollment without reload.
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
    (async () => {
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
            | { id: string; slug: string; title: string; cover_image: string | null; duration_minutes: number }
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
        .filter((r): r is Omit<EnrolledCourse, 'total_lessons' | 'completed_lessons'> => r !== null);

      // For each enrolled course, count total lessons + completed
      const courseIds = baseRows.map((r) => r.id);
      let totalsByCourse = new Map<string, number>();
      let completedByCourse = new Map<string, number>();
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

      // Streak: count distinct days with a lesson_progress.updated_at,
      // walking back from today.
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

      // Cards due today: any card_review with due_at <= now() OR no review row
      // for an enrolled course's flashcard. We approximate the "no row" case
      // by counting flashcards in enrolled courses minus existing review rows
      // with due_at > now.
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
    })();

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
        <div className="glass-card rounded-2xl p-12 animate-pulse min-h-[300px]" />
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

      {/* Daily stats */}
      {stats && (
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <Link
            to="/cards"
            className="glass-card rounded-2xl p-5 space-y-2 hover:border-cyan-300/35 transition-colors"
          >
            <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
              <Brain size={12} className="text-cyan-300" />
              <span>Flashcard cần ôn</span>
            </div>
            <p className="font-headline text-2xl font-extrabold tabular-nums text-cyan-200">
              {stats.cardsDueToday}
            </p>
          </Link>

          <div className="glass-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
              <Flame size={12} className="text-primary" />
              <span>Chuỗi ngày học</span>
            </div>
            <p className="font-headline text-2xl font-extrabold tabular-nums text-primary">
              {stats.streak} {stats.streak === 1 ? 'ngày' : 'ngày'}
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
              <BookOpen size={12} className="text-cyan-300" />
              <span>Khoá học</span>
            </div>
            <p className="font-headline text-2xl font-extrabold tabular-nums text-on-surface">
              {enrolled?.length ?? 0}
            </p>
          </div>
        </div>
      )}

      {pending && pending.length > 0 && (
        <section className="mt-8 space-y-3">
          <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Đang chờ duyệt</p>
          {pending.map((order) => (
            <div key={order.id} className="glass-card rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-headline font-bold text-on-surface">{order.course_title}</p>
                <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/60 mt-1">
                  Mã đơn: <span className="text-primary">{order.memo_code}</span>
                </p>
              </div>
              <Link
                to={`/cart?course=${order.course_slug}`}
                className="font-tech text-[10px] uppercase tracking-[0.14em] text-cyan-300 hover:text-cyan-200"
              >
                Xem trạng thái →
              </Link>
            </div>
          ))}
        </section>
      )}

      <section className="mt-10">
        <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Khoá học của bạn</p>

        {!enrolled && (
          <div className="mt-3 glass-card rounded-2xl p-12 animate-pulse h-32" />
        )}

        {enrolled && enrolled.length === 0 && (
          <div className="mt-3 glass-card rounded-2xl p-10 text-center space-y-3">
            <BookOpen size={28} className="text-cyan-300 mx-auto" />
            <p className="text-secondary/80">Bạn chưa đăng ký khoá học nào.</p>
            <Link to="/courses" className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 underline">
              Xem khoá học có sẵn <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {enrolled && enrolled.length > 0 && (
          <div className="mt-3 grid md:grid-cols-2 gap-5">
            {enrolled.map((course) => (
              <CourseCard key={course.id} course={course} studentName={profile?.display_name ?? 'Học viên'} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function CourseCard({ course, studentName }: { course: EnrolledCourse; studentName: string }) {
  const [downloading, setDownloading] = useState(false);
  const completed = course.total_lessons > 0 && course.completed_lessons >= course.total_lessons;

  const handleDownloadCert = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);
    const [{ generateCertificatePdf, downloadPdf }] = await Promise.all([import('../lib/certificate')]);
    const bytes = await generateCertificatePdf({
      studentName,
      courseTitle: course.title,
      completionDate: new Date(),
    });
    downloadPdf(bytes, `sLearningKaka-${course.slug}-${studentName.replace(/\s+/g, '_')}.pdf`);
    setDownloading(false);
  };

  return (
    <div className="group glass-card rounded-2xl overflow-hidden transition-all hover:border-cyan-300/35">
      <Link to={`/courses/${course.slug}`} className="block">
        {course.cover_image && (
          <div className="aspect-video overflow-hidden bg-white/[0.02]">
            <img
              src={course.cover_image}
              alt={course.title}
              className="h-full w-full object-cover opacity-80 transition-all duration-700 group-hover:opacity-100 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        )}
      </Link>
      <div className="p-5 space-y-3">
        <Link to={`/courses/${course.slug}`}>
          <h3 className="font-headline text-lg font-bold text-on-surface group-hover:text-cyan-200 transition-colors">
            {course.title}
          </h3>
        </Link>

        {course.total_lessons > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
              <span>{course.completed_lessons} / {course.total_lessons} bài</span>
              <span className="text-cyan-200 tabular-nums">
                {Math.round((course.completed_lessons / course.total_lessons) * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-300 to-cyan-200 transition-[width] duration-500"
                style={{ width: `${Math.min(100, (course.completed_lessons / course.total_lessons) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
          {course.duration_minutes > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={11} className="text-cyan-300" /> {formatDuration(course.duration_minutes)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-cyan-300">
            <Trophy size={11} /> Đã đăng ký
          </span>
        </div>

        {completed && (
          <button
            type="button"
            onClick={handleDownloadCert}
            disabled={downloading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-4 py-2.5 font-tech text-[11px] uppercase tracking-[0.16em] text-primary hover:bg-primary/25 hover:shadow-[0_0_18px_rgba(233,195,73,0.25)] transition-all disabled:opacity-60"
          >
            {downloading ? <Loader2 size={12} className="animate-spin" /> : <Award size={12} />}
            Tải chứng chỉ
          </button>
        )}
      </div>
    </div>
  );
}
