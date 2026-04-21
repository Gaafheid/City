// Prepares .open-next/assets/ for Cloudflare Pages deployment.
// Copies worker.js → assets/_worker.js and all worker dependency
// directories into assets/ so relative imports resolve correctly.
const { cpSync, copyFileSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

const src = '.open-next';
const dest = '.open-next/assets';

copyFileSync(join(src, 'worker.js'), join(dest, '_worker.js'));
console.log('✓ Copied worker.js → assets/_worker.js');

for (const entry of readdirSync(src)) {
  if (entry === 'assets' || entry === 'worker.js') continue;
  const srcPath = join(src, entry);
  const destPath = join(dest, entry);
  if (statSync(srcPath).isDirectory()) {
    cpSync(srcPath, destPath, { recursive: true });
  } else {
    copyFileSync(srcPath, destPath);
  }
  console.log(`✓ Copied ${entry}`);
}

console.log('✓ Done — assets ready for Cloudflare Pages');
