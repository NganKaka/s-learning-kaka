import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useAuth } from '../contexts/AuthContext';
import { type Conversation, type Message, getConversations, getMessages, sendMessage, markRead } from '../lib/messages';

export default function Messages() {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    getConversations(user.id).then((c) => { setConversations(c); setLoadingConvs(false); });
  }, [user]);

  useEffect(() => {
    if (!user || !selected) return;
    getMessages(user.id, selected).then((m) => { setMessages(m); markRead(user.id, selected); });
  }, [user, selected]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!user || !selected || !draft.trim()) return;
    setSending(true);
    const msg = await sendMessage(user.id, selected, draft.trim());
    if (msg) setMessages((prev) => [...prev, msg]);
    setDraft('');
    setSending(false);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-headline text-2xl font-extrabold text-on-surface mb-6 inline-flex items-center gap-3">
          <MessageCircle size={22} className="text-primary" /> Tin nhắn
        </h1>

        <div className="grid md:grid-cols-[280px_1fr] gap-4 min-h-[400px]">
          {/* Conversation list */}
          <div className="glass-card rounded-2xl p-3 space-y-1 overflow-y-auto max-h-[500px]">
            {loadingConvs ? <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-primary" /></div> : conversations.length === 0 ? (
              <p className="text-sm text-secondary/60 text-center py-8">Chưa có tin nhắn.</p>
            ) : conversations.map((c) => (
              <button
                key={c.userId}
                onClick={() => setSelected(c.userId)}
                className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors ${selected === c.userId ? 'bg-cyan-400/10 border border-cyan-300/30' : 'hover:bg-white/[0.04] border border-transparent'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-on-surface truncate">{c.displayName ?? 'Người dùng'}</span>
                  {c.unread > 0 && <span className="shrink-0 w-5 h-5 rounded-full bg-primary/80 text-background text-[10px] font-bold flex items-center justify-center">{c.unread}</span>}
                </div>
                <p className="text-xs text-secondary/55 truncate mt-0.5">{c.lastMessage}</p>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="glass-card rounded-2xl p-4 flex flex-col">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-secondary/50 text-sm">Chọn cuộc trò chuyện</div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-[380px]">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${m.sender_id === user.id ? 'bg-primary/15 text-cyan-100' : 'bg-white/[0.06] text-on-surface'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Nhập tin nhắn…"
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
                  />
                  <button onClick={handleSend} disabled={sending || !draft.trim()} className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-40">
                    <Send size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
