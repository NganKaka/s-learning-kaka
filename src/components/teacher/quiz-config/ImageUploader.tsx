import { useState } from 'react';
import { Trash2, Loader2, ImageIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

/**
 * Drag-and-drop / file-picker image uploader for quiz question images.
 * Uploads to the `quiz-submissions` storage bucket and calls onUploaded with the public URL.
 */
export interface ImageUploaderProps {
  imageUrl: string | null;
  onUploaded: (url: string | null) => void;
}

export default function ImageUploader({ imageUrl, onUploaded }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    const path = `quiz-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await supabase.storage
      .from('quiz-submissions')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (!error) {
      const { data } = supabase.storage.from('quiz-submissions').getPublicUrl(path);
      onUploaded(data.publicUrl);
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      {imageUrl && (
        <div className="relative rounded-lg overflow-hidden border border-white/10">
          <img
            src={imageUrl}
            alt="Ảnh câu hỏi"
            className="w-full max-h-48 object-contain bg-black/20"
          />
          <button
            type="button"
            onClick={() => onUploaded(null)}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-red-300 hover:text-red-200"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
          dragOver
            ? 'border-cyan-300/60 bg-cyan-400/[0.06]'
            : 'border-white/15 bg-white/[0.02] hover:border-cyan-300/30'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {uploading ? (
          <Loader2 size={20} className="mx-auto animate-spin text-cyan-300" />
        ) : (
          <>
            <ImageIcon size={20} className="mx-auto text-cyan-300/80 mb-1" />
            <p className="text-sm text-secondary/75">
              Kéo thả ảnh hoặc <span className="text-cyan-200 underline">chọn tệp</span>
            </p>
            <p className="font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/45 mt-1">
              PNG, JPG, WebP
            </p>
          </>
        )}
      </div>
    </div>
  );
}
