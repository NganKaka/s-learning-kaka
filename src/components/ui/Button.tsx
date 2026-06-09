import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Shared button primitive — consolidates the gold "tech CTA" pattern repeated
 * across pages (e.g. `border-primary/40 bg-primary/15 ... font-tech uppercase`).
 *
 * Variants reuse existing brand tokens only — no new colors:
 *  - primary   gold  (border-primary/40 bg-primary/15)
 *  - secondary cyan  (border-cyan-300/40 bg-cyan-400/10)
 *  - ghost     subtle (border-white/10, hover white/10)
 *  - danger    red   (border-red-400/30 bg-red-500/5)
 *
 * Keeps the global focus-visible ring (src/index.css). `loading` disables the
 * button, shows an inline spinner, and sets `aria-busy`.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-tech uppercase tracking-[0.16em] transition-all disabled:opacity-60 disabled:cursor-not-allowed';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border border-primary/40 bg-primary/15 text-primary hover:bg-primary/25 hover:shadow-[0_0_18px_rgba(233,195,73,0.32)]',
  secondary: 'border border-cyan-300/40 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20',
  ghost: 'border border-white/10 text-secondary hover:bg-white/10 hover:text-on-surface',
  danger: 'border border-red-400/30 bg-red-500/5 text-red-300 hover:bg-red-500/10',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[11px]',
  md: 'px-5 py-3 text-[11px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** When true, disables the button and shows an inline spinner. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[BASE, VARIANTS[variant], SIZES[size], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});
