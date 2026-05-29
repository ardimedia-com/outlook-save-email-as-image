import { Clipboard, Download, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import type { I18n } from '@/lib/i18n';

interface ActionBarProps {
  i18n: I18n;
  onSave: () => void;
  onClipboard: () => void;
  saveDisabled: boolean;
  clipboardDisabled: boolean;
  isWorking?: boolean;
}

export function ActionBar({
  i18n,
  onSave,
  onClipboard,
  saveDisabled,
  clipboardDisabled,
  isWorking,
}: ActionBarProps) {
  return (
    <div className="glass-bar flex items-center justify-end gap-2 px-4 py-3">
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="secondary"
          onClick={onClipboard}
          disabled={clipboardDisabled || isWorking}
          aria-label={i18n.t('action.clipboard')}
          title={i18n.t('action.clipboard')}
        >
          <Clipboard className="h-4 w-4" />
          <span className="hidden sm:inline">{i18n.t('action.clipboard')}</span>
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={saveDisabled || isWorking}
          aria-label={i18n.t('action.save')}
        >
          {isWorking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>{i18n.t('action.save')}</span>
        </Button>
      </div>
    </div>
  );
}
