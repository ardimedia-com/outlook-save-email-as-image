import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const pkg = JSON.parse(
  fs.readFileSync(resolve(__dirname, 'package.json'), 'utf8')
) as { version: string };

function readDevCerts() {
  const certDir = path.join(os.homedir(), '.office-addin-dev-certs');
  const keyPath = path.join(certDir, 'localhost.key');
  const certPath = path.join(certDir, 'localhost.crt');
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  define: {
    // Build-time version: the pipeline sets ADDIN_VERSION (e.g. 1.0.<rev>.0); locally it
    // falls back to package.json so dev builds still show a sensible version.
    __APP_VERSION__: JSON.stringify(process.env.ADDIN_VERSION || pkg.version),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    https: readDevCerts(),
    port: 3000,
    strictPort: true,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        taskpane: resolve(__dirname, 'src/taskpane.html'),
        commands: resolve(__dirname, 'src/commands.html'),
      },
      output: {
        // Split the heaviest dependencies into their own long-cached chunks so the app
        // chunk stays small and a code change doesn't bust the vendor cache.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('html2canvas')) return 'html2canvas';
          if (id.includes('dompurify')) return 'sanitize';
          return 'vendor';
        },
      },
    },
  },
});
