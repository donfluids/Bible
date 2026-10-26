/**
 * Handwritten notebook pages: the strokes, how they are kept, read back and drawn.
 *
 * A page is PAGE_WIDTH units wide whatever the screen, so writing done on a phone shows
 * the same on a tablet, larger. A stroke's points are whole units, each stored as the
 * step from the one before, written as letters (see packSteps): a small step, as most
 * are, takes one letter, so a long page takes well under half the room plain numbers
 * would (a page of 3,000 strokes: 390 KB instead of 940 KB).
 */

export const PAGE_WIDTH = 600;
/** The space between the lines of lined paper, and above the first. */
export const LINE_GAP = 36;
/** Room below the lowest writing, so there is always somewhere to go on. */
export const ROOM_BELOW = 500;

export type Paper = 'plain' | 'lined';
export type Tool = 'pen' | 'highlighter' | 'eraser';
/** Pen colours, by index; the highlighter has one colour. */
export const PEN_COLOURS = ['black', 'blue', 'red'] as const;
export type PenColour = (typeof PEN_COLOURS)[number];
export const PEN_WIDTHS = { thin: 3, thick: 5.5 } as const;
export type PenSize = keyof typeof PEN_WIDTHS;
export const HIGHLIGHTER_WIDTH = 18;
/** How near a stroke the eraser has to pass to take it away. */
export const ERASER_RADIUS = 10;

export interface Stroke {
  /** Pen colour index, or -1 for the highlighter. */
  c: number;
  /** Width in units. */
  w: number;
  /** Points as x, y, x, y… in units. */
  p: number[];
}

export interface Ink {
  strokes: Stroke[];
}

/**
 * Limits on what is read back, so a damaged entry cannot stall the page. A page takes at
 * most PAGE_STROKES strokes when written (src/screens/InkPageScreen.tsx says so when it is
 * full), well under what is read back, so nothing written is ever cut on reading.
 */
export const PAGE_STROKES = 20000;
const MAX_STROKES = 50000;
const MAX_POINTS = 4000;
/** How far down a page may run, in units (about 5,500 lines): points below it are not read. */
export const PAGE_MAX_Y = 200000;

export const emptyInk = (): Ink => ({ strokes: [] });

// A finished stroke never changes, so what is worked out from it is kept with it: its
// stored form, its SVG path and its bounds. A page of thousands of strokes then costs
// only the new stroke's work when one is added.
const storedForm = new WeakMap<Stroke, [number, number, string]>();
const paths = new WeakMap<Stroke, string>();
const bounds = new WeakMap<Stroke, [number, number, number, number]>();

// 64 letters that need no escaping in JSON.
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const LETTER_VALUE = new Map([...LETTERS].map((ch, i) => [ch, i]));

/**
 * Whole numbers as letters: each is folded to a non-negative number (0, -1, 1, -2… as
 * 0, 1, 2, 3…) and written five bits a letter, lowest first, the sixth bit marking that
 * another letter follows. A step of up to 15 units either way is one letter.
 */
export function packSteps(values: number[]): string {
  let out = '';
  for (const v of values) {
    let z = v >= 0 ? v * 2 : -v * 2 - 1;
    do {
      const low = z & 31;
      z = Math.floor(z / 32);
      out += LETTERS[low | (z > 0 ? 32 : 0)];
    } while (z > 0);
  }
  return out;
}

/** The numbers packSteps wrote, or null for text it could not have written. */
export function unpackSteps(text: string, limit: number): number[] | null {
  const out: number[] = [];
  let z = 0;
  let scale = 1;
  for (const ch of text) {
    const value = LETTER_VALUE.get(ch);
    if (value === undefined || scale > 2 ** 30) return null;
    z += (value & 31) * scale;
    if (value & 32) {
      scale *= 32;
      continue;
    }
    out.push(z % 2 === 0 ? z / 2 : -(z + 1) / 2);
    if (out.length > limit) return null;
    z = 0;
    scale = 1;
  }
  return scale === 1 ? out : null;
}

/** The stored form: each stroke as its colour, its width and its points' steps as letters. */
export function encodeInk(ink: Ink): unknown {
  return {
    v: 2,
    s: ink.strokes.map((s) => {
      let form = storedForm.get(s);
      if (!form) {
        const d: number[] = [];
        let x = 0;
        let y = 0;
        for (let i = 0; i + 1 < s.p.length; i += 2) {
          d.push(s.p[i] - x, s.p[i + 1] - y);
          x = s.p[i];
          y = s.p[i + 1];
        }
        form = [s.c, s.w, packSteps(d)];
        storedForm.set(s, form);
      }
      return form;
    }),
  };
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * A stored page read back, in the form written here ([colour, width, letters]) or the
 * first one ({ c, w, d: steps as numbers }, 0.4.16): anything not a stroke as written is
 * left out; colours, widths and points out of range are left out.
 */
export function decodeInk(raw: unknown): Ink {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { s?: unknown }).s) ? (raw as { s: unknown[] }).s : [];
  const strokes: Stroke[] = [];
  for (const item of list.slice(0, MAX_STROKES)) {
    if (!item || typeof item !== 'object') continue;
    let c: unknown, w: unknown, d: unknown;
    if (Array.isArray(item)) [c, w, d] = item;
    else ({ c, w, d } = item as { c?: unknown; w?: unknown; d?: unknown });
    if (!isNum(c) || !Number.isInteger(c) || c < -1 || c >= PEN_COLOURS.length) continue;
    if (!isNum(w) || w <= 0 || w > 40) continue;
    const steps = typeof d === 'string' ? unpackSteps(d, MAX_POINTS * 2) : Array.isArray(d) && d.every(isNum) ? (d as number[]).slice(0, MAX_POINTS * 2) : null;
    if (!steps || steps.length < 2 || steps.length % 2 !== 0) continue;
    const p: number[] = [];
    let x = 0;
    let y = 0;
    for (let i = 0; i + 1 < steps.length; i += 2) {
      x += steps[i];
      y += steps[i + 1];
      p.push(Math.round(x), Math.round(y));
    }
    if (p.some((v, i) => (i % 2 === 0 ? v < -50 || v > PAGE_WIDTH + 50 : v < -50 || v > PAGE_MAX_Y))) continue;
    const stroke = { c, w, p };
    strokes.push(stroke);
  }
  return { strokes };
}

/** Parses a stored entry; throws on text that is not JSON, so the store keeps it aside. */
export function parseInk(raw: string): Ink {
  return decodeInk(JSON.parse(raw));
}

/**
 * Adds a point to a stroke being written, in units, unless it is within a unit and a half
 * of the last one (a pen held still sends many).
 */
export function addPoint(points: number[], x: number, y: number): boolean {
  const px = Math.round(Math.min(PAGE_WIDTH, Math.max(0, x)));
  const py = Math.round(Math.max(0, y));
  const n = points.length;
  if (n >= 2 && Math.hypot(px - points[n - 2], py - points[n - 1]) < 1.5) return false;
  if (n >= MAX_POINTS * 2) return false;
  points.push(px, py);
  return true;
}

/** An SVG path through the points, smoothed by curves through the midpoints; a dot for one point. */
export function strokePath(p: number[]): string {
  if (p.length < 2) return '';
  if (p.length === 2) return `M${p[0]} ${p[1]}l0.01 0`;
  if (p.length === 4) return `M${p[0]} ${p[1]}L${p[2]} ${p[3]}`;
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i + 3 < p.length; i += 2) {
    const mx = (p[i] + p[i + 2]) / 2;
    const my = (p[i + 1] + p[i + 3]) / 2;
    d += `Q${p[i]} ${p[i + 1]} ${mx} ${my}`;
  }
  return `${d}L${p[p.length - 2]} ${p[p.length - 1]}`;
}

/** A finished stroke's path, made once. */
export function pathOf(s: Stroke): string {
  let d = paths.get(s);
  if (d === undefined) {
    d = strokePath(s.p);
    paths.set(s, d);
  }
  return d;
}

/** A stroke's left, top, right and bottom, in units (kept for each stroke). */
export function boundsOf(s: Stroke): [number, number, number, number] {
  let b = bounds.get(s);
  if (!b) {
    b = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i + 1 < s.p.length; i += 2) {
      if (s.p[i] < b[0]) b[0] = s.p[i];
      if (s.p[i + 1] < b[1]) b[1] = s.p[i + 1];
      if (s.p[i] > b[2]) b[2] = s.p[i];
      if (s.p[i + 1] > b[3]) b[3] = s.p[i + 1];
    }
    bounds.set(s, b);
  }
  return b;
}

/** Whether the point (x, y) is within r of the stroke's line. */
export function touchesStroke(s: Stroke, x: number, y: number, r: number): boolean {
  const reach = r + s.w / 2;
  // Most strokes are nowhere near: their bounds say so without looking at their points.
  const [x0, y0, x1, y1] = boundsOf(s);
  if (x < x0 - reach || x > x1 + reach || y < y0 - reach || y > y1 + reach) return false;
  const p = s.p;
  if (p.length === 2) return Math.hypot(x - p[0], y - p[1]) <= reach;
  for (let i = 0; i + 3 < p.length; i += 2) {
    if (segmentDistance(x, y, p[i], p[i + 1], p[i + 2], p[i + 3]) <= reach) return true;
  }
  return false;
}

function segmentDistance(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

/** The lowest point written on, in units. */
export function lowestPoint(ink: Ink): number {
  let low = 0;
  for (const s of ink.strokes) {
    const b = boundsOf(s)[3];
    if (b > low) low = b;
  }
  return low;
}

/** The page's height in units: the writing and room below it, at least `min`. */
export function pageHeight(ink: Ink, min: number): number {
  return Math.max(min, lowestPoint(ink) + ROOM_BELOW);
}

/** Store key of a page's ink. */
export const inkKey = (edition: string, pageId: string) => `ink.v1.${edition}.${pageId}`;
