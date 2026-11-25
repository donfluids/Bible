// The App Store pictures of an app: a short caption over the app's own screen, at the
// iPhone 6.9" size App Store Connect asks for (1320 x 2868). The screens come from the
// screen check at the store size:
//   SMOKE_SIZES=store node scripts/smoke.mjs ml && node scripts/store-shots.mjs ml
// The pictures land in docs/app-store/<edition>/ (01-read.png, 02-word.png, ...).
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIDTH = 1320;
const HEIGHT = 2868;
// The app's own colours (src/theme.ts, light): paper, ink, muted ink, accent.
const PAPER = '#FBF8F1';
const INK = '#2A241C';
const MUTED = '#6F665A';
const ACCENT = '#7A4E1D';

// Each picture: the screen check's screenshot, a headline and a line under it.
const PICTURES = {
  ml: [
    ['read', '01-open', 'Read the Bible your way', 'The Sathyavedapusthakam 1910, the IRV and the OMCV, with four English Bibles'],
    ['word', '03-word', 'See the word behind the word', 'Tap a word for the Greek or Hebrew it translates'],
    ['compare', '05-compare', 'Compare Bibles verse by verse', 'Three Malayalam Bibles and four English ones, one under another'],
    ['verse', '04-select', 'Tap a verse number to do more', 'Copy, share, highlight, bookmark or add a note'],
    ['card', '08-card', 'Share a verse as a picture', 'For a greeting, a festival or your status'],
    ['notebook', '11-notebook', 'Keep your own notebook', 'Typed or handwritten. Everything stays on your phone'],
    ['search', '13-search', 'Search the whole Bible', 'In Malayalam or English, with no internet'],
  ],
};

const edition = process.argv[2];
if (!PICTURES[edition]) {
  console.error(`usage: node scripts/store-shots.mjs <${Object.keys(PICTURES).join('|')}>`);
  process.exit(2);
}
const shots = join(ROOT, 'smoke-out', edition, 'store');
const out = join(ROOT, 'docs', 'app-store', edition);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const { chromium } = await import(join(ROOT, 'node_modules/playwright-core/index.mjs'));
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

let n = 0;
for (const [name, shot, headline, line] of PICTURES[edition]) {
  const src = join(shots, `${shot}.png`);
  if (!existsSync(src)) throw new Error(`no screenshot ${src}: run the screen check at the store size first`);
  n++;
  const html = join(shots, `store-${name}.html`);
  // The screen is 1290 x 2796; shown 1000 wide, it is 2167 tall, under a caption of 560.
  writeFileSync(
    html,
    `<!doctype html><html><head><meta charset="utf-8"><style>
      html, body { margin: 0; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: ${PAPER}; }
      .top { position: absolute; top: 150px; left: 90px; right: 90px; text-align: center; }
      h1 { margin: 0; font: 700 92px/1.12 'Bitstream Charter', 'Charter', serif; color: ${INK}; letter-spacing: -0.5px; text-wrap: balance; }
      p { text-wrap: balance; }
      p { margin: 34px auto 0; max-width: 1060px; font: 400 46px/1.35 'Inter', sans-serif; color: ${MUTED}; }
      .rule { width: 120px; height: 8px; border-radius: 4px; background: ${ACCENT}; margin: 0 auto 44px; }
      .screen { position: absolute; top: 590px; left: 160px; width: 1000px; height: 2167px; border-radius: 64px; overflow: hidden;
        box-shadow: 0 30px 90px rgba(42, 36, 28, 0.20), 0 0 0 3px rgba(42, 36, 28, 0.10); }
      .screen img { width: 1000px; display: block; }
    </style></head><body>
      <div class="top"><div class="rule"></div><h1>${escape(headline)}</h1><p>${escape(line)}</p></div>
      <div class="screen"><img src="file://${src}"></div>
    </body></html>`,
  );
  await page.goto(`file://${html}`);
  await page.waitForTimeout(400);
  const file = join(out, `${String(n).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  rmSync(html);
  console.log(file.slice(ROOT.length + 1));
}
await browser.close();
