// The book artwork shared by the app icons (make-icons.mjs) and the Play feature graphic
// (make-feature-graphic.mjs): an open book with the Hebrew aleph and the Greek alpha at the
// head of its pages, lines of text below them, a red ribbon down the middle, and a gold
// dove, the Holy Spirit, coming down onto the pages. SVG,
// rendered with Chromium through playwright-core. Chromium comes from
// PLAYWRIGHT_BROWSERS_PATH (or set CHROMIUM_PATH to a chrome binary). The aleph is set in
// Noto Serif Hebrew from node_modules; the alpha in FreeSerif Bold (ICON_FONT overrides it).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

export const COLOURS = {
  en: { bg: '#F4EFE4', ink: '#5A3A14', page: '#FFFBF2', edge: '#E8DCC4', line: '#CDBFA4', ribbon: '#A4302F' },
  ml: { bg: '#EEF3E6', ink: '#1F4D2E', page: '#FBF7EA', edge: '#E4DCC4', line: '#B9C3AE', ribbon: '#A4302F' },
};

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const fontData = (file) => `data:font/ttf;base64,${fs.readFileSync(file).toString('base64')}`;

/** @font-face rules for the letters, plus any other faces given as { family: file }. */
export function fontFaces(more = {}) {
  const faces = {
    IconHebrew: path.join(ROOT, 'node_modules/@expo-google-fonts/noto-serif-hebrew/700Bold/NotoSerifHebrew_700Bold.ttf'),
    IconGreek: process.env.ICON_FONT ?? '/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf',
    ...more,
  };
  return Object.entries(faces)
    .map(([family, file]) => `@font-face { font-family: ${family}; src: url(${fontData(file)}); }`)
    .join('\n');
}

export function launch() {
  const executablePath = process.env.CHROMIUM_PATH;
  return chromium.launch(executablePath ? { executablePath } : {});
}

// The book in its own units: centred on the gutter, pages 800 wide, cover 856.
const LEFT_PAGE = 'M 0,-190 C -90,-230 -230,-240 -400,-200 L -400,230 C -230,190 -90,200 0,250 Z';
const RIGHT_PAGE = 'M 0,-190 C 90,-230 230,-240 400,-200 L 400,230 C 230,190 90,200 0,250 Z';
const LEFT_COVER = 'M 0,-165 C -90,-200 -240,-212 -428,-172 L -428,262 C -240,222 -90,234 0,280 Z';
const RIGHT_COVER = 'M 0,-165 C 90,-200 240,-212 428,-172 L 428,262 C 240,222 90,234 0,280 Z';
const RIBBON = 'M 6,-150 L 46,-150 L 46,330 L 26,305 L 6,330 Z';
const GOLD = '#C9A24A';
// A dove in flight seen from the side, facing left, wing raised, tilted down as it descends,
// placed over the top of the gutter.
const DOVE_BODY = 'M -168,16 L -136,4 C -130,-30 -90,-42 -62,-22 C -30,-2 24,2 76,-8 L 150,-30 C 172,-24 182,-2 176,14 C 172,26 160,32 146,32 L 76,36 C 26,72 -60,66 -102,40 C -116,30 -128,22 -134,20 Z';
const DOVE_WING = 'M -42,-16 C -54,-84 -14,-156 72,-198 C 94,-186 98,-162 86,-146 C 108,-144 120,-128 110,-110 C 130,-106 138,-90 128,-74 C 124,-50 108,-26 58,-10 Z';
const DOVE_PLACE = 'translate(10,-250) scale(0.72) rotate(-22)';
// The artwork runs from -402 (the dove's wing tip) to 330 (tip of the ribbon); this centres it.
export const MIDDLE = -36;

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

/** The book in colour; c is one of COLOURS, with an optional `cover` colour (default its ink). */
export const book = (c) => `
  <path d="${LEFT_COVER}" fill="${c.cover ?? c.ink}"/><path d="${RIGHT_COVER}" fill="${c.cover ?? c.ink}"/>
  ${[26, 13].map((d) => `<g transform="translate(0,${d})" fill="${c.edge}"><path d="${LEFT_PAGE}"/><path d="${RIGHT_PAGE}"/></g>`).join('')}
  <path d="${LEFT_PAGE}" fill="${c.page}"/><path d="${RIGHT_PAGE}" fill="${c.page}"/>
  <rect x="-3" y="-195" width="6" height="447" fill="${c.edge}"/>
  ${letters(c.ink)}
  <g fill="none" stroke="${c.line}" stroke-width="13" stroke-linecap="round">${textLines()}</g>
  <path d="${RIBBON}" fill="${c.ribbon}"/>
  <g transform="${DOVE_PLACE}"><path d="${DOVE_BODY}" fill="${GOLD}"/><path d="${DOVE_WING}" fill="${GOLD}"/><circle cx="-108" cy="-12" r="7" fill="${c.page}"/></g>`;

// One colour for Android's themed icons: the pages solid, with the letters, the lines and
// the gutter and ribbon cut out of them, and the dove solid with a gap around it.
export const monochrome = () => `
  <defs><mask id="cut" maskUnits="userSpaceOnUse" x="-500" y="-460" width="1000" height="860">
    <path d="${LEFT_PAGE}" fill="#fff"/><path d="${RIGHT_PAGE}" fill="#fff"/>
    ${letters('#000')}
    <g fill="none" stroke="#000" stroke-width="15" stroke-linecap="round">${textLines()}</g>
    <rect x="-14" y="-260" width="28" height="560" fill="#000"/>
    <g transform="${DOVE_PLACE}">
      <g fill="#000" stroke="#000" stroke-width="26" stroke-linejoin="round"><path d="${DOVE_BODY}"/><path d="${DOVE_WING}"/></g>
      <g fill="#fff"><path d="${DOVE_BODY}"/><path d="${DOVE_WING}"/></g>
      <circle cx="-108" cy="-12" r="8" fill="#000"/>
    </g>
  </mask></defs>
  <rect x="-500" y="-460" width="1000" height="860" fill="#fff" mask="url(#cut)"/>`;
