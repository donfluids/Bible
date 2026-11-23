// The How to use pictures (assets/howto/<language>/<topic>.jpg): each topic's part of the
// app, photographed from the app itself in the web version the screen check builds, with
// where its ring goes measured from the button it is about. Then src/howtoPictures.ts is
// written to name them.
//
//   node scripts/smoke.mjs en ml ta all       (builds smoke-out/web-<app>)
//   node scripts/howto-shots.mjs en:en ml:ml ta:ta all:hi
//
// Each argument is an app and the interface language to photograph it in: English from
// the English app (an English Bible), Malayalam from the Malayalam app, and so on. With no
// arguments it only writes src/howtoPictures.ts again from the pictures there are.
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(join(ROOT, 'node_modules/playwright-core/index.mjs'));
const OUT = join(ROOT, 'assets', 'howto');
const RINGS = join(OUT, 'rings.json');
const WIDTH = 412;
const HEIGHT = 915;
const LANGUAGE_NAME = { en: 'English', ml: 'മലയാളം', ta: 'தமிழ்', hi: 'हिन्दी' };
const QUERY = { en: 'love', ml: 'സ്നേഹം', ta: 'அன்பு', hi: 'प्रेम' };
const PAGE = {
  en: 'Love – John 3:16\nRomans 5:8',
  ml: 'സ്നേഹം – യോഹന്നാൻ 3:16\nറോമർ 5:8',
  ta: 'அன்பு – யோவான் 3:16\nரோமர் 5:8',
  hi: 'प्रेम – यूहन्ना 3:16\nरोमियों 5:8',
};

/** The interface strings, read from src/i18n.ts (as scripts/smoke.mjs reads them). */
function strings(language) {
  const src = readFileSync(join(ROOT, 'src/i18n.ts'), 'utf8');
  const start = src.indexOf(`const ${language}`);
  const end = src.indexOf('\n};', start);
  const table = {};
  for (const m of src.slice(start, end).matchAll(/^ {2}(\w+): (['"])((?:\\.|(?!\2).)*)\2,$/gm)) table[m[1]] = m[3].replace(/\\(.)/g, '$1');
  return table;
}
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    let file = join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

const rings = existsSync(RINGS) ? JSON.parse(readFileSync(RINGS, 'utf8')) : {};
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const arg of process.argv.slice(2)) {
  const [edition, language] = arg.split(':');
  const dir = join(ROOT, 'smoke-out', `web-${edition}`);
  if (!existsSync(dir)) throw new Error(`no ${dir}: run node scripts/smoke.mjs ${edition} first`);
  const server = await serve(dir);
  const en = strings('en');
  const t = strings(language);
  // One and a half pixels a point: sharp at the size shown, and small.
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1.5, hasTouch: true });
  const vis = (l) => l.locator('visible=true').first();
  const wait = (ms) => page.waitForTimeout(ms);
  const out = join(OUT, language);
  mkdirSync(out, { recursive: true });
  rings[language] = rings[language] ?? {};

  /**
   * A picture of the clip, its ring around the targets' boxes (their union), padded. A
   * target is a locator, or { l, row } for the button or row a label is in: the label's
   * nearest container at least `row` points wide, so the ring goes round the whole thing
   * and never across its text; or { box } for a box found otherwise.
   */
  async function boxOf(target) {
    if (target.box) return target.box;
    if (!target.row && !target.withIcon) return vis(target).boundingBox();
    const handle = await vis(target.l).elementHandle();
    return handle.evaluate((e, { min, withIcon }) => {
      // `withIcon`: a menu row's label, already full width; its row starts further left,
      // at the icon before it.
      const left = e.getBoundingClientRect().left;
      let el = e;
      while (el.parentElement && (withIcon ? el.getBoundingClientRect().left > left - 16 : el.getBoundingClientRect().width < min)) el = el.parentElement;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }, { min: target.row ?? 0, withIcon: !!target.withIcon });
  }
  async function picture(n, clip, ...targets) {
    await wait(700);
    let box = null;
    for (const target of targets) {
      const b = await boxOf(target);
      if (!b) continue;
      box = box ? { x1: Math.min(box.x1, b.x), y1: Math.min(box.y1, b.y), x2: Math.max(box.x2, b.x + b.width), y2: Math.max(box.y2, b.y + b.height) } : { x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y + b.height };
    }
    // No typing focus: the browser outlines a focused box, which a phone does not.
    await page.evaluate(() => document.activeElement?.blur?.());
    await wait(200);
    await page.screenshot({ path: join(out, `${n}.jpg`), type: 'jpeg', quality: 82, clip });
    if (box) {
      const pad = 6;
      const left = Math.max(0, box.x1 - pad - clip.x);
      const top = Math.max(0, box.y1 - pad - clip.y);
      const right = Math.min(clip.width, box.x2 + pad - clip.x);
      const bottom = Math.min(clip.height, box.y2 + pad - clip.y);
      const r = (v) => Math.round(v * 1000) / 1000;
      rings[language][n] = { left: r(left / clip.width), top: r(top / clip.height), width: r((right - left) / clip.width), height: r((bottom - top) / clip.height) };
    } else delete rings[language][n];
    console.log(`${language} ${n}${box ? '' : ' (no ring)'}`);
  }
  const top = (height) => ({ x: 0, y: 0, width: WIDTH, height });
  const bottom = (height) => ({ x: 0, y: HEIGHT - height, width: WIDTH, height });
  const menu = async (verse) => {
    await vis(page.getByRole('button', { name: t.verseActions.replace('{n}', String(verse)) })).click();
    await wait(1200);
  };
  const closeSheet = async () => {
    await page.getByLabel(t.close).locator('visible=true').last().click();
    await wait(800);
  };
  const back = async () => {
    await vis(page.getByLabel(t.back)).click();
    await wait(1200);
  };
  const tab = async (key) => {
    await vis(page.getByRole('tab', { name: t[key] })).click();
    await wait(1500);
  };

  // A new install, in English: the language chooser (four-language app), the welcome and
  // the hints; then the interface language in Settings.
  await page.goto(`http://localhost:${server.address().port}/`);
  await page.waitForFunction(() => document.body.innerText.length > 200, null, { timeout: 120000 });
  await wait(1500);
  if (await page.getByText('Choose your language', { exact: true }).count()) {
    await vis(page.getByRole('button', { name: /^English,/ })).click();
    await wait(2500);
  }
  const skip = page.getByText(en.welcomeSkip, { exact: true });
  if (await skip.locator('visible=true').count()) {
    await vis(skip).click();
    await wait(2500);
  }
  for (let i = 0; i < 3; i++) {
    const tip = page.getByRole('button', { name: en.gotIt, exact: true }).locator('visible=true');
    if (await tip.count()) await tip.last().click();
    await wait(500);
  }
  if (language !== 'en') {
    await vis(page.getByLabel(en.settings)).click();
    await wait(1500);
    await vis(page.getByRole('radio', { name: LANGUAGE_NAME[language] })).click();
    await wait(1200);
    await back();
  }
  // The four-language app reads its Indian Bible for the interface language.
  if (edition === 'all' && language !== 'en') {
    await vis(page.getByRole('button', { name: new RegExp(`^${escape(t.chooseBible)}:`) })).click();
    await wait(800);
    await vis(page.getByText({ ml: /^സത്യവേദപുസ്തകം/, ta: /^இண்டியன்/, hi: /^इंडियन रिवाइज्ड वर्जन/ }[language])).click();
    await wait(2000);
  }

  // 1 Reading a chapter: the reader, the book name ringed. 2 Switching Bibles: the Bible's
  // name. 12 Study tools: About this book.
  await vis(page.getByRole('button', { name: t.verseActions.replace('{n}', '1') })).waitFor({ timeout: 15000 });
  const title = page.getByRole('button', { name: new RegExp(escape(t.choosePassage).replace('\\{title\\}', '.*')) });
  await picture(1, top(380), title);
  await picture(2, top(380), page.getByRole('button', { name: new RegExp(`^${escape(t.chooseBible)}:`) }));
  await picture(12, top(380), page.getByTestId('about-book'));

  // 3 A verse's menu: its four buttons. 11 Listening: Read from here. 13 Picture cards:
  // Share as card. All from verse 2's menu.
  await menu(2);
  await picture(3, bottom(560), { l: page.getByText(t.actCopy, { exact: true }), row: 300 });
  await picture(11, bottom(480), { l: page.getByText(t.readFromHere, { exact: true }), withIcon: true });
  await picture(13, bottom(560), { l: page.getByText(t.shareAsCard, { exact: true }), withIcon: true });
  // A bookmark and a highlight for Saved: verse 2 bookmarked here, verse 3 highlighted.
  await vis(page.getByText(t.actBookmark, { exact: true })).click();
  await wait(1200);
  await menu(3);
  await vis(page.getByLabel(new RegExp(escape(t.colourYellow), 'i'))).click();
  await wait(1200);

  // 5 Highlighting part of a verse: the marking bar.
  await menu(1);
  await vis(page.getByText(t.markText, { exact: true })).click();
  await wait(1500);
  await picture(5, bottom(330), { l: page.getByRole('button', { name: t.markDone }), row: 300 });
  await vis(page.getByRole('button', { name: t.markDone })).click();
  await wait(1200);

  // 4 Words: a word's sheet, its card for this verse ringed.
  await vis(page.locator('[role="link"]:not([data-testid="about-book"])')).click();
  await wait(2500);
  const card = page.getByText(t.inThisVerse, { exact: true });
  const cardBox = await vis(card).boundingBox();
  await picture(4, { x: 0, y: Math.max(0, cardBox.y - 110), width: WIDTH, height: 460 }, card.locator('xpath=..'));
  await closeSheet();

  // 7 Search: a word's results, the search box ringed.
  await vis(page.getByLabel(t.search)).click();
  await wait(1200);
  await page.keyboard.type(QUERY[language]);
  await wait(4000);
  await picture(7, top(440), { l: page.getByRole('textbox'), row: 300 });
  await back();

  // 6 Saved: the list, its buttons ringed.
  await tab('saved');
  await picture(6, top(440), { l: page.getByText(t.bookmarks).first(), row: 300 });

  // 8 Notebook: a typed page with its verses, the first reference ringed.
  await tab('notebook');
  await vis(page.getByText(t.newPage, { exact: true })).click();
  await wait(800);
  await vis(page.getByText(t.pageTyped, { exact: true })).click();
  await wait(1200);
  await vis(page.locator('textarea')).fill(PAGE[language]);
  await wait(600);
  await vis(page.locator(`[aria-label="${t.donePage}"]`)).click();
  await wait(2500);
  // The first verse box under its reference (the quotes have a 3-point line at their left).
  const quote = await page.evaluate(() => {
    const e = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).borderLeftWidth === '3px' && d.getBoundingClientRect().width > 200);
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  await picture(8, top(520), { box: quote });
  await back();

  // 9 Handwritten pages: a few strokes, the tools ringed.
  await vis(page.getByLabel(t.newPage)).click();
  await wait(800);
  await vis(page.getByText(t.pageHandLined, { exact: true })).click();
  await wait(2000);
  const tip = page.getByRole('button', { name: t.gotIt, exact: true }).locator('visible=true');
  if (await tip.count()) await tip.last().click();
  const svg = await page.evaluate(() => {
    const s = [...document.querySelectorAll('svg')].sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0].getBoundingClientRect();
    return { x: s.x, y: s.y, w: s.width };
  });
  for (const [y, wave] of [[340, 24], [420, 0], [500, 30]]) {
    await page.mouse.move(svg.x + svg.w * 0.15, y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(svg.x + svg.w * (0.15 + i * 0.055), y + (i % 2) * wave, { steps: 3 });
    await page.mouse.up();
  }
  await wait(800);
  await picture(9, bottom(560), page.getByLabel(t.eraser));
  // The ring takes in the whole tool bar: from its pen to its eraser.
  const tools = await page.evaluate((eraser) => {
    const e = [...document.querySelectorAll(`[aria-label="${eraser}"]`)].find((x) => x.getBoundingClientRect().width > 0);
    let bar = e;
    while (bar && bar.getBoundingClientRect().width < 150) bar = bar.parentElement;
    const r = (bar ?? e).getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, t.eraser);
  const clip9 = bottom(560);
  const r = (v) => Math.round(v * 1000) / 1000;
  rings[language][9] = { left: r((tools.x - 6) / WIDTH), top: r((tools.y - 6 - clip9.y) / clip9.height), width: r((tools.width + 12) / WIDTH), height: r((tools.height + 12) / clip9.height) };
  await back();

  // 10 Backing up: the sheet, Save a backup ringed.
  await vis(page.getByLabel(t.backupRestore)).click();
  await wait(1200);
  await picture(10, bottom(440), { l: page.getByText(t.saveBackup, { exact: true }), withIcon: true });
  await closeSheet();

  await page.close();
  server.close();
}
await browser.close();
writeFileSync(RINGS, JSON.stringify(rings, null, 1) + '\n');

// src/howtoPictures.ts: a require for every picture there is, and the rings.
const languages = readdirSync(OUT).filter((d) => statSync(join(OUT, d)).isDirectory()).sort();
const lines = [
  '// Written by scripts/howto-shots.mjs: the How to use pictures and where each one\'s ring',
  '// goes, per interface language. An app carries the pictures of its own languages only',
  '// (metro.config.js puts a blank in place of the others).',
  "import type { ImageSourcePropType } from 'react-native';",
  "import RINGS from '../assets/howto/rings.json';",
  '',
  'export type Ring = { left: number; top: number; width: number; height: number };',
  '// Each picture\'s width over its height (the browser version cannot measure an image).',
  'export const HOWTO_SHAPES: Partial<Record<string, Partial<Record<number, number>>>> = {',
];
// A JPEG's size, from its first frame header.
const jpegShape = (file) => {
  const b = readFileSync(file);
  for (let i = 2; i < b.length; ) {
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return b.readUInt16BE(i + 7) / b.readUInt16BE(i + 5);
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`no size in ${file}`);
};
const numbered = (language) => readdirSync(join(OUT, language)).filter((f) => /^\d+\.jpg$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
for (const language of languages) {
  lines.push(`  ${language}: {`);
  for (const f of numbered(language)) lines.push(`    ${parseInt(f)}: ${jpegShape(join(OUT, language, f)).toFixed(4)},`);
  lines.push('  },');
}
lines.push(
  '};',
  'export const HOWTO_PICTURES: Partial<Record<string, Partial<Record<number, ImageSourcePropType>>>> = {',
);
for (const language of languages) {
  lines.push(`  ${language}: {`);
  for (const f of numbered(language)) lines.push(`    ${parseInt(f)}: require('../assets/howto/${language}/${f}'),`);
  lines.push('  },');
}
lines.push('};', 'export const HOWTO_RINGS: Partial<Record<string, Partial<Record<number, Ring>>>> = RINGS;', '');
writeFileSync(join(ROOT, 'src', 'howtoPictures.ts'), lines.join('\n'));
console.log('wrote src/howtoPictures.ts');
