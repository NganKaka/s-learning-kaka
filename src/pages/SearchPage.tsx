import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Search as SearchIcon, Loader2, BookOpen, Brain, HelpCircle } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface SearchResult {
  type: 'lesson' | 'flashcard' | 'question';
  id: string;
  title: string;
  subtitle?: string;
  link?: string;
}

export default function SearchPage() {
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const tsQuery = query.trim().split(/\s+/).join(' & ');
    const [{ data: lessons }, { data: cards }, { data: questions }] = await Promise.all([
      supabase.from('lessons').select('id, title, slug, course_id').textSearch('fts', tsQuery).limit(10),
      supabase.from('flashcards').select('id, front_md, back_md, lesson_id').textSearch('fts', tsQuery).limit(10),
      supabase.from('quiz_questions').select('id, prompt_md, quiz_id').textSearch('fts', tsQuery).limit(10),
    ]);

    const r: SearchResult[] = [];
    for (const l of lessons ?? []) {
      r.push({ type: 'lesson', id: l.id, title: l.title as string, subtitle: 'Bài học' });
    }
    for (const c of cards ?? []) {
      r.push({ type: 'flashcard', id: c.id, title: c.front_md as string, subtitle: c.back_md as string });
    }
    for (const q of questions ?? []) {
      r.push({ type: 'question', id: q.id, title: q.prompt_md as string, subtitle: 'Câu hỏi quiz' });
    }
    setResults(r);
    setSearching(false);
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const icons = { lesson: BookOpen, flashcard: Brain, question: HelpCircle };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-headline text-2xl font-extrabold text-on-surface">Tìm kiếm</h1>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/50" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Tìm bài học, flashcard, câu hỏi…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-secondary/50 focus:border-cyan-300/50 focus:outline-none"
            />
          </div>
          <button onClick={handleSearch} disabled={searching || !query.trim()} className="rounded-xl border border-primary/40 bg-primary/15 px-5 py-3 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 disabled:opacity-50">
            {searching ? <Loader2 size={14} className="animate-spin" /> : 'Tìm'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r) => {
              const Icon = icons[r.type];
              return (
                <div key={`${r.type}-${r.id}`} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                  <Icon size={16} className="text-cyan-300 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-on-surface truncate">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-secondary/55 truncate">{r.subtitle}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!searching && results.length === 0 && query && (
          <p className="text-center text-sm text-secondary/60 py-8">Không tìm thấy kết quả.</p>
        )}
      </div>
    </PageShell>
  );
}
