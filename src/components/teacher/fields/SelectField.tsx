/**
 * Select field component using CustomSelect.
 */
import CustomSelect from '../../ui/CustomSelect';

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  onSave: (v: T) => void | Promise<void>;
  options: Array<{ v: T; label: string }>;
}

export function SelectField<T extends string>({ label, value, onSave, options }: SelectFieldProps<T>) {
  return (
    <div className="space-y-1">
      <label className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">{label}</label>
      <CustomSelect
        value={value}
        onChange={(v) => void onSave(v as T)}
        options={options.map((o) => ({ value: o.v, label: o.label }))}
      />
    </div>
  );
}
