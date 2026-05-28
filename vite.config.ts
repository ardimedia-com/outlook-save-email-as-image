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
    __APP_VERSION__: JSON.stringify(pkg.version),
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
    },
  },
});
