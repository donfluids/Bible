// Cross references for every edition's database, from OpenBible.info's list (CC BY), which
// draws on the Treasury of Scripture Knowledge and ranks each link by readers' votes. KJV
// verse numbering; the app maps them to and from a Bible that numbers verses differently.
//
// crossrefs(book, chapter, verse, refs): for each verse with links, its strongest ones (up
// to PER_VERSE, most votes first, none with no votes), six bytes each: the first verse of the
// target (book, chapter, verse) and its last (the same verse unless it is a range).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PER_VERSE = 10;

// The source's OSIS book names, in canonical order: book 1 to 66.
const OSIS = ('Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam ' +
  'Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess ' +
  '2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev').split(' ');

/** "Gen.1.1" to [book, chapter, verse], or null. */
function parseRef(text, bookIds) {
  const m = /^(\w+)\.(\d+)\.(\d+)$/.exec(text);
  if (!m) return null;
  const book = bookIds.get(m[1]);
  const chapter = Number(m[2]);
  const verse = Number(m[3]);
  if (!book || chapter < 1 || chapter > 255 || verse < 1 || verse > 255) return null;
  return [book, chapter, verse];
}

/** Adds the crossrefs table to an open database. */
export function addCrossRefs(db, rawDir) {
  const bookIds = new Map(OSIS.map((name, i) => [name, i + 1]));
  // A few links use a numbering the KJV does not have (3 John 1:15): only verses the
  // database's KJV has are kept.
  const kjv = new Set(db.prepare("SELECT book || ':' || chapter || ':' || verse AS k FROM verses WHERE translation = 'KJV' AND verse > 0").all().map((r) => r.k));
  const known = (r) => !!r && kjv.has(r.join(':'));
  const lines = readFileSync(join(rawDir, 'openbible', 'cross_references.txt'), 'utf8').split('\n');
  const byVerse = new Map();
  let skipped = 0;
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const [from, to, votesText] = line.split('\t');
    const votes = Number(votesText);
    if (!(votes > 0)) continue;
    const start = parseRef(from, bookIds);
    const [first, last = first] = (to ?? '').split('-');
    const a = parseRef(first, bookIds);
    let b = parseRef(last, bookIds);
    // A range running on into the next book (2 Chronicles 36:22 to Ezra 1:3, 9 of them) is
    // kept as its first verse: the app shows a range within one book.
    if (a && b && b[0] !== a[0]) b = a;
    if (a && !known(b)) b = a;
    if (!known(start) || !known(a)) {
      skipped++;
      continue;
    }
    const key = start.join(':');
    if (!byVerse.has(key)) byVerse.set(key, { start, links: [] });
    byVerse.get(key).links.push({ votes, ref: [...a, ...b] });
  }
  db.exec(`DROP TABLE IF EXISTS crossrefs;
    CREATE TABLE crossrefs(book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL, refs BLOB NOT NULL,
                           PRIMARY KEY(book, chapter, verse)) WITHOUT ROWID;`);
  const ins = db.prepare('INSERT INTO crossrefs VALUES (?,?,?,?)');
  let links = 0;
  db.exec('BEGIN');
  for (const { start, links: all } of byVerse.values()) {
    // Most votes first; equal votes keep the source's order.
    const top = all
      .map((l, i) => ({ ...l, i }))
      .sort((x, y) => y.votes - x.votes || x.i - y.i)
      .slice(0, PER_VERSE);
    ins.run(...start, new Uint8Array(top.flatMap((l) => l.ref)));
    links += top.length;
  }
  db.exec('COMMIT');
  return { verses: byVerse.size, links, skipped };
}

/** The six-byte refs of a crossrefs row, read back: [{ from: [b, c, v], to: [b, c, v] }]. */
export function decodeCrossRefs(blob) {
  const out = [];
  for (let i = 0; i + 5 < blob.length; i += 6) out.push({ from: [blob[i], blob[i + 1], blob[i + 2]], to: [blob[i + 3], blob[i + 4], blob[i + 5]] });
  return out;
}
