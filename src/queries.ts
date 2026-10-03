import type { SQLiteDatabase } from 'expo-sqlite';
import { inflateSync, strFromU8 } from 'fflate';
import { malayalamPattern } from './malayalamSearch';
import type { MalayalamPattern } from './malayalamSearch';
import { plainText } from './text';
import type { Book, Heading, LexiconHit, Note, OriginalWord, Ref, RelatedWord, Rendering, StrongsEntry, TranslationId, VerseRow } from './types';

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
    'SELECT id, lemma, translit, pron, derivation, definition, kjv_usage, gloss, uses FROM strongs WHERE id = ?',
    id,
  );
}

/**
 * Words related to an entry through Strong's derivations: the ones it comes from (named
 * in its derivation) and the ones that name it in theirs, those it comes from first.
 */
export async function getRelated(db: SQLiteDatabase, entry: StrongsEntry, limit = 6): Promise<RelatedWord[]> {
  const parents = [...new Set((entry.derivation ?? '').match(/\b[HG]\d{1,4}\b/g) ?? [])].filter((id) => id !== entry.id);
  const out: RelatedWord[] = [];
  for (const id of parents.slice(0, limit)) {
    const row = await db.getFirstAsync<RelatedWord>('SELECT id, lemma, gloss FROM strongs WHERE id = ?', id);
    if (row) out.push(row);
  }
  if (out.length < limit) {
    // "H430 (" so that H4300 does not match; the derivations always name a word this way.
    const children = await db.getAllAsync<RelatedWord>(
      "SELECT id, lemma, gloss FROM strongs WHERE derivation LIKE ? ESCAPE '\\' AND gloss IS NOT NULL LIMIT ?",
      `%${entry.id} (%`,
      limit - out.length,
    );
    out.push(...children.filter((c) => c.id !== entry.id && !out.some((o) => o.id === c.id)));
  }
  return out;
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

/**
 * Every verse a word occurs in, from the Hebrew or Greek text itself rather than a
 * translation's tags, in KJV numbering (inTranslation renumbers them).
 */
export async function getOriginalRefs(db: SQLiteDatabase, strongs: string): Promise<Ref[]> {
  const row = await db.getFirstAsync<{ refs: Uint8Array | ArrayBuffer }>("SELECT refs FROM concordance WHERE strongs = ? AND translation = 'ORIG'", strongs);
  return row ? decodeRefs(row.refs) : [];
}

export async function getOriginalCount(db: SQLiteDatabase, strongs: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>("SELECT count FROM concordance WHERE strongs = ? AND translation = 'ORIG'", strongs);
  return row?.count ?? 0;
}

/**
 * KJV-numbered verses in a translation's own numbering (the Malayalam numbers some
 * verses differently), without repeats. A KJV verse gives the translation's verse of
 * the same number unless that one is mapped elsewhere, plus any verses mapped to it
 * (KJV 3 John 14 is Malayalam 14 and 15).
 */
export async function inTranslation(db: SQLiteDatabase, translation: TranslationId, refs: Ref[]): Promise<Ref[]> {
  const rows = await db.getAllAsync<{ book: number; chapter: number; verse: number; obook: number; ochapter: number; overse: number }>(
    'SELECT book, chapter, verse, obook, ochapter, overse FROM verse_map WHERE translation = ? ORDER BY book, chapter, verse, n',
    translation,
  );
  if (rows.length === 0) return refs;
  const fromKjv = new Map<string, Ref[]>();
  const mapped = new Set<string>();
  for (const r of rows) {
    const key = `${r.obook}:${r.ochapter}:${r.overse}`;
    fromKjv.set(key, [...(fromKjv.get(key) ?? []), { book: r.book, chapter: r.chapter, verse: r.verse }]);
    mapped.add(`${r.book}:${r.chapter}:${r.verse}`);
  }
  const out: Ref[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    const key = `${ref.book}:${ref.chapter}:${ref.verse}`;
    const same = mapped.has(key) ? [] : [ref];
    const all = [...same, ...(fromKjv.get(key) ?? [])].sort((a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse);
    for (const r of all) {
      const k = `${r.book}:${r.chapter}:${r.verse}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
  }
  return out;
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
  const malayalam = malayalamPattern(cleaned);
  if (malayalam) return searchMalayalam(db, translation, malayalam, limit);
  const pattern = '%' + cleaned.replace(/[\\%_]/g, (c) => '\\' + c).replace(/'/g, '_') + '%';
  return db.getAllAsync<VerseRow>(
    "SELECT book, chapter, verse, text, tags, omitted, para FROM verses WHERE translation = ? AND omitted = 0 AND text LIKE ? ESCAPE '\\' ORDER BY book, chapter, verse LIMIT ?",
    translation,
    pattern,
    limit,
  );
}

/**
 * Malayalam search: LIKE finds the verses that could match, a page at a time in book
 * order, and the exact pattern keeps the ones that do (src/malayalamSearch.ts).
 */
async function searchMalayalam(db: SQLiteDatabase, translation: TranslationId, pattern: MalayalamPattern, limit: number): Promise<VerseRow[]> {
  const exact = new RegExp(pattern.source);
  const out: VerseRow[] = [];
  const PAGE = 500;
  let after = [0, 0, 0];
  for (;;) {
    const rows = await db.getAllAsync<VerseRow>(
      "SELECT book, chapter, verse, text, tags, omitted, para FROM verses WHERE translation = ? AND omitted = 0 AND text LIKE ? ESCAPE '\\' AND (book, chapter, verse) > (?, ?, ?) ORDER BY book, chapter, verse LIMIT ?",
      translation,
      pattern.like,
      ...after,
      PAGE,
    );
    for (const row of rows) {
      if (!exact.test(row.text)) continue;
      out.push(row);
      if (out.length >= limit) return out;
    }
    if (rows.length < PAGE) return out;
    const last = rows[rows.length - 1];
    after = [last.book, last.chapter, last.verse];
  }
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
