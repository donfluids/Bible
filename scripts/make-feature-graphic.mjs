// Draws the Google Play feature graphics (1024 × 500, no transparency) for the Malayalam
// app's listing: the icon's lamp and book on shaded brown with a faint leather grain, the
// app name in gold over a short gold rule and three lines beside it, in
// Malayalam for the default listing and in English for its translation.
//   node scripts/make-feature-graphic.mjs   writes docs/play/graphics/vedapusthakam-feature-{ml,en}.png
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, art, fontFaces, launch } from './icon-art.mjs';

const GRAPHICS = path.join(ROOT, 'docs', 'play', 'graphics');
const malayalam = (weight) =>
  path.join(ROOT, `node_modules/@expo-google-fonts/noto-serif-malayalam/${weight}/NotoSerifMalayalam_${weight}.ttf`);

const VERSIONS = {
  ml: { name: 'വേദപുസ്തകം', lines: ['മലയാളം–ഇംഗ്ലീഷ് ബൈബിൾ', 'പഴയനിയമം എബ്രായ മൂലപദങ്ങളോടൊപ്പം', 'പുതിയനിയമം ഗ്രീക്ക് മൂലപദങ്ങളോടൊപ്പം'] },
  en: { name: 'Vedapusthakam', lines: ['Malayalam–English Bible', 'Old Testament with Hebrew root words', 'New Testament with Greek root words'] },
};

// A fine grain over the brown, like the leather of a Bible's cover; it also hides banding.
const GRAIN = `<svg class="grain" width="1024" height="500"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter><rect width="1024" height="500" filter="url(#n)"/></svg>`;

const page = (v) => `<!doctype html><meta charset="utf-8"><style>
  ${fontFaces({ NameFace: malayalam('700Bold'), LineFace: malayalam('400Regular') })}
  html, body { margin: 0; }
  #g { position: relative; overflow: hidden; width: 1024px; height: 500px; display: flex; align-items: center; box-sizing: border-box; padding: 0 64px 0 56px;
       background: radial-gradient(ellipse 80% 130% at 30% 35%, #946235 0%, #6C4520 45%, #3E250D 100%); }
  .grain { position: absolute; inset: 0; opacity: .22; mix-blend-mode: overlay; }
  .vignette { position: absolute; inset: 0; box-shadow: inset 0 0 120px 30px rgba(30, 15, 5, .45); }
  svg.book { position: relative; flex: none; }
  .text { position: relative; margin-left: 44px; flex: 1; min-width: 0; }
  .name { font: 72px/1.25 NameFace, serif; white-space: nowrap; color: #F3D894; }
  .rule { width: 140px; height: 3px; background: #C9A24A; margin: 14px 0 12px; }
  .line { font: 30px/1.5 LineFace, serif; color: #F3EADB; white-space: nowrap; }
</style>
<div id="g">${GRAIN}<div class="vignette"></div>
  <svg class="book" width="360" height="380" viewBox="-430 -460 860 900">${art()}</svg>
  <div class="text"><div class="name">${v.name}</div><div class="rule"></div><div class="line">${v.lines.join('<br>')}</div></div>
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
