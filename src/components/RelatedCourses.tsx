import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RelatedCourse {
  slug: string;
  title: string;
  level: string;
}

export default function RelatedCourses({ currentSlug }: { currentSlug: string }) {
  const [courses, setCourses] = useState<RelatedCourse[]>([]);

  useEffect(() => {
    supabase.from('courses').select('slug, title, level').eq('status', 'published').neq('slug', currentSlug).limit(3)
      .then(({ data }) => setCourses((data ?? []) as RelatedCourse[]));
  }, [currentSlug]);

  if (courses.length === 0) return null;

  return (
    <section className="mt-8 space-y-3">
      <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Khoá học liên quan</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {courses.map((c) => (
          <Link key={c.slug} to={`/courses/${c.slug}`} className="glass-card rounded-xl p-4 hover:border-cyan-300/30 transition-colors group">
            <p className="text-sm font-bold text-on-surface group-hover:text-cyan-200 transition-colors">{c.title}</p>
            <p className="font-tech text-[9px] uppercase text-secondary/55 mt-1">{c.level}</p>
            <ArrowRight size={12} className="text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </section>
  );
}
