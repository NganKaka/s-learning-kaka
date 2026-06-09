import { type ReactNode } from 'react';

/**
 * Shared pill/badge primitive — consolidates the one-off status pills
 * (e.g. cyan "Đã đăng ký", amber earned-badge) into brand-token tones.
 * Tones map to the colors already used across the app; no new colors.
 */
export type BadgeTone = 'success' | 'warning' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';

const TONES: Record<BadgeTone, string> = {
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
  info: 'border-cyan-300/40 bg-cyan-400/10 text-cyan-200',
  neutral: 'border-white/10 bg-white/[0.03] text-secondary',
};

const SIZES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[9px]',
  md: 'px-2.5 py-1 text-[10px]',
};

export interface BadgeProps {
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Optional leading icon (decorative — marked aria-hidden). */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', size = 'md', icon, children, className }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border font-tech uppercase tracking-[0.16em]',
        TONES[tone],
        SIZES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
