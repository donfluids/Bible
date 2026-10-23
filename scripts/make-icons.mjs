// Draws the app icon, Android adaptive icon layers, splash images, favicon and the 512 × 512
// Play icon from the art in icon-art.mjs. All three editions share it.
//   node scripts/make-icons.mjs        writes assets/icons/{en,ml,ta}/ and docs/play/graphics/*-icon-512.png
import fs from 'node:fs';
import path from 'node:path';
import { MIDDLE, ROOT, art, background, launch, monochrome } from './icon-art.mjs';

// art: SVG in the art's units; scale: its size on a 1024 canvas; back: the brown behind it.
const svg = (inner, scale, back, size = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  ${back ? background() : ''}
  <g transform="translate(512,${512 - MIDDLE * scale}) scale(${scale})">${inner}</g></svg>`;

// The splash shows the icon as a rounded tile on the app's own cream or dark page.
const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><clipPath id="tile"><rect x="232" y="232" width="560" height="560" rx="128"/></clipPath></defs>
  <g clip-path="url(#tile)"><g transform="translate(232,232) scale(${560 / 1024})">${svg(art(), 1, true)}</g></g></svg>`;

const files = {
  'icon.png': svg(art(), 1, true),
  // Adaptive icons show the middle 72 of 108 dp and may cut to a 66 dp circle (radius 313 of
  // 1024); the book's lower corners, 399 from the middle, set the scale.
  'android-icon-foreground.png': svg(art(), 0.74, false),
  'android-icon-background.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${background()}</svg>`,
  'android-icon-monochrome.png': svg(monochrome(), 0.74, false),
  'splash-icon.png': tile,
  'splash-icon-dark.png': tile,
};

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
const shoot = async (body, file, size = 1024) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><style>html, body { margin: 0; background: transparent; }</style>${body}`);
  await page.locator('svg').first().screenshot({ path: file, omitBackground: true });
};
for (const edition of ['en', 'ml', 'ta']) {
  const out = path.join(ROOT, 'assets', 'icons', edition);
  fs.mkdirSync(out, { recursive: true });
  for (const [name, body] of Object.entries(files)) await shoot(body, path.join(out, name));
  await shoot(svg(art(), 1, true, 48), path.join(out, 'favicon.png'), 48);
}
const graphics = path.join(ROOT, 'docs', 'play', 'graphics');
for (const name of ['bible', 'vedapusthakam', 'vedagamam']) await shoot(svg(art(), 1, true, 512), path.join(graphics, `${name}-icon-512.png`), 512);
await browser.close();
console.log('icons written to assets/icons/{en,ml,ta} and docs/play/graphics');
