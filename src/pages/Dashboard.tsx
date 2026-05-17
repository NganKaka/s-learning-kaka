import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Trophy } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
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

      const enrolledRows: EnrolledCourse[] = (enr ?? [])
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
        .filter((r): r is EnrolledCourse => r !== null);

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

      setEnrolled(enrolledRows);
      setPending(pendingRows);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="group glass-card rounded-2xl overflow-hidden transition-all hover:border-cyan-300/35"
              >
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
                <div className="p-5 space-y-2">
                  <h3 className="font-headline text-lg font-bold text-on-surface group-hover:text-cyan-200 transition-colors">
                    {course.title}
                  </h3>
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
