import type { InlineImage } from './officeItemReader';

/**
 * Normalize a CID reference or attachment name for matching:
 * - strip the `cid:` scheme
 * - strip surrounding angle brackets
 * - drop everything from the first `@` (cid domain part)
 * - lowercase + trim
 */
function normalizeCidKey(raw: string): string {
  let value = raw.trim();
  value = value.replace(/^cid:/i, '');
  value = value.replace(/^<|>$/g, '');
  const at = value.indexOf('@');
  if (at !== -1) value = value.slice(0, at);
  return value.toLowerCase().trim();
}

function stripExtension(value: string): string {
  const dot = value.lastIndexOf('.');
  return dot > 0 ? value.slice(0, dot) : value;
}

export interface CidResolveResult {
  html: string;
  resolved: number;
  unresolved: number;
}

/**
 * Replace `<img src="cid:...">` references in the HTML with embedded data URLs.
 *
 * Matching strategy (in order):
 *  1. exact normalized match (cid base === attachment name)
 *  2. extension-insensitive match (with/without file extension)
 *  3. positional fallback when exactly one cid and one inline image remain unmatched
 *
 * Unresolved CID images are left untouched (sanitize turns them into placeholders).
 */
export function resolveCidImages(
  rawHtml: string,
  inlineImages: InlineImage[]
): CidResolveResult {
  if (inlineImages.length === 0) {
    return { html: rawHtml, resolved: 0, unresolved: 0 };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const cidImgs = Array.from(doc.querySelectorAll('img')).filter((img) =>
    /^cid:/i.test(img.getAttribute('src') ?? '')
  );

  if (cidImgs.length === 0) {
    return { html: rawHtml, resolved: 0, unresolved: 0 };
  }

  // Build lookup tables.
  const byName = new Map<string, InlineImage>();
  const byNameNoExt = new Map<string, InlineImage>();
  for (const img of inlineImages) {
    const key = normalizeCidKey(img.name);
    byName.set(key, img);
    byNameNoExt.set(stripExtension(key), img);
  }

  const usedImageIds = new Set<string>();
  const unmatchedImgs: HTMLImageElement[] = [];
  let resolved = 0;

  for (const img of cidImgs) {
    const cidRaw = img.getAttribute('src') ?? '';
    const key = normalizeCidKey(cidRaw);
    const hit = byName.get(key) ?? byNameNoExt.get(stripExtension(key));
    if (hit) {
      img.setAttribute('src', hit.dataUrl);
      usedImageIds.add(hit.id);
      resolved += 1;
    } else {
      unmatchedImgs.push(img);
    }
  }

  // Positional fallback: if exactly one image and one cid remain unmatched, pair them.
  const unusedImages = inlineImages.filter((i) => !usedImageIds.has(i.id));
  if (unmatchedImgs.length === 1 && unusedImages.length === 1) {
    unmatchedImgs[0].setAttribute('src', unusedImages[0].dataUrl);
    unmatchedImgs.length = 0;
    resolved += 1;
  } else if (
    unmatchedImgs.length > 1 &&
    unmatchedImgs.length === unusedImages.length
  ) {
    // Multiple unmatched but equal counts — map in document order as a best effort.
    unmatchedImgs.forEach((img, i) => {
      img.setAttribute('src', unusedImages[i].dataUrl);
    });
    resolved += unmatchedImgs.length;
    unmatchedImgs.length = 0;
  }

  return {
    html: doc.body.innerHTML,
    resolved,
    unresolved: unmatchedImgs.length,
  };
}
