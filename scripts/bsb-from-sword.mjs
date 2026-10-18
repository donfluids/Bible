// Turns CrossWire's Berean Standard Bible module (SWORD zText, OSIS, CC0) into one USFM
// file per book, so scripts/build-db.mjs reads it like the eBible texts.
//
//   node scripts/bsb-from-sword.mjs data/raw/bsb-sword data/raw/bsb
//
// The module is used rather than eBible's engbsb because its Strong's numbers come from
// the Berean word tables and sit on the right English words; eBible's are shifted by a
// word in many verses (John 1:16 "His" tagged "all"). It follows the KJV versification,
// so the verse layout is taken from the KJV source (data/raw/kjv).
//
// Kept: words with their Strong's numbers, paragraphs, poetry lines, footnotes, psalm
// titles (as \d, verse 0, like the KJV) and the acrostic letters of Psalm 119 (as \d).
// Dropped, as for the other texts: section headings and parallel-passage references.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readZText } from './lib/sword.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [src = join(ROOT, 'data/raw/bsb-sword'), out = join(ROOT, 'data/raw/bsb')] = process.argv.slice(2);

const CODES = ('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL ' +
  'MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV').split(' ');

// KJV verse counts, chapter by chapter, from the KJV USFM.
const kjvDir = join(ROOT, 'data/raw/kjv');
const kjvFiles = readdirSync(kjvDir);
// The English book names too: the module's own first title is a preface in Genesis.
const names = [];
const counts = CODES.map((code) => {
  const file = kjvFiles.find((f) => f.endsWith(code + 'eng-kjv2006.usfm'));
  const chapters = [];
  const src = readFileSync(join(kjvDir, file), 'utf8');
  names.push(/^\\toc2\s+(.+?)\s*$/m.exec(src)?.[1] ?? /^\\h\s+(.+?)\s*$/m.exec(src)?.[1] ?? code);
  for (const line of src.split('\n')) {
    const c = /^\\c\s+(\d+)/.exec(line);
    if (c) chapters.push(0);
    for (const v of line.matchAll(/\\v\s+(\d+)/g)) chapters[chapters.length - 1] = Math.max(chapters[chapters.length - 1], Number(v[1]));
  }
  return chapters;
});

const textDir = join(src, 'modules/texts/ztext/bsb');
const testaments = [readZText(join(textDir, 'ot')), readZText(join(textDir, 'nt'))];

const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
// Superscript verse numbers inside notes keep a space after them ("include 21 But…").
const plain = (s) => unescape(s.replace(/<hi\b[^>]*type="super"[^>]*>([\s\S]*?)<\/hi>/g, '$1 ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

/** One verse entry of OSIS as USFM lines (before the \v marker and after it). */
function verseUsfm(osis) {
  const before = []; // \d lines that come before the verse
  let s = osis;
  // Psalm titles and acrostic letters become \d; other titles (section headings,
  // parallel references) are dropped.
  s = s.replace(/<title\b([^>]*)>([\s\S]*?)<\/title>/g, (_, attrs, body) => {
    if (/type="(psalm|acrostic)"/.test(attrs)) before.push(`\\d ${inline(body)}`);
    return '';
  });
  s = s.replace(/<title\b[^>]*\/>/g, '');
  return { before, body: inline(s) };
}

/** Inline OSIS as USFM: words, notes, breaks. */
function inline(s) {
  return unescape(
    s
      // Footnotes: their text only.
      .replace(/<note\b[^>]*>([\s\S]*?)<\/note>/g, (_, body) => `\\f + \\ft ${plain(body)}\\f*`)
      // Words: the first Strong's number of each; untranslated (empty) words go.
      .replace(/<w\b([^>]*)\/>/g, '')
      .replace(/<w\b([^>]*)>([\s\S]*?)<\/w>/g, (_, attrs, word) => {
        const n = /strong:([HG]\d+)/.exec(attrs);
        const w = word.replace(/<[^>]*>/g, '');
        return n && w.trim() ? `\\w ${w}|strong="${n[1]}"\\w*` : w;
      })
      // Paragraphs start, poetry lines and list items begin a new line.
      .replace(/<div\b[^>]*type="x-p"[^>]*sID[^>]*\/>/g, '\n\\p ')
      .replace(/<l\b[^>]*level="2"[^>]*\/?>/g, '\n\\q2 ')
      .replace(/<l\b[^>]*\/?>/g, (m) => (/eID/.test(m) ? '' : '\n\\q1 '))
      .replace(/<item\b[^>]*type="x-indent-2"[^>]*>/g, '\n\\q2 ')
      .replace(/<item\b[^>]*>/g, '\n\\q1 ')
      .replace(/<lb\b[^>]*\/>/g, '\n\\b ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

mkdirSync(out, { recursive: true });
let book = 0;
let omitted = 0;
for (const [t, entries] of testaments.entries()) {
  let i = 2; // module and testament headings
  const books = t === 0 ? CODES.slice(0, 39) : CODES.slice(39);
  for (const code of books) {
    const chapters = counts[book];
    const lines = [`\\id ${code}`, `\\h ${names[book]}`, `\\toc2 ${names[book]}`];
    i++; // book heading
    for (let c = 1; c <= chapters.length; c++) {
      i++; // chapter heading
      lines.push(`\\c ${c}`);
      let lastNotes = '';
      for (let v = 1; v <= chapters[c - 1]; v++) {
        const { before, body } = verseUsfm(entries[i++] ?? '');
        lines.push(...before);
        if (!body) {
          // A verse the BSB leaves out: say so, with the note on the verse before when it explains it.
          const note = [...lastNotes.matchAll(/\\ft ([^\\]*)/g)].map((m) => m[1]).find((n) => /\b(include|add|verse)/i.test(n));
          lines.push(`\\v ${v} \\f + \\ft ${note ?? 'The BSB does not include this verse; some later manuscripts do.'}\\f*`);
          omitted++;
          continue;
        }
        lastNotes = body;
        const [first, ...rest] = body.split('\n');
        // A break that opens the verse goes before the \v marker.
        if (/^\\(p|q1|q2|b)\b/.test(first)) {
          const m = /^(\\\w+)\s*(.*)$/.exec(first);
          lines.push(m[1], `\\v ${v} ${m[2]}`);
        } else {
          lines.push(`\\v ${v} ${first}`);
        }
        lines.push(...rest);
      }
    }
    writeFileSync(join(out, `${String(book + 2).padStart(2, '0')}-${code}bsb.usfm`), lines.join('\n') + '\n');
    book++;
  }
}
console.log(`BSB: ${book} books written to ${out}, ${omitted} verses the BSB leaves out`);
