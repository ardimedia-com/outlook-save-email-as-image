# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Automatic build-time versioning** — the Azure DevOps pipeline derives a monotonic
  manifest version `1.0.<rev>.0` from a build counter and injects it into both the manifest
  `<Version>` and the footer (`ADDIN_VERSION` env → `__APP_VERSION__`). Every deploy is
  guaranteed a higher version, which is required for M365 Admin Center updates — no manual
  bumping, no per-commit churn. `make-prod-manifest.mjs` validates the 4-part format and
  overrides `<Version>`. Local dev builds fall back to the `package.json` version.
- **Version in the footer** — the app version is injected at build time via Vite `define`
  (`__APP_VERSION__`), shown after the footer tagline (e.g. `· v1.0.42.0` from the pipeline,
  or the `package.json` version locally).
- **Complete i18n coverage** — every locale bundle now has all 66 keys (verified parity
  against en-US). The recently added keys (`preview.page`, `status.clipboardSuccess`,
  `status.saved`, `error.clipboardBlocked`, `footer.privacy`) are now translated in all 11
  locales instead of falling back to English. Non-de/en bundles remain `_meta.review`-flagged
  for native-speaker review.
- **Pagination (auto-split)** — when "Pagination → Auto-split" is selected, a tall render is
  sliced into A4-proportioned pages with a smart page-break (each cut snaps up to the nearest
  all-background row so content isn't cut mid-line). Pages show as tabs in the preview;
  Save downloads all pages (`_pNN`), clipboard copies the active page.
- **Privacy policy page** (`public/privacy.html`) served at `/privacy.html`, linked from the
  task-pane footer — states that all processing is local and no data is collected or
  transmitted. Needed for the AppSource submission later.
- **Accessibility pass** — document `lang` tracks the resolved locale; error toasts use
  `role="alert"`/`aria-live="assertive"`; the resize divider is keyboard-operable
  (Tab-focus + Arrow keys, with `aria-valuenow/min/max`); preview image alt text is
  localized and page-aware.

### Added (hosting & infra)

- **Self-hosted Inter font** via `@fontsource-variable/inter` (bundled by Vite) — removed the
  Google Fonts CDN dependency. No third-party font request, better privacy, and it allows a
  stricter Content-Security-Policy.
- **IIS hosting config** (`public/web.config`) — correct MIME types, long-cache for hashed
  `/assets`, no-cache for HTML/manifest, a strict CSP tuned for client-side email rendering
  (self + Microsoft office.js; inline styles; data:/https: images; self fonts) and security
  headers. Deliberately does **not** set X-Frame-Options/restrictive frame-ancestors, since
  Outlook embeds the taskpane in an iframe.
- **Environment-specific manifest generator** (`scripts/make-prod-manifest.mjs`, `npm run
  make-manifest`) — swaps the dev base URL for the target host so app assets stay
  environment-neutral and only the manifest carries absolute URLs.
- **Azure DevOps pipeline** (`azure-pipelines.yml`) — multi-stage, fully YAML-native: build
  on a Microsoft-hosted agent (npm ci, vite build, generate the prod manifest, publish site +
  manifest artifacts), then a deployment job on the existing `APP-SVRWWW05` environment (VM
  resource) that cleans the IIS target and copies the static site. No agent pool or deployment
  group needed.

### Security

- All image processing is client-side; the hosting server serves only static, public files —
  email content never reaches the server. Dependabot + secret scanning + push protection are
  enabled on the repository.

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

- Renamed the app to "Email as Image" everywhere it appears as a name: the task pane title
  (manifest `DisplayName` + all locale overrides), the ribbon button label (`TaskpaneButton.Label`
  "Save as Image" → "Email as Image" + all locale overrides), the footer tagline (all locales),
  the privacy page, the README and the (unused) `app.title` string. Manifest changes take effect
  after the regenerated manifest is re-uploaded to the M365 Admin Center. Repo/package slug and
  GitHub URLs are intentionally unchanged.
- Migrated styling to **Tailwind CSS v4**. The JS `tailwind.config.js` and `autoprefixer` are
  gone; configuration is now CSS-first in `globals.css` (`@theme` tokens for the brand palette,
  shadows and animations; `@utility` for `card`/`glass-bar`/etc.; `@custom-variant dark` to keep
  the class-based dark mode), built via `@tailwindcss/postcss`. `theme()` calls became CSS
  variables and the v3→v4 utility renames (e.g. `backdrop-blur`→`backdrop-blur-sm`,
  `outline-none`→`outline-hidden`) were applied across components. No visual change intended.
- App background is now white in light mode (was slate-50); dark mode is unchanged.
- Image stats (dimensions, scale, size, type) moved out of the action bar into a highlighted
  status block pinned to the bottom of the settings column, with the advisory notes (blocked
  images, sent-time fallback) shown below them in an amber-tinted status row. The action bar now
  holds only the Copy/Save actions.
- Footer is now two lines: the Office Store and GitHub commands sit on top as buttons, with the
  app name, version and Privacy link on the bottom line.
- Responsive layout is now driven by the pane width via a CSS container query instead of a JS
  viewport media query: a single adaptive DOM switches between stacked and two-column based on
  the task pane's own width, removing the `useMediaQuery` hook and its resize re-renders.
- Manifest `DisplayName` (the task pane title) shortened from "Save Email as Image" to
  "Email as Image". Takes effect after the updated manifest is re-uploaded to the M365 Admin
  Center; locale overrides still carry the longer translated form.
- Render pipeline order is now sanitize → CID-resolve → render (data URLs from trusted
  attachments are injected post-sanitization, avoiding any URI-scheme stripping).

### Fixed

- **Trim empty margins now removes coloured side bands too.** With the setting on, the email is
  rendered shrink-to-fit (its natural content width, capped at the chosen width) instead of at a
  fixed wider canvas. Emails narrower than the canvas (e.g. a 600px marketing layout on a grey
  page background) no longer leave wide grey side bands, and the full-width forwarding header and
  its rule collapse to the same width as the content. Flowing/plain-text content still wraps at
  the cap, so wider emails are unaffected. The white render padding is still trimmed by auto-crop.
- **Rendered preview now shows in the pane.** The CSP `img-src` did not allow `blob:`, so the
  preview `<img>` (an object URL created from the rendered canvas blob) was blocked and showed a
  broken image even though the render succeeded. `img-src` now allows `blob:`.
- **Add-in now initializes in classic Outlook.** The strict `script-src` CSP blocked
  `https://ajax.aspnetcdn.com` and inline/eval, which the Outlook desktop host needs because
  office.js injects `MicrosoftAjax.js` from that CDN during initialization. The block stalled
  office.js so `Office.onReady` never fired and the pane hung on load (it worked in a standalone
  browser because the no-host path doesn't load that script). `script-src` now allows
  `https://ajax.aspnetcdn.com`, `'unsafe-inline'` and `'unsafe-eval'` — required by Microsoft's
  own library, not by app code.
- Outlook classic no longer stays indefinitely on "Loading email" when Office.js callbacks
  stall. Email body read, EWS sent-time lookup, and inline-attachment fetch now use timeout
  guards and fail gracefully, allowing the error/retry state to appear instead of a permanent
  spinner.
- Top-level load watchdog guarantees the spinner can never hang forever. The per-call guards
  only run once `loadEmail()` is invoked (after `Office.onReady`); if onReady never fires
  (office.js blocked, CSP, or an Outlook-classic WebView quirk) the spinner used to stay up
  indefinitely. A 20 s backstop now surfaces a distinct, diagnostic error — `OFFICE_INIT_TIMEOUT`
  (onReady never fired) vs `LOAD_TIMEOUT` (onReady fired but the load stalled) — and the new
  `error.officeInit` message is translated in all 11 locales.
- Body read fails fast on timeout: a timed-out HTML read no longer triggers a second
  full-timeout plain-text read, halving the worst-case wait before the error appears (≈12 s
  instead of ≈24 s) when the host is unresponsive.
- Self-diagnosing init failure: the load failure now distinguishes a missing `Office` global
  (office.js never loaded — CDN blocked/offline/CSP) from `Office.onReady` never firing (host
  handshake stalled) and surfaces a short technical detail line under the error message, so the
  root cause is visible without attaching a debugger. A missing global also fails fast instead
  of waiting out the watchdog. The detail line also reports any Content-Security-Policy
  violation or runtime error captured during the init wait, so a blocked host handshake names
  the offending directive/URL on screen.

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
