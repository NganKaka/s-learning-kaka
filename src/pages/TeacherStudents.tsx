import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, BookOpen, Clock, Search, X, Filter, Key } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatVnd } from '../lib/courses';

interface StudentRow {
  user_id: string;
  display_name: string | null;
  enrolled_courses: Array<{ course_id: string; title: string; granted_at: string; enrollment_id: string; tracking_code: string | null }>;
  completed_lessons: number;
  total_lessons: number;
  last_active: string | null;
  total_paid: number;
}

export default function TeacherStudents() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [query, setQuery] = useState('');
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [courseFilter, setCourseFilter] = useState<string>('all');

  useEffect(() => {
    if (!user || !profile?.is_instructor) return;
    let cancelled = false;
    (async () => {
      setRows(null);

      // Courses owned by this instructor
      const { data: myCourses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', user.id);
      if (cancelled) return;

      const courseIds = (myCourses ?? []).map((c) => c.id as string);
      if (courseIds.length === 0) {
        setRows([]);
        return;
      }
      const courseTitleById = new Map<string, string>();
      for (const c of myCourses ?? []) courseTitleById.set(c.id as string, c.title as string);
      setCourses((myCourses ?? []).map((c) => ({ id: c.id as string, title: c.title as string })));

      // Enrollments in those courses
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, user_id, course_id, granted_at, tracking_code')
        .in('course_id', courseIds)
        .eq('status', 'active');
      if (cancelled) return;

      const studentIds = Array.from(new Set((enrollments ?? []).map((e) => e.user_id as string)));
      if (studentIds.length === 0) {
        setRows([]);
        return;
      }

      // Profile rows for those students (the 0006 fix unlocks this read)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', studentIds);
      if (cancelled) return;
      const nameById = new Map<string, string | null>();
      for (const p of profiles ?? []) nameById.set(p.id as string, (p.display_name as string | null) ?? null);

      // Total lesson counts per course
      const { data: lessonCount } = await supabase
        .from('lessons')
        .select('id, course_id')
        .in('course_id', courseIds);
      if (cancelled) return;
      const totalLessonsByCourse = new Map<string, number>();
      for (const l of lessonCount ?? []) {
        const cid = l.course_id as string;
        totalLessonsByCourse.set(cid, (totalLessonsByCourse.get(cid) ?? 0) + 1);
      }

      // Lesson progress for these students
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('user_id, course_id, completed_at, updated_at')
        .in('user_id', studentIds)
        .in('course_id', courseIds);
      if (cancelled) return;

      const completedByUser = new Map<string, number>();
      const lastActiveByUser = new Map<string, string>();
      for (const p of progress ?? []) {
        const uid = p.user_id as string;
        if (p.completed_at) {
          completedByUser.set(uid, (completedByUser.get(uid) ?? 0) + 1);
        }
        const upd = p.updated_at as string;
        const cur = lastActiveByUser.get(uid);
        if (!cur || upd > cur) lastActiveByUser.set(uid, upd);
      }

      // Confirmed orders (purchases only) for revenue per student
      const { data: confirmedOrders } = await supabase
        .from('orders')
        .select('user_id, amount_vnd, course_id')
        .eq('status', 'confirmed')
        .eq('kind', 'purchase')
        .in('course_id', courseIds);
      if (cancelled) return;
      const paidByUser = new Map<string, number>();
      for (const o of confirmedOrders ?? []) {
        const uid = o.user_id as string;
        paidByUser.set(uid, (paidByUser.get(uid) ?? 0) + (o.amount_vnd as number));
      }

      const result: StudentRow[] = studentIds.map((uid) => {
        const studentEnrollments = (enrollments ?? [])
          .filter((e) => e.user_id === uid)
          .map((e) => ({
            course_id: e.course_id as string,
            title: courseTitleById.get(e.course_id as string) ?? '—',
            granted_at: e.granted_at as string,
            enrollment_id: e.id as string,
            tracking_code: (e.tracking_code as string | null) ?? null,
          }));

        // Sum total lessons over the student's enrolled courses
        const totalLessons = studentEnrollments.reduce(
          (s, e) => s + (totalLessonsByCourse.get(e.course_id) ?? 0),
          0,
        );

        return {
          user_id: uid,
          display_name: nameById.get(uid) ?? null,
          enrolled_courses: studentEnrollments,
          completed_lessons: completedByUser.get(uid) ?? 0,
          total_lessons: totalLessons,
          last_active: lastActiveByUser.get(uid) ?? null,
          total_paid: paidByUser.get(uid) ?? 0,
        };
      });

      setRows(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.is_instructor]);

  if (!profile?.is_instructor) return <Navigate to="/teacher" replace />;

  const filtered = useMemo(() => {
    if (!rows) return [];
    let result = rows;
    if (courseFilter !== 'all') {
      result = result.filter((r) => r.enrolled_courses.some((c) => c.course_id === courseFilter));
    }
    if (!query.trim()) return result;
    const q = query.trim().toLowerCase();
    return result.filter((r) => {
      return (
        r.display_name?.toLowerCase().includes(q) ||
        r.user_id.toLowerCase().includes(q) ||
        r.enrolled_courses.some((c) => c.title.toLowerCase().includes(q))
      );
    });
  }, [rows, query, courseFilter]);

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Teacher · Students"
        title="Học viên"
        subtitle="Theo dõi tiến độ học, doanh thu, và hoạt động gần đây của từng học viên."
      />

      <div className="mt-6 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, ID, hoặc khoá học…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-11 text-sm text-on-surface placeholder:text-secondary/50 focus:border-cyan-300/50 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-secondary"
              aria-label="Xoá"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {courses.length > 1 && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <Filter size={12} className="text-secondary/55" />
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="bg-transparent text-sm text-on-surface focus:outline-none"
            >
              <option value="all">Tất cả khoá học</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {rows === null && <div className="mt-6 glass-card rounded-2xl p-12 animate-pulse h-32" />}

      {rows && rows.length === 0 && (
        <div className="mt-6 glass-card rounded-2xl p-12 text-center space-y-2">
          <Users size={28} className="text-cyan-300 mx-auto" />
          <p className="text-secondary/65">Chưa có học viên nào đăng ký khoá học của bạn.</p>
        </div>
      )}

      {rows && rows.length > 0 && filtered.length === 0 && (
        <div className="mt-6 glass-card rounded-2xl p-8 text-center">
          <p className="text-secondary/65">Không có học viên khớp với tìm kiếm.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-6 space-y-3">
          {filtered.map((s) => {
            const progressPct = s.total_lessons > 0 ? Math.round((s.completed_lessons / s.total_lessons) * 100) : 0;
            return (
              <div key={s.user_id} className="glass-card rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-headline font-bold text-on-surface">{s.display_name ?? 'Học viên'}</p>
                    <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 mt-0.5 truncate">
                      {s.user_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-headline font-bold text-primary tabular-nums">{formatVnd(s.total_paid)}</p>
                    <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">đã thanh toán</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen size={11} className="text-cyan-300" />
                    {s.enrolled_courses.length} khoá
                  </span>
                  <span>·</span>
                  <span>
                    Tiến độ: <span className="text-cyan-200 tabular-nums">{s.completed_lessons}/{s.total_lessons}</span> ({progressPct}%)
                  </span>
                  {s.last_active && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={11} /> {formatRelative(s.last_active)}
                      </span>
                    </>
                  )}
                </div>

                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-300 to-cyan-200"
                    style={{ width: `${Math.min(100, progressPct)}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {s.enrolled_courses.map((c) => (
                    <div
                      key={c.enrollment_id}
                      className="flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-950/15 px-2.5 py-1"
                    >
                      <span className="font-tech text-[9px] uppercase tracking-[0.14em] text-cyan-100/75">
                        {c.title}
                      </span>
                      <div className="flex items-center gap-1">
                        <Key size={9} className="text-secondary/45" />
                        <input
                          type="text"
                          defaultValue={c.tracking_code ?? ''}
                          placeholder="Mã PH"
                          onBlur={(e) => {
                            const val = e.target.value.trim() || null;
                            if (val !== c.tracking_code) {
                              supabase.from('enrollments').update({ tracking_code: val }).eq('id', c.enrollment_id).then(() => {
                                setRows((prev) => prev?.map((r) => r.user_id === s.user_id ? { ...r, enrolled_courses: r.enrolled_courses.map((ec) => ec.enrollment_id === c.enrollment_id ? { ...ec, tracking_code: val } : ec) } : r) ?? null);
                              });
                            }
                          }}
                          className="w-20 bg-transparent border-b border-dashed border-secondary/30 text-[9px] font-tech text-cyan-200 placeholder:text-secondary/40 focus:border-cyan-300/50 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < 60_000) return 'vừa xong';
  if (diffMs < 60 * 60_000) return `${Math.floor(diffMs / 60_000)} phút trước`;
  if (diffMs < day) return `${Math.floor(diffMs / (60 * 60_000))} giờ trước`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
