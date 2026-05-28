// Generate an environment-specific Office Add-in manifest by swapping the dev base URL
// (https://localhost:3000) for the target host.
//
// Usage:
//   node scripts/make-prod-manifest.mjs <baseUrl> [outFile]
//   ADDIN_BASE_URL=https://outlook-image.example.com node scripts/make-prod-manifest.mjs
//
// Examples:
//   node scripts/make-prod-manifest.mjs https://outlook-image.ardimedia.li dist/manifest.xml
//
// The app assets are environment-neutral (relative URLs); only the manifest carries
// absolute URLs, so only the manifest needs to be regenerated per environment.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DEV_BASE = 'https://localhost:3000';

const baseUrlArg = process.argv[2] || process.env.ADDIN_BASE_URL || '';
const baseUrl = baseUrlArg.replace(/\/+$/, '');
const outFile = process.argv[3] || 'dist/manifest.xml';

if (!baseUrl) {
  console.error(
    'Error: no base URL.\n' +
      'Usage: node scripts/make-prod-manifest.mjs <baseUrl> [outFile]\n' +
      '   or: set ADDIN_BASE_URL env var.'
  );
  process.exit(1);
}

if (!/^https:\/\//i.test(baseUrl)) {
  console.error(`Error: base URL must be HTTPS (got "${baseUrl}").`);
  process.exit(1);
}

const src = readFileSync('manifest.xml', 'utf8');
if (!src.includes(DEV_BASE)) {
  console.error(`Error: manifest.xml does not contain the expected dev base "${DEV_BASE}".`);
  process.exit(1);
}

const out = src.split(DEV_BASE).join(baseUrl);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, out);
console.log(`Wrote ${outFile} (base: ${baseUrl})`);
