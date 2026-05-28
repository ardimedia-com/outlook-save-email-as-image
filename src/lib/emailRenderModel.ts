export type EmailType =
  | 'newsletter-fixed'
  | 'word-outlook'
  | 'plain-text'
  | 'responsive'
  | 'unknown';

export interface DetectionResult {
  type: EmailType;
  detectedWidth: number | null;
  suggestedWidth: number;
  label: string;
}

const DEFAULT_BY_TYPE: Record<EmailType, number> = {
  'newsletter-fixed': 660,
  'word-outlook': 900,
  'plain-text': 800,
  responsive: 1000,
  unknown: 1000,
};

const LABEL_BY_TYPE: Record<EmailType, string> = {
  'newsletter-fixed': 'Newsletter (fixed width)',
  'word-outlook': 'Word / Outlook',
  'plain-text': 'Plain text',
  responsive: 'Responsive',
  unknown: 'Unknown',
};

function parsePxLike(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/(\d+(?:\.\d+)?)\s*(px)?/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return n;
}

function findOutermostWidth(doc: Document): number | null {
  const root = doc.body ?? doc.documentElement;
  // Walk only outer-most large elements; stop early to keep this cheap.
  const visit = (el: Element, depth: number): number | null => {
    if (depth > 6) return null;
    if (el instanceof HTMLElement || el instanceof HTMLTableElement) {
      const attrW = parsePxLike(el.getAttribute('width'));
      if (attrW && attrW >= 300 && attrW <= 1400) return attrW;
      const styleW = parsePxLike(el.style?.width || '');
      if (styleW && styleW >= 300 && styleW <= 1400) return styleW;
      const styleMax = parsePxLike(el.style?.maxWidth || '');
      if (styleMax && styleMax >= 300 && styleMax <= 1400) return styleMax;
    }
    for (const child of Array.from(el.children)) {
      const w = visit(child, depth + 1);
      if (w) return w;
    }
    return null;
  };
  return visit(root, 0);
}

export function detectEmailType(rawHtml: string): DetectionResult {
  // Quick string-level signals.
  const hasMsoProps = /mso-|<o:p|<v:|class=["']?Mso/.test(rawHtml);
  const hasMediaQueries = /@media\s*\(/.test(rawHtml);

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml || '<div></div>', 'text/html');

  const detectedWidth = findOutermostWidth(doc);
  const tables = doc.getElementsByTagName('table');
  const hasCenteredRoot =
    doc.querySelector('center') !== null ||
    Array.from(tables).some((t) => t.getAttribute('align') === 'center');

  // Plain text (sanitized originally as wrapped <div>) — no real markup variety.
  const hasFlowMarkup = doc.querySelector('table,h1,h2,h3,img,blockquote,ul,ol') !== null;

  let type: EmailType;
  if (!hasFlowMarkup && !hasMsoProps) {
    type = 'plain-text';
  } else if (hasMsoProps) {
    type = 'word-outlook';
  } else if (detectedWidth && hasCenteredRoot && detectedWidth <= 720) {
    type = 'newsletter-fixed';
  } else if (hasMediaQueries) {
    type = 'responsive';
  } else if (detectedWidth) {
    type = 'newsletter-fixed';
  } else {
    type = 'unknown';
  }

  const suggested = detectedWidth ?? DEFAULT_BY_TYPE[type];

  return {
    type,
    detectedWidth,
    suggestedWidth: Math.max(320, Math.min(1400, suggested)),
    label: LABEL_BY_TYPE[type],
  };
}
