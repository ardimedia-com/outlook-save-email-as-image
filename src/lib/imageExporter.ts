import html2canvas from 'html2canvas';

export type Background = 'light' | 'dark' | 'auto';

const BG_COLORS: Record<Exclude<Background, 'auto'>, string> = {
  light: '#ffffff',
  dark: '#0f172a',
};

const BG_RGB: Record<'light' | 'dark', [number, number, number]> = {
  light: [255, 255, 255],
  dark: [15, 23, 42],
};

export interface RenderOptions {
  html: string;
  headerHtml: string | null;
  width: number;
  scale: number;
  background: Background;
  /** When true, attempt to load external (http/https) images via CORS. */
  loadExternalImages: boolean;
  /** When true, trim uniform background margins from the rendered image. */
  autoCrop: boolean;
}

export interface RenderResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  background: 'light' | 'dark';
}

async function waitForFonts(): Promise<void> {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }
}

/**
 * Wait until every <img> in the container has loaded (or failed/timed out), so the
 * container's scrollHeight is final before html2canvas measures it. Without this,
 * late-loading external images expand the layout after capture and the image is
 * cut off at the wrong height.
 */
async function waitForImages(container: HTMLElement, timeoutMs: number): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        window.setTimeout(done, timeoutMs);
      });
    })
  );
}

export function resolveBackground(
  html: string,
  requested: Background
): 'light' | 'dark' {
  if (requested === 'light' || requested === 'dark') return requested;
  // Heuristic: if body html has high-density dark background tokens, render dark.
  const dark = /background[^:]*:\s*#?(000|111|222|0f|1[0-9a-f]{2,5})|color\s*:\s*#?[ef][0-9a-f]{2,5}/i.test(
    html
  );
  return dark ? 'dark' : 'light';
}

/**
 * Trim uniform background margins around the rendered content. Scans inward from each
 * edge for the first row/column that contains a non-background pixel (within tolerance),
 * then crops to that bounding box plus a small padding. Returns the original canvas if
 * the image is all background, already tight, or the pixels can't be read (tainted).
 */
function autoCropCanvas(
  canvas: HTMLCanvasElement,
  bg: 'light' | 'dark',
  scale: number
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const { width, height } = canvas;
  if (width === 0 || height === 0) return canvas;

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, width, height).data;
  } catch {
    // Tainted canvas — cannot inspect pixels, skip cropping.
    return canvas;
  }

  const [br, bgG, bb] = BG_RGB[bg];
  const tol = 14;
  const step = 2; // sample every 2nd pixel for speed; padding absorbs the imprecision

  const isBgAt = (idx: number): boolean =>
    Math.abs(data[idx] - br) <= tol &&
    Math.abs(data[idx + 1] - bgG) <= tol &&
    Math.abs(data[idx + 2] - bb) <= tol;

  const rowHasContent = (y: number): boolean => {
    const base = y * width * 4;
    for (let x = 0; x < width; x += step) {
      if (!isBgAt(base + x * 4)) return true;
    }
    return false;
  };

  const colHasContent = (x: number, top: number, bottom: number): boolean => {
    const xOff = x * 4;
    for (let y = top; y <= bottom; y += step) {
      if (!isBgAt(y * width * 4 + xOff)) return true;
    }
    return false;
  };

  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;

  while (top < bottom && !rowHasContent(top)) top++;
  while (bottom > top && !rowHasContent(bottom)) bottom--;
  while (left < right && !colHasContent(left, top, bottom)) left++;
  while (right > left && !colHasContent(right, top, bottom)) right--;

  // Nothing to crop (all background) or degenerate result.
  if (right <= left || bottom <= top) return canvas;
  if (top === 0 && left === 0 && right === width - 1 && bottom === height - 1) {
    return canvas;
  }

  const pad = Math.round(16 * scale);
  const x0 = Math.max(0, left - pad);
  const y0 = Math.max(0, top - pad);
  const x1 = Math.min(width - 1, right + pad);
  const y1 = Math.min(height - 1, bottom + pad);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;

  if (cw >= width && ch >= height) return canvas;

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const octx = out.getContext('2d');
  if (!octx) return canvas;
  octx.drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
  return out;
}

/**
 * Slice a tall canvas into page-height chunks for pagination. Each cut is nudged upward
 * to the nearest all-background row within a search window (smart page-break) so content
 * isn't sliced through the middle of a line. Falls back to hard cuts if pixels can't be
 * read (tainted canvas) or no clean break is found.
 */
export function sliceCanvas(
  canvas: HTMLCanvasElement,
  bg: 'light' | 'dark',
  maxPageHeight: number
): HTMLCanvasElement[] {
  const { width, height } = canvas;
  if (height <= maxPageHeight || maxPageHeight < 200) return [canvas];

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [canvas];

  let data: Uint8ClampedArray | null = null;
  try {
    data = ctx.getImageData(0, 0, width, height).data;
  } catch {
    data = null; // tainted — fall back to hard cuts
  }

  const [br, bgG, bb] = BG_RGB[bg];
  const tol = 14;
  const rowIsBackground = (y: number): boolean => {
    if (!data) return false;
    const base = y * width * 4;
    for (let x = 0; x < width; x += 3) {
      const i = base + x * 4;
      if (
        Math.abs(data[i] - br) > tol ||
        Math.abs(data[i + 1] - bgG) > tol ||
        Math.abs(data[i + 2] - bb) > tol
      ) {
        return false;
      }
    }
    return true;
  };

  const fill = bg === 'dark' ? '#0f172a' : '#ffffff';
  const searchWindow = Math.min(180, Math.floor(maxPageHeight * 0.25));
  const pages: HTMLCanvasElement[] = [];
  let top = 0;

  while (top < height) {
    let cut = Math.min(top + maxPageHeight, height);
    if (cut < height) {
      for (let y = cut; y > cut - searchWindow && y > top + 1; y--) {
        if (rowIsBackground(y)) {
          cut = y;
          break;
        }
      }
    }
    const pageHeight = cut - top;
    const page = document.createElement('canvas');
    page.width = width;
    page.height = pageHeight;
    const pctx = page.getContext('2d');
    if (!pctx) break;
    pctx.fillStyle = fill;
    pctx.fillRect(0, 0, width, pageHeight);
    pctx.drawImage(canvas, 0, top, width, pageHeight, 0, 0, width, pageHeight);
    pages.push(page);
    top = cut;
  }

  return pages.length > 0 ? pages : [canvas];
}

function buildContainer(opts: RenderOptions, bg: 'light' | 'dark'): HTMLDivElement {
  const container = document.createElement('div');
  const isDark = bg === 'dark';
  container.style.position = 'absolute';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = `${opts.width}px`;
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';
  container.style.background = BG_COLORS[bg];
  container.style.color = isDark ? '#e2e8f0' : '#0f172a';
  container.style.fontFamily =
    "'Aptos', 'Segoe UI', Calibri, 'Helvetica Neue', Arial, sans-serif";
  container.style.fontSize = '11pt';
  container.style.lineHeight = '1.5';
  container.innerHTML = (opts.headerHtml ?? '') + opts.html;
  return container;
}

export async function renderToCanvas(opts: RenderOptions): Promise<RenderResult> {
  const bg = resolveBackground(opts.html, opts.background);
  const container = buildContainer(opts, bg);
  document.body.appendChild(container);

  try {
    await waitForFonts();
    // Wait for all images (CID data URLs + external) so the layout height is final.
    await waitForImages(container, opts.loadExternalImages ? 15000 : 3000);
    // One more frame so the browser flushes the final layout.
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const finalHeight = container.scrollHeight;

    const canvas = await html2canvas(container, {
      backgroundColor: BG_COLORS[bg],
      scale: opts.scale,
      // CID images are inlined as data URLs (always safe). For external images,
      // useCORS lets html2canvas load CORS-enabled hosts; tainting stays off so
      // toBlob() never throws a SecurityError.
      useCORS: opts.loadExternalImages,
      allowTaint: false,
      imageTimeout: opts.loadExternalImages ? 15000 : 0,
      logging: false,
      windowWidth: opts.width,
      width: opts.width,
      height: finalHeight,
      windowHeight: finalHeight,
    });

    const finalCanvas = opts.autoCrop
      ? autoCropCanvas(canvas, bg, opts.scale)
      : canvas;

    return {
      canvas: finalCanvas,
      width: finalCanvas.width,
      height: finalCanvas.height,
      background: bg,
    };
  } finally {
    container.remove();
  }
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpg',
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('TOBLOB_FAILED'));
        } else {
          resolve(blob);
        }
      },
      mime,
      format === 'jpg' ? quality : undefined
    );
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

export function clipboardSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'clipboard' in navigator &&
    typeof navigator.clipboard?.write === 'function' &&
    typeof window !== 'undefined' &&
    'ClipboardItem' in window
  );
}

export async function copyBlobToClipboard(blob: Blob): Promise<void> {
  if (!clipboardSupported()) {
    throw new Error('CLIPBOARD_UNAVAILABLE');
  }
  // Browsers require image/png for clipboard write in most cases.
  if (blob.type !== 'image/png') {
    throw new Error('CLIPBOARD_PNG_ONLY');
  }
  try {
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
  } catch (e: unknown) {
    // In the Outlook-on-the-web iframe the Permissions-Policy frequently blocks
    // clipboard-write (NotAllowedError) or reports the document as unfocused.
    const name = e instanceof Error ? e.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new Error('CLIPBOARD_BLOCKED');
    }
    throw new Error('CLIPBOARD_UNAVAILABLE');
  }
}
