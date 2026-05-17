import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Lock, Play } from 'lucide-react';
import PageShell from '../components/PageShell';
import LessonCards from '../components/LessonCards';
import LessonQuiz from '../components/LessonQuiz';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Lesson, Module } from '../lib/database.types';
import { formatLessonDuration } from '../lib/courses';

const BUNNY_LIBRARY_ID = import.meta.env.VITE_BUNNY_STREAM_LIBRARY_ID ?? '';

interface CourseShape {
  id: string;
  slug: string;
  title: string;
  modules: Array<Module & { lessons: Lesson[] }>;
}

export default function Learn() {
  const { courseSlug, lessonSlug } = useParams<{ courseSlug: string; lessonSlug: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseShape | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseSlug || !lessonSlug) return;
    let cancelled = false;
    setCourse(null);
    setLesson(null);
    setEnrolled(null);
    setLoadError(null);

    (async () => {
      // Course skeleton — public read
      const { data: courseRow } = await supabase
        .from('courses')
        .select('id, slug, title, modules(id, course_id, title, order_index, created_at)')
        .eq('slug', courseSlug)
        .eq('status', 'published')
        .maybeSingle();

      if (cancelled) return;
      if (!courseRow) {
        setLoadError('not_found');
        return;
      }

      const courseId = courseRow.id as string;

      // Check enrollment for the current user
      let isEnrolled = false;
      if (user) {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        isEnrolled = !!enr;
      }

      // Lessons readable by RLS: previews if course is published, OR if enrolled
      const { data: lessonRows } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (cancelled) return;

      const allLessons = (lessonRows ?? []) as Lesson[];
      const targetLesson = allLessons.find((l) => l.slug === lessonSlug) ?? null;

      // Stitch lessons into modules
      const modulesArr = ((courseRow as unknown as { modules: Module[] }).modules ?? [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((m) => ({
          ...m,
          lessons: allLessons
            .filter((l) => l.module_id === m.id)
            .sort((a, b) => a.order_index - b.order_index),
        }));

      setCourse({ id: courseId, slug: courseRow.slug as string, title: courseRow.title as string, modules: modulesArr });
      setLesson(targetLesson);
      setEnrolled(isEnrolled);

      if (!targetLesson) {
        setLoadError('lesson_not_found');
        return;
      }
      // If lesson is locked (not preview, user not enrolled) → redirect
      if (!targetLesson.is_preview && !isEnrolled) {
        setLoadError('locked');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseSlug, lessonSlug, user?.id]);

  const flatLessons = useMemo<Lesson[]>(() => {
    if (!course) return [];
    return course.modules.flatMap((m) => m.lessons);
  }, [course]);

  const currentIdx = useMemo(() => {
    if (!lesson) return -1;
    return flatLessons.findIndex((l) => l.id === lesson.id);
  }, [flatLessons, lesson]);

  const prevLesson = currentIdx > 0 ? flatLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx >= 0 && currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null;

  // Lesson progress: best-effort upsert on mount
  useEffect(() => {
    if (!user || !lesson || !enrolled || lesson.is_preview === false && !enrolled) return;
    if (!enrolled && !lesson.is_preview) return;
    supabase
      .from('lesson_progress')
      .upsert(
        {
          user_id: user.id,
          lesson_id: lesson.id,
          course_id: lesson.course_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' },
      )
      .then(() => {});
  }, [user?.id, lesson?.id, enrolled]);

  if (authLoading) {
    return (
      <PageShell noFooter>
        <div className="glass-card rounded-2xl p-12 animate-pulse min-h-[60vh]" />
      </PageShell>
    );
  }

  if (loadError === 'not_found') {
    return <Navigate to="/courses" replace />;
  }

  if (loadError === 'locked') {
    return (
      <PageShell>
        <div className="max-w-md mx-auto glass-card rounded-2xl p-8 text-center space-y-4">
          <Lock size={28} className="text-primary mx-auto" />
          <p className="font-headline text-xl font-bold text-on-surface">Bài học bị khoá</p>
          <p className="text-sm text-secondary/80">Bạn cần đăng ký khoá học để xem bài này.</p>
          <Link
            to={`/cart?course=${courseSlug}`}
            className="inline-block bg-primary text-background px-6 py-3 rounded-xl text-xs font-bold tracking-[0.14em] uppercase border border-primary/50 shadow-[0_0_24px_rgba(233,195,73,0.55)]"
          >
            Đăng ký khoá học
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!course || !lesson) {
    return (
      <PageShell noFooter>
        <div className="glass-card rounded-2xl p-12 animate-pulse min-h-[60vh]" />
      </PageShell>
    );
  }

  const canPlay = lesson.is_preview || enrolled === true;

  return (
    <PageShell noFooter>
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="glass-card rounded-2xl p-4 h-fit lg:sticky lg:top-28 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <Link
            to={`/courses/${course.slug}`}
            className="inline-flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/60 hover:text-cyan-300 mb-3"
          >
            <ArrowLeft size={12} /> Trang khoá học
          </Link>
          <p className="font-headline font-bold text-on-surface mb-3 text-sm">{course.title}</p>
          <nav className="space-y-3">
            {course.modules.map((mod, mi) => (
              <div key={mod.id} className="space-y-1">
                <p className="font-tech text-[9px] uppercase tracking-[0.18em] text-primary/85 px-2">
                  {String(mi + 1).padStart(2, '0')} · {mod.title}
                </p>
                <ul className="space-y-0.5">
                  {mod.lessons.map((l) => {
                    const isActive = l.id === lesson.id;
                    const isLocked = !l.is_preview && enrolled !== true;
                    const Icon = isLocked ? Lock : isActive ? Play : BookOpen;
                    return (
                      <li key={l.id}>
                        <Link
                          to={`/learn/${course.slug}/${l.slug}`}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                            isActive
                              ? 'bg-cyan-400/10 border border-cyan-300/30 text-cyan-100'
                              : 'border border-transparent hover:bg-white/[0.03] text-secondary/85'
                          } ${isLocked ? 'opacity-60' : ''}`}
                        >
                          <Icon size={11} className="shrink-0" />
                          <span className="truncate">{l.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <section className="space-y-5">
          <div>
            <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
              {course.title}
            </p>
            <h1 className="mt-1 font-headline text-2xl md:text-4xl font-extrabold tracking-tight text-on-surface">
              {lesson.title}
            </h1>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video">
            {canPlay && lesson.bunny_video_id && BUNNY_LIBRARY_ID ? (
              <iframe
                src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${lesson.bunny_video_id}?autoplay=false&loop=false`}
                loading="lazy"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                className="w-full h-full"
                title={lesson.title}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-8 text-center text-secondary/55 text-sm">
                <Play size={32} className="opacity-40" />
                <p>{lesson.bunny_video_id ? 'Đang tải video…' : 'Video cho bài này chưa được upload. Quay lại sau.'}</p>
              </div>
            )}
          </div>

          {lesson.description && (
            <div className="glass-card rounded-2xl p-6 space-y-2">
              <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Mô tả</p>
              <p className="text-secondary/85 leading-loose whitespace-pre-line">{lesson.description}</p>
            </div>
          )}

          {canPlay && user && <LessonCards lessonId={lesson.id} />}
          {canPlay && user && <LessonQuiz lessonId={lesson.id} userId={user.id} />}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={!prevLesson}
              onClick={() => prevLesson && navigate(`/learn/${course.slug}/${prevLesson.slug}`)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-secondary hover:border-cyan-300/40 hover:text-cyan-200 transition-colors disabled:opacity-40"
            >
              <ArrowLeft size={12} /> Bài trước
            </button>

            {lesson.duration_seconds > 0 && (
              <span className="font-tech text-[10px] tabular-nums text-secondary/55">
                {formatLessonDuration(lesson.duration_seconds)}
              </span>
            )}

            {nextLesson ? (
              <button
                type="button"
                onClick={() => navigate(`/learn/${course.slug}/${nextLesson.slug}`)}
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 transition-all"
              >
                Bài tiếp <ArrowRight size={12} />
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-xs font-tech uppercase tracking-[0.16em] text-cyan-200">
                <Check size={12} /> Bài cuối
              </span>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
