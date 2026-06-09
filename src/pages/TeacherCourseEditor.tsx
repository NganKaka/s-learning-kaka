import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cacheInvalidate, CACHE_KEYS } from '../lib/cache';
import type { Course, Module, Lesson } from '../lib/database.types';
import { ModulePanel } from '../components/teacher/ModulePanel';
import { Field, SelectField } from '../components/teacher/fields';

export default function TeacherCourseEditor() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Array<Module & { lessons: Lesson[] }>>([]);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);

  useEffect(() => {
    if (!slug || !user) return;
    let cancelled = false;
    (async () => {
      const { data: c } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .eq('instructor_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!c) {
        setError('not_found');
        return;
      }
      setCourse(c as Course);

      const { data: mods } = await supabase
        .from('modules')
        .select('*, lessons(*)')
        .eq('course_id', (c as Course).id)
        .order('order_index', { ascending: true });
      if (cancelled) return;
      const sorted = (mods ?? []).map((m) => ({
        ...(m as Module),
        lessons: ((m as { lessons: Lesson[] }).lessons ?? []).sort(
          (a, b) => a.order_index - b.order_index,
        ),
      }));
      setModules(sorted);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, user?.id, refreshTick]);

  if (error === 'not_found') {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-secondary/70">
            Không tìm thấy khoá học hoặc bạn không có quyền chỉnh sửa.
          </p>
          <Link
            to="/teacher/courses"
            className="inline-block mt-3 text-cyan-300 hover:text-cyan-200 underline"
          >
            ← Quay lại
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!course) {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 animate-pulse min-h-[400px]" />
      </PageShell>
    );
  }

  const saveCourseField = async (patch: Partial<Course>) => {
    setSavingCourse(true);
    const { error: e } = await supabase.from('courses').update(patch).eq('id', course.id);
    setSavingCourse(false);
    if (!e) {
      setCourse({ ...course, ...patch });
      void cacheInvalidate(CACHE_KEYS.courseCatalog(), CACHE_KEYS.courseDetail(course.slug));
    }
  };

  const togglePublish = () => {
    void saveCourseField({ status: course.status === 'published' ? 'draft' : 'published' });
  };

  const addModule = async () => {
    const title = window.prompt('Tên chương?');
    if (!title) return;
    const order = modules.length;
    const { data } = await supabase
      .from('modules')
      .insert({ course_id: course.id, title, order_index: order })
      .select('*')
      .single();
    if (data) setModules((m) => [...m, { ...(data as Module), lessons: [] }]);
  };

  const addLesson = async (moduleId: string) => {
    const title = window.prompt('Tên bài học?');
    if (!title) return;
    const slugInput = window.prompt(
      'Slug?',
      title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    );
    if (!slugInput) return;

    const targetModule = modules.find((m) => m.id === moduleId);
    if (!targetModule) return;

    const { error: e } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId,
        course_id: course.id,
        slug: slugInput,
        title,
        order_index: targetModule.lessons.length,
        is_preview: false,
      })
      .select('*')
      .single();
    if (e) {
      window.alert(`Lỗi: ${e.message}`);
      return;
    }
    setRefreshTick((n) => n + 1);
  };

  return (
    <PageShell>
      <Link
        to="/teacher/courses"
        className="inline-flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/60 hover:text-cyan-300 mb-4"
      >
        ← Tất cả khoá học
      </Link>

      <div className="space-y-6">
        {/* Course meta editor */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="font-headline text-2xl font-extrabold text-on-surface">
              {course.title}
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePublish}
                disabled={savingCourse}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.16em] transition-colors disabled:opacity-60 ${
                  course.status === 'published'
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                    : 'border-white/15 bg-white/[0.04] text-secondary/70 hover:bg-white/[0.08]'
                }`}
              >
                {course.status === 'published' ? <Eye size={11} /> : <EyeOff size={11} />}
                {course.status === 'published' ? 'Đã xuất bản' : 'Nháp'}
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field
              label="Tiêu đề"
              value={course.title}
              onSave={(v) => void saveCourseField({ title: v })}
            />
            <Field
              label="Phụ đề"
              value={course.subtitle ?? ''}
              onSave={(v) => void saveCourseField({ subtitle: v })}
            />
            <Field
              label="Slug"
              value={course.slug}
              onSave={(v) => void saveCourseField({ slug: v })}
            />
            <Field
              label="Học phí (VND)"
              value={String(course.price_vnd)}
              onSave={(v) => void saveCourseField({ price_vnd: parseInt(v, 10) || 0 })}
              type="number"
            />
            <Field
              label="Cover image URL"
              value={course.cover_image ?? ''}
              onSave={(v) => void saveCourseField({ cover_image: v })}
            />
            <SelectField
              label="Trình độ"
              value={course.level}
              onSave={(v) =>
                void saveCourseField({ level: v as 'beginner' | 'intermediate' | 'advanced' })
              }
              options={[
                { v: 'beginner', label: 'Cơ bản' },
                { v: 'intermediate', label: 'Trung bình' },
                { v: 'advanced', label: 'Nâng cao' },
              ]}
            />
          </div>

          <Field
            label="Mô tả"
            value={course.description ?? ''}
            onSave={(v) => void saveCourseField({ description: v })}
            multiline
          />
        </div>

        {/* Curriculum editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
              Giáo trình
            </p>
            <button
              type="button"
              onClick={addModule}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.16em] text-primary hover:bg-primary/25"
            >
              + Thêm chương
            </button>
          </div>

          {modules.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center text-secondary/65 text-sm">
              Chưa có chương nào — bấm "Thêm chương" để bắt đầu.
            </div>
          )}

          {modules.map((mod, mi) => (
            <ModulePanel
              key={mod.id}
              module={mod}
              index={mi}
              openLessonId={openLessonId}
              onToggleLesson={setOpenLessonId}
              onAddLesson={() => void addLesson(mod.id)}
              onChange={() => setRefreshTick((n) => n + 1)}
              courseId={course.id}
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
