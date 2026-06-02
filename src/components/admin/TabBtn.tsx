/**
 * Tab button component for admin navigation.
 */
import type { ReactNode } from 'react';

interface TabBtnProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}

export function TabBtn({ active, onClick, icon, label }: TabBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.18em] transition-colors ${
        active
          ? 'bg-primary/15 text-primary border border-primary/30'
          : 'text-secondary/60 hover:text-cyan-200 border border-transparent'
      }`}
    >
      {icon} {label}
    </button>
  );
}
