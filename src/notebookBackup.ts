import { decodeInk, encodeInk } from './ink';
import type { Ink } from './ink';
import type { NotePage } from './notebook';

/**
 * A notebook backup: every page, typed and handwritten (with its strokes), in one JSON
 * file the reader keeps where they like (Drive, Files, another phone) and brings back with
 * Restore. Read back field by field: a file from elsewhere is not trusted.
 */
export const BACKUP_KIND = 'riversresearch-notebook';
export const BACKUP_VERSION = 1;
/** Larger files are refused before they are read into memory. */
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
const MAX_PAGES = 5000;
const MAX_TITLE = 500;
const MAX_BODY = 500_000;
const ID = /^[a-z0-9]{1,24}$/;

export interface Backup {
  /** The edition the backup was made in ('en', 'ml', 'ta'), or null if the file does not say. */
  edition: string | null;
  pages: NotePage[];
  /** The strokes of the handwritten pages, by page id. */
  ink: Map<string, Ink>;
}

/** The backup file's contents. `inkOf` gives a handwritten page's strokes (null if none). */
export function makeBackup(pages: NotePage[], inkOf: (id: string) => Ink | null, edition: string, now = new Date()): string {
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
      const strokes = decodeInk(p.inkData);
      page.ink = { paper: (p.ink as { paper?: unknown }).paper === 'lined' ? 'lined' : 'plain', strokes: strokes.strokes.length };
      ink.set(p.id, strokes);
    }
    if (!title.trim() && !body.trim() && !(page.ink && page.ink.strokes > 0)) continue;
    seen.add(p.id);
    pages.push(page);
  }
  const edition = (raw as { edition?: unknown }).edition;
  // The app it was made in (src/edition.ts: en, ml, ta or the four-language all).
  return { edition: typeof edition === 'string' && /^(en|ml|ta|all)$/.test(edition) ? edition : null, pages, ink };
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
