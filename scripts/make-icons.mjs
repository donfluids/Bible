// Draws an edition's app icon, Android adaptive icon layers, splash images and favicon
// from the book in icon-art.mjs.
//   node scripts/make-icons.mjs en     parchment and brown (English edition)
//   node scripts/make-icons.mjs ml     cream and forest green (Malayalam edition)
import fs from 'node:fs';
import path from 'node:path';
import { COLOURS, MIDDLE, ROOT, book, fontFaces, launch, monochrome } from './icon-art.mjs';

const edition = process.argv[2] ?? 'en';
const c = COLOURS[edition];
if (!c) {
  console.error(`unknown edition ${edition}`);
  process.exit(1);
}
const out = path.join(ROOT, 'assets', 'icons', edition);
fs.mkdirSync(out, { recursive: true });

// art: SVG for the book; scale: its size on a 1024 canvas; background: colour or none.
const svg = (art, scale, background) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}
  <g transform="translate(512,${512 - MIDDLE * scale}) scale(${scale})">${art}</g></svg>`;

const files = {
  'icon.png': svg(book(c), 0.92, c.bg),
  // Adaptive icons show the middle 72 of 108 dp and may cut to a 66 dp circle; the book fits inside it.
  'android-icon-foreground.png': svg(book(c), 0.62, null),
  'android-icon-background.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${c.bg}"/></svg>`,
  'android-icon-monochrome.png': svg(monochrome(), 0.62, null),
  'splash-icon.png': svg(book(c), 0.84, null),
  'splash-icon-dark.png': svg(book(c), 0.84, null),
};

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
const fonts = fontFaces();
for (const [name, body] of Object.entries(files)) {
  await page.setContent(`<!doctype html><style>${fonts} html, body { margin: 0; background: transparent; }</style>${body}`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('svg').screenshot({ path: path.join(out, name), omitBackground: true });
}
// The favicon: the full icon, small.
await page.setContent(`<!doctype html><style>${fonts} html, body { margin: 0; }</style>
  <div style="width:48px;height:48px">${files['icon.png'].replace('width="1024" height="1024"', 'width="48" height="48"')}</div>`);
await page.evaluate(() => document.fonts.ready);
await page.locator('svg').screenshot({ path: path.join(out, 'favicon.png') });
await browser.close();
console.log(`icons for edition ${edition} written to ${path.relative(ROOT, out)}`);
