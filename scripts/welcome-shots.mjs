// The welcome screens' pictures (assets/welcome/<edition>), cut from the screen check's own
// screenshots of each app, so they show the app as it is:
//   node scripts/smoke.mjs en ml ta && node scripts/welcome-shots.mjs en ml ta
// Each picture is the top 412 x 692 points of a phone screenshot, from the given point down.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(join(ROOT, 'node_modules/playwright-core/index.mjs'));
const WIDTH = 412;
const HEIGHT = 692;
// picture: [screenshot, points cut from its top]
const PICTURES = { read: ['01-open.png', 0], word: ['03-word.png', 150], verse: ['04-compare-menu.png', 190], notebook: ['10-notebook.png', 0] };

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
// One and a half pixels a point: sharp at the size shown, and about 100 KB a picture.
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1.5 });
for (const edition of process.argv.slice(2)) {
  const out = join(ROOT, 'assets', 'welcome', edition);
  mkdirSync(out, { recursive: true });
  for (const [name, [shot, top]] of Object.entries(PICTURES)) {
    const src = join(ROOT, 'smoke-out', edition, 'phone', shot);
    if (!existsSync(src)) throw new Error(`no screenshot ${src}: run the screen check for ${edition} first`);
    const html = join(ROOT, 'smoke-out', `welcome-${edition}-${name}.html`);
    writeFileSync(html, `<!doctype html><body style="margin:0;overflow:hidden"><img src="file://${src}" style="width:${WIDTH}px;display:block;margin-top:-${top}px"></body>`);
    await page.goto(`file://${html}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(out, `${name}.png`), clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  }
  console.log(`${edition}: ${Object.keys(PICTURES).length} pictures`);
}
await browser.close();
