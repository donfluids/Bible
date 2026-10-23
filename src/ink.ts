/**
 * Handwritten notebook pages: the strokes, how they are kept, read back and drawn.
 *
 * A page is PAGE_WIDTH units wide whatever the screen, so writing done on a phone shows
 * the same on a tablet, larger. A stroke's points are whole units, each stored as the
 * step from the one before (small numbers, a short entry).
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

/** Limits on what is read back, so a damaged entry cannot stall the page. */
const MAX_STROKES = 20000;
const MAX_POINTS = 4000;

export const emptyInk = (): Ink => ({ strokes: [] });

/** The stored form: each stroke's points as steps from the one before. */
export function encodeInk(ink: Ink): unknown {
  return {
    v: 1,
    s: ink.strokes.map((s) => {
      const d: number[] = [];
      let x = 0;
      let y = 0;
      for (let i = 0; i + 1 < s.p.length; i += 2) {
        d.push(s.p[i] - x, s.p[i + 1] - y);
        x = s.p[i];
        y = s.p[i + 1];
      }
      return { c: s.c, w: s.w, d };
    }),
  };
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * A stored page read back: anything not a stroke as written here is left out; colours,
 * widths and points out of range are left out or brought into range.
 */
export function decodeInk(raw: unknown): Ink {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { s?: unknown }).s) ? (raw as { s: unknown[] }).s : [];
  const strokes: Stroke[] = [];
  for (const item of list.slice(0, MAX_STROKES)) {
    if (!item || typeof item !== 'object') continue;
    const { c, w, d } = item as { c?: unknown; w?: unknown; d?: unknown };
    if (!isNum(c) || !Number.isInteger(c) || c < -1 || c >= PEN_COLOURS.length) continue;
    if (!isNum(w) || w <= 0 || w > 40) continue;
    if (!Array.isArray(d) || d.length < 2 || d.length % 2 !== 0) continue;
    const p: number[] = [];
    let x = 0;
    let y = 0;
    let ok = true;
    for (let i = 0; i + 1 < Math.min(d.length, MAX_POINTS * 2); i += 2) {
      if (!isNum(d[i]) || !isNum(d[i + 1])) {
        ok = false;
        break;
      }
      x += d[i];
      y += d[i + 1];
      p.push(Math.round(x), Math.round(y));
    }
    if (!ok || p.some((v, i) => (i % 2 === 0 ? v < -50 || v > PAGE_WIDTH + 50 : v < -50 || v > 1e6))) continue;
    strokes.push({ c, w, p });
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

/** Whether the point (x, y) is within r of the stroke's line. */
export function touchesStroke(s: Stroke, x: number, y: number, r: number): boolean {
  const reach = r + s.w / 2;
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
  for (const s of ink.strokes) for (let i = 1; i < s.p.length; i += 2) if (s.p[i] > low) low = s.p[i];
  return low;
}

/** The page's height in units: the writing and room below it, at least `min`. */
export function pageHeight(ink: Ink, min: number): number {
  return Math.max(min, lowestPoint(ink) + ROOM_BELOW);
}

/** Store key of a page's ink. */
export const inkKey = (edition: string, pageId: string) => `ink.v1.${edition}.${pageId}`;
