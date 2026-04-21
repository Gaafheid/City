// Bundles .open-next/worker.js into a single self-contained
// .open-next/assets/_worker.js for Cloudflare Pages Advanced Mode.
const esbuild = require('esbuild');
const { existsSync } = require('fs');

const workerSrc = '.open-next/worker.js';
const workerDest = '.open-next/assets/_worker.js';

if (!existsSync(workerSrc)) {
  console.error('worker.js not found — did opennextjs-cloudflare build run?');
  process.exit(1);
}

// Next.js bundles @vercel/og which imports .wasm?module files.
// We don't use OG image generation so stub these out.
const wasmStubPlugin = {
  name: 'wasm-stub',
  setup(build) {
    build.onResolve({ filter: /\.wasm(\?.*)?$/ }, (args) => ({
      path: args.path,
      namespace: 'wasm-stub',
    }));
    build.onLoad({ filter: /.*/, namespace: 'wasm-stub' }, () => ({
      contents: 'module.exports = undefined;',
      loader: 'js',
    }));
  },
};

// next/dist/server/node-environment.js (and its extensions) monkey-patch
// Math.random, Date, and node:crypto for the experimental cacheComponents
// feature. Those patches call require('node:crypto') inside CJS modules.
// In an ESM Cloudflare Worker there is no global require, so esbuild's
// __require shim throws "Dynamic require of node:crypto is not supported".
// We stub the whole node-environment tree (we don't use cacheComponents)
// and set up the only thing we actually need (AsyncLocalStorage) in the banner.
const nodeEnvironmentStubPlugin = {
  name: 'node-environment-stub',
  setup(build) {
    build.onResolve({ filter: /node-environment/ }, (args) => ({
      path: args.path,
      namespace: 'node-env-stub',
    }));
    build.onLoad({ filter: /.*/, namespace: 'node-env-stub' }, () => ({
      // Return a CJS-compatible no-op so esbuild's module wrapper is happy.
      contents: '"use strict"; Object.defineProperty(exports, "__esModule", { value: true });',
      loader: 'js',
    }));
  },
};

esbuild.build({
  entryPoints: [workerSrc],
  bundle: true,
  outfile: workerDest,
  format: 'esm',
  // 'node' platform auto-externalises all Node.js built-ins (fs, path,
  // async_hooks, crypto, stream, etc.) which are available at runtime
  // in Cloudflare Workers via the nodejs_compat flag.
  platform: 'node',
  // Cloudflare-specific package export conditions
  conditions: ['workerd', 'worker', 'browser', 'module', 'require', 'default'],
  external: [
    'cloudflare:*',
    '__STATIC_CONTENT_MANIFEST',
  ],
  // node-environment.js is stubbed above, so we must set up AsyncLocalStorage
  // ourselves. React server components need it as globalThis.AsyncLocalStorage.
  banner: {
    js: [
      `import { AsyncLocalStorage as __AsyncLocalStorage } from 'node:async_hooks';`,
      `if (typeof globalThis.AsyncLocalStorage !== 'function') { globalThis.AsyncLocalStorage = __AsyncLocalStorage; }`,
    ].join('\n') + '\n',
  },
  plugins: [wasmStubPlugin, nodeEnvironmentStubPlugin],
  target: 'es2022',
  minify: false,
}).then(() => {
  console.log('✓ Worker bundled → .open-next/assets/_worker.js');
}).catch((err) => {
  console.error('Bundle failed:', err.message);
  process.exit(1);
});
