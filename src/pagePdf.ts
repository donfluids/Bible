import { LINE_GAP, PAGE_WIDTH, boundsOf, lowestPoint, pathOf } from './ink';
import type { Ink, Paper } from './ink';

/**
 * Notebook pages as HTML for a PDF (expo-print turns it into an A4 PDF on the phone): a
 * typed page with its references and the verses quoted under them, or a handwritten page
 * drawn in vector strokes, cut into A4-tall pieces so a long page runs on over several.
 */

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function documentHtml(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>
@page { size: A4; margin: 18mm 16mm; }
body { font-family: 'Noto Serif', 'Noto Serif Malayalam', 'Noto Serif Tamil', serif; color: #1E1B16; font-size: 12pt; line-height: 1.55; }
h1 { font-size: 18pt; margin: 0 0 10pt; }
p { margin: 0 0 6pt; white-space: pre-wrap; }
.ref { color: #6B4420; font-weight: 600; }
blockquote { margin: 4pt 0 10pt; padding: 6pt 10pt; border-left: 3px solid #A87B4F; background: #F6EEDC; }
.more { color: #6E6458; font-size: 10pt; }
.foot { color: #6E6458; font-size: 10pt; margin-top: 14pt; }
.sheet { display: block; width: 100%; page-break-after: always; }
.sheet:last-child { page-break-after: auto; }
</style></head><body>${title ? `<h1>${escape(title)}</h1>` : ''}${body}</body></html>`;
}

export interface TypedLine {
  /** The line's text in pieces; a reference is marked. */
  pieces: { text: string; ref?: boolean }[];
  /** Verses quoted under the line, with how many more the range holds. */
  quotes: { text: string; more: number }[];
}

/** A typed page: its lines, references in colour, the verses quoted under them, and the Bible they are from. */
export function typedPageHtml(title: string, lines: TypedLine[], footer: string, moreLabel: (n: number) => string): string {
  const body = lines
    .map((line) => {
      const text = line.pieces.map((p) => (p.ref ? `<span class="ref">${escape(p.text)}</span>` : escape(p.text))).join('');
      const quotes = line.quotes
        .map((q) => `<blockquote>${escape(q.text)}${q.more > 0 ? `<div class="more">${escape(moreLabel(q.more))}</div>` : ''}</blockquote>`)
        .join('');
      return `<p>${text || '&nbsp;'}</p>${quotes}`;
    })
    .join('');
  return documentHtml(title, body + (footer ? `<div class="foot">${escape(footer)}</div>` : ''));
}

/** How tall a piece of a handwritten page is, in its units: an A4 page's shape at PAGE_WIDTH across, less the margins. */
const SHEET_HEIGHT = Math.round((PAGE_WIDTH * (297 - 36)) / (210 - 32));

/** Room the title takes on the first page, in the page's units (18 pt and its margin at 600 across A4). */
const TITLE_HEIGHT = 70;

const PEN_COLOURS = ['#1E1B16', '#1F4FB4', '#C0392B'];

/** A handwritten page: its title, then its strokes (light colours, on its paper) in A4-tall pieces. */
export function inkPageHtml(title: string, ink: Ink, paper: Paper): string {
  const height = Math.max(LINE_GAP * 4, lowestPoint(ink) + LINE_GAP);
  const sheets: string[] = [];
  // Each stroke's path is made once; a sheet carries only the strokes that cross it, so a
  // long page's PDF grows with its length, not with its length times its strokes.
  const drawn = ink.strokes.map((s) => {
    const [, top, , bottom] = boundsOf(s);
    const colour = s.c < 0 ? '#FFD400' : (PEN_COLOURS[s.c] ?? PEN_COLOURS[0]);
    return { highlight: s.c < 0, top: top - s.w / 2, bottom: bottom + s.w / 2, svg: `<path d="${pathOf(s)}" stroke="${colour}" stroke-width="${s.w}"/>` };
  });
  // Pieces end on a ruled line, so a cut falls between lines of writing, not through one.
  // The first piece is shorter by the title above it, so it still fits on the first page.
  const lineFit = (room: number) => Math.floor(room / LINE_GAP) * LINE_GAP;
  for (let top = 0, size = lineFit(title ? SHEET_HEIGHT - TITLE_HEIGHT : SHEET_HEIGHT); top < height; top += size, size = lineFit(SHEET_HEIGHT)) {
    const lines = [];
    if (paper === 'lined') for (let y = LINE_GAP * 2; y < top + size; y += LINE_GAP) if (y >= top) lines.push(`<line x1="0" x2="${PAGE_WIDTH}" y1="${y}" y2="${y}" stroke="#DCD3C3" stroke-width="1"/>`);
    const here = drawn.filter((d) => d.bottom >= top && d.top <= top + size);
    // Highlighter under the pens, as on the screen.
    const highlights = here.filter((d) => d.highlight).map((d) => d.svg);
    const pens = here.filter((d) => !d.highlight).map((d) => d.svg);
    sheets.push(
      `<svg class="sheet" xmlns="http://www.w3.org/2000/svg" viewBox="0 ${top} ${PAGE_WIDTH} ${size}" preserveAspectRatio="xMidYMin meet">${lines.join('')}` +
        `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g opacity="0.45">${highlights.join('')}</g>${pens.join('')}</g></svg>`,
    );
  }
  return documentHtml(title, sheets.join(''));
}
