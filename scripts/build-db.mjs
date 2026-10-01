// Builds assets/db/bible.db from the sources fetched by scripts/fetch-data.sh.
//
//   npm run fetch-data
//   npm run build-db
//
// Output schema (all text is UTF-8):
//   books(id, osis, name, testament, chapters)
//   verses(translation, book, chapter, verse, text, tags, omitted)
//     text = the verse as plain text. Poetry and paragraph breaks inside a verse are
//            newlines; an indented poetry line starts with one em space per level.
//            For an omitted verse (WEB only, a verse the translation leaves out) text
//            holds the translators' footnote and omitted = 1
//     tags = Strong's tags as "gap,length,number" triples separated by spaces, e.g.
//            "7,9,7225 1,3,430 1,7,1254": gap is the number of characters since the
//            end of the previous tag (or the start of the verse), length is the tagged
//            span in characters, number is the Strong's number without its letter.
//            The letter is H for Old Testament books and G for New Testament books.
//     verse 0 holds a Psalm's title line (USFM \d) when the chapter has one
//   headings(translation, book, chapter, before_verse, text)
//     section headings that sit between verses (the acrostic labels in WEB Psalm 119)
//   notes(translation, book, chapter, verse, n, pos, kind, text)
//     translators' footnotes (kind f) and cross references (kind x); pos is the character
//     offset in the verse text where the note marker belongs
//   renderings(strongs, translation, word, count, refs)
//     how a Strong's number is rendered in a translation: the English word or phrase,
//     how many verses use it, and those verses packed like concordance.refs
//   strongs(id, lemma, translit, pron, derivation, definition, kjv_usage)
//   concordance(strongs, translation, count, refs)
//     refs = BLOB of 3 bytes per verse: book, chapter, verse (each fits a byte)
//   interlinear(book, chapter, data)
//     data = raw deflate (zlib, no header) of the chapter's words as text. Verses are
//            separated by U+001C and each verse is "<verse number>U+001D<words>"; words
//            are records separated by U+001E with fields separated by U+001F:
//            text, transliteration, gloss, Strong's id (may be empty), grammar code, flags
//             flags: 1 = not in Nestle-Aland editions, 2 = supplied from the Septuagint,
//                    4 = restored where the Leningrad Codex is damaged
//     Source: STEPBible TAHOT and TAGNT (CC BY 4.0). Greek words are those found in the
//     Textus Receptus or the Byzantine text; verse numbers follow the KJV.
//   meta(key, value)
import { DatabaseSync } from 'node:sqlite';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
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

const STEP_DIR = join(RAW, 'step');
const STEP_FILES = {
  hebrew: [
    'TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
    'TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
    'TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
    'TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  ],
  greek: [
    'TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
    'TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
  ],
};
// STEPBible book abbreviations in canonical order.
const STEP_BOOKS = ('Gen Exo Lev Num Deu Jos Jdg Rut 1Sa 2Sa 1Ki 2Ki 1Ch 2Ch Ezr Neh Est Job Psa Pro Ecc Sng Isa Jer Lam Ezk Dan ' +
  'Hos Jol Amo Oba Jon Mic Nam Hab Zep Hag Zec Mal Mat Mrk Luk Jhn Act Rom 1Co 2Co Gal Eph Php Col 1Th 2Th 1Ti 2Ti Tit Phm Heb ' +
  'Jas 1Pe 2Pe 1Jn 2Jn 3Jn Jud Rev').split(' ');
const FLAG_NOT_IN_NA = 1;
const FLAG_LXX = 2;
const FLAG_RESTORED = 4;
// Internal markers used while a verse is being assembled; none appear in the output.
const BREAK = '\x07'; // followed by an indent level digit
const NOTE = '\x06'; // wraps a note index
const FS = '\x1c';
const GS = '\x1d';
const RS = '\x1e';
const US = '\x1f';

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
  // Poetry and paragraph breaks become newlines, indented with em spaces.
  s = s.replace(/\s*\x07(\d)\s*/g, (_, level) => '\n' + '\u2003'.repeat(Number(level)));
  s = s.replace(/\n+/g, '\n').replace(/^\n/, '').replace(/[\n\u2003]+$/, '');
  return s;
}

// Footnote or cross reference body to plain text.
function cleanNote(body) {
  let s = body.replace(/\\(fr|xo)\s+[^\\]*/g, '');
  s = s.replace(/\\\+?w\s+([^|\\]*?)\|[^\\]*?\\\+?w\*/g, '$1');
  s = s.replace(/\\\+?[a-z]+\d?\*?/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

// Split tagged text into plain text plus the offset-encoded tag string.
function splitTags(tagged) {
  let text = '';
  const tags = [];
  const notes = [];
  let last = 0;
  let prevEnd = 0;
  for (const m of tagged.matchAll(/⟨([^|⟩]*)\|[HG](\d+)⟩|\x06(\d+)\x06/g)) {
    text += tagged.slice(last, m.index);
    if (m[3] !== undefined) {
      notes.push({ idx: Number(m[3]), pos: text.length });
    } else {
      const start = text.length;
      text += m[1];
      tags.push(`${start - prevEnd},${m[1].length},${m[2]}`);
      prevEnd = text.length;
    }
    last = m.index + m[0].length;
  }
  text += tagged.slice(last);
  return { text, tags: tags.join(' '), notes };
}

function parseBook(path) {
  let src = readFileSync(path, 'utf8').replace(/^﻿/, '');
  // A verse whose only content is a footnote is one the translation omits. Keep the
  // note, marked with U+2205, so the app can show the gap honestly.
  src = src.replace(/^(\\v\s+\d+\s*)\\f\s+\+\s+(?:\\fr\s+[^\\\n]*)?\\ft\s+([^\n]*?)\\f\*[ \t]*$/gm,
    (_, v, note) => `${v}\u2205${note.replace(/\\\+?[a-z]+\*?/g, '').trim()}`);
  // Footnotes and cross references can span lines; lift them out into a list and
  // leave a marker where each one sat.
  const notes = []; // { kind: 'f' | 'x', text }
  src = src.replace(/\\(f|x)\s+\+?\s*([\s\S]*?)\\\1\*/g, (_, kind, body) => {
    const text = cleanNote(body);
    if (!text) return '';
    notes.push({ kind, text });
    return `${NOTE}${notes.length - 1}${NOTE}`;
  });
  const chapters = new Map(); // chapter -> Map(verse -> raw)
  const headings = []; // { chapter, beforeVerse, raw }
  let chapter = 0;
  let verse = null;
  let pendingBreak = null; // poetry or paragraph break waiting for the next text
  const append = (text) => {
    if (verse === null || !text || !text.trim()) return;
    const ch = chapters.get(chapter);
    const prefix = pendingBreak === null ? '' : `${BREAK}${pendingBreak} `;
    pendingBreak = null;
    ch.set(verse, (ch.get(verse) || '') + ' ' + prefix + text);
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
    if (p) {
      rest = rest.slice(p[0].length);
      pendingBreak = /^(q2|pi1|li1|mi|pm|pmo)$/.test(p[1]) ? 1 : /^(q3|pi2|li2)$/.test(p[1]) ? 2 : 0;
    }
    // A line may hold several verses: split on \v markers.
    const parts = rest.split(/\\v\s+(\d+)[a-z]?\s*/);
    append(parts[0]);
    for (let i = 1; i < parts.length; i += 2) {
      verse = Number(parts[i]);
      append(parts[i + 1]);
    }
  }
  return { chapters, headings, notes };
}

// Parse "Mat.17.14[17.15]#03=NKO" style references. Returns null for non-data lines.
// The KJV reference in square brackets wins because the bundled Bibles follow it.
function parseStepRef(field) {
  const m = /^([1-3A-Za-z]{3})\.(\d+)\.(\d+)([^#]*)#(\d+)=(.*)$/.exec(field);
  if (!m) return null;
  const book = STEP_BOOKS.indexOf(m[1]) + 1;
  if (book === 0) return null;
  let chapter = Number(m[2]);
  let verse = Number(m[3]);
  const kjv = /\[(\d+)\.(\d+)\]/.exec(m[4]);
  if (kjv) { chapter = Number(kjv[1]); verse = Number(kjv[2]); }
  // Word numbers such as "0501" are words inserted after word 5.
  const num = m[5].length > 2 ? Number(m[5].slice(0, 2)) + Number('0.' + m[5].slice(2)) : Number(m[5]);
  return { book, chapter, verse, order: num, type: m[6] };
}

function stepLines(files) {
  const out = [];
  for (const f of files) {
    const path = join(STEP_DIR, f);
    try { statSync(path); } catch { throw new Error(`missing data/raw/step/${f}; run npm run fetch-data first`); }
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const fields = line.split('\t');
      const ref = parseStepRef(fields[0]);
      if (ref) out.push({ ref, fields });
    }
  }
  return out;
}

function stepHebrewWords() {
  const words = [];
  for (const { ref, fields } of stepLines(STEP_FILES.hebrew)) {
    const text = fields[1].replace(/[\/\\]/g, '').trim();
    if (!text) continue; // Qere with no written form
    const translit = fields[2].replace(/\//g, '').trim();
    const gloss = fields[3].replace(/\//g, '').replace(/\s+/g, ' ').trim();
    const root = /\{H(\d+)/.exec(fields[4]) || /\bH(\d+)/.exec(fields[4]);
    const strongs = root && Number(root[1]) < 9000 ? 'H' + Number(root[1]) : '';
    const morph = fields[5].trim();
    let flags = 0;
    if (ref.type.startsWith('X')) flags |= FLAG_LXX;
    if (ref.type.startsWith('R')) flags |= FLAG_RESTORED;
    words.push({ ...ref, text, translit, gloss, strongs, morph, flags });
  }
  return words;
}

function stepGreekWords() {
  const words = [];
  let skipped = 0;
  for (const { ref, fields } of stepLines(STEP_FILES.greek)) {
    const editions = fields[5];
    if (!/\bTR\b|Byz/.test(editions)) { skipped++; continue; } // not in the traditional text
    const raw = fields[1].replace(/[¶]|\[\[|\]\]/g, '').trim();
    const split = raw.lastIndexOf(' (');
    const text = (split > 0 ? raw.slice(0, split) : raw).trim();
    const translit = split > 0 ? raw.slice(split + 2).replace(/\)$/, '').trim() : '';
    if (!text) continue;
    const gloss = fields[2].replace(/\s+/g, ' ').trim();
    const sm = /G(\d+)/.exec(fields[3]);
    const strongs = sm ? 'G' + Number(sm[1]) : '';
    const morph = (fields[3].split('=')[1] || '').trim();
    const flags = /NA2/.test(editions) ? 0 : FLAG_NOT_IN_NA;
    words.push({ ...ref, text, translit, gloss, strongs, morph, flags });
  }
  return { words, skipped };
}

function buildInterlinear(db) {
  const ins = db.prepare('INSERT INTO interlinear VALUES (?,?,?)');
  const known = new Set(db.prepare('SELECT id FROM strongs').all().map((r) => r.id));
  const hebrew = stepHebrewWords();
  const { words: greek, skipped } = stepGreekWords();
  // STEPBible extends Strong's numbering for a few words; without a dictionary entry the number is dropped.
  let unknown = 0;
  for (const w of [...hebrew, ...greek]) {
    if (w.strongs && !known.has(w.strongs)) { w.strongs = ''; unknown++; }
  }
  const byVerse = new Map();
  for (const w of [...hebrew, ...greek]) {
    const key = `${w.book}:${w.chapter}:${w.verse}`;
    if (!byVerse.has(key)) byVerse.set(key, []);
    byVerse.get(key).push(w);
  }
  const byChapter = new Map();
  for (const [key, list] of byVerse) {
    list.sort((a, b) => a.order - b.order);
    const [book, chapter, verse] = key.split(':').map(Number);
    const packed = list.map((w) => [w.text, w.translit, w.gloss, w.strongs, w.morph, String(w.flags)].join(US)).join(RS);
    const ck = `${book}:${chapter}`;
    if (!byChapter.has(ck)) byChapter.set(ck, []);
    byChapter.get(ck).push({ verse, packed });
  }
  let bytes = 0;
  db.exec('BEGIN');
  for (const [ck, verses] of byChapter) {
    verses.sort((a, b) => a.verse - b.verse);
    const [book, chapter] = ck.split(':').map(Number);
    const text = verses.map((v) => v.verse + GS + v.packed).join(FS);
    const blob = new Uint8Array(deflateRawSync(Buffer.from(text, 'utf8'), { level: 9 }));
    bytes += blob.length;
    ins.run(book, chapter, blob);
  }
  db.exec('COMMIT');
  return { hebrewWords: hebrew.length, greekWords: greek.length, greekSkippedNaOnly: skipped, wordsWithoutDictionaryEntry: unknown, verses: byVerse.size, chapters: byChapter.size, compressedBytes: bytes };
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
                        text TEXT NOT NULL, tags TEXT NOT NULL, omitted INTEGER NOT NULL DEFAULT 0,
                        PRIMARY KEY(translation, book, chapter, verse)) WITHOUT ROWID;
    CREATE TABLE headings(translation TEXT NOT NULL, book INTEGER NOT NULL, chapter INTEGER NOT NULL, before_verse INTEGER NOT NULL,
                        text TEXT NOT NULL, PRIMARY KEY(translation, book, chapter, before_verse)) WITHOUT ROWID;
    CREATE TABLE notes(translation TEXT NOT NULL, book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
                        n INTEGER NOT NULL, pos INTEGER NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL,
                        PRIMARY KEY(translation, book, chapter, verse, n)) WITHOUT ROWID;
    CREATE TABLE renderings(strongs TEXT NOT NULL, translation TEXT NOT NULL, word TEXT NOT NULL, count INTEGER NOT NULL,
                        refs BLOB NOT NULL, PRIMARY KEY(strongs, translation, word)) WITHOUT ROWID;
    CREATE TABLE strongs(id TEXT PRIMARY KEY, lemma TEXT, translit TEXT, pron TEXT, derivation TEXT, definition TEXT, kjv_usage TEXT) WITHOUT ROWID;
    CREATE TABLE concordance(strongs TEXT NOT NULL, translation TEXT NOT NULL, count INTEGER NOT NULL, refs BLOB NOT NULL,
                        PRIMARY KEY(strongs, translation)) WITHOUT ROWID;
    CREATE TABLE interlinear(book INTEGER NOT NULL, chapter INTEGER NOT NULL, data BLOB NOT NULL,
                        PRIMARY KEY(book, chapter)) WITHOUT ROWID;
    CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
  `);

  const insVerse = db.prepare('INSERT INTO verses VALUES (?,?,?,?,?,?,?)');
  const insHeading = db.prepare('INSERT OR REPLACE INTO headings VALUES (?,?,?,?,?)');
  const insNote = db.prepare('INSERT INTO notes VALUES (?,?,?,?,?,?,?,?)');
  const insRendering = db.prepare('INSERT INTO renderings VALUES (?,?,?,?,?)');
  const insBook = db.prepare('INSERT INTO books VALUES (?,?,?,?,?)');
  const insStrongs = db.prepare('INSERT INTO strongs VALUES (?,?,?,?,?,?,?)');
  const insConc = db.prepare('INSERT INTO concordance VALUES (?,?,?,?)');
  const insMeta = db.prepare('INSERT INTO meta VALUES (?,?)');

  const chapterCounts = new Map();
  const stats = {};
  for (const t of TRANSLATIONS) {
    const files = readdirSync(join(RAW, t.dir));
    const conc = new Map(); // strongs -> array of [b,c,v]
    const rend = new Map(); // strongs -> Map(lowercased word -> { forms: Map(display -> n), refs: [], lastKey })
    let verses = 0, tagCount = 0, omitted = 0, noteCount = 0;
    db.exec('BEGIN');
    for (const book of BOOKS) {
      const file = files.find((f) => f.endsWith(book.osis + t.suffix));
      if (!file) throw new Error(`${t.id}: no file for ${book.osis}`);
      const { chapters, headings, notes } = parseBook(join(RAW, t.dir, file));
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
          if (tagged.startsWith('\u2205')) {
            insVerse.run(t.id, book.id, chapter, verse, tagged.slice(1).trim(), '', 1);
            omitted++;
            continue;
          }
          const { text, tags, notes: markers } = splitTags(tagged);
          insVerse.run(t.id, book.id, chapter, verse, text, tags, 0);
          verses++;
          markers.forEach((mk, n) => {
            const note = notes[mk.idx];
            insNote.run(t.id, book.id, chapter, verse, n, mk.pos, note.kind, note.text);
            noteCount++;
          });
          const seen = new Set();
          const verseKey = `${book.id}:${chapter}:${verse}`;
          for (const m of tagged.matchAll(/⟨([^|⟩]*)\|([HG]\d+)⟩/g)) {
            tagCount++;
            const word = m[1].trim();
            const lower = word.toLowerCase();
            if (!rend.has(m[2])) rend.set(m[2], new Map());
            const byWord = rend.get(m[2]);
            if (!byWord.has(lower)) byWord.set(lower, { forms: new Map(), refs: [], lastKey: '' });
            const entry = byWord.get(lower);
            entry.forms.set(word, (entry.forms.get(word) || 0) + 1);
            if (entry.lastKey !== verseKey) { entry.refs.push(book.id, chapter, verse); entry.lastKey = verseKey; }
            if (seen.has(m[2])) continue;
            seen.add(m[2]);
            if (!conc.has(m[2])) conc.set(m[2], []);
            conc.get(m[2]).push(book.id, chapter, verse);
          }
        }
      }
    }
    for (const [strongs, refs] of conc) {
      insConc.run(strongs, t.id, refs.length / 3, new Uint8Array(refs));
    }
    let renderingRows = 0;
    for (const [strongs, byWord] of rend) {
      for (const entry of byWord.values()) {
        // Display the most frequent spelling (keeps LORD rather than lord).
        const display = [...entry.forms.entries()].sort((a, b) => b[1] - a[1])[0][0];
        insRendering.run(strongs, t.id, display, entry.refs.length / 3, new Uint8Array(entry.refs));
        renderingRows++;
      }
    }
    db.exec('COMMIT');
    stats[t.id] = { verses, omittedVerses: omitted, tags: tagCount, strongsNumbers: conc.size, notes: noteCount, renderings: renderingRows };
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
  insMeta.run('schema', '4');
  insMeta.run('built', new Date().toISOString().slice(0, 10));
  insMeta.run('translations', JSON.stringify(TRANSLATIONS.map(({ id, name }) => ({ id, name }))));
  insMeta.run('sources', JSON.stringify({
    KJV: 'eBible.org eng-kjv2006, public domain',
    WEB: 'eBible.org engwebp, public domain',
    strongs: 'Open Scriptures strongs (CC BY-SA)',
    interlinear: 'STEPBible TAHOT and TAGNT, Tyndale House Cambridge (CC BY 4.0)',
  }));
  db.exec('COMMIT');
  const interlinear = buildInterlinear(db);
  // Sanity check: interlinear verses should line up with the KJV's verse numbering.
  const kjv = new Set(db.prepare("SELECT book || ':' || chapter || ':' || verse k FROM verses WHERE translation = 'KJV' AND omitted = 0").all().map((r) => r.k));
  const have = new Set();
  for (const row of db.prepare('SELECT book, chapter, data FROM interlinear').all()) {
    const text = inflateRawSync(Buffer.from(row.data)).toString('utf8');
    for (const v of text.split(FS)) have.add(`${row.book}:${row.chapter}:${v.split(GS)[0]}`);
  }
  let unmatched = 0, missing = 0;
  for (const k of have) if (!kjv.has(k)) unmatched++;
  for (const k of kjv) if (!have.has(k)) missing++;
  stats.interlinear = { ...interlinear, versesNotInKjv: unmatched, kjvVersesWithoutOriginal: missing };
  db.exec('VACUUM');
  db.close();

  console.log(JSON.stringify({ ...stats, strongsEntries: nStrongs, bytes: statSync(OUT).size }, null, 2));
}

main();
