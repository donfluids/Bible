// Screen check: builds the web version of an app, opens it in Chromium at a few screen
// sizes and goes through every main screen as a person would, in the app's own
// language. It fails on a screen that does not open, a step that does not work or a
// JavaScript error, and keeps a screenshot of each step to look over.
//
//   npm install --no-save react-dom@19.2.3 react-native-web@^0.21.2   (once; web only)
//   node scripts/smoke.mjs                 all three apps
//   node scripts/smoke.mjs ml en           some of them
//
// Screenshots go to smoke-out/<app>/<size>/ (ignored by git). What the browser cannot
// show (the phone's photo picker, its voices, Android's back button) is in
// docs/testing/phone-checklist.md for a person with a phone.
import { execFileSync } from 'node:child_process';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'smoke-out');
const editions = process.argv.slice(2).filter((a) => ['en', 'ml', 'ta', 'all'].includes(a));
const EDITIONS = editions.length ? editions : ['en', 'ml', 'ta', 'all'];
const SIZES = [
  ['phone', 412, 915, 2],
  ['small-phone', 360, 640, 2],
  ['phone-sideways', 915, 412, 2],
  ['tablet-sideways', 1366, 1024, 1],
];
const LANGUAGE = { en: 'en', ml: 'ml', ta: 'ta', all: 'en' };
const QUERY = { en: 'love', ml: 'സ്നേഹം', ta: 'அன்பு', all: 'love' };
const PAGE = { en: 'Love – John 3:16', ml: 'സ്നേഹം – യോഹന്നാൻ 3:16', ta: 'அன்பு – யோவான் 3:16', all: 'Love – John 3:16' };

for (const pkg of ['react-dom', 'react-native-web']) {
  if (!existsSync(join(ROOT, 'node_modules', pkg))) {
    console.error(`${pkg} is missing: npm install --no-save react-dom@19.2.3 react-native-web@^0.21.2`);
    process.exit(1);
  }
}
const { chromium } = await import(join(ROOT, 'node_modules/playwright-core/index.mjs'));

// The interface strings, read from src/i18n.ts, so the steps follow its wording.
function strings(language) {
  const src = readFileSync(join(ROOT, 'src/i18n.ts'), 'utf8');
  const start = src.indexOf(`const ${language}`);
  const end = src.indexOf('\n};', start);
  const table = {};
  for (const m of src.slice(start, end).matchAll(/^ {2}(\w+): (['"])((?:\\.|(?!\2).)*)\2,$/gm)) table[m[1]] = m[3].replace(/\\(.)/g, '$1');
  return table;
}

// The web build of an app; the database needs wasm, which only the web build takes as an asset.
function buildWeb(edition) {
  const dir = join(OUT, `web-${edition}`);
  rmSync(dir, { recursive: true, force: true });
  const metro = join(ROOT, 'metro.config.js');
  const original = readFileSync(metro, 'utf8');
  try {
    writeFileSync(metro, original.replace("config.resolver.assetExts.push('db');", "config.resolver.assetExts.push('db', 'wasm');"));
    execFileSync('npx', ['expo', 'export', '--clear', '--platform', 'web', '--output-dir', dir], { cwd: ROOT, env: { ...process.env, BIBLE_EDITION: edition }, stdio: 'pipe' });
  } finally {
    writeFileSync(metro, original);
  }
  // The fonts the Android build carries (app.config.js), loaded by the page.
  mkdirSync(join(dir, 'fonts'), { recursive: true });
  const fonts = [...readFileSync(join(ROOT, 'app.config.js'), 'utf8').matchAll(/FONT\('([\w-]+)', '([\w.]+)'\)/g)].map(([, pkg, file]) => [pkg, file]);
  const faces = [];
  for (const [pkg, file] of fonts) {
    const weight = file.match(/_(\d{3})/)?.[1];
    const src = join(ROOT, 'node_modules/@expo-google-fonts', pkg, `${weight}${file.replace(/^.*_\d{3}(\w+)\.ttf$/, '$1')}`, file);
    if (!existsSync(src) || faces.some((f) => f.includes(file))) continue;
    copyFileSync(src, join(dir, 'fonts', file));
    faces.push(`@font-face{font-family:'${file.replace(/\.ttf$/, '')}';src:url('/fonts/${file}')}`);
  }
  copyFileSync(join(ROOT, 'assets/fonts/BibleIcons.ttf'), join(dir, 'fonts/BibleIcons.ttf'));
  faces.push("@font-face{font-family:'BibleIcons';src:url('/fonts/BibleIcons.ttf')}");
  const index = join(dir, 'index.html');
  writeFileSync(index, readFileSync(index, 'utf8').replace('</head>', `<style>${faces.join('')}</style></head>`));
  return dir;
}

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    let file = join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
    // The database's web worker needs these.
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

const failures = [];
for (const edition of EDITIONS) {
  console.log(`== ${edition}: building the web version`);
  const dir = buildWeb(edition);
  const server = await serve(dir);
  const url = `http://localhost:${server.address().port}/`;
  const t = strings(LANGUAGE[edition]);
  const browser = await chromium.launch();
  for (const [size, width, height, scale] of SIZES) {
    const shots = join(OUT, edition, size);
    mkdirSync(shots, { recursive: true });
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale, hasTouch: true });
    const errors = [];
    // The browser has no screen wake lock for a page in a test; the app asks for one.
    page.on('pageerror', (e) => !/wake lock/i.test(e.message) && errors.push(e.message.split('\n')[0]));
    const vis = (l) => l.locator('visible=true').first();
    const wait = (ms) => page.waitForTimeout(ms);
    let n = 0;
    // Each step takes its screenshot at the moment that shows what it checked (snap), or
    // at its end.
    const step = async (name, fn) => {
      const file = join(shots, `${String(++n).padStart(2, '0')}-${name}.png`);
      let snapped = false;
      const snap = async () => {
        snapped = true;
        await page.screenshot({ path: file });
      };
      try {
        await fn(snap);
        if (!snapped) await page.screenshot({ path: file });
      } catch (e) {
        failures.push(`${edition} ${size} ${name}: ${e.message.split('\n')[0].slice(0, 160)}`);
        await page.screenshot({ path: file.replace(/\.png$/, '-FAILED.png') }).catch(() => {});
      }
    };
    const shows = async (text) => {
      await vis(page.getByText(text)).waitFor({ timeout: 8000 });
    };
    // The sheet's own close button: the dimmed backdrop behind a sheet carries the same name.
    const closeSheet = async () => {
      await page.getByLabel(t.close).locator('visible=true').last().click();
      await wait(800);
    };
    const tab = async (key) => {
      // The reader folds its bottom bar away while scrolling down; a scroll up brings it back.
      const target = page.getByRole('tab', { name: t[key] });
      if (!(await target.locator('visible=true').count())) {
        await page.mouse.move(width / 2, height / 2);
        await page.mouse.wheel(0, -600);
        await wait(1000);
      }
      await vis(target).click();
      await wait(1500);
    };

    await step('open', async () => {
      await page.goto(url);
      await page.waitForFunction(() => document.body.innerText.length > 200, null, { timeout: 120000 });
      await wait(1500);
      // The four-language app asks the language once: its screenshot, then English.
      const chooser = page.getByText('Choose your language', { exact: true });
      if (await chooser.count()) {
        await page.screenshot({ path: join(shots, '00-language.png') });
        await vis(page.getByRole('button', { name: /^English,/ })).click();
        await wait(2500);
      }
      const tip = page.getByText(t.gotIt, { exact: true });
      if (await tip.count()) await tip.first().click();
      await vis(page.getByRole('button', { name: t.verseActions.replace('{n}', '1') })).waitFor({ timeout: 8000 });
    });
    if (edition === 'all') {
      await step('bible-chooser', async (snap) => {
        // The Bible pill opens the six Bibles; the Hindi opens on the same chapter (John 1).
        await vis(page.getByRole('button', { name: new RegExp(`^${t.chooseBible}:`) })).click();
        await wait(800);
        await vis(page.getByText(/^इंडियन रिवाइज्ड वर्जन/)).click();
        await wait(2000);
        // A footnote letter sits inside John 1:1's first words, so the pill tells which Bible is open.
        await vis(page.getByRole('button', { name: new RegExp(`^${t.chooseBible}: इंडियन रिवाइज्ड वर्जन`) })).waitFor({ timeout: 8000 });
        await shows('यही आदि में परमेश्वर के साथ था।');
        await snap();
        await vis(page.getByRole('button', { name: new RegExp(`^${t.chooseBible}:`) })).click();
        await wait(800);
        // The row's text: in the browser its name also carries the icon's glyph.
        await vis(page.getByText('King James Version', { exact: true })).click();
        await wait(2000);
        // The KJV's words are links each, so its pill tells which Bible is open.
        await vis(page.getByRole('button', { name: `${t.chooseBible}: King James Version` })).waitFor({ timeout: 8000 });
      });
    }
    await step('passage-picker', async (snap) => {
      // The title opens the picker: Testament switch, book grid, then the chapters; Genesis 3 opens.
      await vis(page.getByRole('button', { name: new RegExp(t.choosePassage.replace('{title}', '.*')) })).click();
      await wait(1200);
      await vis(page.getByText(t.allBooks, { exact: true })).click();
      await wait(600);
      await vis(page.getByRole('radio', { name: t.oldTestament })).click();
      await wait(600);
      await shows(t.groupLaw);
      await snap();
      await vis(page.getByRole('button', { name: /^Genesis$|^ഉല്പത്തി$|^ஆதியாகமம்$/ })).click();
      await wait(800);
      await vis(page.getByRole('button', { name: /^(Genesis|ഉല്പത്തി|ஆதியாகமம்) 3$/ })).click();
      await wait(2000);
      await vis(page.getByRole('button', { name: new RegExp(t.choosePassage.replace('{title}', '(Genesis|ഉല്പത്തി|ஆதியாகமம்) 3')) })).waitFor({ timeout: 8000 });
      // Back to John 1 for the steps that follow.
      await vis(page.getByRole('button', { name: new RegExp(t.choosePassage.replace('{title}', '.*')) })).click();
      await wait(1000);
      await vis(page.getByText(t.allBooks, { exact: true })).click();
      await wait(500);
      await vis(page.getByRole('radio', { name: t.newTestament })).click();
      await wait(500);
      await vis(page.getByRole('button', { name: /^John$|^യോഹന്നാൻ$|^யோவான்$/ })).click();
      await wait(800);
      await vis(page.getByRole('button', { name: /^(John|യോഹന്നാൻ|யோவான்) 1$/ })).click();
      await wait(2000);
    });
    await step('word', async (snap) => {
      // A word in the text: the first link that is not the About this book line above chapter 1.
      await vis(page.locator(`[role="link"]:not([aria-label="${t.aboutBook}"])`)).click();
      await wait(2500);
      await shows(t.inThisVerse);
      await snap();
      await closeSheet();
    });
    await step('compare', async (snap) => {
      await vis(page.getByRole('button', { name: t.verseActions.replace('{n}', '2') })).click();
      await wait(1200);
      await vis(page.getByText(t.compare)).click();
      await wait(2500);
      await shows(t.compare);
      await snap();
      await page.keyboard.press('Escape');
      await wait(800);
      if (await page.getByLabel(t.close).locator('visible=true').count()) await closeSheet();
    });
    await step('cross-references', async (snap) => {
      await vis(page.getByRole('button', { name: t.verseActions.replace('{n}', '1') })).click();
      await wait(1500);
      await vis(page.getByText(t.crossReferences, { exact: true })).click();
      await wait(2500);
      // The list has loaded when its source line shows.
      await shows(t.crossReferencesSource);
      await snap();
      await closeSheet();
    });
    await step('about-book', async (snap) => {
      await vis(page.getByLabel(t.aboutBook)).click();
      await wait(2000);
      // The introduction has loaded when its outline heading shows.
      await shows(t.introOutline);
      await snap();
      await vis(page.getByLabel(t.back)).click();
      await wait(1500);
    });
    await step('card', async (snap) => {
      await vis(page.getByRole('button', { name: t.verseActions.replace('{n}', '3') })).click();
      await wait(1200);
      await vis(page.getByText(t.shareAsCard)).click();
      await wait(2500);
      await shows(t.cardShare);
      await shows(t.cardPhoto);
      await snap();
      await vis(page.getByLabel(t.back)).click();
      await wait(1500);
    });
    await step('books', async (snap) => {
      await tab('books');
      await shows(t.newTestament);
      // Genesis 3, read in the picker step, is behind the clock in the title bar.
      await vis(page.getByLabel(t.recent)).click();
      await wait(800);
      // The row's text (in the browser its name also carries the clock's glyph).
      await vis(page.getByText(/^(Genesis|ഉല്പത്തി|ஆதியாகமம்) 3$/)).waitFor({ timeout: 8000 });
      await snap();
      await closeSheet();
    });
    await step('saved', () => tab('saved'));
    await step('notebook', async (snap) => {
      await tab('notebook');
      await vis(page.getByText(t.newPage, { exact: true })).click();
      await wait(800);
      await vis(page.getByText(t.pageTyped, { exact: true })).click();
      await wait(1200);
      await vis(page.locator('textarea')).fill(PAGE[edition]);
      await wait(600);
      await vis(page.locator(`[aria-label="${t.donePage}"]`)).click();
      await wait(2500);
      // The reference became a link with the verse quoted under it.
      await vis(page.getByRole('link')).waitFor({ timeout: 8000 });
      await snap();
      await vis(page.getByLabel(t.back)).click();
      await wait(1200);
    });
    await step('handwritten', async (snap) => {
      await vis(page.getByLabel(t.newPage)).click();
      await wait(800);
      await vis(page.getByText(t.pageHandLined, { exact: true })).click();
      await wait(1500);
      const svg = await page.evaluate(() => {
        const s = [...document.querySelectorAll('svg')].sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0].getBoundingClientRect();
        return { x: s.x, y: s.y, w: s.width };
      });
      await page.mouse.move(svg.x + svg.w * 0.15, svg.y + 80);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) await page.mouse.move(svg.x + svg.w * (0.15 + i * 0.05), svg.y + 80 + (i % 2) * 24, { steps: 3 });
      await page.mouse.up();
      await wait(600);
      const strokes = await page.evaluate(() => [...document.querySelectorAll('svg path')].filter((e) => e.getAttribute('d')?.startsWith('M')).length);
      if (strokes < 1) throw new Error('the stroke was not drawn');
      await snap();
      await vis(page.getByLabel(t.back)).click();
      await wait(1200);
      // The page is in the list, marked as handwritten.
      await shows(t.handwritten);
    });
    await step('search', async (snap) => {
      await tab('tabRead');
      await vis(page.getByLabel(t.search)).click();
      await wait(1200);
      await page.keyboard.type(QUERY[edition]);
      await wait(4000);
      await shows(new RegExp(t.nVerses.replace('{n}', '[\\d,]+')));
      await snap();
      await vis(page.getByLabel(t.back)).click();
      await wait(1200);
    });
    await step('settings', async (snap) => {
      await vis(page.getByLabel(t.settings)).click();
      await wait(1500);
      await shows(t.theme);
      await shows(t.feedback);
      await snap();
      await vis(page.getByLabel(t.back)).click();
      await wait(1200);
    });
    await step('plain-reader', async (snap) => {
      // Study tools off: no tappable words, and the cap in the top bar switches them back on.
      await vis(page.getByLabel(t.settings)).click();
      await wait(1200);
      await vis(page.getByRole('switch').first()).click();
      await wait(600);
      await vis(page.getByLabel(t.back)).click();
      await wait(1500);
      if (await page.getByRole('link').count()) throw new Error('words are still links with the study tools off');
      // The cap in the top bar now offers to switch them on.
      await snap();
      await vis(page.getByLabel(t.studyToolsOn)).click();
      await shows(t.studyToolsOnNote);
      await wait(1200);
      await vis(page.getByRole('link').first()).waitFor({ timeout: 8000 });
    });
    await step('how-to', async (snap) => {
      await vis(page.getByLabel(t.settings)).click();
      await wait(1200);
      await vis(page.getByText(t.howTo, { exact: true })).click();
      await wait(1200);
      await vis(page.getByText(t.howTopic8, { exact: true })).click();
      await wait(800);
      await shows(t.howText8.slice(0, 40));
      await snap();
      await vis(page.getByLabel(t.back)).click();
      await wait(800);
      await vis(page.getByLabel(t.back)).click();
      await wait(1200);
    });
    await step('dark', async (snap) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await wait(1200);
      // The title follows the theme: light letters on the dark page.
      const colour = await vis(page.getByRole('button', { name: new RegExp(t.choosePassage.replace('{title}', '.*')) })).evaluate((el) => {
        const text = el.querySelector('div[dir], div') ?? el;
        return getComputedStyle(text).color;
      });
      const [r, g, b] = colour.match(/\d+/g).map(Number);
      if (r + g + b < 384) throw new Error(`title is ${colour} on the dark page`);
      await snap();
      await page.emulateMedia({ colorScheme: 'light' });
    });
    if (width >= 1000) {
      await step('keyboard', async () => {
        const title = () => vis(page.getByRole('button', { name: new RegExp(t.choosePassage.replace('{title}', '.*')) })).getAttribute('aria-label');
        const first = await title();
        await page.keyboard.press('ArrowRight');
        await wait(2000);
        if ((await title()) === first) throw new Error(`ArrowRight did not turn the chapter (${first})`);
      });
    }
    for (const e of errors) failures.push(`${edition} ${size}: JavaScript error: ${e.slice(0, 160)}`);
    await page.close();
    console.log(`   ${size}: ${n} steps`);
  }
  await browser.close();
  server.close();
}

if (failures.length) {
  console.log(`\n${failures.length} problem(s):\n  ${failures.join('\n  ')}`);
  console.log(`screenshots: ${OUT}`);
  process.exit(1);
}
console.log(`\nscreen check passed; screenshots in ${OUT}`);
