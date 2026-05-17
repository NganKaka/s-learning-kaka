import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Pin, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Announcement {
  id: string;
  title: string | null;
  body_md: string;
  pinned: boolean;
  created_at: string;
  instructor_id: string;
  instructor_name?: string | null;
}

/**
 * Latest announcements visible to the current user — pinned first, then
 * recent. Used on the student dashboard. Hidden when nothing is published.
 */
export default function StudentAnnouncements() {
  const [list, setList] = useState<Announcement[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('announcements')
        .select('id, title, body_md, pinned, created_at, instructor_id')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);
      if (cancelled) return;

      // Resolve instructor name once per unique id
      const instructorIds = Array.from(new Set((rows ?? []).map((r) => r.instructor_id as string)));
      const nameById = new Map<string, string>();
      if (instructorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', instructorIds);
        for (const p of profiles ?? []) {
          nameById.set(p.id as string, (p.display_name as string | null) ?? 'Giảng viên');
        }
      }

      if (cancelled) return;
      setList(
        (rows ?? []).map((r) => ({
          id: r.id as string,
          title: (r.title as string | null) ?? null,
          body_md: r.body_md as string,
          pinned: !!r.pinned,
          created_at: r.created_at as string,
          instructor_id: r.instructor_id as string,
          instructor_name: nameById.get(r.instructor_id as string) ?? null,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!list || list.length === 0) return null;

  return (
    <section className="mt-8 space-y-3">
      <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary inline-flex items-center gap-2">
        <Megaphone size={12} /> Thông báo từ giảng viên
      </p>

      <div className="space-y-2">
        {list.map((a) => {
          const isOpen = expanded === a.id;
          return (
            <motion.div
              key={a.id}
              layout
              className={`glass-card rounded-2xl px-5 py-4 cursor-pointer transition-colors ${
                a.pinned ? 'border-primary/40 bg-primary/[0.05]' : 'hover:border-cyan-300/30'
              }`}
              onClick={() => setExpanded(isOpen ? null : a.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 font-tech text-[9px] uppercase tracking-[0.16em] text-primary">
                        <Pin size={9} /> Ghim
                      </span>
                    )}
                    <span className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
                      {a.instructor_name ?? 'Giảng viên'} · {formatRelative(a.created_at)}
                    </span>
                  </div>
                  {a.title && <p className="mt-1 font-headline font-bold text-on-surface">{a.title}</p>}
                  {!isOpen && (
                    <p className="mt-1 text-sm text-secondary/80 line-clamp-1">{a.body_md}</p>
                  )}
                </div>
                <ChevronDown size={14} className={`text-secondary/45 mt-1 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-secondary/85 leading-relaxed whitespace-pre-line">{a.body_md}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'vừa xong';
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}h`;
  if (diff < 7 * 24 * 60 * 60_000) return `${Math.floor(diff / (24 * 60 * 60_000))}d`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
