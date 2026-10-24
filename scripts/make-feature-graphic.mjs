// Draws the Google Play feature graphics (1024 × 500, no transparency) for the Malayalam
// app's listing: the icon's lamp and book on a sunrise over hills (scripts/sunrise.svg, the
// background of the store screenshots too), the app name in gold over a short gold rule
// and three lines beside it, in
// Malayalam for the default listing and in English for its translation.
//   node scripts/make-feature-graphic.mjs   writes docs/play/graphics/vedapusthakam-feature-{ml,en}.png
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, art, fontFaces, launch } from './icon-art.mjs';

const GRAPHICS = path.join(ROOT, 'docs', 'play', 'graphics');
const malayalam = (weight) =>
  path.join(ROOT, `node_modules/@expo-google-fonts/noto-serif-malayalam/${weight}/NotoSerifMalayalam_${weight}.ttf`);

const VERSIONS = {
  ml: { name: 'വേദപുസ്തകം', lines: ['മലയാളം–ഇംഗ്ലീഷ് പഠന ബൈബിൾ', 'പഴയനിയമം എബ്രായ മൂലപദങ്ങളോടൊപ്പം', 'പുതിയനിയമം ഗ്രീക്ക് മൂലപദങ്ങളോടൊപ്പം'] },
  en: { name: 'Vedapusthakam', lines: ['Malayalam–English Study Bible', 'Old Testament with Hebrew root words', 'New Testament with Greek root words'] },
};

// The sunrise, filling the banner (cropped about its middle).
const SUNRISE = fs
  .readFileSync(path.join(ROOT, 'scripts', 'sunrise.svg'), 'utf8')
  .replace('width="1080" height="1080"', 'class="sky" width="1024" height="500" preserveAspectRatio="xMidYMid slice"');

const page = (v) => `<!doctype html><meta charset="utf-8"><style>
  ${fontFaces({ NameFace: malayalam('700Bold'), LineFace: malayalam('400Regular') })}
  html, body { margin: 0; }
  #g { position: relative; overflow: hidden; width: 1024px; height: 500px; display: flex; align-items: center; box-sizing: border-box; padding: 0 64px 0 56px;
       background: #2E2236; }
  .sky { position: absolute; inset: 0; }
  /* A shade over the sky behind the words, so they read clearly against the sun. */
  .shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(20,16,30,.15) 0%, rgba(20,16,30,.35) 40%, rgba(20,16,30,.55) 100%); }
  svg.book { position: relative; flex: none; }
  .text { position: relative; margin-left: 44px; flex: 1; min-width: 0; }
  .name { font: 72px/1.25 NameFace, serif; white-space: nowrap; color: #FFE7B0; text-shadow: 0 2px 10px rgba(0,0,0,.45); }
  .rule { width: 140px; height: 3px; background: #C9A24A; margin: 14px 0 12px; }
  .line { font: 30px/1.5 LineFace, serif; color: #FBF3E6; white-space: nowrap; text-shadow: 0 1px 6px rgba(0,0,0,.5); }
</style>
<div id="g">${SUNRISE}<div class="shade"></div>
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
