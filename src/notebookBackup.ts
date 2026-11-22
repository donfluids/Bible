import { decodeInk, encodeInk } from './ink';
import type { Ink } from './ink';
import type { NotePage } from './notebook';
import { HIGHLIGHT_COLORS } from './types';
import type { Bookmark, HighlightColor, TextMark, TranslationId } from './types';

/**
 * A backup: every notebook page, typed and handwritten (with its strokes), and the
 * bookmarks, highlights, marked text and verse notes, in one JSON file the reader keeps
 * where they like (Drive, Files, another phone) and brings back with Restore. Read back
 * field by field: a file from elsewhere is not trusted.
 */
export const BACKUP_KIND = 'riversresearch-notebook';
export const BACKUP_VERSION = 1;
/** Larger files are refused before they are read into memory. */
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
const MAX_PAGES = 5000;
const MAX_BACKUP_POINTS = 3_000_000;
const MAX_TITLE = 500;
const MAX_BODY = 500_000;
const ID = /^[a-z0-9]{1,24}$/;
const MAX_SAVED = 100_000;
const MAX_NOTE = 50_000;
const VERSE_KEY = /^(\d{1,2}):(\d{1,3}):(\d{1,3})$/;
const TRANSLATION = /^[A-Z0-9]{2,8}$/;
const MARK_ID = /^[A-Za-z0-9_-]{1,40}$/;

/** What the reader keeps beside the notebook (the settings' bookmarks, highlights, marks and notes). */
export interface SavedItems {
  bookmarks: Bookmark[];
  highlights: Record<string, HighlightColor>;
  marks: TextMark[];
  notes: Record<string, string>;
}

export interface Backup {
  /** The edition the backup was made in ('en', 'ml', 'ta'), or null if the file does not say. */
  edition: string | null;
  pages: NotePage[];
  /** The strokes of the handwritten pages, by page id. */
  ink: Map<string, Ink>;
  /** Bookmarks, highlights, marks and notes; null in a file from before they were kept. */
  saved: SavedItems | null;
}

/** The backup file's contents. `inkOf` gives a handwritten page's strokes (null if none). */
export function makeBackup(pages: NotePage[], inkOf: (id: string) => Ink | null, edition: string, saved: SavedItems | null = null, now = new Date()): string {
  return JSON.stringify({
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    edition,
    exported: now.toISOString(),
    pages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      created: p.created,
      updated: p.updated,
      ...(p.ink ? { ink: { paper: p.ink.paper, strokes: p.ink.strokes }, inkData: encodeInk(inkOf(p.id) ?? { strokes: [] }) } : {}),
    })),
    ...(saved ? { saved } : {}),
  });
}

const isTime = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 1e14;

/** A backup file read back; throws with a short reason on a file that is not one. */
export function readBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('not JSON');
  }
  if (!raw || typeof raw !== 'object' || (raw as { kind?: unknown }).kind !== BACKUP_KIND) throw new Error('not a notebook backup');
  const list = (raw as { pages?: unknown }).pages;
  if (!Array.isArray(list)) throw new Error('no pages');
  const pages: NotePage[] = [];
  const ink = new Map<string, Ink>();
  const seen = new Set<string>();
  // The points all pages' handwriting may hold together (a full page of 20,000 strokes is
  // far less; the app's own backups never reach it).
  const budget = { points: MAX_BACKUP_POINTS };
  for (const item of list.slice(0, MAX_PAGES)) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    if (typeof p.id !== 'string' || !ID.test(p.id) || seen.has(p.id)) continue;
    const title = typeof p.title === 'string' ? p.title.slice(0, MAX_TITLE) : '';
    const body = typeof p.body === 'string' ? p.body.slice(0, MAX_BODY) : '';
    // Times from the file are kept no later than now, and a page with none counts as the
    // oldest, so a page from the file never replaces a newer one here by its date alone.
    const now = Date.now();
    const created = isTime(p.created) ? Math.min(p.created, now) : 1;
    const updated = isTime(p.updated) ? Math.min(p.updated, now) : created;
    const page: NotePage = { id: p.id, title, body, created, updated };
    if (p.ink && typeof p.ink === 'object') {
      const strokes = decodeInk(p.inkData, budget);
      page.ink = { paper: (p.ink as { paper?: unknown }).paper === 'lined' ? 'lined' : 'plain', strokes: strokes.strokes.length };
      ink.set(p.id, strokes);
    }
    if (!title.trim() && !body.trim() && !(page.ink && page.ink.strokes > 0)) continue;
    seen.add(p.id);
    pages.push(page);
  }
  const edition = (raw as { edition?: unknown }).edition;
  // The app it was made in (src/edition.ts: en, ml, ta or the four-language all).
  return { edition: typeof edition === 'string' && /^(en|ml|ta|all)$/.test(edition) ? edition : null, pages, ink, saved: readSaved((raw as { saved?: unknown }).saved) };
}

const isCount = (n: unknown, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max;
const isColour = (c: unknown): c is HighlightColor => typeof c === 'string' && (HIGHLIGHT_COLORS as string[]).includes(c);
const isVerseKey = (k: string) => {
  const m = VERSE_KEY.exec(k);
  return !!m && +m[1] >= 1 && +m[1] <= 66 && +m[2] >= 1;
};
const entries = (o: unknown): [string, unknown][] => (o && typeof o === 'object' && !Array.isArray(o) ? Object.entries(o).slice(0, MAX_SAVED) : []);

/** The saved items of a backup, each checked; anything malformed is left out. */
function readSaved(raw: unknown): SavedItems | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const now = Date.now();
  const bookmarks: Bookmark[] = [];
  for (const b of Array.isArray(r.bookmarks) ? r.bookmarks.slice(0, MAX_SAVED) : []) {
    if (!b || typeof b !== 'object') continue;
    const x = b as Record<string, unknown>;
    if (!isCount(x.book, 66) || x.book < 1 || !isCount(x.chapter, 200) || x.chapter < 1 || !isCount(x.verse, 200)) continue;
    if (typeof x.translation !== 'string' || !TRANSLATION.test(x.translation)) continue;
    bookmarks.push({ book: x.book, chapter: x.chapter, verse: x.verse, translation: x.translation as TranslationId, added: isTime(x.added) ? Math.min(x.added, now) : now });
  }
  const highlights: Record<string, HighlightColor> = {};
  for (const [k, c] of entries(r.highlights)) if (isVerseKey(k) && isColour(c)) highlights[k] = c;
  const notes: Record<string, string> = {};
  for (const [k, n] of entries(r.notes)) if (isVerseKey(k) && typeof n === 'string' && n.trim()) notes[k] = n.slice(0, MAX_NOTE);
  const marks: TextMark[] = [];
  const point = (p: unknown) => {
    const x = p as Record<string, unknown> | null;
    return x && typeof x === 'object' && isCount(x.verse, 200) && isCount(x.offset, 100_000) ? { verse: x.verse, offset: x.offset } : null;
  };
  for (const m of Array.isArray(r.marks) ? r.marks.slice(0, MAX_SAVED) : []) {
    if (!m || typeof m !== 'object') continue;
    const x = m as Record<string, unknown>;
    const from = point(x.from);
    const to = point(x.to);
    if (typeof x.id !== 'string' || !MARK_ID.test(x.id) || typeof x.translation !== 'string' || !TRANSLATION.test(x.translation)) continue;
    if (!isCount(x.book, 66) || x.book < 1 || !isCount(x.chapter, 200) || x.chapter < 1 || !from || !to || !isColour(x.color)) continue;
    if (to.verse < from.verse || (to.verse === from.verse && to.offset <= from.offset)) continue;
    marks.push({ id: x.id, translation: x.translation as TranslationId, book: x.book, chapter: x.chapter, from, to, color: x.color, added: isTime(x.added) ? Math.min(x.added, now) : now });
  }
  return { bookmarks, highlights, marks, notes };
}

/**
 * The saved items after a restore: what the file has and this phone does not is added;
 * what is here already stays as it is (a verse's own highlight or note is not replaced).
 */
export function mergeSaved(here: SavedItems, incoming: SavedItems): { saved: SavedItems; added: number } {
  let added = 0;
  const verseKey = (b: { book: number; chapter: number; verse: number }) => `${b.book}:${b.chapter}:${b.verse}`;
  const marked = new Set(here.bookmarks.map(verseKey));
  const bookmarks = [...here.bookmarks];
  for (const b of incoming.bookmarks) {
    if (marked.has(verseKey(b))) continue;
    marked.add(verseKey(b));
    bookmarks.push(b);
    added++;
  }
  const highlights = { ...here.highlights };
  for (const [k, c] of Object.entries(incoming.highlights)) {
    if (highlights[k]) continue;
    highlights[k] = c;
    added++;
  }
  const notes = { ...here.notes };
  for (const [k, n] of Object.entries(incoming.notes)) {
    if (notes[k]) continue;
    notes[k] = n;
    added++;
  }
  const ids = new Set(here.marks.map((m) => m.id));
  const marks = [...here.marks];
  for (const m of incoming.marks) {
    if (ids.has(m.id)) continue;
    ids.add(m.id);
    marks.push(m);
    added++;
  }
  return { saved: { bookmarks, highlights, marks, notes }, added };
}

export interface MergeResult {
  pages: NotePage[];
  /** Pages taken from the backup (new, or newer than the one here): their ink is written too. */
  taken: string[];
  added: number;
  updated: number;
  kept: number;
}

/**
 * The notebook after a restore: pages from the backup are added, a page already here is
 * replaced only by a newer copy of itself, and nothing here is deleted. Newest edited first.
 */
export function mergePages(existing: NotePage[], incoming: NotePage[]): MergeResult {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const taken: string[] = [];
  let added = 0;
  let updated = 0;
  let kept = 0;
  for (const p of incoming) {
    const here = byId.get(p.id);
    if (!here) {
      byId.set(p.id, p);
      taken.push(p.id);
      added++;
    } else if (p.updated > here.updated) {
      byId.set(p.id, p);
      taken.push(p.id);
      updated++;
    } else kept++;
  }
  const pages = [...byId.values()].sort((a, b) => b.updated - a.updated);
  return { pages, taken, added, updated, kept };
}
