import { useParams } from 'react-router-dom';
import PageShell from '../components/PageShell';

export default function Learn() {
  const { courseSlug, lessonSlug } = useParams<{ courseSlug: string; lessonSlug: string }>();
  return (
    <PageShell noFooter>
      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        <aside className="glass-card rounded-2xl p-5 h-fit sticky top-28">
          <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-primary">{courseSlug}</p>
          <p className="mt-2 text-sm text-secondary/70">Sidebar khoá học</p>
        </aside>
        <section className="glass-card rounded-2xl p-6 md:p-8 min-h-[60vh] space-y-4">
          <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-primary">Đang xem</p>
          <h1 className="font-headline text-3xl font-bold text-on-surface">{lessonSlug}</h1>
          <div className="aspect-video rounded-xl border border-white/10 bg-black/40 flex items-center justify-center text-secondary/40 text-sm">
            Video player (Phase 2.5)
          </div>
        </section>
      </div>
    </PageShell>
  );
}
