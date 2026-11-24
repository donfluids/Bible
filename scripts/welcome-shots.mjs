// The welcome's pictures (assets/welcome/<app>-<language>/<page>.jpg): each page's part of
// the app, photographed from the web version the screen check builds, then framed as the
// welcome shows it (a card of one or two slices) with its ring measured from the button
// or row it is about. Then src/welcomePictures.ts is written to name them.
//
//   node scripts/smoke.mjs en ml ta all       (builds smoke-out/web-<app>)
//   node scripts/welcome-shots.mjs            (every set) or e.g. ml:ml all:hi
//
// A set is an app and its interface language: the pictures show that app's Bible with
// its menus in that language. The four-language app in English uses the English app's.
// The first page is drawn by the app itself (src/screens/WelcomeScreen.tsx), not a picture.
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(join(ROOT, 'node_modules/playwright-core/index.mjs'));
const OUT = join(ROOT, 'assets', 'welcome');
const WORK = join(ROOT, 'smoke-out', 'welcome');
const SETS = ['en:en', 'ml:en', 'ml:ml', 'ta:en', 'ta:ta', 'all:ml', 'all:ta', 'all:hi'];
// The phone photographed: narrower than most, so its words are larger in the picture.
const WIDTH = 340;
const HEIGHT = 740;
// The card's width in the picture's points, and the pixels a point in the pictures.
const CARD = 290;
const SCALE = (WIDTH * 2) / CARD;
const LANGUAGE_NAME = { en: 'English', ml: 'മലയാളം', ta: 'தமிழ்', hi: 'हिन्दी' };
// Per Bible: verse 4's words marked from and to (the "from" word's second time), the
// notebook page typed (a heading, then a verse under each reference).
const BIBLE = {
  KJV: { word: 'beginning', from: 'life', to: 'men', page: 'The Word – John 1:1\nGenesis 1:1' },
  MAL: { from: 'ജീവൻ', to: 'വെളിച്ചമായിരുന്നു', page: 'വചനം – യോഹന്നാൻ 1:1\nഉല്പത്തി 1:1' },
  TAM: { from: 'ஜீவன்', to: 'ஒளியாக', page: 'வார்த்தை – யோவான் 1:1\nஆதியாகமம் 1:1' },
  HIN: { from: 'जीवन', to: 'ज्योति', page: 'वचन – यूहन्ना 1:1\nउत्पत्ति 1:1' },
};
const INDIAN = { ml: 'MAL', ta: 'TAM', hi: 'HIN' };
// The pictured pages, in order (cards() below frames each).
const NAMES = ['word', 'original', 'study', 'saved', 'notebook', 'share'];
// The handwriting's pen strokes: a single-stroke script typeface (Hershey Script, MIT; its
// letters and licence in scripts/data/hershey-script.json), so the page is written as a
// hand would write it.

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

/** Pen strokes for a line of script: [x, y] points per stroke, from x on the baseline. */
const glyphs = {};
for (const [ch, { adv, d }] of Object.entries(JSON.parse(readFileSync(join(ROOT, 'scripts', 'data', 'hershey-script.json'), 'utf8')).glyphs)) {
  const parts = d.split('M').filter((x) => x.trim()).map((seg) => seg.trim().split(/\s*L\s*/).map((pt) => pt.trim().split(/\s+/).map(Number)));
  glyphs[ch] = { adv, parts };
}
function script(strokes, text, x, base, size) {
  for (const ch of text) {
    const g = glyphs[ch] ?? glyphs[' '];
    for (const part of g.parts) strokes.push(part.map(([gx, gy]) => [x + gx * size, base - gy * size]));
    x += g.adv * size;
  }
  return x;
}
/** The handwritten note: in English words, or (other languages) references and arrows only. */
function note(english) {
  const strokes = [];
  const end = script(strokes, english ? 'In the beginning' : '1 : 1', 52, 168, 0.036);
  strokes.push(Array.from({ length: 24 }, (_, k) => [50 + k * ((end - 50) / 23), 176 + 1.5 * Math.sin(k / 1.7)]));
  strokes.push([[44, 184], [44, 205], [56, 205]]);
  strokes.push([[51, 200], [57, 205], [51, 210]]);
  if (english) {
    script(strokes, 'compare Genesis 1:1', 64, 210, 0.027);
    script(strokes, 'see also verse 14', 64, 252, 0.027);
  } else {
    // 1:1, then 1:14 (underlined twice) and 1:18 below it.
    const end14 = script(strokes, '1 : 14', 64, 212, 0.03);
    for (const dy of [6, 10]) strokes.push(Array.from({ length: 12 }, (_, k) => [62 + k * ((end14 - 60) / 11), 212 + dy + Math.sin(k) * 0.8]));
    script(strokes, '1 : 18', 64, 254, 0.03);
  }
  return strokes;
}

/** Photograph one set's pages; returns the boxes (in screenshot pixels) the framing needs. */
async function photograph(browser, edition, language, dir) {
  const server = await serve(join(ROOT, 'smoke-out', `web-${edition}`));
  const en = strings('en');
  const t = strings(language);
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2, hasTouch: true });
  const vis = (l) => l.locator('visible=true').first();
  const wait = (ms) => page.waitForTimeout(ms);
  const marks = {};
  const px = (b) => b && { x: b.x * 2, y: b.y * 2, w: b.width * 2, h: b.height * 2 };
  const shot = async (name) => {
    await page.evaluate(() => document.activeElement?.blur?.());
    await wait(300);
    await page.screenshot({ path: join(dir, `${name}.png`) });
  };
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
  const gotIt = async () => {
    const tip = page.getByRole('button', { name: t.gotIt, exact: true }).locator('visible=true');
    if (await tip.count()) await tip.last().click();
    await wait(500);
  };
  // A row a label is in: up to the full-width row (or, `withIcon`, to the icon before it).
  const rowOf = async (loc, withIcon) =>
    (await vis(loc).elementHandle()).evaluate((e, withIcon) => {
      const left = e.getBoundingClientRect().left;
      let el = e;
      while (el.parentElement && (withIcon ? el.getBoundingClientRect().left > left - 16 : el.getBoundingClientRect().width < 300)) el = el.parentElement;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }, withIcon);
  // The dimming behind a sheet is left out of the pictures: the reader and the sheet both read clearly.
  const undim = () =>
    page.evaluate(() => {
      for (const e of document.querySelectorAll('div')) {
        const r = e.getBoundingClientRect();
        const m = getComputedStyle(e).backgroundColor.match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/);
        if (m && +m[4] > 0.05 && +m[4] < 0.9 && r.width >= innerWidth - 1 && r.height >= innerHeight * 0.9) e.style.backgroundColor = 'transparent';
      }
    });
  const wordBoxes = (w) =>
    page.evaluate((w) => {
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        let k = -1;
        while ((k = n.data.indexOf(w, k + 1)) >= 0) {
          const r = document.createRange();
          r.setStart(n, k);
          r.setEnd(n, k + w.length);
          const b = r.getBoundingClientRect();
          if (b.width && b.top > 60 && b.bottom < innerHeight - 120) out.push({ x: b.x, y: b.y, width: b.width, height: b.height });
        }
      }
      return out.sort((a, b) => a.y - b.y || a.x - b.x);
    }, w);
  const chooseBible = async (row) => {
    await vis(page.getByRole('button', { name: new RegExp(`^${escape(t.chooseBible)}:`) })).click();
    await wait(800);
    await vis(row).click();
    await wait(2000);
    await page.mouse.move(WIDTH / 2, HEIGHT / 2);
    await page.mouse.wheel(0, -3000);
    await wait(800);
    await gotIt();
  };
  const interlinear = async () => {
    await vis(page.getByLabel(t.settings)).click();
    await wait(1500);
    await vis(page.getByRole('switch', { name: t.showInterlinear })).click();
    await wait(800);
    await back();
    await wait(3000);
  };

  // A new install, in English; then the interface language, and in the four-language app
  // that language's Bible.
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
  const indianRow = page.getByText({ ml: /^സത്യവേദപുസ്തകം/, ta: /^இண்டியன்/, hi: /^इंडियन रिवाइज्ड वर्जन/ }[language] ?? /^$/);
  if (edition === 'all' && language !== 'en') await chooseBible(indianRow);
  const bible = edition === 'en' ? 'KJV' : edition === 'all' ? INDIAN[language] : INDIAN[edition];
  // The Hindi's words are not linked yet: its word pages are of the KJV.
  const kjvWords = bible === 'HIN';
  if (kjvWords) await chooseBible(page.getByRole('button', { name: /KJV$/ }));
  await wait(1000);

  // 2 A word of verse 1, its card for this verse.
  const wordLink = BIBLE[kjvWords ? 'KJV' : bible].word;
  await vis(wordLink ? page.getByRole('link', { name: wordLink }) : page.locator('[role="link"]:not([data-testid="about-book"])')).click();
  await wait(2500);
  await undim();
  marks.card = px(await vis(page.getByText(t.inThisVerse, { exact: true }).locator('xpath=..')).boundingBox());
  await shot('word');
  await closeSheet();

  // 3 The Hebrew or Greek under verse 1, its first word.
  await interlinear();
  marks.first = px(
    await page.evaluate(() => {
      const e = [...document.querySelectorAll('div')].find((d) => d.textContent === 'Ἐν' && d.children.length === 0);
      let c = e;
      while (c.parentElement && c.parentElement.getBoundingClientRect().width < 120) c = c.parentElement;
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
  // The rows of words under verse 1 (each word's column top), to cut the picture between two.
  marks.rows = await page.evaluate(() => {
    const tops = new Set();
    for (const d of document.querySelectorAll('div')) {
      if (d.children.length === 0 && /^[Ͱ-Ͽἀ-῿֐-׿][^\s]*$/.test(d.textContent) && d.getBoundingClientRect().height) tops.add(Math.round(d.getBoundingClientRect().top * 2));
    }
    return [...tops].sort((a, b) => a - b);
  });
  marks.verse2 = px(await vis(page.getByRole('button', { name: t.verseActions.replace('{n}', '2') })).boundingBox());
  await shot('original');
  await interlinear();
  if (kjvWords) await chooseBible(indianRow);

  // 4 Study this verse, opened; 7 its menu's Read from here.
  await menu(1);
  marks.share = px(await rowOf(page.getByText(t.shareAsCard, { exact: true }), true));
  marks.read = px(await rowOf(page.getByText(t.readFromHere, { exact: true }), true));
  await undim();
  await shot('menu');
  await vis(page.getByText(t.studyVerse, { exact: true })).click();
  await wait(1200);
  await page.mouse.move(WIDTH / 2, HEIGHT - 100);
  await page.mouse.wheel(0, 800);
  await wait(1000);
  await undim();
  marks.about = px(await vis(page.getByTestId('about-book')).boundingBox());
  marks.sheetHead = px(await vis(page.getByLabel(t.close).locator('visible=true').last()).boundingBox());
  marks.study = px(await rowOf(page.getByText(t.studyVerse, { exact: true }), true));
  const c1 = await rowOf(page.getByText(t.compare, { exact: true }), true);
  const c2 = await rowOf(page.getByText(new RegExp(`^${escape(t.crossReferences)}`)), true);
  marks.tools = px({ x: c1.x, y: c1.y, width: c1.width, height: c2.y + c2.height - c1.y });
  await shot('study');
  await closeSheet();

  // 5 Verse 1 highlighted, verse 2 bookmarked, verse 3 with a note, part of verse 4 marked.
  await menu(1);
  await vis(page.getByLabel(new RegExp(escape(t.colourYellow), 'i'))).click();
  await wait(1200);
  await menu(2);
  await vis(page.getByText(t.actBookmark, { exact: true })).click();
  await wait(1200);
  await menu(3);
  await vis(page.getByText(t.actNote, { exact: true })).click();
  await wait(1500);
  await vis(page.locator('textarea')).fill('Colossians 1:16');
  await wait(500);
  await vis(page.getByRole('button', { name: t.save, exact: true })).click();
  await wait(1500);
  await menu(4);
  await vis(page.getByText(t.markText, { exact: true })).click();
  await wait(2000);
  const froms = await wordBoxes(BIBLE[bible].from);
  const a = froms[1] ?? froms[0];
  const b = (await wordBoxes(BIBLE[bible].to)).find((w) => w.y > a.y + 5 || (w.y >= a.y - 2 && w.x > a.x));
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await wait(700);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
  await page.mouse.up();
  await wait(800);
  await vis(page.getByRole('button', { name: t.markDone })).click();
  await wait(1500);
  await page.mouse.move(WIDTH / 2, 300);
  await page.mouse.wheel(0, -3000);
  await wait(1200);
  marks.verse4 = px(await vis(page.getByRole('button', { name: t.verseActions.replace('{n}', '4') })).boundingBox());
  marks.verse5 = px(await vis(page.getByRole('button', { name: t.verseActions.replace('{n}', '5') })).boundingBox());
  await shot('saved');

  // 7 A picture card.
  await menu(3);
  await vis(page.getByText(t.shareAsCard, { exact: true })).click();
  await wait(2500);
  marks.cardImage = px(
    await page.evaluate(() => {
      const e = [...document.querySelectorAll('div')]
        .filter((d) => {
          const r = d.getBoundingClientRect();
          return r.width > 200 && r.width < 320 && Math.abs(r.width - r.height) < 4 && r.top > 40;
        })
        .sort((p, q) => q.getBoundingClientRect().width - p.getBoundingClientRect().width)[0];
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
  await shot('card');
  await back();

  // 6 The Notebook: a typed page quoting two verses, and a handwritten page.
  await vis(page.getByRole('tab', { name: t.notebook })).click();
  await wait(1500);
  await vis(page.getByText(t.newPage, { exact: true })).click();
  await wait(800);
  await vis(page.getByText(t.pageTyped, { exact: true })).click();
  await wait(1200);
  await vis(page.locator('textarea')).fill(BIBLE[bible].page);
  await wait(600);
  await vis(page.locator(`[aria-label="${t.donePage}"]`)).click();
  await wait(2500);
  marks.quote = px(
    await page.evaluate(() => {
      const e = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).borderLeftWidth === '3px' && d.getBoundingClientRect().width > 200);
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
  );
  await shot('typed');
  await back();
  await vis(page.getByLabel(t.newPage)).click();
  await wait(800);
  await vis(page.getByText(t.pageHandLined, { exact: true })).click();
  await wait(2000);
  await gotIt();
  for (const line of note(language === 'en')) {
    await page.mouse.move(line[0][0], line[0][1]);
    await page.mouse.down();
    for (const [x, y] of line.slice(1)) await page.mouse.move(x, y, { steps: 4 });
    await page.mouse.up();
  }
  await wait(800);
  marks.ink = { y: 250, h: 310 };
  await shot('ink');
  await page.close();
  server.close();
  return marks;
}

/**
 * Each page's card: slices of the photographs, one above another, and where its ring goes
 * ({ y0, y1, ring } in screenshot pixels). The ring is kept to the card's inside edge.
 */
function cards(M) {
  const inside = (b, p = 8) => ({ x: Math.max(14, b.x - p), y: b.y - p, w: Math.min(666, b.x + b.w + p) - Math.max(14, b.x - p), h: b.h + 2 * p });
  const tall = CARD * SCALE * 1.5; // the tallest a card may be (1.5 times its width)
  // The Hebrew or Greek: cut between two rows of words, before verse 2.
  const rowEnd = M.rows.filter((y) => y < Math.min(M.verse2.y, tall)).slice(-1)[0] - 14;
  const sheetTop = M.sheetHead.y - 60;
  return {
    word: [['word', 0, Math.min(tall, M.card.y + M.card.h + 165), inside(M.card, 6)]],
    original: [['original', 0, Math.min(M.verse2.y - 24, rowEnd), inside(M.first)]],
    study: [
      ['study', M.about.y - 24, sheetTop],
      'gap',
      ['study', M.sheetHead.y - 24, M.sheetHead.y + M.sheetHead.h + 8],
      ['study', M.study.y, M.tools.y + M.tools.h + 16, { x: 24, y: M.tools.y - 4, w: 632, h: M.tools.h + 8 }],
    ],
    saved: [['saved', Math.max(0, M.verse5.y - 24 - tall), M.verse5.y - 24, { x: 20, y: M.verse4.y - 16, w: 640, h: M.verse5.y - 30 - (M.verse4.y - 16) }]],
    notebook: [['typed', M.quote.y - 84, M.quote.y + M.quote.h + 20, inside(M.quote, 6)], 'gap', ['ink', M.ink.y, M.ink.y + M.ink.h]],
    share: [['card', M.cardImage.y - 16, M.cardImage.y + M.cardImage.h + 16], 'gap', ['menu', M.share.y, M.read.y + M.read.h + 8, { x: 24, y: M.read.y + 4, w: 632, h: M.read.h - 8 }]],
  };
}

/** Frame a set's cards as JPEGs, at the photographs' own sharpness; returns each card's shape and ring. */
async function frame(browser, dir, out, marks) {
  const page = await browser.newPage({ viewport: { width: CARD, height: 2000 }, deviceScaleFactor: SCALE });
  const result = {};
  const GAP = 10;
  for (const [name, parts] of Object.entries(cards(marks))) {
    let y = 0;
    let ring = null;
    let html = '';
    for (const part of parts) {
      if (part === 'gap') {
        html += `<div style="height:${GAP}px;background:linear-gradient(#EEDFC8,#F3E8D6)"></div>`;
        y += GAP;
        continue;
      }
      const [src, y0, y1, r] = part;
      const h = (y1 - y0) / SCALE;
      html += `<div style="height:${h}px;background:url(${src}.png) 0 ${-y0 / SCALE}px / ${CARD}px auto no-repeat"></div>`;
      if (r) ring = { left: r.x / SCALE, top: y + (r.y - y0) / SCALE, width: r.w / SCALE, height: r.h / SCALE };
      y += h;
    }
    // From a file beside the photographs, so the page may show them.
    const file = join(dir, `${name}.html`);
    writeFileSync(file, `<!doctype html><body style="margin:0;background:#FAF7F1"><div style="width:${CARD}px">${html}</div></body>`);
    await page.goto(`file://${file}`);
    await page.waitForTimeout(400);
    const height = Math.round(y);
    await page.screenshot({ path: join(out, `${name}.jpg`), type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: CARD, height } });
    const f = (v) => Math.round(v * 1000) / 1000;
    result[name] = { shape: f(CARD / height), ring: ring && { left: f(ring.left / CARD), top: f(ring.top / height), width: f(ring.width / CARD), height: f(ring.height / height) } };
  }
  await page.close();
  return result;
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const SHAPES = join(OUT, 'pictures.json');
const shapes = existsSync(SHAPES) ? JSON.parse(readFileSync(SHAPES, 'utf8')) : {};
for (const arg of process.argv.length > 2 ? process.argv.slice(2) : SETS) {
  const [edition, language] = arg.split(':');
  if (!existsSync(join(ROOT, 'smoke-out', `web-${edition}`))) throw new Error(`no smoke-out/web-${edition}: run node scripts/smoke.mjs ${edition} first`);
  const set = `${edition}-${language}`;
  const dir = join(WORK, set);
  const out = join(OUT, set);
  mkdirSync(dir, { recursive: true });
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const marks = await photograph(browser, edition, language, dir);
  shapes[set] = await frame(browser, dir, out, marks);
  console.log(`${set}: ${Object.keys(shapes[set]).length} pictures`);
}
await browser.close();
writeFileSync(SHAPES, JSON.stringify(shapes, null, 1) + '\n');

// src/welcomePictures.ts: a require for every picture there is, with its shape and ring.
const sets = readdirSync(OUT).filter((d) => statSync(join(OUT, d)).isDirectory() && shapes[d]).sort();
const lines = [
  '// Written by scripts/welcome-shots.mjs: the welcome\'s pictures and where each one\'s ring',
  '// goes, per app and interface language. An app carries its own sets only (metro.config.js',
  '// puts a blank in place of the others).',
  "import type { ImageSourcePropType } from 'react-native';",
  "import SHAPES from '../assets/welcome/pictures.json';",
  '',
  `export type WelcomePictureName = ${NAMES.map((n) => `'${n}'`).join(' | ')};`,
  'export type WelcomeRing = { left: number; top: number; width: number; height: number };',
  '/** Each picture\'s width over its height, and its ring. */',
  'export const WELCOME_SHAPES: Partial<Record<string, Partial<Record<WelcomePictureName, { shape: number; ring: WelcomeRing | null }>>>> = SHAPES;',
  'export const WELCOME_PICTURES: Partial<Record<string, Partial<Record<WelcomePictureName, ImageSourcePropType>>>> = {',
];
for (const set of sets) {
  lines.push(`  '${set}': {`);
  for (const name of Object.keys(shapes[set])) lines.push(`    ${name}: require('../assets/welcome/${set}/${name}.jpg'),`);
  lines.push('  },');
}
lines.push('};', '');
writeFileSync(join(ROOT, 'src', 'welcomePictures.ts'), lines.join('\n'));
console.log('wrote src/welcomePictures.ts');
