// Checks the built Bible databases (assets/db/bible-*.db) after every rebuild:
//
//   node --no-warnings scripts/check-data.mjs            check, and compare with the snapshot
//   node --no-warnings scripts/check-data.mjs --update   check, and write the snapshot anew
//
// Rules that always hold: 66 books and 1,189 chapters; every chapter's verses numbered
// from 1 without a gap or a duplicate; the KJV's 31,102 verses; no empty verse; no
// replacement or control characters, markup or doubled spaces in the text; Malayalam
// and Tamil text without stray Latin letters or a bridged verse's "-18" at a verse's start;
// every verse outside the KJV numbering mapped to it (verse_map); every word link (tags) inside its verse
// and pointing at a Strong's entry that exists; every concordance, rendering, note and
// heading pointing at a verse that exists; every cross reference from and to KJV verses;
// every lexicon entry belonging to a Strong's entry. Then the snapshot (data/checks/verse-counts.json): the number of verses in each
// chapter of each translation, so a rebuild that loses or gains a verse shows at once.
// After an intended change (a correction of the text, a new translation) run --update
// and commit the snapshot with it.
//
// Errors end the run with exit code 1; warnings are listed and do not.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INTRO_LANGUAGES } from './lib/intros.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// CHECK_DB_DIR checks copies elsewhere (the self-test breaks a copy on purpose).
const DB_DIR = process.env.CHECK_DB_DIR || join(ROOT, 'assets', 'db');
const SNAPSHOT = join(ROOT, 'data', 'checks', 'verse-counts.json');
const update = process.argv.includes('--update');

const KJV_VERSES = 31102;
const CHAPTERS = 1189;
// Markup a source can leave behind: USFM (\f, \v), braces, tags, the KJV's [[ ]].
const MARKUP = /\\[a-z]|[{}<>|]|\[\[|\]\]/;
const BAD_CHARS = /[�\u0000-\u0009\u000B-\u001F\u007F]/;
const SCRIPT = { MAL: /[ഀ-ൿ]/, TAM: /[஀-௿]/, HIN: /[ऀ-ॿ]/ };

const errors = [];
const warnings = [];
const snapshot = {};
// At most this many examples of one problem are listed.
const SHOW = 5;

function report(list, name, items) {
  if (items.length === 0) return;
  list.push(`${name}: ${items.length}${items.length > SHOW ? ` (first ${SHOW})` : ''}\n    ${items.slice(0, SHOW).join('\n    ')}`);
}

const decodeRefs = (blob) => {
  const out = [];
  for (let i = 0; i + 2 < blob.length; i += 3) out.push(`${blob[i]}:${blob[i + 1]}:${blob[i + 2]}`);
  return out;
};

for (const file of readdirSync(DB_DIR).filter((f) => /^bible-\w+\.db$/.test(f)).sort()) {
  const db = new DatabaseSync(join(DB_DIR, file), { readOnly: true });
  const label = file.replace(/\.db$/, '');
  const edition = label.replace('bible-', '');
  const all = (sql, ...args) => db.prepare(sql).all(...args);

  const books = all('SELECT id, chapters FROM books ORDER BY id');
  if (books.length !== 66) errors.push(`${label}: ${books.length} books, not 66`);
  const chapterTotal = books.reduce((n, b) => n + b.chapters, 0);
  if (chapterTotal !== CHAPTERS) errors.push(`${label}: ${chapterTotal} chapters, not ${CHAPTERS}`);
  const chaptersOf = new Map(books.map((b) => [b.id, b.chapters]));

  const strongs = new Set(all('SELECT id FROM strongs').map((r) => r.id));
  const translations = all('SELECT DISTINCT translation FROM verses').map((r) => r.translation);
  const verseKeys = new Map(translations.map((t) => [t, new Set()]));
  snapshot[label] = {};

  for (const t of translations) {
    const rows = all('SELECT book, chapter, verse, text, tags, omitted FROM verses WHERE translation = ? ORDER BY book, chapter, verse', t);
    const keys = verseKeys.get(t);
    const counts = {};
    const gaps = [], empty = [], bad = [], markup = [], spaces = [], latin = [], tagProblems = [], unknown = [], outside = [], number = [];
    let shown = 0;
    const byChapter = new Map();
    for (const r of rows) {
      keys.add(`${r.book}:${r.chapter}:${r.verse}`);
      if (r.verse === 0) continue; // a Psalm's title
      const ch = `${r.book}:${r.chapter}`;
      if (!byChapter.has(ch)) byChapter.set(ch, []);
      byChapter.get(ch).push(r.verse);
      if (r.book > 66 || r.chapter > (chaptersOf.get(r.book) ?? 0)) outside.push(ch);
      if (!r.omitted) shown++;
      const at = `${t} ${r.book}:${r.chapter}:${r.verse}`;
      if (!r.omitted && !r.text.trim()) empty.push(at);
      if (BAD_CHARS.test(r.text)) bad.push(`${at} ${JSON.stringify(r.text.match(BAD_CHARS)[0])}`);
      if (MARKUP.test(r.text)) markup.push(`${at} …${r.text.slice(Math.max(0, r.text.search(MARKUP) - 15), r.text.search(MARKUP) + 15)}…`);
      if (/ {2,}/.test(r.text)) spaces.push(at);
      // What is left of a bridged verse number ("-18 அப்பொழுது"). A leading number cannot be
      // checked so: the Tamil writes numbers as digits ("40 நாட்களுக்குப்").
      if (SCRIPT[t] && /^-\d/.test(r.text)) number.push(`${at} ${r.text.slice(0, 20)}…`);
      if (SCRIPT[t] && /[A-Za-z]/.test(r.text)) latin.push(`${at} …${r.text.slice(Math.max(0, r.text.search(/[A-Za-z]/) - 10), r.text.search(/[A-Za-z]/) + 10)}…`);
      if (r.tags) {
        const prefix = r.book <= 39 ? 'H' : 'G';
        let pos = 0;
        for (const triple of r.tags.split(' ')) {
          const [gap, len, nums = ''] = triple.split(',');
          pos += Number(gap);
          const end = pos + Number(len);
          if (!Number.isFinite(pos) || !Number.isFinite(end) || end > r.text.length || Number(len) <= 0) {
            tagProblems.push(`${at} "${triple}"`);
            break;
          }
          for (const n of nums.split('+')) if (!strongs.has(prefix + n)) unknown.push(`${at} ${prefix}${n}`);
          pos = end;
        }
      }
    }
    for (const [ch, verses] of byChapter) {
      verses.sort((a, b) => a - b);
      counts[ch] = verses.length;
      verses.forEach((v, i) => {
        if (v !== i + 1) gaps.push(`${t} ${ch}: verse ${i + 1} expected, ${v} found`);
      });
    }
    for (const b of books) for (let c = 1; c <= b.chapters; c++) if (!byChapter.has(`${b.id}:${c}`)) gaps.push(`${t} ${b.id}:${c}: chapter missing`);
    if (t === 'KJV' && rows.filter((r) => r.verse > 0).length !== KJV_VERSES) errors.push(`${label} KJV: ${rows.filter((r) => r.verse > 0).length} verses, not ${KJV_VERSES}`);
    report(errors, `${label} ${t}: verse numbering`, gaps);
    report(errors, `${label} ${t}: chapters outside the book`, outside);
    report(errors, `${label} ${t}: empty verses`, empty);
    report(errors, `${label} ${t}: replacement or control characters`, bad);
    report(errors, `${label} ${t}: word links outside their verse`, tagProblems);
    report(errors, `${label} ${t}: word links to a missing Strong's entry`, unknown);
    report(warnings, `${label} ${t}: left-over markup`, markup);
    report(warnings, `${label} ${t}: doubled spaces`, spaces);
    report(warnings, `${label} ${t}: Latin letters in the text`, latin);
    report(errors, `${label} ${t}: a verse starting with "-" and a number`, number);
    snapshot[label][t] = { verses: shown, chapters: counts };
  }

  // A verse the KJV numbering lacks (a psalm's title aside) needs a verse_map row, or it has no Hebrew or Greek,
  // no cross references and no partner side by side (data/overrides/versification.json).
  const kjvKeys = verseKeys.get('KJV');
  if (kjvKeys) {
    const mapped = new Set(all('SELECT translation, book, chapter, verse FROM verse_map').map((r) => `${r.translation} ${r.book}:${r.chapter}:${r.verse}`));
    for (const t of translations) {
      if (t === 'KJV') continue;
      const unmapped = [...verseKeys.get(t)].filter((k) => !k.endsWith(':0') && !kjvKeys.has(k) && !mapped.has(`${t} ${k}`)).map((k) => `${t} ${k}`);
      report(errors, `${label} ${t}: verses not in the KJV numbering and not mapped to it`, unmapped);
    }
  }

  // Everything that points at a verse or a Strong's entry.
  const anyVerse = (k) => [...verseKeys.values()].some((s) => s.has(k));
  const deadRefs = [], deadStrongs = [];
  for (const table of ['concordance', 'renderings']) {
    for (const r of all(`SELECT strongs, translation, refs FROM ${table}`)) {
      if (!strongs.has(r.strongs)) deadStrongs.push(`${table} ${r.strongs}`);
      const set = r.translation === 'ORIG' ? null : verseKeys.get(r.translation);
      for (const k of decodeRefs(r.refs)) if (set ? !set.has(k) : !anyVerse(k)) deadRefs.push(`${table} ${r.strongs} ${r.translation} ${k}`);
    }
  }
  report(errors, `${label}: concordance and renderings for a missing Strong's entry`, deadStrongs);
  report(errors, `${label}: concordance and renderings pointing at a missing verse`, deadRefs);
  const badNotes = [];
  for (const n of all('SELECT n.translation AS t, n.book, n.chapter, n.verse, n.pos, length(v.text) AS len FROM notes n LEFT JOIN verses v ON v.translation = n.translation AND v.book = n.book AND v.chapter = n.chapter AND v.verse = n.verse')) {
    if (n.len === null) badNotes.push(`${n.t} ${n.book}:${n.chapter}:${n.verse}: no such verse`);
    else if (n.pos > n.len) badNotes.push(`${n.t} ${n.book}:${n.chapter}:${n.verse}: note at ${n.pos}, verse ${n.len} long`);
  }
  report(errors, `${label}: footnotes`, badNotes);
  const badHeadings = all('SELECT translation AS t, book, chapter, before_verse AS v FROM headings')
    .filter((h) => !verseKeys.get(h.t)?.has(`${h.book}:${h.chapter}:${h.v}`) && !verseKeys.get(h.t)?.has(`${h.book}:${h.chapter}:${h.v - 1}`))
    .map((h) => `${h.t} ${h.book}:${h.chapter} before ${h.v}`);
  report(errors, `${label}: headings before a missing verse`, badHeadings);
  // Cross references (scripts/lib/crossrefs.mjs): KJV-numbered, from and to verses the KJV
  // has, a range running forwards within its book.
  const kjv = verseKeys.get('KJV');
  const badCross = [];
  for (const r of all("SELECT 'crossrefs' AS t, book, chapter, verse, refs FROM crossrefs UNION ALL SELECT 'parallels', book, chapter, verse, refs FROM parallels")) {
    const at = `${r.t} ${r.book}:${r.chapter}:${r.verse}`;
    if (!kjv?.has(`${r.book}:${r.chapter}:${r.verse}`)) badCross.push(`from ${at}: no such KJV verse`);
    const blob = r.refs;
    if (blob.length === 0 || blob.length % 6 !== 0) badCross.push(`${at}: ${blob.length} bytes`);
    for (let i = 0; i + 5 < blob.length; i += 6) {
      const a = `${blob[i]}:${blob[i + 1]}:${blob[i + 2]}`;
      const b = `${blob[i + 3]}:${blob[i + 4]}:${blob[i + 5]}`;
      if (!kjv?.has(a) || !kjv?.has(b)) badCross.push(`${at} -> ${a}-${b}: no such KJV verse`);
      else if (blob[i + 3] !== blob[i] || blob[i + 4] * 1000 + blob[i + 5] < blob[i + 1] * 1000 + blob[i + 2]) badCross.push(`${at} -> ${a}-${b}: range runs backwards or across books`);
    }
  }
  report(errors, `${label}: cross references and parallel passages`, badCross);
  // Book introductions (scripts/lib/intros.mjs checks them when they are added): one per
  // book in each language the edition's interface offers.
  const introLangs = INTRO_LANGUAGES[edition] ?? ['en'];
  const intros = all('SELECT book, lang FROM intros').map((r) => `${r.lang}:${r.book}`);
  const missingIntros = introLangs.flatMap((l) => Array.from({ length: 66 }, (_, i) => `${l}:${i + 1}`)).filter((k) => !intros.includes(k));
  report(errors, `${label}: book introductions missing`, missingIntros);
  const orphanLexicon = all('SELECT id FROM lexicon').filter((r) => !strongs.has(r.id)).map((r) => r.id);
  report(errors, `${label}: lexicon entries for a missing Strong's entry`, orphanLexicon);
  const interlinear = all('SELECT COUNT(*) AS n FROM interlinear')[0].n;
  if (interlinear !== CHAPTERS) warnings.push(`${label}: interlinear words for ${interlinear} chapters, not ${CHAPTERS}`);
  db.close();
}

// The snapshot: verse counts per chapter.
if (update || !existsSync(SNAPSHOT)) {
  mkdirSync(dirname(SNAPSHOT), { recursive: true });
  writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 1) + '\n');
  console.log(`snapshot written: ${SNAPSHOT}`);
} else {
  const before = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  const changes = [];
  for (const label of new Set([...Object.keys(before), ...Object.keys(snapshot)])) {
    for (const t of new Set([...Object.keys(before[label] ?? {}), ...Object.keys(snapshot[label] ?? {})])) {
      const a = before[label]?.[t], b = snapshot[label]?.[t];
      if (!a || !b) {
        changes.push(`${label} ${t}: ${a ? 'gone' : 'new'}`);
        continue;
      }
      if (a.verses !== b.verses) changes.push(`${label} ${t}: ${a.verses} verses shown, now ${b.verses}`);
      for (const ch of new Set([...Object.keys(a.chapters), ...Object.keys(b.chapters)])) {
        if (a.chapters[ch] !== b.chapters[ch]) changes.push(`${label} ${t} ${ch}: ${a.chapters[ch] ?? 0} verses, now ${b.chapters[ch] ?? 0}`);
      }
    }
  }
  report(errors, 'changed since the snapshot (run with --update if intended)', changes);
}

for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`ERROR    ${e}`);
console.log(errors.length ? `${errors.length} problem(s) found` : 'data check passed');
process.exit(errors.length ? 1 : 0);
