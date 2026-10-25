// Parallel passages for every edition's database, from the United Bible Societies' Parallel
// Passages Database (© 2023 United Bible Societies, CC BY-SA 4.0): the same event or words
// in another place, verse by verse (Matthew 8:28 with Mark 5:1-3 and Luke 8:26-27; Kings with
// Chronicles; a psalm found twice). Only parallels within one Testament are kept: a passage
// that also quotes the Old Testament in the New keeps its New Testament verses with each other.
//
// The source numbers Old Testament verses as the Hebrew Bible does (Psalm 18:2-3 for the
// KJV's 18:1-2, Joel 3:1 for 2:28) and New Testament verses as the Greek New Testament does;
// both are turned into KJV numbering with the STEPBible files, which give each word's verse
// in both numberings.
//
// parallels(book, chapter, verse, refs): for each verse with parallels, six bytes per
// passage, the same layout as crossrefs: the first verse of the passage and its last.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The source's (USFM) book codes, in canonical order: book 1 to 66.
const USFM = ('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS ' +
  'JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS ' +
  '1PE 2PE 1JN 2JN 3JN JUD REV').split(' ');
const STEP_BOOKS = ('Gen Exo Lev Num Deu Jos Jdg Rut 1Sa 2Sa 1Ki 2Ki 1Ch 2Ch Ezr Neh Est Job Psa Pro Ecc Sng Isa Jer Lam Ezk Dan ' +
  'Hos Jol Amo Oba Jon Mic Nam Hab Zep Hag Zec Mal Mat Mrk Luk Jhn Act Rom 1Co 2Co Gal Eph Php Col 1Th 2Th 1Ti 2Ti Tit Phm Heb ' +
  'Jas 1Pe 2Pe 1Jn 2Jn 3Jn Jud Rev').split(' ');
export const STEP_FILES = [
  'TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  'TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  'TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  'TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt',
  'TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
  'TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
];
/** At most this many passages for one verse. */
export const PER_VERSE = 12;

/**
 * The KJV verse of the first and of the last word of each verse in the source's numbering,
 * keyed "book:chapter:verse". Hebrew lines read "Psa.18.1(18.2)#01": the English verse, then
 * the Hebrew in brackets when it differs. Greek lines read "2Co.13.13[13.14]#01": the Greek
 * verse, then the KJV in square brackets when it differs.
 */
function sourceToKjv(stepDir) {
  const map = new Map();
  for (const file of STEP_FILES) {
    for (const line of readFileSync(join(stepDir, file), 'utf8').split(/\r?\n/)) {
      const m = /^([1-3A-Za-z]{3})\.(\d+)\.(\d+)(\((\d+)\.(\d+)\))?(\[(\d+)\.(\d+)\])?[a-z]?#/.exec(line);
      if (!m) continue;
      const book = STEP_BOOKS.indexOf(m[1]) + 1;
      if (!book) continue;
      let src;
      let kjv;
      if (book <= 39) {
        src = m[4] ? [book, Number(m[5]), Number(m[6])] : [book, Number(m[2]), Number(m[3])];
        kjv = [book, Number(m[2]), Number(m[3])];
      } else {
        src = [book, Number(m[2]), Number(m[3])];
        kjv = m[7] ? [book, Number(m[8]), Number(m[9])] : src;
      }
      // A psalm's title is the KJV's verse 0; a link to it goes to verse 1.
      if (kjv[2] === 0) kjv = [kjv[0], kjv[1], 1];
      const key = src.join(':');
      const seen = map.get(key);
      if (seen) seen.last = kjv;
      else map.set(key, { first: kjv, last: kjv });
    }
  }
  return map;
}

/** "LUK 6:27-28,35" to [[book, chapter, first, chapter, last], ...] in the source's numbering, or null. */
function parseSourceRef(text) {
  const m = /^([1-3A-Z]{3}) (\d+):(.+)$/.exec(text.trim());
  if (!m) return null;
  const book = USFM.indexOf(m[1]) + 1;
  if (!book) return null;
  const chapter = Number(m[2]);
  const out = [];
  for (const piece of m[3].split(',')) {
    const r = /^(\d+)(?:-(?:(\d+):)?(\d+))?$/.exec(piece);
    if (!r) return null;
    out.push([book, chapter, Number(r[1]), r[2] ? Number(r[2]) : chapter, r[3] ? Number(r[3]) : Number(r[1])]);
  }
  return out;
}

/** The passages of the source: lists of { testament, ranges } read from its XML. */
function readPassages(file) {
  const xml = readFileSync(file, 'utf8');
  const passages = [];
  for (const p of xml.matchAll(/<Passage>([\s\S]*?)<\/Passage>/g)) {
    const verses = [];
    for (const v of p[1].matchAll(/<Verse\s+(HEB|GRK)="[^"]*">([^<]+)<\/Verse>/g)) verses.push({ ranges: parseSourceRef(v[2]), book: USFM.indexOf(v[2].trim().slice(0, 3)) + 1 });
    passages.push(verses);
  }
  return passages;
}

/** Adds the parallels table to an open database. */
export function addParallels(db, rawDir) {
  const toKjv = sourceToKjv(join(rawDir, 'step'));
  const kjvRows = db.prepare("SELECT book, chapter, verse FROM verses WHERE translation = 'KJV' AND verse > 0 ORDER BY book, chapter, verse").all();
  const kjvIndex = new Map(kjvRows.map((r, i) => [`${r.book}:${r.chapter}:${r.verse}`, i]));
  let skipped = 0;
  let unreadable = 0;
  // Each passage's members: a range in KJV numbering, [b, c, v, b, c, v], and which of the
  // source's verse lists it came from ("Mark 1:32,34" gives two ranges from one list).
  const groups = [];
  for (const verses of readPassages(join(rawDir, 'ubs', 'ParallelPassages.xml'))) {
    for (const testament of [0, 1]) {
      const members = [];
      verses.forEach((v, origin) => {
        if (!v.ranges) {
          if (testament === 0) unreadable++;
          return;
        }
        if ((v.book > 39 ? 1 : 0) !== testament) return;
        for (const [book, c1, v1, c2, v2] of v.ranges) {
          const a = toKjv.get(`${book}:${c1}:${v1}`)?.first;
          const b = toKjv.get(`${book}:${c2}:${v2}`)?.last;
          if (!a || !b || !kjvIndex.has(a.join(':')) || !kjvIndex.has(b.join(':')) || kjvIndex.get(b.join(':')) < kjvIndex.get(a.join(':'))) {
            skipped++;
            continue;
          }
          members.push({ range: [...a, ...b], origin });
        }
      });
      if (new Set(members.map((m) => m.origin)).size > 1) groups.push(members);
    }
  }
  // Every verse of a member gets the other members of its passage.
  const byVerse = new Map();
  for (const members of groups) {
    for (const { range: m, origin } of members) {
      const from = kjvIndex.get(`${m[0]}:${m[1]}:${m[2]}`);
      const to = kjvIndex.get(`${m[3]}:${m[4]}:${m[5]}`);
      for (let i = from; i <= to; i++) {
        const r = kjvRows[i];
        const key = `${r.book}:${r.chapter}:${r.verse}`;
        if (!byVerse.has(key)) byVerse.set(key, { at: [r.book, r.chapter, r.verse], links: [] });
        const entry = byVerse.get(key);
        for (const { range: other, origin: from2 } of members) {
          if (from2 === origin) continue;
          // Not the verse's own passage in the same book (a range overlapping itself).
          if (other[0] === r.book && kjvIndex.get(`${other[0]}:${other[1]}:${other[2]}`) <= i && i <= kjvIndex.get(`${other[3]}:${other[4]}:${other[5]}`)) continue;
          if (!entry.links.some((l) => l.join() === other.join())) entry.links.push(other);
        }
      }
    }
  }
  db.exec(`DROP TABLE IF EXISTS parallels;
    CREATE TABLE parallels(book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL, refs BLOB NOT NULL,
                           PRIMARY KEY(book, chapter, verse)) WITHOUT ROWID;`);
  const ins = db.prepare('INSERT INTO parallels VALUES (?,?,?,?)');
  let links = 0;
  let verses = 0;
  db.exec('BEGIN');
  for (const { at, links: all } of byVerse.values()) {
    if (!all.length) continue;
    // In Bible order: Matthew before Mark, Kings before Chronicles. Pieces of one book that
    // overlap or are a verse apart are one passage (Matthew 14:19 and 14:21 are 14:19-21).
    const at0 = (x) => kjvIndex.get(`${x[0]}:${x[1]}:${x[2]}`);
    const at1 = (x) => kjvIndex.get(`${x[3]}:${x[4]}:${x[5]}`);
    const merged = [];
    for (const x of [...all].sort((x, y) => at0(x) - at0(y) || at1(x) - at1(y))) {
      const prev = merged[merged.length - 1];
      if (prev && prev[0] === x[0] && at0(x) <= at1(prev) + 2) {
        if (at1(x) > at1(prev)) prev.splice(3, 3, x[3], x[4], x[5]);
      } else merged.push([...x]);
    }
    const top = merged.slice(0, PER_VERSE);
    ins.run(...at, new Uint8Array(top.flat()));
    links += top.length;
    verses++;
  }
  db.exec('COMMIT');
  return { passages: groups.length, verses, links, skipped, unreadable };
}
