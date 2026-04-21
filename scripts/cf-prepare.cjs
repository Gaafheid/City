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
  plugins: [wasmStubPlugin],
  target: 'es2022',
  minify: false,
}).then(() => {
  console.log('✓ Worker bundled → .open-next/assets/_worker.js');
}).catch((err) => {
  console.error('Bundle failed:', err.message);
  process.exit(1);
});
