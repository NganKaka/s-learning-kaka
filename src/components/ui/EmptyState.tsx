import { type ReactNode } from 'react';

/**
 * Shared empty-state primitive — replaces the ad-hoc `return null` / one-off
 * "no data" blocks scattered across pages with one centered, muted layout.
 * Brand tokens only. `action` slot takes a <Button> or link.
 */
export interface EmptyStateProps {
  /** Decorative icon (e.g. a lucide icon node). Marked aria-hidden. */
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={['flex flex-col items-center justify-center text-center px-6 py-12', className]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && (
        <div className="mb-4 text-secondary/50" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="font-headline text-base text-on-surface">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-secondary/70">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
