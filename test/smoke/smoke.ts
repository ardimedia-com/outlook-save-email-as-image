/**
 * Headless smoke test for the export pipeline. Run it with `npm run smoke`.
 *
 * It renders representative email HTML through the real sanitize -> header -> renderToCanvas
 * path in a real browser, in both light and dark mode, and reports one PASS/FAIL line per case.
 * scripts/smoke-render.mjs builds this page, serves it and scrapes those lines.
 *
 * Why it exists: the renderer is the app's only output, and its failure modes are silent to
 * both tsc and the bundler. The bug this was written for -- Tailwind v4's oklch palette
 * aborting every dark-mode render -- produced a green build and a broken app.
 */
import '../../src/styles/globals.css';

import { renderToCanvas, canvasToBlob } from '../../src/lib/imageExporter';
import { sanitizeEmailHtml } from '../../src/lib/sanitize';
import { buildHeaderHtml, getHeaderFontStack } from '../../src/lib/outlookHeader';
import type { EmailMeta } from '../../src/lib/officeItemReader';
import { runMountCheck } from './mount';

/** 1x1 transparent PNG, so the image path is exercised without a network fetch. */
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const META: EmailMeta = {
  subject: 'Smoke test message',
  from: { displayName: 'Sender Name', emailAddress: 'sender@example.com' },
  to: [{ displayName: 'Recipient', emailAddress: 'recipient@example.com' }],
  cc: [],
  sentTime: new Date('2026-01-15T09:30:00Z'),
  sentTimeIsReceived: false,
};

const CASES: Array<{ name: string; html: string }> = [
  {
    // A table-based layout with inline styles: the shape of nearly every real HTML email.
    name: 'table layout + inline styles + image',
    html: `<div style="font-family:Arial,sans-serif;color:#1f2937">
      <table cellpadding="8" style="border-collapse:collapse;border:1px solid #d1d5db">
        <tr style="background:#f3f4f6"><th>Item</th><th>Amount</th></tr>
        <tr><td>First position</td><td style="text-align:right">1.234,00</td></tr>
        <tr><td>Second position</td><td style="text-align:right">99,50</td></tr>
      </table>
      <p>Regards,<br /><img src="${PIXEL}" width="120" height="40" alt="signature logo" /></p>
      <p><a href="https://example.com">A link</a></p>
    </div>`,
  },
  {
    // The second oklch source: modern colour functions arriving inside the email itself.
    // html2canvas 1.4.1 threw on all of these; html2canvas-pro parses them natively.
    name: 'email carrying CSS Color 4 values',
    html: `<div style="color:oklch(55.4% 0.046 257.417)">
      <p style="background:oklab(0.7 0.1 -0.05);padding:8px">oklab background</p>
      <p style="color:lab(50% 40 59.5)">lab text</p>
      <p style="border:2px solid color(srgb 0.2 0.4 0.9);padding:4px">color(srgb) border</p>
      <p style="background:linear-gradient(90deg, oklch(70% 0.15 30), transparent);padding:6px">gradient</p>
    </div>`,
  },
  {
    name: 'plain text',
    html: '<div>Just a plain sentence, no markup to speak of.</div>',
  },
];

const out = document.getElementById('out') as HTMLPreElement;
const lines: string[] = [];

function log(line: string): void {
  lines.push(line);
  out.textContent = lines.join('\n');
}

async function run(): Promise<void> {
  for (const theme of ['light', 'dark'] as const) {
    // Matches how useTheme drives the app: the class lands on <html>.
    document.documentElement.classList.toggle('dark', theme === 'dark');

    for (const testCase of CASES) {
      const label = `${theme.padEnd(5)} | ${testCase.name}`;
      try {
        const sanitized = sanitizeEmailHtml(testCase.html, { allowExternalImages: false });
        const headerHtml = buildHeaderHtml({
          meta: META,
          locale: 'en-US',
          fontFamily: getHeaderFontStack('en-US'),
          background: theme,
        });

        const result = await renderToCanvas({
          html: sanitized.html,
          headerHtml,
          width: 800,
          scale: 1,
          background: theme,
          loadExternalImages: false,
          autoCrop: true,
        });

        // A canvas that exists but has no pixels means the render silently produced nothing.
        if (result.width < 10 || result.height < 10) {
          throw new Error(`degenerate canvas ${result.width}x${result.height}`);
        }
        const blob = await canvasToBlob(result.canvas, 'png');
        if (blob.size < 100) throw new Error(`suspiciously small blob (${blob.size} bytes)`);

        log(`SMOKE PASS ${label} -> ${result.width}x${result.height}, ${blob.size} bytes`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        log(`SMOKE FAIL ${label} -> ${message}`);
      }
    }
  }

  await runMountCheck(log);

  log('SMOKE DONE');
}

run().catch((error: unknown) => {
  log(`SMOKE FAIL harness -> ${error instanceof Error ? error.message : String(error)}`);
  log('SMOKE DONE');
});
