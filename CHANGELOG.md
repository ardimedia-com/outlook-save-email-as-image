# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Auto-crop.** Uniform background margins are now trimmed from the rendered image. The
  crop scans inward from each edge for the first non-background pixel (tolerance-based,
  sampled every 2nd pixel for speed) and crops to that bounding box plus 16 px padding.
  Skips gracefully when the image is all background or the canvas is tainted. Toggled via
  the existing "Trim empty margins" setting.
- **JPG export confirmed end-to-end** — format radio (PNG/JPG) plus quality slider
  (50–100, default 90) produce `image/jpeg` blobs with `.jpg` filenames. Clipboard stays
  PNG-only (browser limitation), so it is disabled while JPG is selected.
- **Resizable split** in single-column layout — drag the divider between preview and
  settings to adjust their heights (pointer-capture based).
- **Responsive two-column layout** kicks in at ≥760 px (settings left, preview right);
  below that it's single-column with the draggable divider.
- **Dark-aware forwarding header** — the rendered Outlook header switches to light text,
  a lighter rule and a muted annotation colour when the background resolves to dark, so it
  stays legible. Background is resolved once and shared by the header and the renderer.
- **Clipboard feedback toast** — success and failure are now surfaced (previously a failed
  copy was swallowed silently). Browser/iframe clipboard blocks report a clear,
  actionable message.

### Changed

- Default background is now **Light** (was Auto).
- Image export waits for all images (CID + external) to finish loading before measuring
  the canvas height, fixing cut-off output when external images were loaded late.
- The redundant in-app header was removed (Outlook already shows the add-in name in its
  taskpane chrome); the dark-mode toggle moved into the preview toolbar.
- Footer uses a distinct background tint to separate it from the action bar.

### Added (earlier in this cycle)

- **CID inline-image resolution.** Embedded images (signature logos, inline photos) are
  now fetched via Office.js `getAttachmentContentAsync`, converted to base64 data URLs and
  injected into the rendered HTML after sanitization. CID-to-attachment matching uses
  name matching with an extension-insensitive and positional fallback (`cidResolver.ts`).
- **External-image loading via CORS.** When "External images → Loaded for this export" is
  selected, html2canvas now runs with `useCORS: true` and a 15 s image timeout, so
  CORS-enabled hosts render. Tainting stays disabled so PNG/JPG export never throws a
  SecurityError. Hosts without CORS headers still fall back to placeholders (a proxy is a
  later option).

### Changed

- Render pipeline order is now sanitize → CID-resolve → render (data URLs from trusted
  attachments are injected post-sanitization, avoiding any URI-scheme stripping).

## [0.1.0-alpha.1] - 2026-05-28

### Added

- Initial scaffold of the Outlook add-in (TypeScript + Vite + React + Tailwind + Radix UI).
- Office Add-In manifest (`manifest.xml`) with ribbon button on `MessageReadCommandSurface`
  in 10 locale overrides (default `en-US` plus `de`, `fr`, `es`, `pt-BR`, `pt-PT`, `nl`,
  `pl`, `ja`, `zh-Hans`).
- Single-pane taskpane UI with live preview, settings panel and sticky action bar.
- Modern, professional design language: Tailwind + Radix primitives, Inter font, brand
  indigo accent, glassmorphic action bars, dark-mode autodetect + manual toggle.
- `officeItemReader` reading body (HTML with plain-text fallback) and meta (from, to, cc,
  subject) via Office.js; fetches true send time via EWS `makeEwsRequestAsync` /
  `DateTimeSent` with graceful fallback to `dateTimeCreated`.
- `emailRenderModel` with type detection (newsletter-fixed / Word-Outlook / plain-text /
  responsive / unknown) and width suggestion based on outer-most width / max-width.
- `outlookHeader` generator that builds a localized "Von / Gesendet / An / Cc / Betreff"
  block (11 locales, dates via `Intl.DateTimeFormat`). CJK-aware font stack for `ja` and
  `zh-Hans`.
- `sanitize` (DOMPurify) with external-image blocking by default and per-export opt-in
  toggle; replaces blocked images with dashed placeholder boxes.
- `imageExporter` rendering sanitized HTML in an offscreen `<div>` via html2canvas,
  emitting PNG or JPG blobs and supporting `navigator.clipboard.write` for PNG.
- 11 i18n bundles (auto-translated for non-`de` / non-`en` locales, marked
  `"_meta.review"` for native-speaker correction).
- README with sideload instructions for Outlook on the Web, classic Outlook for Windows
  and the automated `office-addin-debugging` flow.
- MIT LICENSE.

### Known issues / deferred to next iteration

- Pagination is single-image only — auto-split, paper formats and smart page-break are
  not implemented yet.
- External images on hosts without CORS headers still render as placeholders (a
  server-side proxy would be needed to cover those — deferred).
- Auto-translated locale bundles need native-speaker review.
