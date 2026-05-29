import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastKind = 'success' | 'error';

export interface ToastData {
  kind: ToastKind;
  message: string;
  /** Per-toast auto-dismiss override in ms. Falls back to the kind-based default. */
  durationMs?: number;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Errors stay longer than success. */
  autoDismissMs?: number;
}

export function Toast({ toast, onDismiss, autoDismissMs }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const delay =
      toast.durationMs ?? autoDismissMs ?? (toast.kind === 'error' ? 7000 : 3000);
    const id = window.setTimeout(onDismiss, delay);
    return () => window.clearTimeout(id);
  }, [toast, autoDismissMs, onDismiss]);

  if (!toast) return null;

  const isError = toast.kind === 'error';
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-50 flex justify-center px-4">
      <div
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        className={cn(
          'pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-soft-lg ring-1 backdrop-blur-sm animate-slide-up',
          isError
            ? 'bg-amber-50/95 text-amber-900 ring-amber-200 dark:bg-amber-950/80 dark:text-amber-100 dark:ring-amber-900/60'
            : 'bg-emerald-50/95 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-100 dark:ring-emerald-900/60'
        )}
      >
        {isError ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span className="flex-1 leading-snug">{toast.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="mt-0.5 shrink-0 rounded-sm p-0.5 opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
