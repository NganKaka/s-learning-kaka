import { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Drag-and-drop receipt screenshot upload.
 *
 * Saves the image to Supabase Storage at receipts/<order_id>/<timestamp>.<ext>
 * and writes the public URL into orders.notes (we don't have a dedicated
 * column yet; storing as JSON inside notes keeps the migration count low).
 *
 * The bucket needs to exist + be public (or signed). Run once:
 *
 *   insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true)
 *   on conflict (id) do nothing;
 *
 *   create policy "receipts: insert by owner" on storage.objects
 *     for insert with check (
 *       bucket_id = 'receipts'
 *       and (storage.foldername(name))[1] = auth.uid()::text
 *     );
 *
 *   create policy "receipts: read all" on storage.objects
 *     for select using (bucket_id = 'receipts');
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export default function ReceiptUpload({ orderId }: { orderId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Chỉ chấp nhận ảnh.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Ảnh quá lớn (tối đa 5 MB).');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setError('Bạn chưa đăng nhập.');
      setUploading(false);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/${orderId}-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('receipts')
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // Append to order.notes so the teacher panel can render it.
    const { data: orderRow } = await supabase
      .from('orders')
      .select('notes')
      .eq('id', orderId)
      .maybeSingle();
    const existingNotes = (orderRow?.notes as string | null) ?? '';
    const newNotes = existingNotes
      ? `${existingNotes}\n[receipt] ${publicUrl}`
      : `[receipt] ${publicUrl}`;
    await supabase.from('orders').update({ notes: newNotes }).eq('id', orderId);

    setUploading(false);
    setDone(true);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
          <ImageIcon size={12} /> Ảnh xác nhận chuyển khoản
        </p>
        <p className="font-tech text-[9px] uppercase tracking-[0.16em] text-secondary/45">tuỳ chọn · tăng tốc duyệt</p>
      </div>

      {!done ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors ${
            dragOver
              ? 'border-cyan-300/60 bg-cyan-400/[0.06]'
              : 'border-white/15 bg-white/[0.02] hover:border-cyan-300/40 hover:bg-cyan-400/[0.03]'
          }`}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

          {uploading ? (
            <>
              <Loader2 size={22} className="animate-spin text-cyan-300" />
              <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-cyan-200">Đang tải lên…</p>
              {preview && <img src={preview} alt="" className="mt-2 max-h-40 rounded-lg border border-white/10" />}
            </>
          ) : (
            <>
              <Upload size={20} className="text-cyan-300/70" />
              <p className="text-sm text-secondary/85">
                Kéo ảnh vào đây hoặc <span className="text-cyan-300 underline">bấm để chọn</span>
              </p>
              <p className="font-tech text-[9px] uppercase tracking-[0.18em] text-secondary/45">
                JPG / PNG · tối đa 5 MB
              </p>
            </>
          )}
        </label>
      ) : (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 text-emerald-200">
            <Check size={14} className="mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-headline font-bold">Đã tải lên</p>
              <p className="text-xs text-emerald-200/80">Giảng viên sẽ thấy ảnh khi duyệt đơn.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setPreview(null);
            }}
            className="text-emerald-200/60 hover:text-emerald-100"
            aria-label="Tải ảnh khác"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/5 p-3 text-xs text-red-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
