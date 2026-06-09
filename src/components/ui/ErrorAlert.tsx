import { AlertCircle } from 'lucide-react';

/**
 * Shared inline error banner — consolidates the identical
 * `border-red-400/30 bg-red-500/5 p-3 text-xs text-red-300` block already
 * duplicated across Login, Signup, Teacher* pages. `role="alert"` so assistive
 * tech announces it. Optional retry action.
 */
export interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorAlert({ message, onRetry, className }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/5 p-3 text-xs text-red-300',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-tech uppercase tracking-[0.16em] text-[10px] text-red-200 hover:text-red-100 transition-colors"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
