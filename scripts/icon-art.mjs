// The artwork shared by the app icons (make-icons.mjs) and the Play feature graphic
// (make-feature-graphic.mjs): an open white book under a lamp's flame ("Thy word is a lamp
// unto my feet", Psalm 119:105), with a warm glow, on brown. The same in all three apps.
// SVG, rendered with Chromium through playwright-core. Chromium comes from
// PLAYWRIGHT_BROWSERS_PATH (or set CHROMIUM_PATH to a chrome binary).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

export const COLOURS = {
  top: '#8A5A2B', bottom: '#4E2F12',
  page: '#FFFFFF', pageShade: '#F3EBDD', edge: '#D9C7A8',
  flame: '#FFD36B', flameCore: '#FFF4D2', glow: '#FFD98A',
};

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const fontData = (file) => `data:font/ttf;base64,${fs.readFileSync(file).toString('base64')}`;

/** @font-face rules for the faces given as { family: file }. */
export function fontFaces(faces = {}) {
  return Object.entries(faces)
    .map(([family, file]) => `@font-face { font-family: ${family}; src: url(${fontData(file)}); }`)
    .join('\n');
}

export function launch() {
  const executablePath = process.env.CHROMIUM_PATH;
  return chromium.launch(executablePath ? { executablePath } : {});
}

// The art in its own units, the fold of the book at x = 0: the flame's tip at -312, the
// book's lower edge at 254. MIDDLE centres it; the book's lower corners (±300, 234), 399
// from the middle, are the points furthest from it.
export const MIDDLE = -29;

// One page of the open book, curving up to the fold; side -1 is the left page.
const pagePath = (side, top, lift) => {
  const x = (v) => side * v;
  return `M 0,${top + 20 + lift} C ${x(72)},${top - 20 + lift} ${x(250)},${top - 30 + lift} ${x(300)},${top + lift} L ${x(300)},${top + 210 + lift} C ${x(250)},${top + 182 + lift} ${x(72)},${top + 190 + lift} 0,${top + 230 + lift} Z`;
};
const BOOK_TOP = 10;
const FLAME = 'M 0,-312 C 48,-232 78,-182 48,-122 C 33,-92 16,-82 0,-80 C -16,-82 -33,-92 -48,-122 C -78,-182 -48,-232 0,-312 Z';
const FLAME_CORE = 'M 0,-222 C 24,-182 36,-152 22,-120 C 15,-104 7,-98 0,-97 C -7,-98 -15,-104 -22,-120 C -36,-152 -24,-182 0,-222 Z';

let ids = 0;
const glowCircle = (r, opacity) => {
  const id = `glow${++ids}`;
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${COLOURS.glow}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${COLOURS.glow}" stop-opacity="0"/></radialGradient></defs>
  <circle cx="0" cy="-130" r="${r}" fill="url(#${id})"/>`;
};

/** The brown background, a vertical shade, filling a w × h box at the origin. */
export const background = (w = 1024, h = 1024) => {
  const id = `bg${++ids}`;
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLOURS.top}"/><stop offset="1" stop-color="${COLOURS.bottom}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#${id})"/>`;
};

/** The glow, the flame and the book. */
export const art = () => `
  ${glowCircle(300, 0.6)}
  <path d="${FLAME}" fill="${COLOURS.flame}"/><path d="${FLAME_CORE}" fill="${COLOURS.flameCore}"/>
  <path d="${pagePath(-1, BOOK_TOP, 14)}" fill="${COLOURS.edge}"/><path d="${pagePath(1, BOOK_TOP, 14)}" fill="${COLOURS.edge}"/>
  <path d="${pagePath(-1, BOOK_TOP, 0)}" fill="${COLOURS.page}"/><path d="${pagePath(1, BOOK_TOP, 0)}" fill="${COLOURS.pageShade}"/>`;

// One colour for Android's themed icons: the flame with its core cut out, and the two
// pages with a gap at the fold.
export const monochrome = () => `
  <defs><mask id="cut" maskUnits="userSpaceOnUse" x="-400" y="-400" width="800" height="760">
    <path d="${FLAME}" fill="#fff"/><path d="${FLAME_CORE}" fill="#000"/>
    <path d="${pagePath(-1, BOOK_TOP, 0)}" fill="#fff"/><path d="${pagePath(1, BOOK_TOP, 0)}" fill="#fff"/>
    <rect x="-7" y="${BOOK_TOP}" width="14" height="250" fill="#000"/>
  </mask></defs>
  <rect x="-400" y="-400" width="800" height="760" fill="#fff" mask="url(#cut)"/>`;
