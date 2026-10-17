import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Rasterises the AweFit SVG mark into every bitmap the launcher and the web
 * manifest need.
 *
 *   cd frontend && node scripts/render-icons.mjs
 *
 * `assets/*.svg` are the single source; the PNGs next to them are inputs for
 * `npx capacitor-assets generate`, and the ones under `public/icons/` ship with
 * the web app (manifest + apple-touch-icon). Nothing here is hand-edited.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asset = (p) => path.join(root, 'assets', p);
const pub = (p) => path.join(root, 'public', 'icons', p);

// density keeps the vector crisp on the large canvases; the explicit resize is
// what actually fixes the pixel dimensions.
const DENSITY = 384;

const jobs = [
  // Capacitor asset inputs
  [asset('icon-only.svg'), asset('icon-only.png'), 1024],
  [asset('icon-foreground.svg'), asset('icon-foreground.png'), 1024],
  [asset('icon-background.svg'), asset('icon-background.png'), 1024],
  [asset('splash.svg'), asset('splash.png'), 2732],
  [asset('splash.svg'), asset('splash-dark.png'), 2732],
  // shipped to the browser
  [asset('icon-only.svg'), pub('icon-192x192.png'), 192],
  [asset('icon-only.svg'), pub('icon-512x512.png'), 512],
  [asset('icon-maskable.svg'), pub('icon-maskable-512x512.png'), 512],
  [asset('icon-only.svg'), pub('apple-touch-icon.png'), 180],
];

for (const [src, out, size] of jobs) {
  await sharp(src, { density: DENSITY })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(out);
  console.log(`wrote ${path.relative(root, out)} (${size}×${size})`);
}
