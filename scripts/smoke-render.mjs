/**
 * Headless smoke test for the export pipeline (`npm run smoke`).
 *
 * Builds test/smoke/smoke.html with the real Vite/Tailwind pipeline, serves it, drives it with
 * headless Chrome and scrapes the SMOKE PASS/FAIL lines the page writes into the DOM.
 *
 * The renderer is the app's only output and its failure modes are invisible to tsc and to the
 * bundler: the oklch bug this was written for produced a green build and a broken app. Anything
 * that touches the render path, Tailwind, or a rendering dependency should be run through here.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { build, preview } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.smoke-build');
const PAGE = 'test/smoke/smoke.html';
const PORT = 4183;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Drive the page over the DevTools protocol and return its result text.
 *
 * `--dump-dom` is not usable here: it pairs with `--virtual-time-budget`, and virtual time races
 * past the canvas rendering and blob encoding, which are real work rather than timers. So the
 * dump lands mid-run and reports only the cases that happened to finish. Polling the live page
 * for its completion marker is the only reliable signal.
 */
async function runPage(chrome, url, timeoutMs = 120000) {
  const port = 9333;
  const child = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--disable-extensions',
      `--remote-debugging-port=${port}`,
      url,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );

  let stderr = '';
  child.stderr.on('data', (chunk) => (stderr += chunk));

  const deadline = Date.now() + timeoutMs;
  try {
    // Wait for the debugging endpoint, then for our page target to appear.
    let target = null;
    while (!target && Date.now() < deadline) {
      try {
        const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
        target = targets.find((t) => t.type === 'page' && t.url.startsWith(url));
      } catch {
        /* endpoint not up yet */
      }
      if (!target) await sleep(250);
    }
    if (!target) throw new Error(`Chrome debugging endpoint never came up\n${stderr}`);

    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', () => reject(new Error('CDP socket failed')), {
        once: true,
      });
    });

    let messageId = 0;
    const evaluate = (expression) =>
      new Promise((resolve, reject) => {
        const id = ++messageId;
        const onMessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.id !== id) return;
          socket.removeEventListener('message', onMessage);
          if (message.error) reject(new Error(message.error.message));
          else resolve(message.result?.result?.value ?? '');
        };
        socket.addEventListener('message', onMessage);
        socket.send(
          JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: { expression, returnByValue: true },
          })
        );
      });

    try {
      // The target appears in /json/list before it has navigated, and a FAILED navigation also
      // leaves a matching target sitting on chrome-error://chromewebdata/. So wait for the real
      // document, and say so plainly if it never arrives — otherwise the poll below just times
      // out after two minutes with no explanation.
      let href = '';
      const navDeadline = Date.now() + 20000;
      while (Date.now() < navDeadline) {
        href = await evaluate('location.href');
        if (href.startsWith('http')) break;
        await sleep(250);
      }
      if (!href.startsWith('http')) {
        throw new Error(`Navigation to ${url} failed (stuck on ${href}); is the server up?`);
      }

      while (Date.now() < deadline) {
        const text = await evaluate("document.getElementById('out')?.textContent ?? ''");
        if (text.includes('SMOKE DONE')) return text;
        await sleep(500);
      }
      // Report whatever completed, so a hang still shows which case it hung on.
      return await evaluate("document.getElementById('out')?.textContent ?? ''");
    } finally {
      socket.close();
    }
  } finally {
    child.kill();
  }
}

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.error('No Chrome/Edge found. Set CHROME_PATH to a Chromium binary.');
    process.exit(2);
  }

  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    plugins: [react()],
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: { input: path.join(root, PAGE) },
    },
  });

  const server = await preview({
    root,
    configFile: false,
    logLevel: 'warn',
    build: { outDir },
    preview: { port: PORT, strictPort: true, open: false },
  });

  try {
    const output = await runPage(chrome, `http://localhost:${PORT}/${PAGE}`);
    const results = output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('SMOKE PASS') || line.startsWith('SMOKE FAIL'));

    if (results.length === 0) {
      console.error('No smoke results in the page output — the harness did not run.');
      process.exit(1);
    }

    for (const line of results) console.log(line);

    const failed = results.filter((line) => line.includes('SMOKE FAIL'));
    const passed = results.length - failed.length;
    console.log(`\n${passed} passed, ${failed.length} failed`);
    if (!output.includes('SMOKE DONE')) {
      console.error('Harness did not reach completion — results may be truncated.');
      process.exit(1);
    }
    process.exit(failed.length > 0 ? 1 : 0);
  } finally {
    server.httpServer.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
