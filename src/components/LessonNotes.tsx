import { useEffect, useState } from 'react';
import { StickyNote, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LessonNote {
  id: string;
  user_id: string;
  lesson_id: string;
  timestamp_seconds: number | null;
  content: string;
  created_at: string;
}

export default function LessonNotes({ userId, lessonId }: { userId: string; lessonId: string }) {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    supabase
      .from('lesson_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setNotes((data ?? []) as LessonNote[]); setLoading(false); });
  }, [userId, lessonId]);

  const addNote = async () => {
    if (!draft.trim()) return;
    const ts = timestamp ? parseTimestamp(timestamp) : null;
    const { data } = await supabase
      .from('lesson_notes')
      .insert({ user_id: userId, lesson_id: lessonId, content: draft.trim(), timestamp_seconds: ts })
      .select('*')
      .single();
    if (data) setNotes((prev) => [...prev, data as LessonNote]);
    setDraft('');
    setTimestamp('');
  };

  const deleteNote = async (id: string) => {
    await supabase.from('lesson_notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-cyan-200">
        <StickyNote size={12} /> Ghi chú ({notes.length})
      </p>

      {notes.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {notes.map((n) => (
            <div key={n.id} className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
              {n.timestamp_seconds !== null && (
                <span className="shrink-0 font-tech text-[10px] tabular-nums text-primary mt-0.5">
                  {formatTs(n.timestamp_seconds)}
                </span>
              )}
              <p className="flex-1 text-sm text-on-surface whitespace-pre-wrap">{n.content}</p>
              <button onClick={() => deleteNote(n.id)} className="shrink-0 text-red-400/60 hover:text-red-300">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          placeholder="mm:ss"
          className="w-16 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs text-on-surface text-center focus:border-cyan-300/40 focus:outline-none"
        />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
          placeholder="Thêm ghi chú…"
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
        />
        <button onClick={addNote} disabled={!draft.trim()} className="shrink-0 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1.5 text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-40">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function parseTimestamp(str: string): number | null {
  const parts = str.split(':').map(Number);
  if (parts.length === 2 && parts.every((p) => !isNaN(p))) return parts[0] * 60 + parts[1];
  return null;
}

function formatTs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
