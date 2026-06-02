/**
 * Editable field component that auto-saves on blur.
 */
import { useEffect, useState } from 'react';

interface FieldProps {
  label: string;
  value: string;
  onSave: (v: string) => void | Promise<void>;
  multiline?: boolean;
  type?: 'text' | 'number';
}

export function Field({ label, value, onSave, multiline, type }: FieldProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const dirty = draft !== value;

  const handleBlur = () => {
    if (dirty) {
      void onSave(draft);
    }
  };

  return (
    <div className="space-y-1">
      <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">{label}</label>
      {multiline ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          rows={4}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none resize-y"
        />
      ) : (
        <input
          type={type ?? 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
        />
      )}
    </div>
  );
}
