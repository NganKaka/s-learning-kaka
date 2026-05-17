import { Link } from 'react-router-dom';
import { Search, X, BookOpen, Clock, BarChart3 } from 'lucide-react';
import { useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { usePublishedCourses, formatVnd, formatDuration } from '../lib/courses';

const LEVELS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'beginner', label: 'Cơ bản' },
  { id: 'intermediate', label: 'Trung bình' },
  { id: 'advanced', label: 'Nâng cao' },
] as const;

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
};

export default function Courses() {
  const { data: courses, loading, error } = usePublishedCourses();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<string>('all');

  const filtered = useMemo(() => {
    if (!courses) return [];
    return courses.filter((c) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.subtitle?.toLowerCase().includes(q) ?? false) ||
        (c.description?.toLowerCase().includes(q) ?? false);
      const matchesLevel = level === 'all' || c.level === level;
      return matchesQuery && matchesLevel;
    });
  }, [courses, query, level]);

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Catalog"
        title="Tất cả khoá học"
        subtitle="Mỗi khoá đi kèm video bài giảng, flashcard ôn tập, quiz đánh giá và chứng chỉ hoàn thành."
      />

      <div className="mt-8 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/50 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm khoá học theo tên, mô tả…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-11 text-sm text-on-surface placeholder:text-secondary/50 transition-all focus:border-cyan-300/50 focus:bg-cyan-400/[0.05] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-secondary transition-colors"
              aria-label="Xoá tìm kiếm"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => {
            const isActive = level === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-tech uppercase tracking-[0.14em] transition-all ${
                  isActive
                    ? 'border border-primary/40 bg-primary/15 text-primary'
                    : 'border border-white/10 bg-white/[0.03] text-secondary/70 hover:border-cyan-300/30 hover:text-cyan-200'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-10 glass-card rounded-2xl p-8 text-center">
          <p className="text-red-400">Lỗi tải khoá học: {error}</p>
        </div>
      )}

      {loading && (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 min-h-[320px] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="mt-10 glass-card rounded-2xl p-12 text-center">
          <p className="text-secondary/70">
            {courses && courses.length === 0
              ? 'Chưa có khoá học nào được xuất bản.'
              : 'Không có khoá học nào khớp bộ lọc.'}
          </p>
          {(query || level !== 'all') && (
            <button
              onClick={() => {
                setQuery('');
                setLevel('all');
              }}
              className="mt-3 text-sm text-cyan-300 hover:text-cyan-200 underline"
            >
              Xoá bộ lọc
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.slug}`}
              className="group glass-card block rounded-2xl overflow-hidden transition-all hover:border-cyan-300/35"
            >
              {course.cover_image && (
                <div className="aspect-video overflow-hidden bg-white/[0.02]">
                  <img
                    src={course.cover_image}
                    alt={course.title}
                    className="h-full w-full object-cover opacity-70 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}

              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
                  <BarChart3 size={12} className="text-cyan-300" />
                  <span>{LEVEL_LABEL[course.level] ?? course.level}</span>
                  {course.duration_minutes > 0 && (
                    <>
                      <span className="text-secondary/30">·</span>
                      <Clock size={12} className="text-cyan-300" />
                      <span>{formatDuration(course.duration_minutes)}</span>
                    </>
                  )}
                </div>

                <h2 className="font-headline text-xl font-bold text-on-surface group-hover:text-cyan-200 transition-colors">
                  {course.title}
                </h2>

                {course.subtitle && (
                  <p className="text-sm text-secondary/80 leading-relaxed line-clamp-2">{course.subtitle}</p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="font-headline text-lg font-bold text-primary tabular-nums">
                    {course.price_vnd === 0 ? 'Miễn phí' : formatVnd(course.price_vnd)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-tech uppercase tracking-[0.14em] text-cyan-300 group-hover:gap-2 transition-all">
                    <BookOpen size={12} /> Xem chi tiết
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
