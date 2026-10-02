import type { SQLiteDatabase } from 'expo-sqlite';
import { inflateSync, strFromU8 } from 'fflate';
import { plainText } from './text';
import type { Book, Heading, LexiconHit, Note, OriginalWord, Ref, Rendering, StrongsEntry, TranslationId, VerseRow } from './types';

export async function getBooks(db: SQLiteDatabase): Promise<Book[]> {
  const [books, names] = await Promise.all([
    db.getAllAsync<Omit<Book, 'names'>>('SELECT id, osis, name, testament, chapters FROM books ORDER BY id'),
    db.getAllAsync<{ translation: TranslationId; book: number; name: string }>('SELECT translation, book, name FROM book_names'),
  ]);
  return books.map((b) => {
    const out: Book = { ...b, names: {} };
    for (const n of names) if (n.book === b.id) out.names[n.translation] = n.name;
    return out;
  });
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
      'SELECT book, chapter, verse, text, tags, omitted, para FROM verses WHERE translation = ? AND book = ? AND chapter = ? ORDER BY verse',
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

/** Footnotes and cross references of a chapter, keyed by verse. */
export async function getNotes(db: SQLiteDatabase, translation: TranslationId, book: number, chapter: number): Promise<Map<number, Note[]>> {
  const rows = await db.getAllAsync<Note>(
    'SELECT verse, n, pos, kind, text FROM notes WHERE translation = ? AND book = ? AND chapter = ? ORDER BY verse, n',
    translation,
    book,
    chapter,
  );
  const out = new Map<number, Note[]>();
  for (const row of rows) {
    const list = out.get(row.verse) ?? [];
    list.push(row);
    out.set(row.verse, list);
  }
  return out;
}

function decodeRefs(blob: Uint8Array | ArrayBuffer): Ref[] {
  const bytes = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
  const refs: Ref[] = [];
  for (let i = 0; i + 2 < bytes.length; i += 3) refs.push({ book: bytes[i], chapter: bytes[i + 1], verse: bytes[i + 2] });
  return refs;
}

/** The English words a translation uses for a Strong's number, most frequent first. */
export async function getRenderings(db: SQLiteDatabase, strongs: string, translation: TranslationId): Promise<Rendering[]> {
  return db.getAllAsync<Rendering>(
    'SELECT word, count FROM renderings WHERE strongs = ? AND translation = ? ORDER BY count DESC, word',
    strongs,
    translation,
  );
}

/** The verses in which a Strong's number is rendered by one particular word. */
export async function getRenderingRefs(db: SQLiteDatabase, strongs: string, translation: TranslationId, word: string): Promise<Ref[]> {
  const row = await db.getFirstAsync<{ refs: Uint8Array | ArrayBuffer }>(
    'SELECT refs FROM renderings WHERE strongs = ? AND translation = ? AND word = ?',
    strongs,
    translation,
    word,
  );
  return row ? decodeRefs(row.refs) : [];
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
  return row ? decodeRefs(row.refs) : [];
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
      `SELECT book, chapter, verse, text, tags, omitted, para FROM verses WHERE translation = ? AND (${where})`,
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
    "SELECT book, chapter, verse, text, tags, omitted, para FROM verses WHERE translation = ? AND omitted = 0 AND text LIKE ? ESCAPE '\\' ORDER BY book, chapter, verse LIMIT ?",
    translation,
    pattern,
    limit,
  );
}

/**
 * Hebrew or Greek words for every verse of a chapter, keyed by verse number in the
 * numbering of `translation`. The words follow the KJV numbering; a translation that
 * numbers some verses differently (the Malayalam in 15 chapters) has them remapped
 * through the verse_map table, which may draw on a neighbouring chapter.
 */
export async function getInterlinear(
  db: SQLiteDatabase,
  book: number,
  chapter: number,
  translation?: TranslationId,
): Promise<Map<number, OriginalWord[]>> {
  const out = await chapterWords(db, book, chapter);
  if (!translation) return out;
  const rows = await db.getAllAsync<{ verse: number; obook: number; ochapter: number; overse: number }>(
    'SELECT verse, obook, ochapter, overse FROM verse_map WHERE translation = ? AND book = ? AND chapter = ? ORDER BY verse, n',
    translation,
    book,
    chapter,
  );
  if (rows.length === 0) return out;
  const chapters = new Map([[`${book}:${chapter}`, out]]);
  const byVerse = new Map<number, OriginalWord[]>();
  for (const r of rows) {
    const key = `${r.obook}:${r.ochapter}`;
    if (!chapters.has(key)) chapters.set(key, await chapterWords(db, r.obook, r.ochapter));
    byVerse.set(r.verse, [...(byVerse.get(r.verse) ?? []), ...(chapters.get(key)?.get(r.overse) ?? [])]);
  }
  return new Map([...out, ...byVerse]);
}

/** The KJV-numbered verses that a verse of `translation` corresponds to (usually itself). */
export async function toKjvRefs(db: SQLiteDatabase, translation: TranslationId, ref: Ref): Promise<Ref[]> {
  const rows = await db.getAllAsync<{ obook: number; ochapter: number; overse: number }>(
    'SELECT obook, ochapter, overse FROM verse_map WHERE translation = ? AND book = ? AND chapter = ? AND verse = ? ORDER BY n',
    translation,
    ref.book,
    ref.chapter,
    ref.verse,
  );
  return rows.length ? rows.map((r) => ({ book: r.obook, chapter: r.ochapter, verse: r.overse })) : [ref];
}

/**
 * The same verse in another translation's numbering, or null when that translation
 * has no such verse (Acts 15:34 in the Malayalam, for example).
 */
export async function mapRef(db: SQLiteDatabase, from: TranslationId, to: TranslationId, ref: Ref): Promise<Ref | null> {
  if (from === to) return ref;
  const kjv = (await toKjvRefs(db, from, ref))[0];
  // A verse with the same number that is not itself renumbered, and exists, is the match.
  const remapped = await db.getFirstAsync<{ x: number }>(
    'SELECT 1 AS x FROM verse_map WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?',
    to,
    kjv.book,
    kjv.chapter,
    kjv.verse,
  );
  if (!remapped) {
    const exists = await db.getFirstAsync<{ x: number }>(
      'SELECT 1 AS x FROM verses WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?',
      to,
      kjv.book,
      kjv.chapter,
      kjv.verse,
    );
    if (exists) return kjv;
  }
  return db.getFirstAsync<Ref>(
    'SELECT book, chapter, verse FROM verse_map WHERE translation = ? AND obook = ? AND ochapter = ? AND overse = ? ORDER BY book, chapter, verse LIMIT 1',
    to,
    kjv.book,
    kjv.chapter,
    kjv.verse,
  );
}

/** Words of one chapter, keyed by KJV verse number. */
async function chapterWords(db: SQLiteDatabase, book: number, chapter: number): Promise<Map<number, OriginalWord[]>> {
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
    const [text = '', translit = '', gloss = '', strongs = '', morph = '', flags = '0', alt] = rec.split('\x1f');
    return { text, translit, gloss, strongs, morph, flags: Number(flags) || 0, ...(alt ? { alt } : {}) };
  });
}

/**
 * Dictionary entries matching a typed word: a transliteration or lemma prefix
 * (accent-insensitive), an English rendering in the KJV, or a word in the definition.
 */
export async function searchLexicon(db: SQLiteDatabase, query: string, limit: number): Promise<LexiconHit[]> {
  const q = plainText(query.replace(/\s+/g, ' '));
  if (q.length < 2) return [];
  const escaped = q.replace(/[\\%_]/g, (c) => '\\' + c);
  const prefix = escaped + '%';
  const word = '%' + escaped + '%';
  return db.getAllAsync<LexiconHit>(
    `SELECT id, lemma, translit, pron, derivation, definition, kjv_usage,
            CASE WHEN translit_plain LIKE ? ESCAPE '\\' OR lemma_plain LIKE ? ESCAPE '\\' THEN 0
                 WHEN lower(kjv_usage) LIKE ? ESCAPE '\\' THEN 1 ELSE 2 END AS rank
     FROM strongs
     WHERE translit_plain LIKE ? ESCAPE '\\' OR lemma_plain LIKE ? ESCAPE '\\'
        OR lower(kjv_usage) LIKE ? ESCAPE '\\' OR lower(definition) LIKE ? ESCAPE '\\'
     ORDER BY rank, length(translit_plain), id
     LIMIT ?`,
    prefix,
    prefix,
    word,
    prefix,
    prefix,
    word,
    word,
    limit,
  );
}

export async function getMeta(db: SQLiteDatabase): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM meta');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
