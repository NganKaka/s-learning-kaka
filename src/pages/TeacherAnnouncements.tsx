import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Pin, Loader2, Trash2, Send, AlertCircle } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/ui/SectionHeading';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Announcement {
  id: string;
  instructor_id: string;
  title: string | null;
  body_md: string;
  pinned: boolean;
  created_at: string;
}

export default function TeacherAnnouncements() {
  const { user, profile } = useAuth();
  const [list, setList] = useState<Announcement[] | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user || !profile?.is_instructor) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('instructor_id', user.id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (!cancelled) setList((data ?? []) as Announcement[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.is_instructor, tick]);

  if (!profile?.is_instructor) return <Navigate to="/teacher" replace />;

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !body.trim()) return;
    setSubmitting(true);
    setErr(null);
    const { error } = await supabase.from('announcements').insert({
      instructor_id: user.id,
      title: title.trim() || null,
      body_md: body.trim(),
      pinned,
    });
    setSubmitting(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setTitle('');
    setBody('');
    setPinned(false);
    setTick((n) => n + 1);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xoá thông báo này?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    setTick((n) => n + 1);
  };

  const togglePin = async (a: Announcement) => {
    await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id);
    setTick((n) => n + 1);
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Teacher · Announcements"
        title="Thông báo cho học viên"
        subtitle="Mỗi thông báo sẽ hiển thị trên Dashboard của tất cả học viên đang học khoá của bạn."
      />

      <form onSubmit={handlePost} className="mt-8 glass-card rounded-2xl p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">Tiêu đề (tuỳ chọn)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Nghỉ học thứ 7"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-on-surface focus:border-cyan-300/50 focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">Nội dung *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            required
            placeholder="Bài 5 đã có video mới. Các em xem trước, sáng mai làm quiz nhé."
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-on-surface focus:border-cyan-300/50 focus:outline-none resize-y"
          />
        </div>
        <label className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.16em] text-secondary/65 cursor-pointer">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-primary" />
          <Pin size={11} /> Ghim lên đầu
        </label>

        {err && (
          <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/5 p-3 text-xs text-red-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {err}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 transition-colors disabled:opacity-60"
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Gửi thông báo
        </button>
      </form>

      <div className="mt-8 space-y-3">
        <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">Đã đăng</p>
        {list === null && <div className="glass-card rounded-2xl p-12 animate-pulse h-32" />}
        {list && list.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center space-y-2">
            <Megaphone size={28} className="text-cyan-300 mx-auto" />
            <p className="text-secondary/65">Chưa có thông báo nào.</p>
          </div>
        )}
        <AnimatePresence>
          {list?.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`glass-card rounded-2xl p-5 ${a.pinned ? 'border-primary/40' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {a.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 font-tech text-[9px] uppercase tracking-[0.16em] text-primary">
                        <Pin size={9} /> Ghim
                      </span>
                    )}
                    <span className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">
                      {formatDate(a.created_at)}
                    </span>
                  </div>
                  {a.title && <p className="font-headline font-bold text-on-surface mb-1">{a.title}</p>}
                  <p className="text-sm text-secondary/85 whitespace-pre-line leading-relaxed">{a.body_md}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePin(a)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                      a.pinned
                        ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                        : 'border-white/10 bg-white/[0.03] text-secondary/55 hover:text-cyan-200'
                    }`}
                    title={a.pinned ? 'Bỏ ghim' : 'Ghim'}
                  >
                    <Pin size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/30 bg-red-500/5 text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    title="Xoá"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
