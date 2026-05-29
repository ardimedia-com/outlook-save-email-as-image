import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Footer } from './components/Footer';
import { PreviewPane, type PreviewPage } from './components/PreviewPane';
import { SettingsPanel } from './components/SettingsPanel';
import { ActionBar } from './components/ActionBar';
import { ErrorState } from './components/ErrorState';
import { Toast, type ToastData } from './components/Toast';

import { useTheme } from './hooks/useTheme';
import { useDebouncedValue } from './hooks/useDebouncedValue';

import { createI18n, detectLocale, resolveLocale, type SupportedLocale } from './lib/i18n';
import {
  fetchInlineImages,
  readCurrentEmail,
  type EmailContent,
  type InlineImage,
} from './lib/officeItemReader';
import { resolveCidImages } from './lib/cidResolver';
import { sanitizeEmailHtml } from './lib/sanitize';
import { detectEmailType, type DetectionResult } from './lib/emailRenderModel';
import { buildHeaderHtml, getHeaderFontStack } from './lib/outlookHeader';
import {
  canvasToBlob,
  clipboardSupported,
  copyBlobToClipboard,
  downloadBlob,
  renderToCanvas,
  resolveBackground,
  sliceCanvas,
} from './lib/imageExporter';
import { buildFilename } from './lib/filename';
import { DEFAULT_SETTINGS, type Settings } from './types/settings';

interface AppError {
  code: string;
  detail?: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

// Hard ceiling on the initial load. The per-call timeouts in officeItemReader only
// run once loadEmail() is invoked — i.e. after Office.onReady fires. If onReady never
// fires (office.js blocked, CSP, or an Outlook-classic WebView quirk) loadEmail() is
// never called and the spinner would hang forever. This backstop guarantees an exit.
const OFFICE_LOAD_WATCHDOG_MS = 20000;

export function App() {
  const { theme, toggle: toggleTheme } = useTheme();

  // Settings panel height (px) in stacked (narrow) mode. null = auto: the panel sizes to its
  // content (no wasted height) and the preview fills the rest. The divider sets an explicit px.
  const [settingsPx, setSettingsPx] = useState<number | null>(null);
  const settingsRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const [locale, setLocale] = useState<SupportedLocale>('en-US');
  const i18n = useMemo(() => createI18n(locale), [locale]);

  const [emailContent, setEmailContent] = useState<EmailContent | null>(null);
  const [inlineImages, setInlineImages] = useState<InlineImage[]>([]);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const debouncedSettings = useDebouncedValue(settings, 300);

  const [pages, setPages] = useState<PreviewPage[] | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [imagesBlocked, setImagesBlocked] = useState(0);
  const [toast, setToast] = useState<ToastData | null>(null);

  const renderTokenRef = useRef(0);
  const onReadyFiredRef = useRef(false);

  const headerLocale: SupportedLocale =
    settings.headerLocale === 'auto'
      ? locale
      : resolveLocale(settings.headerLocale);

  // Office.onReady: load initial mail
  const loadEmail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const content = await readCurrentEmail();
      setEmailContent(content);
      setDetection(detectEmailType(content.bodyHtml));
      // Inline images are best-effort — never block the preview on them.
      try {
        setInlineImages(await fetchInlineImages());
      } catch {
        setInlineImages([]);
      }
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : 'UNKNOWN';
      setError({ code });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Keep the document language in sync with the resolved UI locale (a11y / screen readers).
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    let alive = true;
    let settled = false;

    // Capture anything that could silently break the Office host handshake during the
    // wait, so it shows up in the on-screen error detail without attaching a debugger.
    // A CSP violation here would explain "office.js loaded but onReady never fired".
    const diag: string[] = [];
    const onCsp = (e: SecurityPolicyViolationEvent) => {
      diag.push(`CSP ${e.effectiveDirective || e.violatedDirective} blocked ${e.blockedURI || 'inline'}`);
    };
    const onErr = (e: ErrorEvent) => {
      if (e.message) diag.push(`error: ${e.message}`);
    };
    document.addEventListener('securitypolicyviolation', onCsp);
    window.addEventListener('error', onErr);

    const cleanup = () => {
      alive = false;
      document.removeEventListener('securitypolicyviolation', onCsp);
      window.removeEventListener('error', onErr);
    };

    const fail = (code: string, detail: string) => {
      if (!alive || settled) return;
      settled = true;
      const full = diag.length ? `${detail} | ${diag.join('; ')}` : detail;
      // eslint-disable-next-line no-console
      console.warn(`[save-email] init failed: ${code} — ${full}`);
      setError({ code, detail: full });
      setIsLoading(false);
    };

    // office.js is a synchronous <script> in <head>, so by the time this deferred module
    // runs it has either defined the Office global or failed to load entirely. Telling these
    // apart pinpoints the failure: a missing global means the CDN was blocked/offline/CSP;
    // a present global whose onReady never fires means the Outlook host handshake stalled.
    if (typeof Office === 'undefined') {
      fail('OFFICE_INIT_TIMEOUT', 'office.js did not load (CDN blocked, offline, or CSP)');
      return cleanup;
    }

    // Safety watchdog: an add-in must never hang forever on the loading spinner.
    // OFFICE_INIT_TIMEOUT  → onReady never fired (loadEmail was never invoked).
    // LOAD_TIMEOUT         → onReady fired but the load stalled past every per-call guard.
    const watchdog = window.setTimeout(() => {
      const code = onReadyFiredRef.current ? 'LOAD_TIMEOUT' : 'OFFICE_INIT_TIMEOUT';
      fail(
        code,
        onReadyFiredRef.current
          ? 'Office.onReady fired but the message read stalled'
          : 'office.js loaded but Office.onReady never fired — host did not initialise the add-in'
      );
    }, OFFICE_LOAD_WATCHDOG_MS);

    Office.onReady(() => {
      if (!alive) return;
      onReadyFiredRef.current = true;
      try {
        const lang = Office.context.displayLanguage || navigator.language;
        setLocale(resolveLocale(lang));
      } catch {
        setLocale(detectLocale());
      }
      void loadEmail().finally(() => {
        settled = true;
        window.clearTimeout(watchdog);
      });
    });

    return () => {
      window.clearTimeout(watchdog);
      cleanup();
    };
  }, [loadEmail]);

  // Render pipeline
  useEffect(() => {
    if (!emailContent || !detection) return;
    const token = ++renderTokenRef.current;
    setIsRendering(true);

    (async () => {
      try {
        const allowExternalImages = debouncedSettings.externalImages === 'allow';
        const sanitized = sanitizeEmailHtml(emailContent.bodyHtml, {
          allowExternalImages,
        });
        if (token !== renderTokenRef.current) return;

        // Resolve embedded CID images after sanitization (data URLs come from
        // trusted Office.js attachments, so no re-sanitization needed).
        const cidResult = resolveCidImages(sanitized.html, inlineImages);
        if (token !== renderTokenRef.current) return;

        // Resolve background once so the forwarding header text matches the
        // rendered background (light text on dark, etc.).
        const resolvedBg = resolveBackground(
          cidResult.html,
          debouncedSettings.background
        );

        const headerHtml = debouncedSettings.outlookHeader
          ? buildHeaderHtml({
              meta: emailContent.meta,
              locale: headerLocale,
              fontFamily: getHeaderFontStack(headerLocale),
              background: resolvedBg,
            })
          : null;

        const widthValue =
          debouncedSettings.width === 'auto'
            ? detection.suggestedWidth
            : debouncedSettings.width;

        const result = await renderToCanvas({
          html: cidResult.html,
          headerHtml,
          width: widthValue,
          scale: debouncedSettings.scale,
          background: debouncedSettings.background,
          loadExternalImages: allowExternalImages,
          autoCrop: debouncedSettings.autoCrop,
        });
        if (token !== renderTokenRef.current) return;

        // Auto-split paginates the tall canvas into A4-proportioned pages with smart
        // page-breaks; single mode keeps one image.
        const canvases =
          debouncedSettings.pagination === 'auto-split'
            ? sliceCanvas(
                result.canvas,
                result.background,
                Math.round(result.width * 1.414)
              )
            : [result.canvas];

        const renderedPages: PreviewPage[] = [];
        for (const c of canvases) {
          const blob = await canvasToBlob(
            c,
            debouncedSettings.format,
            debouncedSettings.jpgQuality / 100
          );
          renderedPages.push({ blob, width: c.width, height: c.height });
        }
        if (token !== renderTokenRef.current) return;

        setPages(renderedPages);
        setImagesBlocked(sanitized.externalImagesBlocked);
        setActivePage(0);
        setError(null);
      } catch (e: unknown) {
        if (token !== renderTokenRef.current) return;
        const code = e instanceof Error ? e.message : 'RENDER_FAILED';
        setError({ code: 'RENDER_FAILED', detail: code });
      } finally {
        if (token === renderTokenRef.current) {
          setIsRendering(false);
        }
      }
    })();
  }, [emailContent, detection, debouncedSettings, headerLocale, inlineImages]);

  const handleSettingChange = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const totalSize = useMemo(() => {
    if (!pages) return 0;
    return pages.reduce((sum, p) => sum + p.blob.size, 0);
  }, [pages]);

  const clipboardErrorMessage = useCallback(
    (code: string): string => {
      switch (code) {
        case 'CLIPBOARD_BLOCKED':
          return i18n.t('error.clipboardBlocked');
        case 'CLIPBOARD_PNG_ONLY':
          return i18n.t('error.clipboardPngOnly');
        default:
          return i18n.t('error.clipboardUnavailable');
      }
    },
    [i18n]
  );

  const handleSave = useCallback(async () => {
    if (!pages || !emailContent) return;
    setIsSaving(true);
    try {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const filename = buildFilename({
          subject: emailContent.meta.subject,
          date: emailContent.meta.sentTime,
          ext: settings.format,
          page: i + 1,
          totalPages: pages.length,
        });
        downloadBlob(page.blob, filename);
        if (pages.length > 1) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }
      setToast({ kind: 'success', message: i18n.t('status.saved') });
    } finally {
      setIsSaving(false);
    }
  }, [pages, emailContent, settings.format, i18n]);

  const handleClipboard = useCallback(async () => {
    if (!pages || pages.length === 0) return;
    const active = pages[activePage];
    try {
      await copyBlobToClipboard(active.blob);
      setToast({ kind: 'success', message: i18n.t('status.clipboardSuccess') });
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : 'CLIPBOARD_UNAVAILABLE';
      setToast({ kind: 'error', message: clipboardErrorMessage(code), durationMs: 15000 });
    }
  }, [pages, activePage, i18n, clipboardErrorMessage]);

  const onDividerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = {
        startY: e.clientY,
        startH: settingsRef.current?.offsetHeight ?? 0,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    []
  );

  const onDividerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    // The divider sits below the settings panel: drag down grows settings, up shrinks it — the
    // preview fills the rest, so it grows/shrinks inversely.
    const delta = e.clientY - dragRef.current.startY;
    const max = window.innerHeight * 0.9;
    const next = Math.min(max, Math.max(72, dragRef.current.startH + delta));
    setSettingsPx(next);
  }, []);

  const onDividerPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const info = useMemo(() => {
    if (!pages || pages.length === 0) return null;
    const current = pages[activePage];
    const detected = detection?.label
      ? i18n.t(`type.${detection.type}` as never)
      : null;
    return (
      <span className="inline-flex items-center gap-3">
        <span>
          {i18n.t('info.dimensions', {
            w: current.width,
            h: current.height,
            scale: settings.scale,
          })}
        </span>
        <span className="opacity-50">·</span>
        <span>{formatBytes(totalSize)}</span>
        {detected && (
          <>
            <span className="opacity-50">·</span>
            <span>{detected}</span>
          </>
        )}
      </span>
    );
  }, [pages, activePage, detection, settings.scale, totalSize, i18n]);

  // Loading state
  if (isLoading) {
    return (
      <Shell>
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            <span className="text-sm">{i18n.t('status.loading')}</span>
          </div>
        </div>
      </Shell>
    );
  }

  // Error state
  if (error && !pages) {
    return (
      <Shell>
        <ErrorState
          i18n={i18n}
          code={error.code}
          detail={error.detail}
          onRetry={loadEmail}
        />
      </Shell>
    );
  }

  const noteParts: string[] = [];
  if (imagesBlocked > 0 && settings.externalImages === 'block') {
    noteParts.push(i18n.t('info.imagesBlocked'));
  }
  if (emailContent?.meta.sentTimeIsReceived && settings.outlookHeader) {
    noteParts.push(i18n.t('info.sentTimeReceived'));
  }

  const previewSection = (
    <section className="app-preview relative flex min-h-0 flex-col">
      <PreviewPane
        i18n={i18n}
        pages={pages}
        activeIndex={activePage}
        onActiveChange={setActivePage}
        isRendering={isRendering}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </section>
  );

  const settingsBody = (
    <>
      <div className="sticky top-0 z-10 flex items-center border-b border-slate-200/70 bg-white px-4 py-2 dark:border-slate-800/60 dark:bg-slate-950">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {i18n.t('section.settings')}
        </span>
      </div>
      <SettingsPanel
        i18n={i18n}
        settings={settings}
        onChange={handleSettingChange}
        detectedWidth={detection?.detectedWidth ?? null}
      />
      {(info || noteParts.length > 0) && (
        // Status block right after the controls (no filler gap): stats on top, advisory notes
        // below, each with its own highlighted background.
        <div>
          {info && (
            <div className="border-t border-slate-200/70 bg-slate-100/80 px-4 py-2 text-[11px] text-slate-600 dark:border-slate-800/60 dark:bg-slate-800/40 dark:text-slate-300">
              {info}
            </div>
          )}
          {noteParts.length > 0 && (
            <div className="border-t border-amber-200/70 bg-amber-50/80 px-4 py-2 text-[11px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
              {noteParts.join(' · ')}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <Shell>
      {/* Single adaptive layout: stacked (settings on top, preview below) by default; two
          columns (settings left, preview right) when the pane itself — not the viewport — is
          wide enough, via a CSS container query (no JS resize listener). While stacked the
          settings panel sizes to its content and the preview fills the rest; the divider
          resizes the settings panel (--settings-h, default auto). The wide layout ignores it. */}
      <main
        className="app-layout relative flex min-h-0 flex-1"
        style={
          settingsPx != null
            ? ({ '--settings-h': `${settingsPx}px` } as React.CSSProperties)
            : undefined
        }
      >
        <section
          ref={settingsRef}
          className="app-settings flex min-h-0 flex-col overflow-y-auto"
        >
          {settingsBody}
        </section>
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={i18n.t('section.settings')}
          aria-valuenow={settingsPx != null ? Math.round(settingsPx) : undefined}
          aria-valuemin={72}
          aria-valuemax={Math.round(window.innerHeight * 0.9)}
          tabIndex={0}
          onPointerDown={onDividerPointerDown}
          onPointerMove={onDividerPointerMove}
          onPointerUp={onDividerPointerUp}
          onKeyDown={(e) => {
            const cur = settingsPx ?? settingsRef.current?.offsetHeight ?? 0;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSettingsPx(Math.min(window.innerHeight * 0.9, cur + 24));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSettingsPx(Math.max(72, cur - 24));
            }
          }}
          className="app-divider group flex h-2.5 shrink-0 cursor-row-resize items-center justify-center border-t border-slate-200/70 bg-slate-100/70 transition-colors hover:bg-brand-100 focus-visible:bg-brand-100 focus-visible:outline-hidden dark:border-slate-800/60 dark:bg-slate-900/50 dark:hover:bg-brand-900/40 dark:focus-visible:bg-brand-900/40"
          title="Drag to resize"
        >
          <span className="h-1 w-10 rounded-full bg-slate-300 transition-colors group-hover:bg-brand-400 dark:bg-slate-600" />
        </div>
        {previewSection}
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </main>

      <ActionBar
        i18n={i18n}
        onSave={handleSave}
        onClipboard={handleClipboard}
        saveDisabled={!pages || pages.length === 0}
        clipboardDisabled={
          !pages ||
          pages.length === 0 ||
          settings.format !== 'png' ||
          !clipboardSupported()
        }
        isWorking={isSaving}
      />

      <Footer i18n={i18n} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex h-full min-h-0 flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {children}
    </div>
  );
}
