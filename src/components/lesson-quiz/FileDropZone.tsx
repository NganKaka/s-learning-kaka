import { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { MAX_UPLOAD_BYTES } from '../../lib/quiz';
import { type PendingFile } from './types';

interface FileDropZoneProps {
  staged: PendingFile[];
  onFilesAdded: (files: File[]) => void;
  onRemove: (idx: number) => void;
}

/**
 * Drag-and-drop / click-to-browse file upload widget.
 *
 * Files are filtered client-side by MAX_UPLOAD_BYTES; oversized files are
 * silently dropped (the server also enforces this limit).
 * Actual upload to storage happens at quiz-submit time, not here.
 */
export default function FileDropZone({ staged, onFilesAdded, onRemove }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const filtered = Array.from(list).filter((f) => {
      if (f.size > MAX_UPLOAD_BYTES) {
        return false;
      }
      return true;
    });
    if (filtered.length > 0) onFilesAdded(filtered);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragOver
            ? 'border-cyan-300/60 bg-cyan-400/[0.06]'
            : 'border-white/15 bg-white/[0.02] hover:border-cyan-300/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <Upload size={20} className="mx-auto text-cyan-300/80 mb-1.5" />
        <p className="text-sm text-secondary/75">
          Kéo thả tệp vào đây hoặc <span className="text-cyan-200 underline">chọn tệp</span>
        </p>
        <p className="font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/45 mt-1">
          Tối đa {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB / tệp
        </p>
      </div>

      {staged.length > 0 && (
        <ul className="space-y-1.5">
          {staged.map((s, i) => (
            <li
              key={`${s.file.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-cyan-300 shrink-0" />
                <span className="truncate">{s.file.name}</span>
                <span className="font-tech text-[10px] tabular-nums text-secondary/45 shrink-0">
                  {(s.file.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-secondary/55 hover:text-red-300"
                aria-label="Xoá tệp"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
