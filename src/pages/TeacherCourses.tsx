import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, Loader2 } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatVnd } from '../lib/courses';
import type { Course } from '../lib/database.types';

export default function TeacherCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false });
      if (!cancelled) setCourses((data ?? []) as Course[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleCreate = async () => {
    if (!user) return;
    const title = window.prompt('Tên khoá học mới?');
    if (!title) return;
    const slug = window.prompt('Slug (lowercase, không dấu, dùng -)?', title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')) ?? '';
    if (!slug) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('courses')
      .insert({
        slug,
        title,
        instructor_id: user.id,
        status: 'draft',
        price_vnd: 0,
        level: 'beginner',
      })
      .select('*')
      .single();
    setCreating(false);
    if (error) {
      window.alert(`Lỗi: ${error.message}`);
      return;
    }
    setCourses((cur) => [(data as Course), ...(cur ?? [])]);
  };

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionHeading
          eyebrow="Teacher"
          title="Quản lý khoá học"
          subtitle="Bấm vào một khoá để chỉnh sửa giáo trình, video, flashcard và quiz."
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 transition-colors disabled:opacity-60"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Khoá mới
        </button>
      </div>

      {!courses && <div className="mt-8 glass-card rounded-2xl p-12 animate-pulse h-32" />}

      {courses && courses.length === 0 && (
        <div className="mt-8 glass-card rounded-2xl p-12 text-center">
          <p className="text-secondary/70">Chưa có khoá học nào.</p>
        </div>
      )}

      {courses && courses.length > 0 && (
        <div className="mt-8 space-y-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/teacher/courses/${course.slug}`}
              className="glass-card rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-cyan-300/35 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-headline font-bold text-on-surface truncate">{course.title}</p>
                  <span className={`rounded-full px-2 py-0.5 font-tech text-[9px] uppercase tracking-[0.18em] ${
                    course.status === 'published'
                      ? 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                      : 'border border-secondary/40 bg-white/[0.04] text-secondary/65'
                  }`}>
                    {course.status === 'published' ? 'Đã xuất bản' : course.status === 'draft' ? 'Nháp' : 'Lưu trữ'}
                  </span>
                </div>
                <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55 mt-1">
                  /{course.slug} · {formatVnd(course.price_vnd)}
                </p>
              </div>
              <ChevronRight size={18} className="text-secondary/45 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
