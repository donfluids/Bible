// The App Store header banner for the Malayalam app, at the sizes App Store Connect lists
// (3840 x 1646 and 5244 x 2950), from the screen check at the store size:
//   SMOKE_SIZES=store node scripts/smoke.mjs ml && node scripts/store-header.mjs
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(join(ROOT, 'node_modules/playwright-core/index.mjs'));
const SHOTS = join(ROOT, 'smoke-out/ml/store');
const FONT = join(ROOT, 'node_modules/@expo-google-fonts/noto-serif-malayalam/700Bold/NotoSerifMalayalam_700Bold.ttf');
const OUT = join(ROOT, 'docs/app-store/ml/header');
mkdirSync(OUT, { recursive: true });
const SP = mkdtempSync(join(tmpdir(), 'store-header-'));
const b = await chromium.launch();
for (const [W, H] of [[3840, 1646], [5244, 2950]]) {
  // Everything scales with the height; the wide one keeps its content in the middle.
  const u = Math.min(H / 1646, W / 3840);
  const phoneW = 560 * u, phoneH = phoneW * 2796 / 1290;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: MalSerif; src: url('file://${FONT}'); }
  html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
  body{background:radial-gradient(ellipse at 70% 40%, #FFFDF8 0%, #FBF8F1 45%, #F1E6D4 100%);position:relative;font-family:Inter,'Helvetica Neue',Arial,sans-serif}
  .text{position:absolute;left:${W / 2 - 1560 * u}px;top:${H / 2}px;transform:translateY(-50%);width:${1500 * u}px}
  .rule{width:${150 * u}px;height:${12 * u}px;border-radius:${6 * u}px;background:#7A4E1D;margin-bottom:${56 * u}px}
  h1{margin:0;font:700 ${190 * u}px/1.25 MalSerif,serif;color:#2A241C}
  h2{margin:${24 * u}px 0 0;font:700 ${96 * u}px/1.2 'Bitstream Charter',Charter,Georgia,serif;color:#2A241C;letter-spacing:-0.5px}
  p{margin:${48 * u}px 0 0;font:400 ${58 * u}px/1.4 Inter,'Helvetica Neue',Arial,sans-serif;color:#6F665A}
  .phones{position:absolute;left:${W / 2 + 140 * u}px;top:${(H - phoneH) / 2}px;width:${phoneW * 2.15}px;height:${phoneH}px}
  .ph{position:absolute;top:0;width:${phoneW}px;height:${phoneH}px;border-radius:${64 * u}px;overflow:hidden;background:#FBF8F1;
      box-shadow:0 ${40 * u}px ${110 * u}px rgba(42,36,28,.22),0 0 0 ${4 * u}px rgba(42,36,28,.10)}
  .ph img{width:100%;display:block}
  .a{left:0;transform:rotate(-4deg) translateY(${30 * u}px)} .b{left:${phoneW * 1.12}px;transform:rotate(4deg) translateY(${-10 * u}px)}
  </style></head><body>
  <div class="text"><div class="rule"></div><h1>വേദപുസ്തകം</h1><h2>Malayalam–English Study Bible</h2>
  <p>Three Malayalam Bibles and four English ones, the Hebrew and Greek behind the words, the words of Jesus in red. No internet needed.</p></div>
  <div class="phones"><div class="ph a"><img src="file://${SHOTS}/01-open.png"></div><div class="ph b"><img src="file://${SHOTS}/05-compare.png"></div></div>
  </body></html>`;
  const f = `${SP}/header-${W}.html`;
  writeFileSync(f, html);
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(`file://${f}`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/header-${W}x${H}.png` });
  console.log(`docs/app-store/ml/header/header-${W}x${H}.png`);
}
await b.close();
