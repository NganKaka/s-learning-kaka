import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationCenter({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const unread = items.filter((n) => !n.is_read).length;

  useEffect(() => {
    supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setItems((data ?? []) as Notification[]));
  }, [userId]);

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-full border border-white/10 bg-white/[0.03] p-2 hover:border-cyan-300/40 transition-colors">
        <Bell size={16} className="text-secondary/70" />
        {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-background flex items-center justify-center">{unread}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-[#0f1729]/95 backdrop-blur-md shadow-xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">Thông báo</p>
              {unread > 0 && (
                <button onClick={markAllRead} className="inline-flex items-center gap-1 font-tech text-[9px] uppercase text-cyan-300 hover:text-cyan-200">
                  <Check size={10} /> Đọc hết
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-secondary/50">Không có thông báo.</p>
              ) : items.map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-white/5 ${n.is_read ? '' : 'bg-cyan-400/[0.03]'}`}>
                  <p className="text-sm text-on-surface">{n.title}</p>
                  {n.body && <p className="text-xs text-secondary/55 mt-0.5">{n.body}</p>}
                  <p className="font-tech text-[9px] text-secondary/40 mt-1">{new Date(n.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export async function pushNotification(userId: string, type: string, title: string, body?: string, link?: string) {
  await supabase.from('notifications').insert({ user_id: userId, type, title, body: body ?? null, link: link ?? null });
}
