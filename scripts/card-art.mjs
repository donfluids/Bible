// An old print as a transparent PNG for a verse card: cropped to its subject, the paper
// keyed out, the edges faded (the method of scripts/card-rose.mjs). The prints and their
// crops are listed in assets/cards/SOURCES.md.
//
//   node scripts/card-art.mjs <print.jpg> <out.png> <x0,y0,x1,y1> [longest side] [x0,y0,x1,y1 to clear …]
//
// The crop is in fractions of the print; in a box to clear (in fractions of the crop)
// the grey ink is taken out, for lettering on the paper.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const [src, out, cropArg, sideArg, ...clearArgs] = process.argv.slice(2);
const crop = cropArg.split(',').map(Number);
const side = Number(sideArg || 640);
const clears = clearArgs.map((a) => a.split(',').map(Number));
const b = await chromium.launch();
const p = await b.newPage();
const data = 'data:image/jpeg;base64,' + fs.readFileSync(src).toString('base64');
const png = await p.evaluate(
  async ({ data, crop, side, clears }) => {
    const img = new Image();
    img.src = data;
    await img.decode();
    const sx = Math.round(img.width * crop[0]), sy = Math.round(img.height * crop[1]);
    const sw = Math.round(img.width * (crop[2] - crop[0])), sh = Math.round(img.height * (crop[3] - crop[1]));
    const scale = Math.min(1, side / Math.max(sw, sh));
    const W = Math.round(sw * scale), H = Math.round(sh * scale);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H);
    const px = d.data;
    // Paper colour: the median of the four corners' pixels.
    const samples = [];
    for (const [x0, y0] of [[2, 2], [W - 12, 2], [2, H - 12], [W - 12, H - 12]])
      for (let y = y0; y < y0 + 10; y++) for (let x = x0; x < x0 + 10; x++) { const i = (y * W + x) * 4; samples.push([px[i], px[i + 1], px[i + 2]]); }
    const med = [0, 1, 2].map((k) => samples.map((s) => s[k]).sort((a, b) => a - b)[samples.length >> 1]);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const dist = Math.hypot(px[i] - med[0], px[i + 1] - med[1], px[i + 2] - med[2]);
        let a = Math.min(1, Math.max(0, (dist - 10) / 55));
        // Fade towards the edges.
        const ex = Math.min(x, W - 1 - x) / (W * 0.08), ey = Math.min(y, H - 1 - y) / (H * 0.06);
        a *= Math.min(1, ex, ey);
        // Lettering on the paper, cleared: the grey ink only, so flowers in the box stay.
        if (clears.some(([x0, y0, x1, y1]) => x >= x0 * W && x < x1 * W && y >= y0 * H && y < y1 * H)) {
          const hi = Math.max(px[i], px[i + 1], px[i + 2]), lo = Math.min(px[i], px[i + 1], px[i + 2]);
          if (hi - lo < 40) a = 0;
        }
        // Un-mix the paper from partly transparent pixels so they keep their own colour.
        if (a > 0) for (let k = 0; k < 3; k++) px[i + k] = Math.max(0, Math.min(255, (px[i + k] - med[k] * (1 - a)) / a));
        px[i + 3] = Math.round(a * 255);
      }
    g.putImageData(d, 0, 0);
    return c.toDataURL('image/png');
  },
  { data, crop, side, clears },
);
fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
await b.close();
