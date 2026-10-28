import type { SQLiteDatabase } from 'expo-sqlite';
import { inflateSync, strFromU8 } from 'fflate';
import { hindiPattern } from './hindiSearch';
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

/** A fuller dictionary entry for a Strong's number (Abbott-Smith or BDB Glosses), or null. */
export async function getLexicon(db: SQLiteDatabase, id: string): Promise<{ source: 'AS' | 'BDB'; body: string } | null> {
  return db.getFirstAsync<{ source: 'AS' | 'BDB'; body: string }>('SELECT source, body FROM lexicon WHERE id = ?', id).catch(() => null);
}

/**
 * Words related to an entry through Strong's derivations: the ones it comes from (named
 * in its derivation) and the ones that name it in theirs, those it comes from first.
 */
export async function getRelated(db: SQLiteDatabase, entry: StrongsEntry, limit = 6): Promise<RelatedWord[]> {
  const parents = [...new Set((entry.derivation ?? '').match(/\b[HG]\d{1,4}\b/g) ?? [])].filter((id) => id !== entry.id);
  const wanted = parents.slice(0, limit);
  // One query for all of them, kept in the order the derivation names them.
  const rows = wanted.length
    ? await db.getAllAsync<RelatedWord>(`SELECT id, lemma, gloss FROM strongs WHERE id IN (${wanted.map(() => '?').join(', ')})`, ...wanted)
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: RelatedWord[] = wanted.map((id) => byId.get(id)).filter((r): r is RelatedWord => !!r);
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
    const moved = fromKjv.get(key);
    if (!moved) {
      // Most verses: numbered alike, nothing to merge or sort.
      if (!mapped.has(key) && !seen.has(key)) {
        seen.add(key);
        out.push(ref);
      }
      continue;
    }
    const same = mapped.has(key) ? [] : [ref];
    const all = [...same, ...moved].sort((a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse);
    for (const r of all) {
      const k = `${r.book}:${r.chapter}:${r.verse}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}

/**
 * Fetch the text of specific verses. Keeps the order of `refs`. The verses are looked up
 * by key as a list of (book, chapter, verse) values; written as ORs of ANDs, SQLite scans
 * the whole translation once there are three or more.
 */
export async function getVerses(
  db: SQLiteDatabase,
  translation: TranslationId,
  refs: Ref[],
): Promise<VerseRow[]> {
  if (refs.length === 0) return [];
  const found = new Map<string, VerseRow>();
  const batch = 200;
  for (let i = 0; i < refs.length; i += batch) {
    const slice = refs.slice(i, i + batch);
    const values = slice.map(() => '(?, ?, ?)').join(', ');
    const params: (string | number)[] = [translation];
    for (const r of slice) params.push(r.book, r.chapter, r.verse);
    const rows = await db.getAllAsync<VerseRow>(
      `SELECT book, chapter, verse, text, tags, omitted, para FROM verses WHERE translation = ? AND (book, chapter, verse) IN (VALUES ${values})`,
      params,
    );
    for (const row of rows) found.set(`${row.book}:${row.chapter}:${row.verse}`, row);
  }
  return refs.map((r) => found.get(`${r.book}:${r.chapter}:${r.verse}`)).filter((v): v is VerseRow => !!v);
}

const verseCounts = new Map<string, Promise<Map<string, number>>>();

/** The last verse number of every chapter in a translation ("book:chapter" to number), read once. */
export function getVerseCounts(db: SQLiteDatabase, translation: TranslationId): Promise<Map<string, number>> {
  let counts = verseCounts.get(translation);
  if (!counts) {
    counts = db
      .getAllAsync<{ book: number; chapter: number; n: number }>('SELECT book, chapter, MAX(verse) AS n FROM verses WHERE translation = ? GROUP BY book, chapter', translation)
      .then((rows) => new Map(rows.map((r) => [`${r.book}:${r.chapter}`, r.n])));
    counts.catch(() => verseCounts.delete(translation));
    verseCounts.set(translation, counts);
  }
  return counts;
}

/**
 * Plain text search: every matching verse, as references in book order (the verses
 * themselves are read a page at a time with getVerses). Case-insensitive for ASCII
 * letters. A straight apostrophe in the query matches either a straight or a curly
 * apostrophe in the text.
 */
export async function searchText(
  db: SQLiteDatabase,
  translation: TranslationId,
  query: string,
  /** True once the result is no longer wanted (more has been typed); a long search then stops early. */
  stale?: () => boolean,
): Promise<Ref[]> {
  // Joiners a keyboard may add are dropped: the Tamil text has none.
  const cleaned = query.trim().replace(/\s+/g, ' ').replace(/[\u200c\u200d]/g, (c) => (/[\u0b80-\u0bff]/.test(query) ? '' : c));
  if (!cleaned) return [];
  const malayalam = malayalamPattern(cleaned);
  if (malayalam) return searchMalayalam(db, translation, malayalam, stale);
  const hindi = hindiPattern(cleaned);
  if (hindi) return searchMalayalam(db, translation, hindi, stale);
  const pattern = '%' + cleaned.replace(/[\\%_]/g, (c) => '\\' + c).replace(/'/g, '_') + '%';
  return db.getAllAsync<Ref>(
    "SELECT book, chapter, verse FROM verses WHERE translation = ? AND omitted = 0 AND text LIKE ? ESCAPE '\\' ORDER BY book, chapter, verse",
    translation,
    pattern,
  );
}

/**
 * Malayalam and Hindi search: LIKE finds the verses that could match, a page at a time in
 * book order, and the exact pattern keeps the ones that do (src/malayalamSearch.ts,
 * src/hindiSearch.ts).
 */
async function searchMalayalam(
  db: SQLiteDatabase,
  translation: TranslationId,
  pattern: MalayalamPattern,
  stale?: () => boolean,
): Promise<Ref[]> {
  const exact = new RegExp(pattern.source);
  const out: Ref[] = [];
  const PAGE = 500;
  let after = [0, 0, 0];
  // The spelled-out alternatives keep most non-matching verses in the database (ശൗൽ reads
  // a few hundred rows instead of 15,000); the exact match below decides as before.
  const tighter = pattern.alternatives.length > 0 ? ` AND (${pattern.alternatives.map(() => "text LIKE ? ESCAPE '\\'").join(' OR ')})` : '';
  for (;;) {
    if (stale?.()) return out;
    const rows = await db.getAllAsync<VerseRow>(
      `SELECT book, chapter, verse, text FROM verses WHERE translation = ? AND omitted = 0 AND text LIKE ? ESCAPE '\\'${tighter} AND (book, chapter, verse) > (?, ?, ?) ORDER BY book, chapter, verse LIMIT ?`,
      translation,
      pattern.like,
      ...pattern.alternatives,
      ...after,
      PAGE,
    );
    for (const row of rows) if (exact.test(row.text)) out.push({ book: row.book, chapter: row.chapter, verse: row.verse });
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

/**
 * For side-by-side reading: the verses of `to` beside each verse of a chapter of `from`,
 * keyed by that verse's number. Usually the verse of the same number. Where a Bible
 * numbers verses differently from the KJV (the Malayalam in 15 chapters), the verse_map
 * table takes the verse to its KJV verses and from those to the other Bible's, which may
 * lie in a neighbouring chapter. One of the two is the KJV.
 */
export async function getBeside(db: SQLiteDatabase, from: TranslationId, to: TranslationId, book: number, chapter: number, verses: number[]): Promise<Map<number, VerseRow[]>> {
  const key = (r: Ref) => `${r.book}:${r.chapter}:${r.verse}`;
  // From a verse of `from` to KJV-numbered verses.
  const rows = await db.getAllAsync<{ verse: number; obook: number; ochapter: number; overse: number }>(
    'SELECT verse, obook, ochapter, overse FROM verse_map WHERE translation = ? AND book = ? AND chapter = ? ORDER BY verse, n',
    from,
    book,
    chapter,
  );
  const mapped = new Map<number, Ref[]>();
  for (const r of rows) mapped.set(r.verse, [...(mapped.get(r.verse) ?? []), { book: r.obook, chapter: r.ochapter, verse: r.overse }]);
  const kjv = new Map<number, Ref[]>(verses.map((v) => [v, mapped.get(v) ?? [{ book, chapter, verse: v }]]));
  // From KJV-numbered verses to the verses of `to` that hold them; a verse `to` does not
  // renumber is its own.
  let wanted = kjv;
  if (to !== 'KJV') {
    const back = await db.getAllAsync<{ book: number; chapter: number; verse: number; obook: number; ochapter: number; overse: number }>(
      'SELECT book, chapter, verse, obook, ochapter, overse FROM verse_map WHERE translation = ? AND obook = ? AND ochapter BETWEEN ? AND ? ORDER BY book, chapter, verse, n',
      to,
      book,
      chapter - 1,
      chapter + 1,
    );
    const holders = new Map<string, Ref[]>();
    const renumbered = new Set<string>();
    for (const r of back) {
      const k = key({ book: r.obook, chapter: r.ochapter, verse: r.overse });
      holders.set(k, [...(holders.get(k) ?? []), { book: r.book, chapter: r.chapter, verse: r.verse }]);
      renumbered.add(key(r));
    }
    wanted = new Map();
    for (const [v, refs] of kjv) {
      const out: Ref[] = [];
      // The verse of the same number, unless `to` gives it elsewhere, and any verse `to`
      // takes it into (one KJV verse may be two, as 1 Timothy 6:21 in the Malayalam).
      for (const r of refs) for (const h of [...(renumbered.has(key(r)) ? [] : [r]), ...(holders.get(key(r)) ?? [])]) if (!out.some((o) => key(o) === key(h))) out.push(h);
      out.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
      wanted.set(v, out);
    }
  }
  const found = await getVerses(db, to, [...wanted.values()].flat());
  const byRef = new Map(found.map((v) => [key(v), v]));
  const out = new Map<number, VerseRow[]>();
  for (const [v, refs] of wanted) {
    const beside = refs.map((r) => byRef.get(key(r))).filter((x): x is VerseRow => !!x && !x.omitted);
    if (beside.length) out.set(v, beside);
  }
  return out;
}

/**
 * The verses linked to a verse: its cross references (OpenBible.info's list, from the
 * Treasury of Scripture Knowledge), or its parallel passages (the United Bible Societies'
 * list: the same event or words elsewhere, as Mark 5:1-3 for Matthew 8:28). Both tables
 * hold KJV-numbered verses in the same layout.
 */
export type LinkKind = 'crossrefs' | 'parallels';

/** A cross reference or parallel passage, in the numbering of the Bible being read: a verse or a range. */
export interface CrossRef {
  start: Ref;
  end: Ref;
  /** The first verses of the range, in the Bible being read. */
  verses: VerseRow[];
  /** How many more verses the range holds. */
  more: number;
}

/** At most this many verses of a range are quoted under it. */
const CROSS_SHOWN = 3;
/** At most this many cross references for one verse (two KJV verses may each have ten). */
const CROSS_MAX = 12;

/** The KJV-numbered verses a crossrefs row points at, in its order: [start, end] pairs. */
function decodeCrossRefs(blob: Uint8Array): [Ref, Ref][] {
  const out: [Ref, Ref][] = [];
  for (let i = 0; i + 5 < blob.length; i += 6) {
    out.push([
      { book: blob[i], chapter: blob[i + 1], verse: blob[i + 2] },
      { book: blob[i + 3], chapter: blob[i + 4], verse: blob[i + 5] },
    ]);
  }
  return out;
}

/** How many cross references (or parallel passages) a verse of `translation` has (for the verse menu). */
export async function countCrossRefs(db: SQLiteDatabase, translation: TranslationId, ref: Ref, kind: LinkKind = 'crossrefs'): Promise<number> {
  return (await crossRefTargets(db, translation, ref, kind)).length;
}

async function crossRefTargets(db: SQLiteDatabase, translation: TranslationId, ref: Ref, kind: LinkKind): Promise<[Ref, Ref][]> {
  const seen = new Set<string>();
  const out: [Ref, Ref][] = [];
  for (const kjv of await toKjvRefs(db, translation, ref)) {
    const row = await db.getFirstAsync<{ refs: Uint8Array }>(`SELECT refs FROM ${kind === 'parallels' ? 'parallels' : 'crossrefs'} WHERE book = ? AND chapter = ? AND verse = ?`, kjv.book, kjv.chapter, kjv.verse);
    if (!row) continue;
    for (const pair of decodeCrossRefs(new Uint8Array(row.refs))) {
      const key = `${pair[0].book}:${pair[0].chapter}:${pair[0].verse}-${pair[1].chapter}:${pair[1].verse}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(pair);
    }
  }
  return out.slice(0, CROSS_MAX);
}

/**
 * The cross references of a verse of `translation` (the strongest first), or its parallel
 * passages (in Bible order), each with the first verses of its range in `translation`. The
 * lists are in KJV numbering; a Bible that numbers verses differently has them mapped both ways.
 */
export async function getCrossRefs(db: SQLiteDatabase, translation: TranslationId, ref: Ref, kind: LinkKind = 'crossrefs'): Promise<CrossRef[]> {
  const out: CrossRef[] = [];
  for (const [start, end] of await crossRefTargets(db, translation, ref, kind)) {
    // The KJV verses of the range, which may run into the next chapter.
    const range = await db.getAllAsync<Ref>(
      "SELECT book, chapter, verse FROM verses WHERE translation = 'KJV' AND verse > 0 AND book = ? AND (chapter, verse) >= (?, ?) AND (chapter, verse) <= (?, ?) ORDER BY chapter, verse",
      start.book,
      start.chapter,
      start.verse,
      end.chapter,
      end.verse,
    );
    const shownKjv = range.slice(0, CROSS_SHOWN);
    const mapped: Ref[] = [];
    for (const r of shownKjv) for (const m of await mapRefs(db, 'KJV', translation, r)) if (!mapped.some((x) => x.book === m.book && x.chapter === m.chapter && x.verse === m.verse)) mapped.push(m);
    const verses = (await getVerses(db, translation, mapped)).filter((v) => !v.omitted);
    const first = (await mapRef(db, 'KJV', translation, start)) ?? start;
    const last = (await mapRef(db, 'KJV', translation, end)) ?? end;
    out.push({ start: first, end: last, verses, more: Math.max(0, range.length - shownKjv.length) });
  }
  return out;
}

interface MapRow {
  book: number;
  chapter: number;
  verse: number;
  n: number;
  obook: number;
  ochapter: number;
  overse: number;
}

/**
 * A Bible's verse map (a few dozen rows: the verses it numbers differently from the KJV),
 * read once and kept, so mapping a list of cross references does not ask the database
 * about each verse in it.
 */
const verseMaps = new WeakMap<SQLiteDatabase, Map<TranslationId, Promise<{ byVerse: Map<string, MapRow[]>; byKjv: Map<string, MapRow[]> }>>>();
function verseMap(db: SQLiteDatabase, translation: TranslationId) {
  let forDb = verseMaps.get(db);
  if (!forDb) verseMaps.set(db, (forDb = new Map()));
  let found = forDb.get(translation);
  if (!found) {
    found = db
      .getAllAsync<MapRow>('SELECT book, chapter, verse, n, obook, ochapter, overse FROM verse_map WHERE translation = ? ORDER BY book, chapter, verse, n', translation)
      .then((rows) => {
        const byVerse = new Map<string, MapRow[]>();
        const byKjv = new Map<string, MapRow[]>();
        for (const r of rows) {
          const v = `${r.book}:${r.chapter}:${r.verse}`;
          const k = `${r.obook}:${r.ochapter}:${r.overse}`;
          byVerse.set(v, [...(byVerse.get(v) ?? []), r]);
          byKjv.set(k, [...(byKjv.get(k) ?? []), r]);
        }
        return { byVerse, byKjv };
      });
    // A failed read is tried again next time.
    found.catch(() => forDb!.delete(translation));
    forDb.set(translation, found);
  }
  return found;
}

/** The KJV-numbered verses that a verse of `translation` corresponds to (usually itself). */
export async function toKjvRefs(db: SQLiteDatabase, translation: TranslationId, ref: Ref): Promise<Ref[]> {
  const rows = (await verseMap(db, translation)).byVerse.get(`${ref.book}:${ref.chapter}:${ref.verse}`);
  return rows?.length ? rows.map((r) => ({ book: r.obook, chapter: r.ochapter, verse: r.overse })) : [ref];
}

/**
 * The verse of `to` that holds a KJV-numbered verse, or null when `to` has none (Acts
 * 15:34 in the Malayalam). A verse with the same number is the match unless `to` numbers
 * it differently, or has only an empty place for it (the WEB's Romans 16:25, whose words
 * it gives at 14:24).
 */
async function fromKjv(db: SQLiteDatabase, to: TranslationId, kjv: Ref): Promise<Ref | null> {
  const map = await verseMap(db, to);
  const remapped = map.byVerse.has(`${kjv.book}:${kjv.chapter}:${kjv.verse}`);
  const movedRow = map.byKjv.get(`${kjv.book}:${kjv.chapter}:${kjv.verse}`)?.[0];
  const moved = movedRow ? { book: movedRow.book, chapter: movedRow.chapter, verse: movedRow.verse } : null;
  // A verse no map row names is in its place, unless the Bible leaves it out.
  if (!remapped && !moved) {
    const row = await db.getFirstAsync<{ omitted: number }>('SELECT omitted FROM verses WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?', to, kjv.book, kjv.chapter, kjv.verse);
    return row ? kjv : null;
  }
  if (!remapped) {
    const row = await db.getFirstAsync<{ omitted: number }>('SELECT omitted FROM verses WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?', to, kjv.book, kjv.chapter, kjv.verse);
    if (row && !row.omitted) return kjv;
  }
  return moved;
}

/**
 * Every verse of `to` that holds the words of `ref` in `from`: usually one, two where
 * `from` joins two verses into one (Malayalam Exodus 8:1 is KJV 7:25 and 8:1).
 */
export async function mapRefs(db: SQLiteDatabase, from: TranslationId, to: TranslationId, ref: Ref): Promise<Ref[]> {
  if (from === to) return [ref];
  const out: Ref[] = [];
  for (const kjv of await toKjvRefs(db, from, ref)) {
    const r = await fromKjv(db, to, kjv);
    if (r && !out.some((o) => o.book === r.book && o.chapter === r.chapter && o.verse === r.verse)) out.push(r);
  }
  return out;
}

/**
 * The same verse in another translation's numbering, or null when that translation has
 * no such verse. Where the verse stands for two, the one in the same chapter is taken, so
 * switching translation does not jump back a chapter.
 */
export async function mapRef(db: SQLiteDatabase, from: TranslationId, to: TranslationId, ref: Ref): Promise<Ref | null> {
  const all = await mapRefs(db, from, to, ref);
  return all.find((r) => r.book === ref.book && r.chapter === ref.chapter) ?? all[0] ?? null;
}

// Decoding a chapter's words takes a few to tens of milliseconds on a phone, and the same
// chapter is wanted again and again (each word tapped, each page turn back), so the last
// few decoded chapters are kept. The maps are shared: callers only read them.
const decodedWords = new Map<string, Promise<Map<number, OriginalWord[]>>>();
const WORDS_KEPT = 12;

/** Words of one chapter, keyed by KJV verse number. */
function chapterWords(db: SQLiteDatabase, book: number, chapter: number): Promise<Map<number, OriginalWord[]>> {
  const key = `${book}:${chapter}`;
  const hit = decodedWords.get(key);
  if (hit) {
    decodedWords.delete(key);
    decodedWords.set(key, hit);
    return hit;
  }
  const load = decodeChapterWords(db, book, chapter);
  decodedWords.set(key, load);
  load.catch(() => {
    if (decodedWords.get(key) === load) decodedWords.delete(key);
  });
  while (decodedWords.size > WORDS_KEPT) decodedWords.delete(decodedWords.keys().next().value as string);
  return load;
}

async function decodeChapterWords(db: SQLiteDatabase, book: number, chapter: number): Promise<Map<number, OriginalWord[]>> {
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
  // The dictionary has no Malayalam or Tamil in it, so such a query cannot match; it is not run.
  if (/[\u0d00-\u0d7f\u0b80-\u0bff]/.test(q)) return [];
  const escaped = q.replace(/[\\%_]/g, (c) => '\\' + c);
  const prefix = escaped + '%';
  const word = '%' + escaped + '%';
  return db.getAllAsync<LexiconHit>(
    `SELECT id, lemma, translit, pron, derivation, definition, kjv_usage,
            CASE WHEN translit_plain LIKE ? ESCAPE '\\' OR lemma_plain LIKE ? ESCAPE '\\' THEN 0
                 WHEN kjv_usage LIKE ? ESCAPE '\\' THEN 1 ELSE 2 END AS rank
     FROM strongs
     WHERE translit_plain LIKE ? ESCAPE '\\' OR lemma_plain LIKE ? ESCAPE '\\'
        OR kjv_usage LIKE ? ESCAPE '\\' OR definition LIKE ? ESCAPE '\\'
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

/** A book's introduction (data/intros, written for these apps), as stored in the database. */
export interface BookIntro {
  book: number;
  facts: { author: string; date: string; audience: string };
  about: string[];
  themes: { title: string; text: string }[];
  /** Sections of the book in KJV numbering, "chapter:verse". */
  outline: { from: string; to: string; title: string }[];
  /** "chapter:verse" or a range, "3:16-17", in KJV numbering. */
  keyVerses: string[];
}

/**
 * A book's introduction in `language`, or in English when the database has none in it;
 * null when there is none at all (a database built before the introductions).
 */
export async function getIntro(db: SQLiteDatabase, book: number, language: string): Promise<BookIntro | null> {
  try {
    const rows = await db.getAllAsync<{ lang: string; data: string }>('SELECT lang, data FROM intros WHERE book = ? AND lang IN (?, ?)', book, language, 'en');
    const row = rows.find((r) => r.lang === language) ?? rows.find((r) => r.lang === 'en');
    return row ? (JSON.parse(row.data) as BookIntro) : null;
  } catch {
    return null;
  }
}
