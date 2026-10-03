import type { Book, Ref, Segment, TranslationId, VerseRow } from './types';

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

/** The book's name as the given translation prints it; English for the English Bibles. */
export function bookName(books: Book[], id: number, translation?: TranslationId): string {
  const book = books.find((b) => b.id === id);
  if (!book) return `Book ${id}`;
  if (translation && translation !== 'KJV' && translation !== 'WEB') return book.names[translation] ?? book.name;
  return book.name;
}

export function formatRef(books: Book[], ref: Ref, translation?: TranslationId): string {
  const name = bookName(books, ref.book, translation);
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

/**
 * Strong's list of the KJV's renderings in plain words. Strong marks a rendering made
 * through an idiom ([idiom], or X in the Greek), as part of a phrase ([phrase]) or only
 * with other words (+); each mark becomes a word in brackets after the rendering:
 * "[idiom] exceeding" reads "exceeding (idiom)".
 */
export function plainKjvUsage(usage: string, labels: { idiom: string; phrase: string; with: string }): string {
  let text = usage.trim().replace(/\.$/, '');
  if (/^\([^()]*\)$/.test(text)) text = text.slice(1, -1);
  const items: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth = Math.max(0, depth - 1);
    else if (text[i] === ',' && depth === 0) {
      items.push(text.slice(start, i));
      start = i + 1;
    }
  }
  items.push(text.slice(start));
  return items
    .map((raw) => {
      let item = raw.trim();
      const marks: string[] = [];
      for (let m = /^(\[idiom\]|\[phrase\]|\+|X)\s+/.exec(item); m; m = /^(\[idiom\]|\[phrase\]|\+|X)\s+/.exec(item)) {
        const label = m[1] === '[phrase]' ? labels.phrase : m[1] === '+' ? labels.with : labels.idiom;
        if (!marks.includes(label)) marks.push(label);
        item = item.slice(m[0].length);
      }
      return marks.length ? `${item} (${marks.join(', ')})` : item;
    })
    .filter(Boolean)
    .join(', ')
    .replace(/\[(idiom|phrase)\]\s*/g, '');
}
