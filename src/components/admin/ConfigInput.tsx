/**
 * Config input component for boolean and string values.
 */
import { useState } from 'react';

interface ConfigInputProps {
  value: unknown;
  onChange: (v: unknown) => void;
}

export function ConfigInput({ value, onChange }: ConfigInputProps) {
  const [strVal, setStrVal] = useState(
    typeof value === 'string' ? value.replace(/^"|"$/g, '') : String(value),
  );

  const handleBoolClick = () => {
    const bool = value === true || value === 'true';
    onChange(!bool);
  };

  if (typeof value === 'boolean' || value === 'true' || value === 'false') {
    const bool = value === true || value === 'true';
    return (
      <button
        type="button"
        onClick={handleBoolClick}
        className={`w-10 h-5 rounded-full transition-colors relative ${bool ? 'bg-emerald-500/40' : 'bg-white/10'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
            bool ? 'left-5 bg-emerald-300' : 'left-0.5 bg-secondary/50'
          }`}
        />
      </button>
    );
  }

  const handleChange = (v: string) => {
    setStrVal(v);
    const num = Number(v);
    onChange(!isNaN(num) && v.trim() !== '' ? num : `"${v}"`);
  };

  return (
    <input
      type="text"
      value={strVal}
      onChange={(e) => handleChange(e.target.value)}
      className="w-48 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-on-surface text-right focus:border-cyan-300/40 focus:outline-none"
    />
  );
}
