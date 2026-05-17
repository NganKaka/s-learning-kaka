import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Clock, Lock, Play, BookOpen, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import { useCourse, formatVnd, formatDuration, formatLessonDuration } from '../lib/courses';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
};

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: course, loading, error } = useCourse(slug);
  const { user } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);

  // Check whether the signed-in user already owns this course
  useEffect(() => {
    if (!user || !course?.id) {
      setIsEnrolled(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsEnrolled(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, course?.id]);

  if (loading) {
    return (
      <PageShell>
        <div className="space-y-6">
          <div className="h-12 w-2/3 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-64 w-full bg-white/5 rounded-2xl animate-pulse" />
          <div className="h-32 w-full bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </PageShell>
    );
  }

  if (error === 'not_found' || !course) {
    return <Navigate to="/courses" />;
  }

  if (error) {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-red-400">Lỗi tải khoá học: {error}</p>
        </div>
      </PageShell>
    );
  }

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const firstLessonSlug = course.modules[0]?.lessons[0]?.slug ?? null;

  return (
    <PageShell>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 lg:gap-12">
        {/* Left: hero + curriculum */}
        <div className="space-y-10">
          <div className="space-y-5">
            <div className="flex items-center gap-3 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
              <Link to="/courses" className="hover:text-cyan-300 transition-colors">Khoá học</Link>
              <span className="text-secondary/30">/</span>
              <span className="text-cyan-200">{course.slug}</span>
            </div>

            <h1 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tight text-on-surface leading-tight">
              {course.title}
            </h1>

            {course.subtitle && (
              <p className="text-lg text-secondary/85 leading-relaxed">{course.subtitle}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 font-tech text-[11px] uppercase tracking-[0.16em] text-secondary/60">
              <span className="inline-flex items-center gap-1.5">
                <BarChart3 size={12} className="text-cyan-300" />
                {LEVEL_LABEL[course.level] ?? course.level}
              </span>
              {course.duration_minutes > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={12} className="text-cyan-300" />
                  {formatDuration(course.duration_minutes)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={12} className="text-cyan-300" />
                {totalLessons} bài học
              </span>
            </div>
          </div>

          {course.cover_image && (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
              <img src={course.cover_image} alt={course.title} className="w-full aspect-video object-cover" />
            </div>
          )}

          {course.description && (
            <section className="glass-card rounded-2xl p-6 md:p-8 space-y-3">
              <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Giới thiệu khoá học</p>
              <p className="text-secondary/90 leading-loose whitespace-pre-line">{course.description}</p>
            </section>
          )}

          {/* Curriculum */}
          <section className="space-y-4">
            <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Giáo trình</p>
            <div className="space-y-3">
              {course.modules.map((module, mi) => (
                <ModulePanel key={module.id} module={module} index={mi} courseSlug={course.slug} />
              ))}
            </div>
          </section>

          {course.instructor && (
            <section className="glass-card rounded-2xl p-6 md:p-8 space-y-4">
              <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Giảng viên</p>
              <div className="flex items-center gap-4">
                {course.instructor.avatar_url && (
                  <img src={course.instructor.avatar_url} alt="" className="w-14 h-14 rounded-full border border-white/10 object-cover" />
                )}
                <div>
                  <p className="font-headline text-lg font-bold text-on-surface">
                    {course.instructor.display_name ?? 'Giảng viên'}
                  </p>
                  <p className="text-xs font-tech uppercase tracking-[0.14em] text-secondary/55">sLearningKaka</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right: sticky purchase card */}
        <aside className="lg:sticky lg:top-28 lg:self-start space-y-4">
          <div className="glass-card rounded-3xl p-6 ambient-shadow space-y-5">
            {isEnrolled ? (
              <div className="flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-200">
                <CheckCircle2 size={12} />
                Đã đăng ký
              </div>
            ) : (
              <div>
                <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-secondary/55">Học phí</p>
                <p className="mt-1 font-headline text-3xl font-extrabold text-primary tabular-nums">
                  {course.price_vnd === 0 ? 'Miễn phí' : formatVnd(course.price_vnd)}
                </p>
              </div>
            )}

            {isEnrolled && firstLessonSlug ? (
              <Link
                to={`/learn/${course.slug}/${firstLessonSlug}`}
                className="block w-full text-center bg-cyan-400 text-background px-6 py-3 rounded-xl text-xs font-bold tracking-[0.14em] uppercase border border-cyan-300/60 shadow-[0_0_24px_rgba(34,211,238,0.45)] hover:shadow-[0_0_32px_rgba(34,211,238,0.8)] transition-shadow inline-flex items-center justify-center gap-2"
              >
                <Play size={14} /> Tiếp tục học
              </Link>
            ) : (
              <Link
                to={`/cart?course=${course.slug}`}
                className="block w-full text-center bg-primary text-background px-6 py-3 rounded-xl text-xs font-bold tracking-[0.14em] uppercase border border-primary/50 shadow-[0_0_24px_rgba(233,195,73,0.55)] hover:shadow-[0_0_32px_rgba(233,195,73,0.9)] transition-shadow"
              >
                {course.price_vnd === 0 ? 'Bắt đầu học' : 'Đăng ký khoá học'}
              </Link>
            )}

            <ul className="space-y-2 pt-2 border-t border-white/10 text-sm text-secondary/85">
              <li className="flex items-start gap-2">
                <BookOpen size={14} className="mt-0.5 shrink-0 text-cyan-300" />
                <span>{totalLessons} bài học video</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock size={14} className="mt-0.5 shrink-0 text-cyan-300" />
                <span>Truy cập trọn đời</span>
              </li>
              <li className="flex items-start gap-2">
                <Play size={14} className="mt-0.5 shrink-0 text-cyan-300" />
                <span>Flashcard ôn tập + Quiz</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight size={14} className="mt-0.5 shrink-0 text-cyan-300" />
                <span>Chứng chỉ hoàn thành</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

interface ModulePanelProps {
  module: { id: string; title: string; lessons: Array<{ id: string; slug: string; title: string; duration_seconds: number; is_preview: boolean }> };
  index: number;
  courseSlug: string;
}

function ModulePanel({ module, index, courseSlug }: ModulePanelProps) {
  const [open, setOpen] = useState(index === 0);
  const totalSeconds = module.lessons.reduce((s, l) => s + l.duration_seconds, 0);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-primary tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="font-headline text-base font-bold text-on-surface">{module.title}</span>
        </div>
        <div className="flex items-center gap-3 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
          <span>{module.lessons.length} bài</span>
          {totalSeconds > 0 && <span>·</span>}
          {totalSeconds > 0 && <span>{Math.round(totalSeconds / 60)} phút</span>}
          <ChevronDown size={14} className={`text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <ul className="border-t border-white/10 divide-y divide-white/5">
          {module.lessons.map((lesson, li) => {
            const Icon = lesson.is_preview ? Play : Lock;
            const inner = (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <Icon size={12} className={lesson.is_preview ? 'text-cyan-300 shrink-0' : 'text-secondary/40 shrink-0'} />
                  <span className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/45 tabular-nums shrink-0">
                    {String(li + 1).padStart(2, '0')}
                  </span>
                  <span className={`text-sm truncate ${lesson.is_preview ? 'text-on-surface' : 'text-secondary/70'}`}>
                    {lesson.title}
                  </span>
                  {lesson.is_preview && (
                    <span className="font-tech text-[9px] uppercase tracking-[0.16em] text-cyan-300/85 shrink-0">Xem thử</span>
                  )}
                </div>
                {lesson.duration_seconds > 0 && (
                  <span className="font-tech text-[10px] tabular-nums text-secondary/55 shrink-0">
                    {formatLessonDuration(lesson.duration_seconds)}
                  </span>
                )}
              </>
            );
            return (
              <li key={lesson.id}>
                {lesson.is_preview ? (
                  <Link
                    to={`/learn/${courseSlug}/${lesson.slug}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-cyan-400/[0.04] cursor-pointer"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-5 py-3">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
