// Builds assets/db/bible.db from the sources fetched by scripts/fetch-data.sh.
//
//   npm run fetch-data
//   npm run build-db
//
// Output schema (all text is UTF-8):
//   books(id, osis, name, testament, chapters)
//   verses(translation, book, chapter, verse, text, tags)
//     text = the verse as plain text
//     tags = Strong's tags as "gap,length,number" triples separated by spaces, e.g.
//            "7,9,7225 1,3,430 1,7,1254": gap is the number of characters since the
//            end of the previous tag (or the start of the verse), length is the tagged
//            span in characters, number is the Strong's number without its letter.
//            The letter is H for Old Testament books and G for New Testament books.
//     verse 0 holds a Psalm's title line (USFM \d) when the chapter has one
//   headings(translation, book, chapter, before_verse, text)
//     section headings that sit between verses (the acrostic labels in WEB Psalm 119)
//   strongs(id, lemma, translit, pron, derivation, definition, kjv_usage)
//   concordance(strongs, translation, count, refs)
//     refs = BLOB of 3 bytes per verse: book, chapter, verse (each fits a byte)
//   meta(key, value)
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'data', 'raw');
const OUT_DIR = join(ROOT, 'assets', 'db');
const OUT = join(OUT_DIR, 'bible.db');

// USFM book code, display name, testament. Order is the Protestant canon.
const BOOKS = [
  ['GEN', 'Genesis'], ['EXO', 'Exodus'], ['LEV', 'Leviticus'], ['NUM', 'Numbers'], ['DEU', 'Deuteronomy'],
  ['JOS', 'Joshua'], ['JDG', 'Judges'], ['RUT', 'Ruth'], ['1SA', '1 Samuel'], ['2SA', '2 Samuel'],
  ['1KI', '1 Kings'], ['2KI', '2 Kings'], ['1CH', '1 Chronicles'], ['2CH', '2 Chronicles'], ['EZR', 'Ezra'],
  ['NEH', 'Nehemiah'], ['EST', 'Esther'], ['JOB', 'Job'], ['PSA', 'Psalms'], ['PRO', 'Proverbs'],
  ['ECC', 'Ecclesiastes'], ['SNG', 'Song of Songs'], ['ISA', 'Isaiah'], ['JER', 'Jeremiah'], ['LAM', 'Lamentations'],
  ['EZK', 'Ezekiel'], ['DAN', 'Daniel'], ['HOS', 'Hosea'], ['JOL', 'Joel'], ['AMO', 'Amos'],
  ['OBA', 'Obadiah'], ['JON', 'Jonah'], ['MIC', 'Micah'], ['NAM', 'Nahum'], ['HAB', 'Habakkuk'],
  ['ZEP', 'Zephaniah'], ['HAG', 'Haggai'], ['ZEC', 'Zechariah'], ['MAL', 'Malachi'],
  ['MAT', 'Matthew'], ['MRK', 'Mark'], ['LUK', 'Luke'], ['JHN', 'John'], ['ACT', 'Acts'],
  ['ROM', 'Romans'], ['1CO', '1 Corinthians'], ['2CO', '2 Corinthians'], ['GAL', 'Galatians'], ['EPH', 'Ephesians'],
  ['PHP', 'Philippians'], ['COL', 'Colossians'], ['1TH', '1 Thessalonians'], ['2TH', '2 Thessalonians'], ['1TI', '1 Timothy'],
  ['2TI', '2 Timothy'], ['TIT', 'Titus'], ['PHM', 'Philemon'], ['HEB', 'Hebrews'], ['JAS', 'James'],
  ['1PE', '1 Peter'], ['2PE', '2 Peter'], ['1JN', '1 John'], ['2JN', '2 John'], ['3JN', '3 John'],
  ['JUD', 'Jude'], ['REV', 'Revelation'],
].map(([osis, name], i) => ({ id: i + 1, osis, name, testament: i < 39 ? 'OT' : 'NT' }));

const TRANSLATIONS = [
  { id: 'KJV', name: 'King James Version', dir: 'kjv', suffix: 'eng-kjv2006.usfm' },
  { id: 'WEB', name: 'World English Bible', dir: 'web', suffix: 'engwebp.usfm' },
];

// Paragraph level markers whose content belongs to the current verse.
const PARAGRAPH = /^\\(p|m|b|nb|q1|q2|q3|q4|pi1|pi2|mi|li1|li2|pc|pmo|pm|pr|qr|qc)\b\s*/;
// Whole lines that are headings or front matter and never verse text.
const SKIP_LINE = /^\\(id|ide|h|toc1|toc2|toc3|mt1|mt2|mt3|ms1|ms2|s1|s2|s3|r|sp|cl|is1|ip|ili|iot|io1|rem|sr|mr)\b/;

function normalizeStrongs(raw) {
  const m = /^([HG])0*(\d+)$/.exec(raw.trim());
  return m ? m[1] + m[2] : null;
}

// Turn one verse's raw USFM into tagged text.
function cleanVerse(raw) {
  let s = raw;
  // \w word|strong="H0430"\w*  and nested  \+w ...\+w*
  s = s.replace(/\\\+?w\s+([^|\\]*?)\|([^\\]*?)\\\+?w\*/g, (_, word, attrs) => {
    const sm = /strong="([^"]+)"/.exec(attrs);
    const n = sm ? normalizeStrongs(sm[1]) : null;
    const w = word.trim();
    if (!n || !w) return w;
    return `⟨${w}|${n}⟩`;
  });
  // \w without attributes
  s = s.replace(/\\\+?w\s+([^\\]*?)\\\+?w\*/g, '$1');
  // Remaining character markers (\add \nd \wj \tl \qs \bk ...): keep content, drop markers.
  s = s.replace(/\\\+?[a-z]+\d?\*?/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  // Tidy spaces the markup left before punctuation.
  s = s.replace(/ ([,.;:!?’”)])/g, '$1');
  return s;
}

// Split tagged text into plain text plus the offset-encoded tag string.
function splitTags(tagged) {
  let text = '';
  const tags = [];
  let last = 0;
  let prevEnd = 0;
  for (const m of tagged.matchAll(/⟨([^|⟩]*)\|[HG](\d+)⟩/g)) {
    text += tagged.slice(last, m.index);
    const start = text.length;
    text += m[1];
    tags.push(`${start - prevEnd},${m[1].length},${m[2]}`);
    prevEnd = text.length;
    last = m.index + m[0].length;
  }
  text += tagged.slice(last);
  return { text, tags: tags.join(' ') };
}

function parseBook(path) {
  let src = readFileSync(path, 'utf8').replace(/^﻿/, '');
  // Footnotes and cross references can span lines; remove them whole.
  src = src.replace(/\\f\s[\s\S]*?\\f\*/g, '').replace(/\\x\s[\s\S]*?\\x\*/g, '');
  const chapters = new Map(); // chapter -> Map(verse -> raw)
  const headings = []; // { chapter, beforeVerse, raw }
  let chapter = 0;
  let verse = null;
  const append = (text) => {
    if (verse === null || !text) return;
    const ch = chapters.get(chapter);
    ch.set(verse, (ch.get(verse) || '') + ' ' + text);
  };
  for (const line of src.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const c = /^\\c\s+(\d+)/.exec(line);
    if (c) { chapter = Number(c[1]); chapters.set(chapter, new Map()); verse = null; continue; }
    if (SKIP_LINE.test(line)) continue;
    if (/^\\d\b/.test(line)) {
      const content = line.replace(/^\\d\s*/, '');
      if (verse === null) { verse = 0; append(content); }
      else headings.push({ chapter, beforeVerse: verse + 1, raw: content });
      continue;
    }
    let rest = line;
    const p = PARAGRAPH.exec(rest);
    if (p) rest = rest.slice(p[0].length);
    // A line may hold several verses: split on \v markers.
    const parts = rest.split(/\\v\s+(\d+)[a-z]?\s*/);
    append(parts[0]);
    for (let i = 1; i < parts.length; i += 2) {
      verse = Number(parts[i]);
      append(parts[i + 1]);
    }
  }
  return { chapters, headings };
}

function loadStrongs(file, varName) {
  const src = readFileSync(join(RAW, file), 'utf8');
  const start = src.indexOf('{', src.indexOf(`var ${varName}`));
  const end = src.lastIndexOf('};');
  return JSON.parse(src.slice(start, end + 1));
}

function main() {
  for (const t of TRANSLATIONS) {
    try { statSync(join(RAW, t.dir)); } catch { throw new Error(`missing data/raw/${t.dir}; run npm run fetch-data first`); }
  }
  mkdirSync(OUT_DIR, { recursive: true });
  rmSync(OUT, { force: true });
  const db = new DatabaseSync(OUT);
  db.exec(`
    PRAGMA journal_mode = OFF;
    PRAGMA synchronous = OFF;
    PRAGMA page_size = 4096;
    CREATE TABLE books(id INTEGER PRIMARY KEY, osis TEXT NOT NULL, name TEXT NOT NULL, testament TEXT NOT NULL, chapters INTEGER NOT NULL);
    CREATE TABLE verses(translation TEXT NOT NULL, book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
                        text TEXT NOT NULL, tags TEXT NOT NULL, PRIMARY KEY(translation, book, chapter, verse)) WITHOUT ROWID;
    CREATE TABLE headings(translation TEXT NOT NULL, book INTEGER NOT NULL, chapter INTEGER NOT NULL, before_verse INTEGER NOT NULL,
                        text TEXT NOT NULL, PRIMARY KEY(translation, book, chapter, before_verse)) WITHOUT ROWID;
    CREATE TABLE strongs(id TEXT PRIMARY KEY, lemma TEXT, translit TEXT, pron TEXT, derivation TEXT, definition TEXT, kjv_usage TEXT) WITHOUT ROWID;
    CREATE TABLE concordance(strongs TEXT NOT NULL, translation TEXT NOT NULL, count INTEGER NOT NULL, refs BLOB NOT NULL,
                        PRIMARY KEY(strongs, translation)) WITHOUT ROWID;
    CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
  `);

  const insVerse = db.prepare('INSERT INTO verses VALUES (?,?,?,?,?,?)');
  const insHeading = db.prepare('INSERT OR REPLACE INTO headings VALUES (?,?,?,?,?)');
  const insBook = db.prepare('INSERT INTO books VALUES (?,?,?,?,?)');
  const insStrongs = db.prepare('INSERT INTO strongs VALUES (?,?,?,?,?,?,?)');
  const insConc = db.prepare('INSERT INTO concordance VALUES (?,?,?,?)');
  const insMeta = db.prepare('INSERT INTO meta VALUES (?,?)');

  const chapterCounts = new Map();
  const stats = {};
  for (const t of TRANSLATIONS) {
    const files = readdirSync(join(RAW, t.dir));
    const conc = new Map(); // strongs -> array of [b,c,v]
    let verses = 0, tagCount = 0;
    db.exec('BEGIN');
    for (const book of BOOKS) {
      const file = files.find((f) => f.endsWith(book.osis + t.suffix));
      if (!file) throw new Error(`${t.id}: no file for ${book.osis}`);
      const { chapters, headings } = parseBook(join(RAW, t.dir, file));
      for (const h of headings) {
        const text = splitTags(cleanVerse(h.raw)).text;
        if (text) insHeading.run(t.id, book.id, h.chapter, h.beforeVerse, text);
      }
      const nChapters = Math.max(...chapters.keys());
      chapterCounts.set(book.id, Math.max(chapterCounts.get(book.id) || 0, nChapters));
      for (const [chapter, vmap] of chapters) {
        for (const [verse, raw] of [...vmap.entries()].sort((a, b) => a[0] - b[0])) {
          const tagged = cleanVerse(raw);
          if (!tagged) continue;
          const { text, tags } = splitTags(tagged);
          insVerse.run(t.id, book.id, chapter, verse, text, tags);
          verses++;
          const seen = new Set();
          for (const m of tagged.matchAll(/⟨[^|⟩]*\|([HG]\d+)⟩/g)) {
            tagCount++;
            if (seen.has(m[1])) continue;
            seen.add(m[1]);
            if (!conc.has(m[1])) conc.set(m[1], []);
            conc.get(m[1]).push(book.id, chapter, verse);
          }
        }
      }
    }
    for (const [strongs, refs] of conc) {
      insConc.run(strongs, t.id, refs.length / 3, new Uint8Array(refs));
    }
    db.exec('COMMIT');
    stats[t.id] = { verses, tags: tagCount, strongsNumbers: conc.size };
  }

  db.exec('BEGIN');
  for (const b of BOOKS) insBook.run(b.id, b.osis, b.name, b.testament, chapterCounts.get(b.id));
  const heb = loadStrongs('strongs-hebrew.js', 'strongsHebrewDictionary');
  const grk = loadStrongs('strongs-greek.js', 'strongsGreekDictionary');
  let nStrongs = 0;
  for (const dict of [heb, grk]) {
    for (const [id, e] of Object.entries(dict)) {
      insStrongs.run(id, e.lemma ?? null, e.xlit ?? e.translit ?? null, e.pron ?? null,
        (e.derivation ?? '').trim() || null, (e.strongs_def ?? '').trim() || null, (e.kjv_def ?? '').trim() || null);
      nStrongs++;
    }
  }
  insMeta.run('schema', '1');
  insMeta.run('built', new Date().toISOString().slice(0, 10));
  insMeta.run('translations', JSON.stringify(TRANSLATIONS.map(({ id, name }) => ({ id, name }))));
  insMeta.run('sources', JSON.stringify({
    KJV: 'eBible.org eng-kjv2006, public domain',
    WEB: 'eBible.org engwebp, public domain',
    strongs: 'Open Scriptures strongs (CC BY-SA)',
  }));
  db.exec('COMMIT');
  db.exec('VACUUM');
  db.close();

  console.log(JSON.stringify({ ...stats, strongsEntries: nStrongs, bytes: statSync(OUT).size }, null, 2));
}

main();
