// Bundles .open-next/worker.js + all its dependencies into a single
// .open-next/assets/_worker.js so Cloudflare Pages gets one self-contained
// file and doesn't need to re-bundle (which fails for multi-file workers).
const esbuild = require('esbuild');
const { existsSync } = require('fs');

const workerSrc = '.open-next/worker.js';
const workerDest = '.open-next/assets/_worker.js';

if (!existsSync(workerSrc)) {
  console.error('worker.js not found — did opennextjs-cloudflare build run?');
  process.exit(1);
}

esbuild.build({
  entryPoints: [workerSrc],
  bundle: true,
  outfile: workerDest,
  format: 'esm',
  platform: 'browser',
  conditions: ['workerd', 'worker', 'browser'],
  // Cloudflare builtins — available at runtime, must not be bundled
  external: ['cloudflare:*', 'node:*', '__STATIC_CONTENT_MANIFEST'],
  target: 'es2022',
  minify: false,
}).then(() => {
  console.log('✓ Worker bundled → .open-next/assets/_worker.js');
}).catch((err) => {
  console.error('Bundle failed:', err.message);
  process.exit(1);
});
