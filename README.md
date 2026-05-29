# Email as Image

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Office Add-In](https://img.shields.io/badge/Office%20Add--In-Outlook-blue.svg)](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/)

An Outlook add-in that exports the currently opened email as a **PNG or JPG image**, with an
optional Outlook-style forwarding header in 11 languages. Open-source, MIT-licensed, no
tracking.

> **Status: v0.1.0-alpha, preparing for v1.0 / AppSource.** The full flow works — read email
> → live preview → export PNG/JPG or copy to clipboard. Auto-crop (incl. an email's own
> coloured side bands), smart pagination, CID-image resolution and EWS sent-time queries are
> implemented.

## Features

- **Live preview** with on-the-fly re-rendering when settings change (debounced 300 ms)
- **PNG and JPG export** — JPG with a quality slider
- **Auto-crop** — trims empty margins, including an email's own coloured side bands
- **Smart pagination** — auto-split into A4-proportioned pages with clean page-breaks
- **Outlook-style forwarding header** with localized labels and date format (11 locales)
- **Email-type detection** — newsletter / Word-Outlook / plain-text / responsive
- **External images blocked by default**, with a one-click "load for this export" toggle
- **Background picker** — Light / Dark / Auto (heuristic)
- **Clipboard copy** (PNG only, modern browsers)
- **Dark mode** with system-preference autodetect + manual toggle
- **Localized UI** in `en-US`, `en-GB`, `de`, `fr`, `es`, `pt-BR`, `pt-PT`, `nl`, `pl`, `ja`, `zh-Hans`

## Quick start (local testing)

### Prerequisites

- **Node.js 20+** and **npm 10+**
- **Microsoft 365 Outlook** (classic Windows/Mac), **new Outlook**, or **Outlook on the web**
  (requires Mailbox requirement set 1.8 — Outlook 2016/2019 perpetual is not supported)
- Trusted dev certificate for `https://localhost:3000`

### 1. Install dependencies

```sh
npm install
```

### 2. Generate and trust the dev certificate

The Office Add-In tooling installs an HTTPS dev cert into your machine's trust store:

```sh
npx office-addin-dev-certs install
```

You will be prompted to install the root CA — accept. This is needed once per machine.

### 3. Start the dev server

```sh
npm run dev
```

The server listens on `https://localhost:3000`. Vite serves both the taskpane
(`/src/taskpane.html`) and the function-command stub (`/src/commands.html`).

### 4. Sideload the manifest into Outlook

Pick the path that matches your setup:

#### Option A — Outlook on the Web (fastest)

1. Open `https://outlook.office.com`
2. Open any mail
3. Click the **More actions (…)** menu → **Get Add-ins**
4. In the dialog: **My add-ins** → **Custom Addins** → **Add a custom add-in** →
   **Add from file…**
5. Pick `manifest.xml` from the project root
6. Reload the mail — the **"Email as Image"** ribbon button appears in the *Image Export*
   group.

#### Option B — Outlook for Windows (classic)

1. In Outlook: **Home** ribbon → **Get Add-ins** (or **All Apps** in newer builds)
2. Same flow as Option A — **My add-ins** → **Add from file…**

#### Option C — Automated sideload via Office Add-In Tooling

```sh
npm run start:outlook:web         # opens OWA + sideloads
# or
npm run start:outlook:desktop     # opens classic Outlook + sideloads
```

This is the most reliable method during development, but requires that Outlook is closed
before running.

### 5. Test it

1. Open any email in Outlook
2. Click **"Email as Image"** in the ribbon
3. The taskpane opens with a live preview
4. Tweak settings as needed — preview updates within ~300 ms
5. Click **Save** → PNG downloads to your default Downloads folder

## How it works

```
Outlook Ribbon Click
   ↓
Taskpane opens (React + Tailwind + Radix)
   ↓
officeItemReader  → reads body (HTML or text fallback) + meta via Office.js
                  → fetches DateTimeSent via EWS makeEwsRequestAsync (with fallback)
   ↓
sanitize          → DOMPurify removes scripts, blocks external images by default
   ↓
emailRenderModel  → detects type (newsletter / Word / plain / responsive)
                  → suggests render width
   ↓
outlookHeader     → builds localized "Von / Gesendet / An / Cc / Betreff" header
                    (11 locales, Intl.DateTimeFormat for dates)
   ↓
imageExporter     → renders sanitized HTML + header into an offscreen <div>
                  → html2canvas → PNG/JPG blob
   ↓
Live preview      → Blob URL in <img>, debounced re-render on setting changes
   ↓
Save / Clipboard  → download via <a download> OR navigator.clipboard.write
```

## Project structure

```
.
├── src/
│   ├── App.tsx                  # main React app
│   ├── main.tsx                 # entry
│   ├── taskpane.html            # taskpane shell (loaded into Outlook iframe)
│   ├── commands.html            # function-command shell
│   ├── commands.ts
│   ├── components/
│   │   ├── PreviewPane.tsx      # live preview with tabs + zoom
│   │   ├── SettingsPanel.tsx    # settings grid
│   │   ├── ActionBar.tsx        # Save / Clipboard
│   │   ├── ErrorState.tsx       # localized error UI
│   │   ├── Footer.tsx           # branding + Store + GitHub links
│   │   └── ui/                  # Radix-based primitives
│   ├── lib/                     # framework-agnostic core
│   │   ├── officeItemReader.ts  # Office.js wrapper, EWS DateTimeSent
│   │   ├── sanitize.ts          # DOMPurify + image policy
│   │   ├── emailRenderModel.ts  # type detection + width suggestion
│   │   ├── outlookHeader.ts     # localized header HTML
│   │   ├── imageExporter.ts     # html2canvas + clipboard
│   │   ├── i18n.ts              # locale resolver + string lookup
│   │   ├── filename.ts          # filename sanitizer
│   │   └── cn.ts                # class merger
│   ├── locales/                 # 11 JSON bundles
│   ├── hooks/                   # useTheme, useDebouncedValue
│   ├── styles/globals.css       # Tailwind v4 theme + utilities (CSS-first config)
│   └── types/settings.ts        # Settings type + defaults
├── manifest.xml                 # Office Add-In manifest (11 locale overrides)
├── postcss.config.js            # @tailwindcss/postcss
├── vite.config.ts
└── tsconfig.json
```

## Architecture decisions

- **Office Add-In (JS) over VSTO** — works in classic Outlook, new Outlook (Monarch),
  Outlook on the Web and Mac. VSTO is Windows-classic-only and a dead end.
- **No context-menu entry** — Microsoft's Office Add-In manifest has no extension point
  for the Outlook context menu (only `MessageReadCommandSurface` for the ribbon). VSTO
  could, but see above. Ribbon button + user-assignable keyboard shortcut covers the
  speed need.
- **Offscreen `<div>` rendering, not sandboxed iframe** — DOMPurify strips scripts and
  event handlers before render; html2canvas works most reliably on a normal DOM node.
- **EWS for sent time** — `Office.context.mailbox.item.dateTimeCreated` is the *receive*
  time, not the send time. We query EWS `DateTimeSent` via `makeEwsRequestAsync`. When
  EWS is unavailable, the header shows the receive time with an *(Empfangen / Received)*
  annotation.
- **No telemetry, no tracking** — the add-in never sends data anywhere. AppSource may
  surface anonymized crash reports via Microsoft, but we don't collect anything.

## Roadmap

- **v0.1.x** — auto-crop, CID-image resolution, real-world QA corpus
- **v0.2** — Pagination (auto-split + smart page-break + tabs)
- **v0.3** — JPG export + quality slider, clipboard JPG
- **v0.4** — Paper formats (A4 / Letter / Legal) + page-break optimization
- **v0.5** — A11y audit, manifest validation, Microsoft AppSource submission

## License

[MIT](LICENSE)

## Contributing

Issues and pull requests are welcome at
[github.com/ardimedia-com/outlook-save-email-as-image](https://github.com/ardimedia-com/outlook-save-email-as-image).
The 11 i18n bundles in `src/locales/` were initially auto-translated and are marked
`"_meta.review": "Auto-translated — needs review by native speaker"` — corrections from
native speakers are especially appreciated.

## Acknowledgments

- [html2canvas](https://html2canvas.hertzen.com/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
