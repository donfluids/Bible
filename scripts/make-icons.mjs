// Draws an edition's app icon, Android adaptive icon layers, splash images and favicon:
// an open book with the Hebrew aleph and the Greek alpha at the head of its pages, lines
// of text below them and a red ribbon down the middle.
//   node scripts/make-icons.mjs en     parchment and brown (English edition)
//   node scripts/make-icons.mjs ml     cream and forest green (Malayalam edition)
//
// The artwork is SVG, rendered with Chromium through playwright-core. Chromium comes from
// PLAYWRIGHT_BROWSERS_PATH (or set CHROMIUM_PATH to a chrome binary). The aleph is set in
// Noto Serif Hebrew from node_modules; the alpha in FreeSerif Bold (ICON_FONT overrides it).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const COLOURS = {
  en: { bg: '#F4EFE4', ink: '#5A3A14', page: '#FFFBF2', edge: '#E8DCC4', line: '#CDBFA4', ribbon: '#A4302F' },
  ml: { bg: '#EEF3E6', ink: '#1F4D2E', page: '#FBF7EA', edge: '#E4DCC4', line: '#B9C3AE', ribbon: '#A4302F' },
};

const edition = process.argv[2] ?? 'en';
const c = COLOURS[edition];
if (!c) {
  console.error(`unknown edition ${edition}`);
  process.exit(1);
}
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'assets', 'icons', edition);
fs.mkdirSync(out, { recursive: true });

const fontData = (file) => `data:font/ttf;base64,${fs.readFileSync(file).toString('base64')}`;
const hebrewFont = path.join(root, 'node_modules/@expo-google-fonts/noto-serif-hebrew/700Bold/NotoSerifHebrew_700Bold.ttf');
const greekFont = process.env.ICON_FONT ?? '/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf';

// The book in its own units: centred on the gutter, pages 800 wide, cover 856.
const LEFT_PAGE = 'M 0,-190 C -90,-230 -230,-240 -400,-200 L -400,230 C -230,190 -90,200 0,250 Z';
const RIGHT_PAGE = 'M 0,-190 C 90,-230 230,-240 400,-200 L 400,230 C 230,190 90,200 0,250 Z';
const LEFT_COVER = 'M 0,-165 C -90,-200 -240,-212 -428,-172 L -428,262 C -240,222 -90,234 0,280 Z';
const RIGHT_COVER = 'M 0,-165 C 90,-200 240,-212 428,-172 L 428,262 C 240,222 90,234 0,280 Z';
const RIBBON = 'M 6,-150 L 46,-150 L 46,330 L 26,305 L 6,330 Z';
// The book runs from -212 (top of the cover) to 330 (tip of the ribbon); this centres it.
const MIDDLE = 59;

// Lines of text that follow the curve of the pages, on both sides of the gutter.
function textLines() {
  let d = '';
  for (let y = 70; y <= 170; y += 46) {
    const t = (y + 190) / 440;
    const left = `M -48,${y} C -110,${y - 34 * (1 - t) - 8 * t} -240,${y - 40 * (1 - t) - 8 * t} -352,${y - 6 * (1 - t) - 32 * t}`;
    d += `<path d="${left}"/><path d="${left.replace(/-(\d+),/g, '$1,')}"/>`;
  }
  return d;
}

const letters = (fill) => `<text x="-205" y="-20" font-size="210" font-family="IconHebrew" fill="${fill}" text-anchor="middle">א</text>
  <text x="205" y="-30" font-size="210" font-family="IconGreek" fill="${fill}" text-anchor="middle">α</text>`;

// The book in colour.
const book = () => `
  <path d="${LEFT_COVER}" fill="${c.ink}"/><path d="${RIGHT_COVER}" fill="${c.ink}"/>
  ${[26, 13].map((d) => `<g transform="translate(0,${d})" fill="${c.edge}"><path d="${LEFT_PAGE}"/><path d="${RIGHT_PAGE}"/></g>`).join('')}
  <path d="${LEFT_PAGE}" fill="${c.page}"/><path d="${RIGHT_PAGE}" fill="${c.page}"/>
  <rect x="-3" y="-195" width="6" height="447" fill="${c.edge}"/>
  ${letters(c.ink)}
  <g fill="none" stroke="${c.line}" stroke-width="13" stroke-linecap="round">${textLines()}</g>
  <path d="${RIBBON}" fill="${c.ribbon}"/>`;

// One colour for Android's themed icons: the pages solid, with the letters, the lines and
// the gutter and ribbon cut out of them.
const monochrome = () => `
  <defs><mask id="cut" maskUnits="userSpaceOnUse" x="-500" y="-300" width="1000" height="700">
    <path d="${LEFT_PAGE}" fill="#fff"/><path d="${RIGHT_PAGE}" fill="#fff"/>
    ${letters('#000')}
    <g fill="none" stroke="#000" stroke-width="15" stroke-linecap="round">${textLines()}</g>
    <rect x="-14" y="-260" width="28" height="560" fill="#000"/>
  </mask></defs>
  <rect x="-500" y="-300" width="1000" height="700" fill="#fff" mask="url(#cut)"/>`;

// art: SVG for the book; scale: its size on a 1024 canvas; background: colour or none.
const svg = (art, scale, background) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}
  <g transform="translate(512,${512 - MIDDLE * scale}) scale(${scale})">${art}</g></svg>`;

const files = {
  'icon.png': svg(book(), 0.92, c.bg),
  // Adaptive icons show the middle 72 of 108 dp and may cut to a 66 dp circle; the book fits inside it.
  'android-icon-foreground.png': svg(book(), 0.62, null),
  'android-icon-background.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${c.bg}"/></svg>`,
  'android-icon-monochrome.png': svg(monochrome(), 0.62, null),
  'splash-icon.png': svg(book(), 0.84, null),
  'splash-icon-dark.png': svg(book(), 0.84, null),
};

const executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
const fonts = `@font-face { font-family: IconHebrew; src: url(${fontData(hebrewFont)}); }
  @font-face { font-family: IconGreek; src: url(${fontData(greekFont)}); }`;
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
console.log(`icons for edition ${edition} written to ${path.relative(root, out)}`);
