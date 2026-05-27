import { useEffect, useState } from 'react';
import { MessageCircle, Send, Trash2, Reply, Loader2 } from 'lucide-react';
import { type Comment, getComments, addComment, deleteComment } from '../lib/comments';

export default function LessonDiscussion({ lessonId, userId }: { lessonId: string; userId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    getComments(lessonId).then((c) => { setComments(c); setLoading(false); });
  }, [lessonId]);

  const handlePost = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    const c = await addComment(lessonId, userId, draft.trim(), replyTo ?? undefined);
    if (c) {
      if (replyTo) {
        setComments((prev) => prev.map((p) => p.id === replyTo ? { ...p, replies: [...(p.replies ?? []), c] } : p));
      } else {
        setComments((prev) => [...prev, { ...c, replies: [] }]);
      }
    }
    setDraft('');
    setReplyTo(null);
    setPosting(false);
  };

  const handleDelete = async (id: string) => {
    await deleteComment(id);
    setComments((prev) => prev.filter((c) => c.id !== id).map((c) => ({ ...c, replies: (c.replies ?? []).filter((r) => r.id !== id) })));
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-cyan-200">
        <MessageCircle size={12} /> Thảo luận ({comments.reduce((s, c) => s + 1 + (c.replies?.length ?? 0), 0)})
      </p>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {comments.map((c) => (
          <div key={c.id} className="space-y-2">
            <CommentBubble comment={c} userId={userId} onReply={() => setReplyTo(c.id)} onDelete={() => handleDelete(c.id)} />
            {c.replies?.map((r) => (
              <div key={r.id} className="ml-8">
                <CommentBubble comment={r} userId={userId} onDelete={() => handleDelete(r.id)} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handlePost()}
          placeholder={replyTo ? 'Trả lời…' : 'Viết bình luận…'}
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
        />
        {replyTo && <button onClick={() => setReplyTo(null)} className="text-xs text-secondary/55 hover:text-red-300">Huỷ</button>}
        <button onClick={handlePost} disabled={posting || !draft.trim()} className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-40">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function CommentBubble({ comment, userId, onReply, onDelete }: { comment: Comment; userId: string; onReply?: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-tech text-[10px] text-cyan-200">{comment.display_name ?? 'Ẩn danh'}</span>
        <span className="font-tech text-[9px] text-secondary/40">{new Date(comment.created_at).toLocaleDateString('vi-VN')}</span>
      </div>
      <p className="text-sm text-on-surface">{comment.content}</p>
      <div className="flex gap-3">
        {onReply && <button onClick={onReply} className="inline-flex items-center gap-1 font-tech text-[9px] text-secondary/50 hover:text-cyan-200"><Reply size={10} /> Trả lời</button>}
        {comment.user_id === userId && <button onClick={onDelete} className="inline-flex items-center gap-1 font-tech text-[9px] text-red-400/60 hover:text-red-300"><Trash2 size={10} /> Xoá</button>}
      </div>
    </div>
  );
}
