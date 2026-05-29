import { useEffect, useState } from 'react';
import { Loader2, Maximize2, Minus, Moon, Plus, Sun } from 'lucide-react';
import { Button } from './ui/Button';
import { Tabs, TabsList, TabsTrigger } from './ui/Tabs';
import { cn } from '@/lib/cn';
import type { I18n } from '@/lib/i18n';

export interface PreviewPage {
  blob: Blob;
  width: number;
  height: number;
}

interface PreviewPaneProps {
  i18n: I18n;
  pages: PreviewPage[] | null;
  activeIndex: number;
  onActiveChange: (index: number) => void;
  isRendering: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function PreviewPane({
  i18n,
  pages,
  activeIndex,
  onActiveChange,
  isRendering,
  theme,
  onToggleTheme,
}: PreviewPaneProps) {
  const [zoom, setZoom] = useState(1);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!pages) {
      setUrls([]);
      return;
    }
    const next = pages.map((p) => URL.createObjectURL(p.blob));
    setUrls(next);
    return () => {
      next.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pages]);

  const showTabs = pages && pages.length > 1;
  const currentPage = pages?.[activeIndex] ?? null;

  return (
    <div className="relative flex h-full flex-col">
      {/* Top bar: page tabs + zoom controls */}
      <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-2 dark:border-slate-800/60">
        <div className="min-h-7 flex items-center">
          {showTabs ? (
            <Tabs
              value={String(activeIndex)}
              onValueChange={(v) => onActiveChange(Number(v))}
            >
              <TabsList>
                {pages!.map((_, i) => (
                  <TabsTrigger key={i} value={String(i)}>
                    {i18n.t('preview.page', { n: i + 1 })}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {i18n.t('section.preview')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums text-slate-500">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Fit"
            onClick={() => setZoom(1)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <Button
            variant="ghost"
            size="sm"
            aria-label={i18n.t('action.darkToggle')}
            title={i18n.t('action.darkToggle')}
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Preview viewport */}
      <div className="preview-checkerboard relative flex-1 overflow-auto">
        <div className="flex min-h-full items-start justify-center p-6">
          {currentPage && urls[activeIndex] && (
            <img
              src={urls[activeIndex]}
              alt={
                pages && pages.length > 1
                  ? i18n.t('preview.page', { n: activeIndex + 1 })
                  : i18n.t('section.preview')
              }
              className={cn(
                'h-auto rounded-sm shadow-soft-lg transition-opacity',
                isRendering && 'opacity-60'
              )}
              style={{ width: currentPage.width * zoom * 0.5, maxWidth: '100%' }}
            />
          )}
        </div>

        {isRendering && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-xs dark:bg-slate-950/40">
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-soft ring-1 ring-slate-200/70 dark:bg-slate-800/90 dark:text-slate-200 dark:ring-slate-700/60">
              <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              {i18n.t('status.rendering')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
