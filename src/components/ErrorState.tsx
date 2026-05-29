import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';
import type { I18n } from '@/lib/i18n';

interface ErrorStateProps {
  i18n: I18n;
  code: string;
  detail?: string;
  onRetry?: () => void;
}

function errorMessage(i18n: I18n, code: string, detail?: string): string {
  switch (code) {
    case 'NO_ITEM':
      return i18n.t('error.noItem');
    case 'BODY_EMPTY':
      return i18n.t('error.bodyEmpty');
    case 'BODY_UNREADABLE':
    // onReady fired but the read stalled past every guard — same remedy as an
    // unreadable body (still loading / inaccessible).
    case 'LOAD_TIMEOUT':
      return i18n.t('error.bodyUnreadable');
    case 'OFFICE_INIT_TIMEOUT':
      return i18n.t('error.officeInit');
    case 'TOBLOB_FAILED':
    case 'RENDER_FAILED':
      return i18n.t('error.renderFailed');
    case 'TOO_MANY_IMAGES':
      return i18n.t('error.tooManyImages');
    case 'CLIPBOARD_UNAVAILABLE':
      return i18n.t('error.clipboardUnavailable');
    case 'CLIPBOARD_PNG_ONLY':
      return i18n.t('error.clipboardPngOnly');
    default:
      return i18n.t('error.generic', { message: detail ?? code });
  }
}

export function ErrorState({ i18n, code, detail, onRetry }: ErrorStateProps) {
  const message = errorMessage(i18n, code, detail);
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <p className="max-w-prose text-sm text-slate-700 dark:text-slate-300">{message}</p>
      {detail && (
        <p className="max-w-prose font-mono text-[11px] text-slate-400 dark:text-slate-500">
          {detail}
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5" />
          {i18n.t('error.retry')}
        </Button>
      )}
    </div>
  );
}
