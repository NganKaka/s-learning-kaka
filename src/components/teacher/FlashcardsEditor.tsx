/**
 * Flashcards editor component.
 */
import { Brain, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Flashcard {
  id: string;
  lesson_id: string;
  course_id: string;
  front_md: string;
  back_md: string;
  order_index: number;
}

interface FlashcardsEditorProps {
  lessonId: string;
  courseId: string;
}

export function FlashcardsEditor({ lessonId, courseId }: FlashcardsEditorProps) {
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('flashcards')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index', { ascending: true });
      if (!cancelled) setCards((data ?? []) as Flashcard[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, tick]);

  const addCard = async () => {
    const front = window.prompt('Mặt trước:');
    if (!front) return;
    const back = window.prompt('Mặt sau:');
    if (!back) return;
    const order = (cards ?? []).length;
    await supabase.from('flashcards').insert({
      lesson_id: lessonId,
      course_id: courseId,
      front_md: front,
      back_md: back,
      order_index: order,
    });
    setTick((n) => n + 1);
  };

  const editCard = async (card: Flashcard) => {
    const front = window.prompt('Mặt trước:', card.front_md);
    if (front === null) return;
    const back = window.prompt('Mặt sau:', card.back_md);
    if (back === null) return;
    await supabase.from('flashcards').update({ front_md: front, back_md: back }).eq('id', card.id);
    setTick((n) => n + 1);
  };

  const deleteCard = async (id: string) => {
    if (!window.confirm('Xoá thẻ này?')) return;
    await supabase.from('flashcards').delete().eq('id', id);
    setTick((n) => n + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-cyan-200">
          <Brain size={11} /> Flashcards <span className="text-secondary/45">({cards?.length ?? 0})</span>
        </p>
        <button
          type="button"
          onClick={addCard}
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 font-tech text-[10px] uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/20"
        >
          <Plus size={10} /> Thêm thẻ
        </button>
      </div>
      <ul className="space-y-2">
        {cards?.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 flex items-start justify-between gap-3"
          >
            <div className="min-w-0 text-sm">
              <p className="text-on-surface truncate">{c.front_md}</p>
              <p className="text-xs text-secondary/55 truncate">{c.back_md}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => editCard(c)}
                className="text-cyan-300/70 hover:text-cyan-200 text-xs font-tech uppercase tracking-[0.14em]"
              >
                Sửa
              </button>
              <button
                type="button"
                onClick={() => deleteCard(c.id)}
                className="text-red-400/70 hover:text-red-300"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
