import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Loader2 } from 'lucide-react';
import { type MistakeEntry, getMistakes, resolveMistake, updateMistakeNote } from '../lib/mistakeNotebook';
import { supabase } from '../lib/supabase';

export default function MistakeNotebook({ userId, courseId }: { userId: string; courseId?: string }) {
  const [entries, setEntries] = useState<MistakeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');

  useEffect(() => {
    getMistakes(userId, courseId).then(async (mistakes) => {
      // Enrich with question prompts
      if (mistakes.length > 0) {
        const qIds = mistakes.map((m) => m.question_id);
        const { data: questions } = await supabase
          .from('quiz_questions')
          .select('id, prompt_md, tags')
          .in('id', qIds);
        const qMap = new Map((questions ?? []).map((q) => [q.id, q]));
        for (const m of mistakes) {
          const q = qMap.get(m.question_id);
          if (q) { m.prompt_md = q.prompt_md; m.tags = q.tags; }
        }
      }
      setEntries(mistakes);
      setLoading(false);
    });
  }, [userId, courseId]);

  const handleResolve = async (id: string) => {
    await resolveMistake(id);
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, is_resolved: true, resolved_at: new Date().toISOString() } : e));
  };

  const handleNote = async (id: string, note: string) => {
    await updateMistakeNote(id, note);
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, student_note: note } : e));
  };

  const filtered = filter === 'unresolved' ? entries.filter((e) => !e.is_resolved) : entries;

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-red-300">
          <BookOpen size={12} /> Sổ lỗi sai ({entries.filter((e) => !e.is_resolved).length} chưa hiểu)
        </p>
        <div className="flex gap-2">
          <button onClick={() => setFilter('unresolved')} className={`font-tech text-[10px] uppercase px-2 py-1 rounded ${filter === 'unresolved' ? 'bg-primary/15 text-primary' : 'text-secondary/55'}`}>Chưa hiểu</button>
          <button onClick={() => setFilter('all')} className={`font-tech text-[10px] uppercase px-2 py-1 rounded ${filter === 'all' ? 'bg-primary/15 text-primary' : 'text-secondary/55'}`}>Tất cả</button>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-secondary/60 text-center py-4">
          {filter === 'unresolved' ? 'Không có lỗi sai nào chưa giải quyết. 🎉' : 'Chưa có lỗi sai nào.'}
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((entry) => (
          <div key={entry.id} className={`rounded-xl border p-4 space-y-2 ${entry.is_resolved ? 'border-emerald-400/20 bg-emerald-500/[0.03]' : 'border-red-400/20 bg-red-500/[0.03]'}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-on-surface">{entry.prompt_md ?? 'Câu hỏi'}</p>
              {!entry.is_resolved && (
                <button onClick={() => handleResolve(entry.id)} className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 font-tech text-[9px] uppercase text-emerald-200 hover:bg-emerald-500/20">
                  <CheckCircle2 size={10} /> Đã hiểu
                </button>
              )}
            </div>
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {entry.tags.map((t) => (
                  <span key={t} className="rounded-full bg-white/[0.06] px-2 py-0.5 font-tech text-[9px] text-secondary/60">{t}</span>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Ghi chú của bạn…"
              defaultValue={entry.student_note ?? ''}
              onBlur={(e) => { if (e.target.value !== (entry.student_note ?? '')) handleNote(entry.id, e.target.value); }}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-on-surface focus:border-cyan-300/40 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
