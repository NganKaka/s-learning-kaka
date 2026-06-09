/**
 * Controlled field component (no auto-save, controlled by parent).
 */
interface FieldRawProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  type?: 'text' | 'number';
}

export function FieldRaw({ label, value, onChange, multiline, placeholder, type }: FieldRawProps) {
  return (
    <div className="space-y-1">
      <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none resize-y"
        />
      ) : (
        <input
          type={type ?? 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
        />
      )}
    </div>
  );
}
