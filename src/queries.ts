import type { SQLiteDatabase } from 'expo-sqlite';
import { inflateSync, strFromU8 } from 'fflate';
import type { Book, Heading, OriginalWord, Ref, StrongsEntry, TranslationId, VerseRow } from './types';

export async function getBooks(db: SQLiteDatabase): Promise<Book[]> {
  return db.getAllAsync<Book>('SELECT id, osis, name, testament, chapters FROM books ORDER BY id');
}

export interface ChapterData {
  verses: VerseRow[];
  headings: Heading[];
}

export async function getChapter(
  db: SQLiteDatabase,
  translation: TranslationId,
  book: number,
  chapter: number,
): Promise<ChapterData> {
  const [verses, headings] = await Promise.all([
    db.getAllAsync<VerseRow>(
      'SELECT book, chapter, verse, text, tags FROM verses WHERE translation = ? AND book = ? AND chapter = ? ORDER BY verse',
      translation,
      book,
      chapter,
    ),
    db.getAllAsync<Heading>(
      'SELECT before_verse, text FROM headings WHERE translation = ? AND book = ? AND chapter = ? ORDER BY before_verse',
      translation,
      book,
      chapter,
    ),
  ]);
  return { verses, headings };
}

export async function getStrongs(db: SQLiteDatabase, id: string): Promise<StrongsEntry | null> {
  return db.getFirstAsync<StrongsEntry>(
    'SELECT id, lemma, translit, pron, derivation, definition, kjv_usage FROM strongs WHERE id = ?',
    id,
  );
}

/** Every verse in which a Strong's number occurs, in canonical order. */
export async function getConcordance(
  db: SQLiteDatabase,
  strongs: string,
  translation: TranslationId,
): Promise<Ref[]> {
  const row = await db.getFirstAsync<{ refs: Uint8Array | ArrayBuffer }>(
    'SELECT refs FROM concordance WHERE strongs = ? AND translation = ?',
    strongs,
    translation,
  );
  if (!row) return [];
  const bytes = row.refs instanceof Uint8Array ? row.refs : new Uint8Array(row.refs);
  const refs: Ref[] = [];
  for (let i = 0; i + 2 < bytes.length; i += 3) {
    refs.push({ book: bytes[i], chapter: bytes[i + 1], verse: bytes[i + 2] });
  }
  return refs;
}

export async function getConcordanceCount(
  db: SQLiteDatabase,
  strongs: string,
  translation: TranslationId,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT count FROM concordance WHERE strongs = ? AND translation = ?',
    strongs,
    translation,
  );
  return row?.count ?? 0;
}

/** Fetch the text of specific verses. Keeps the order of `refs`. */
export async function getVerses(
  db: SQLiteDatabase,
  translation: TranslationId,
  refs: Ref[],
): Promise<VerseRow[]> {
  if (refs.length === 0) return [];
  const found = new Map<string, VerseRow>();
  const batch = 40;
  for (let i = 0; i < refs.length; i += batch) {
    const slice = refs.slice(i, i + batch);
    const where = slice.map(() => '(book = ? AND chapter = ? AND verse = ?)').join(' OR ');
    const params: (string | number)[] = [translation];
    for (const r of slice) params.push(r.book, r.chapter, r.verse);
    const rows = await db.getAllAsync<VerseRow>(
      `SELECT book, chapter, verse, text, tags FROM verses WHERE translation = ? AND (${where})`,
      params,
    );
    for (const row of rows) found.set(`${row.book}:${row.chapter}:${row.verse}`, row);
  }
  return refs.map((r) => found.get(`${r.book}:${r.chapter}:${r.verse}`)).filter((v): v is VerseRow => !!v);
}

/**
 * Plain text search. Case-insensitive for ASCII letters. A straight apostrophe in the
 * query matches either a straight or a curly apostrophe in the text.
 */
export async function searchText(
  db: SQLiteDatabase,
  translation: TranslationId,
  query: string,
  limit: number,
): Promise<VerseRow[]> {
  const cleaned = query.trim().replace(/\s+/g, ' ');
  if (!cleaned) return [];
  const pattern = '%' + cleaned.replace(/[\\%_]/g, (c) => '\\' + c).replace(/'/g, '_') + '%';
  return db.getAllAsync<VerseRow>(
    "SELECT book, chapter, verse, text, tags FROM verses WHERE translation = ? AND text LIKE ? ESCAPE '\\' ORDER BY book, chapter, verse LIMIT ?",
    translation,
    pattern,
    limit,
  );
}

/**
 * Hebrew or Greek words for every verse of a chapter, keyed by verse number.
 * Each chapter is stored as one deflate-compressed blob; see scripts/build-db.mjs.
 */
export async function getInterlinear(db: SQLiteDatabase, book: number, chapter: number): Promise<Map<number, OriginalWord[]>> {
  const row = await db.getFirstAsync<{ data: Uint8Array | ArrayBuffer }>(
    'SELECT data FROM interlinear WHERE book = ? AND chapter = ?',
    book,
    chapter,
  );
  const out = new Map<number, OriginalWord[]>();
  if (!row) return out;
  const bytes = row.data instanceof Uint8Array ? row.data : new Uint8Array(row.data);
  const text = strFromU8(inflateSync(bytes));
  for (const part of text.split('\x1c')) {
    const sep = part.indexOf('\x1d');
    if (sep < 0) continue;
    out.set(Number(part.slice(0, sep)), unpackWords(part.slice(sep + 1)));
  }
  return out;
}

export function unpackWords(packed: string): OriginalWord[] {
  if (!packed) return [];
  return packed.split('\x1e').map((rec) => {
    const [text = '', translit = '', gloss = '', strongs = '', morph = '', flags = '0'] = rec.split('\x1f');
    return { text, translit, gloss, strongs, morph, flags: Number(flags) || 0 };
  });
}

export async function getMeta(db: SQLiteDatabase): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM meta');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
