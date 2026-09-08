/**
 * CSS Color 4 -> legacy rgb()/rgba() compatibility shim for html2canvas.
 *
 * html2canvas 1.4.1 only understands hex, rgb(), rgba(), hsl() and hsla(). Every other
 * colour function makes its parser throw
 *   Attempting to parse an unsupported color function "oklch"
 * and the whole render fails.
 *
 * That is not a theoretical risk here: Tailwind CSS v4's palette is authored in oklch, and its
 * /opacity modifiers compile to color-mix(), which Chromium serialises as `color(srgb ...)` in
 * computed styles. So the add-in's own stylesheet -- and any modern email HTML -- routinely
 * produces values html2canvas cannot read.
 *
 * This module converts the convertible ones (oklch, oklab, and color() in an sRGB-compatible
 * space) into rgb()/rgba(). Values it cannot convert are reported by returning null, so the
 * caller can substitute a safe fallback instead of letting the render throw.
 */

/** Any colour function html2canvas 1.4.1 cannot parse. Longest names first so the alternation matches greedily. */
const UNSUPPORTED_COLOR_FN = /\b(?:color-mix|light-dark|oklch|oklab|lch|lab|color|hwb)\(/i;

/** The subset this module knows how to rewrite. */
const CONVERTIBLE_COLOR_FN = /\b(oklch|oklab|color)\(/i;

export function hasUnsupportedColorFunction(value: string): boolean {
  return UNSUPPORTED_COLOR_FN.test(value);
}

/** Read the balanced parenthesised group that starts at `openIndex`. */
function readBalanced(value: string, openIndex: number): { inner: string; end: number } | null {
  let depth = 0;
  for (let i = openIndex; i < value.length; i++) {
    const ch = value[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return { inner: value.slice(openIndex + 1, i), end: i + 1 };
    }
  }
  return null;
}

/** Split a colour function's arguments into components and the optional `/ alpha` part. */
function splitArguments(inner: string): { components: string[]; alpha: string | null } {
  const slash = inner.indexOf('/');
  const head = slash === -1 ? inner : inner.slice(0, slash);
  const alpha = slash === -1 ? null : inner.slice(slash + 1).trim();
  const components = head.trim().split(/[\s,]+/).filter(Boolean);
  return { components, alpha: alpha || null };
}

/** `none` counts as 0 per CSS Color 4; percentages are relative to `percentBase`. */
function parseNumber(token: string | undefined, percentBase: number): number {
  if (!token || token === 'none') return 0;
  if (token.endsWith('%')) {
    const pct = parseFloat(token);
    return Number.isFinite(pct) ? (pct / 100) * percentBase : 0;
  }
  const n = parseFloat(token);
  return Number.isFinite(n) ? n : 0;
}

function parseAngleDegrees(token: string | undefined): number {
  if (!token || token === 'none') return 0;
  const n = parseFloat(token);
  if (!Number.isFinite(n)) return 0;
  if (token.endsWith('turn')) return n * 360;
  if (token.endsWith('grad')) return n * 0.9;
  if (token.endsWith('rad')) return (n * 180) / Math.PI;
  return n; // deg or unitless
}

function parseAlpha(token: string | null): number {
  if (token === null || token === 'none') return 1;
  const a = token.endsWith('%') ? parseFloat(token) / 100 : parseFloat(token);
  if (!Number.isFinite(a)) return 1;
  return Math.min(1, Math.max(0, a));
}

/** Gamma-encoded sRGB component (0..1) -> linear light. */
function decodeGamma(c: number): number {
  const abs = Math.abs(c);
  const decoded = abs <= 0.04045 ? abs / 12.92 : Math.pow((abs + 0.055) / 1.055, 2.4);
  return Math.sign(c) * decoded;
}

/** Linear-light sRGB component -> gamma-encoded sRGB (0..1). */
function encodeGamma(c: number): number {
  const abs = Math.abs(c);
  const encoded = abs <= 0.0031308 ? abs * 12.92 : 1.055 * Math.pow(abs, 1 / 2.4) - 0.055;
  return Math.sign(c) * encoded;
}

function toByte(c: number): number {
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

function formatRgba(r: number, g: number, b: number, alpha: number): string {
  const a = Math.round(alpha * 1000) / 1000;
  return a >= 1
    ? `rgb(${toByte(r)}, ${toByte(g)}, ${toByte(b)})`
    : `rgba(${toByte(r)}, ${toByte(g)}, ${toByte(b)}, ${a})`;
}

/** Oklab -> linear-light sRGB (Bjoern Ottosson's reference matrices). */
function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const lRoot = L + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = L - 0.0894841775 * a - 1.291485548 * b;

  const l = lRoot * lRoot * lRoot;
  const m = mRoot * mRoot * mRoot;
  const s = sRoot * sRoot * sRoot;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Linear-light Display P3 -> linear-light sRGB. */
function p3LinearToSrgbLinear(r: number, g: number, b: number): [number, number, number] {
  return [
    1.2249401762 * r - 0.2249404157 * g,
    -0.0420569547 * r + 1.0420571684 * g,
    -0.0196375546 * r - 0.0786360496 * g + 1.0982736159 * b,
  ];
}

function convertOklch(inner: string): string {
  const { components, alpha } = splitArguments(inner);
  const l = parseNumber(components[0], 1);
  const chroma = parseNumber(components[1], 0.4);
  const hue = (parseAngleDegrees(components[2]) * Math.PI) / 180;
  const [lr, lg, lb] = oklabToLinearSrgb(l, chroma * Math.cos(hue), chroma * Math.sin(hue));
  return formatRgba(encodeGamma(lr), encodeGamma(lg), encodeGamma(lb), parseAlpha(alpha));
}

function convertOklab(inner: string): string {
  const { components, alpha } = splitArguments(inner);
  const [lr, lg, lb] = oklabToLinearSrgb(
    parseNumber(components[0], 1),
    parseNumber(components[1], 0.4),
    parseNumber(components[2], 0.4)
  );
  return formatRgba(encodeGamma(lr), encodeGamma(lg), encodeGamma(lb), parseAlpha(alpha));
}

function convertColorFunction(inner: string): string | null {
  const { components, alpha } = splitArguments(inner);
  const space = components[0]?.toLowerCase();

  // xyz / rec2020 / a98-rgb / prophoto-rgb would need a chromatic adaptation we don't do here.
  if (space !== 'srgb' && space !== 'srgb-linear' && space !== 'display-p3') return null;

  const c1 = parseNumber(components[1], 1);
  const c2 = parseNumber(components[2], 1);
  const c3 = parseNumber(components[3], 1);
  const a = parseAlpha(alpha);

  if (space === 'srgb') return formatRgba(c1, c2, c3, a);
  if (space === 'srgb-linear') {
    return formatRgba(encodeGamma(c1), encodeGamma(c2), encodeGamma(c3), a);
  }

  // display-p3 components are gamma-encoded with the sRGB transfer function.
  const [lr, lg, lb] = p3LinearToSrgbLinear(decodeGamma(c1), decodeGamma(c2), decodeGamma(c3));
  return formatRgba(encodeGamma(lr), encodeGamma(lg), encodeGamma(lb), a);
}

/**
 * Rewrite every convertible CSS Color 4 function in `value` as rgb()/rgba(), leaving the rest of
 * the value (gradient stops, shadow offsets, ...) untouched.
 *
 * Returns null when the value still contains a colour function html2canvas cannot parse -- the
 * caller must then fall back to a safe substitute rather than pass it on.
 */
export function toLegacyColorSyntax(value: string): string | null {
  let out = value;

  // Bounded loop: every pass replaces the first convertible function with an rgb()/rgba()
  // literal, which cannot reintroduce one, so this always terminates.
  for (let guard = 0; guard < 128; guard++) {
    const match = CONVERTIBLE_COLOR_FN.exec(out);
    if (!match) break;

    const openIndex = match.index + match[0].length - 1;
    const group = readBalanced(out, openIndex);
    if (!group) return null;

    const name = match[1].toLowerCase();
    const replacement =
      name === 'oklch'
        ? convertOklch(group.inner)
        : name === 'oklab'
          ? convertOklab(group.inner)
          : convertColorFunction(group.inner);
    if (replacement === null) return null;

    out = out.slice(0, match.index) + replacement + out.slice(group.end);
  }

  return hasUnsupportedColorFunction(out) ? null : out;
}
