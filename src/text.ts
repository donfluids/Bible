import type { Book, Ref, Segment, VerseRow } from './types';

/** Strong's numbers are Hebrew in the Old Testament and Greek in the New. */
export function strongsPrefix(book: number): 'H' | 'G' {
  return book <= 39 ? 'H' : 'G';
}

export function isHebrew(strongs: string): boolean {
  return strongs.startsWith('H');
}

/**
 * Expand a verse's offset-encoded tags into text runs.
 * Tags are "gap,length,number" triples; see scripts/build-db.mjs.
 */
export function parseSegments(verse: Pick<VerseRow, 'book' | 'text' | 'tags'>): Segment[] {
  const { text, tags } = verse;
  if (!tags) return [{ text }];
  const prefix = strongsPrefix(verse.book);
  const out: Segment[] = [];
  let pos = 0;
  for (const triple of tags.split(' ')) {
    const [gap, len, num] = triple.split(',').map(Number);
    if (Number.isNaN(gap) || Number.isNaN(len) || Number.isNaN(num)) continue;
    if (gap > 0) out.push({ text: text.slice(pos, pos + gap) });
    pos += gap;
    out.push({ text: text.slice(pos, pos + len), strongs: prefix + num });
    pos += len;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}

export function bookName(books: Book[], id: number): string {
  return books.find((b) => b.id === id)?.name ?? `Book ${id}`;
}

export function formatRef(books: Book[], ref: Ref): string {
  const name = bookName(books, ref.book);
  return ref.verse === 0 ? `${name} ${ref.chapter} (title)` : `${name} ${ref.chapter}:${ref.verse}`;
}

export function refKey(ref: Ref): string {
  return `${ref.book}:${ref.chapter}:${ref.verse}`;
}

/** Remove Hebrew cantillation marks, keeping vowel points. */
export function stripCantillation(text: string): string {
  return text.replace(/[\u0591-\u05AF]/g, '');
}

/** Verse text as a single line for copying or sharing. */
export function flattenVerse(text: string): string {
  return text.replace(/[\n\u2003]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Same normalisation as the build script's plainText(), for dictionary search. */
export function plainText(text: string): string {
  const base = typeof text.normalize === 'function' ? text.normalize('NFD') : text;
  return base
    .replace(/[\u0300-\u036f\u0591-\u05c7\u05f0-\u05f4]/g, '')
    .replace(/ς/g, 'σ')
    .replace(/[ʼʻ'’ʾʿ]/g, '')
    .toLowerCase()
    .trim();
}

/** Width of the reading column on wide screens such as tablets and landscape phones. */
export const MAX_CONTENT_WIDTH = 720;

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}
