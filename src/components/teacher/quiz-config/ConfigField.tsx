/**
 * Thin labelled field wrapper used throughout the quiz config forms.
 */
export interface ConfigFieldProps {
  label: string;
  children: React.ReactNode;
}

export default function ConfigField({ label, children }: ConfigFieldProps) {
  return (
    <div className="space-y-1">
      <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
        {label}
      </label>
      {children}
    </div>
  );
}
