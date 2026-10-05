// Draws the Google Play feature graphics (1024 × 500, no transparency) for the Malayalam
// app's listing: the icon's book on forest green, with the app name and one line beside it,
// in Malayalam for the default listing and in English for its translation.
//   node scripts/make-feature-graphic.mjs   writes docs/play/graphics/vedapusthakam-feature-{ml,en}.png
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { COLOURS, ROOT, book, fontFaces, launch } from './icon-art.mjs';

const GRAPHICS = path.join(ROOT, 'docs', 'play', 'graphics');
const malayalam = (weight) =>
  path.join(ROOT, `node_modules/@expo-google-fonts/noto-serif-malayalam/${weight}/NotoSerifMalayalam_${weight}.ttf`);

const VERSIONS = {
  ml: { name: 'വേദപുസ്തകം', lines: ['സത്യവേദപുസ്തകം 1910', 'എബ്രായ, ഗ്രീക്ക് മൂലപാഠത്തോടൊപ്പം'] },
  en: { name: 'Vedapusthakam', lines: ['Malayalam Bible 1910', 'with the Hebrew and Greek words'] },
};

const c = { ...COLOURS.ml, cover: '#143521' };
const page = (v) => `<!doctype html><meta charset="utf-8"><style>
  ${fontFaces({ NameFace: malayalam('700Bold'), LineFace: malayalam('400Regular') })}
  html, body { margin: 0; }
  #g { width: 1024px; height: 500px; display: flex; align-items: center; box-sizing: border-box; padding: 0 64px 0 56px;
       background: radial-gradient(circle at 27% 52%, #2C6641 0%, #1F4D2E 48%, #173D24 100%); }
  svg { flex: none; }
  .text { margin-left: 44px; color: #FBF7EA; flex: 1; min-width: 0; }
  .name { font: 72px/1.25 NameFace, IconGreek, serif; white-space: nowrap; }
  .line { font: 30px/1.5 LineFace, serif; color: #CFE0C6; margin-top: 10px; white-space: nowrap; }
</style>
<div id="g">
  <svg width="380" height="245" viewBox="-450 -230 900 580">${book(c)}</svg>
  <div class="text"><div class="name">${v.name}</div><div class="line">${v.lines.join('<br>')}</div></div>
</div>`;

const browser = await launch();
const tab = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
for (const [lang, v] of Object.entries(VERSIONS)) {
  const file = path.join(GRAPHICS, `vedapusthakam-feature-${lang}.png`);
  await tab.setContent(page(v));
  await tab.evaluate(async () => {
    await document.fonts.ready;
    // Shrink the name, then the two lines together, until each fits beside the book.
    for (const el of document.querySelectorAll('.name, .line')) {
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth && size > 12) el.style.fontSize = `${(size -= 1)}px`;
    }
  });
  await tab.locator('#g').screenshot({ path: file });
  // Play wants a 24-bit image: drop the alpha channel Chromium writes.
  execFileSync('convert', [file, '-alpha', 'off', `PNG24:${file}`]);
  console.log(`wrote ${path.relative(ROOT, file)}`);
}
await browser.close();
