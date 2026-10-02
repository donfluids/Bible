// Builds the per-edition databases from the sources fetched by scripts/fetch-data.sh.
//
//   npm run fetch-data
//   npm run build-db              # both editions
//   node scripts/build-db.mjs ml  # one edition
//
// Editions (see src/edition.ts): "en" bundles the KJV and WEB into assets/db/bible-en.db;
// "ml" bundles the Malayalam Sathyavedapusthakam and the KJV into assets/db/bible-ml.db.
//
// Output schema (all text is UTF-8):
//   books(id, osis, name, testament, chapters)
//   book_names(translation, book, name)   book names in each translation's own language
//   verses(translation, book, chapter, verse, text, tags, omitted, para)
//     para = the break that precedes the verse: '' none, 'p' new paragraph, 'b' blank
//            line, 'q0' 'q1' 'q2' a poetry line at that indent level
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
//     how many verses use it, and those verses packed like concordance.refs. Malayalam
//     forms of one word (ദൈവം, ദൈവമായ, ദൈവത്തിന്റെ …) are grouped under the shortest
//   strongs(id, lemma, translit, pron, derivation, definition, kjv_usage, lemma_plain, translit_plain, gloss)
//     lemma_plain and translit_plain are lowercase with accents, vowel points and
//     diacritics removed, for accent-insensitive dictionary search; gloss is a short
//     modern meaning: the one or two senses STEPBible's dictionaries give the word
//     most often in the Hebrew and Greek text (null for words that never occur)
//   concordance(strongs, translation, count, refs)
//     refs = BLOB of 3 bytes per verse: book, chapter, verse (each fits a byte)
//   interlinear(book, chapter, data)
//     data = raw deflate (zlib, no header) of the chapter's words as text. Verses are
//            separated by U+001C and each verse is "<verse number>U+001D<words>"; words
//            are records separated by U+001E with fields separated by U+001F:
//            text, transliteration, gloss, Strong's id (may be empty), grammar code, flags,
//            and for a replaced word the Nestle-Aland reading it replaces (may be absent)
//             flags: 1 = not in the Nestle-Aland editions, 2 = supplied from the Septuagint,
//                    4 = restored where the Leningrad Codex is damaged,
//                    8 = not in the Textus Receptus, 16 = not in the Byzantine text,
//                    32 = the Textus Receptus or Byzantine reading where Nestle-Aland has
//                         a different word (the seventh field holds that word)
//     Source: STEPBible TAHOT and TAGNT (CC BY 4.0). TAGNT spells words as NA28 does. The
//     Greek here is every word found in the Textus Receptus or the Byzantine text, in the
//     place TAGNT gives it; where those texts read a different word from Nestle-Aland, their
//     word is shown. Hebrew section marks (פ ס) are dropped. Verse numbers follow the KJV.
//   verse_map(translation, book, chapter, verse, n, obook, ochapter, overse)
//     translation verses numbered differently from the KJV numbering of the interlinear;
//     n orders the KJV verses when one verse holds two. From data/overrides/versification.json
//   meta(key, value)
import { DatabaseSync } from 'node:sqlite';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { textHash } from './lib/tokens.mjs';
import { readFileSync, readdirSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'data', 'raw');
const OUT_DIR = join(ROOT, 'assets', 'db');
const EDITIONS = { en: ['KJV', 'WEB'], ml: ['MAL', 'KJV'] };

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
const FLAG_NOT_IN_TR = 8;
const FLAG_NOT_IN_BYZ = 16;
const FLAG_REPLACES_NA = 32;

// Dictionary glosses seen for each Strong's number, counted over every word of the
// Hebrew and Greek text, for strongs.gloss.
const senseCounts = new Map(); // "H430" -> Map(gloss -> count)

// The word's own gloss from a STEPBible dictionary entry. A word with several senses is
// written ": sense»gloss:1_sense" (the part before » only tells the senses apart, e.g.
// ": depart»to send" for שָׁלַח); a word with one is written "gloss" or "gloss»link@ref".
function entryGloss(value) {
  const v = (value || '').trim();
  if (v.startsWith(':')) return v.includes('»') ? v.split('»')[1].split(/[:@]/)[0] : '';
  return v.split(/[»@]/)[0];
}

function countSense(strongs, sense) {
  const clean = (sense || '')
    .replace(/^[:\s]+/, '')
    .replace(/[@|].*$/, '')
    .replace(/_/g, ' ')
    .replace(/(\p{L})\((\p{L}+)\)/gu, '$1$2') // "to(wards)"
    .replace(/\s+/g, ' ')
    .trim();
  // Placeholders such as "[Obj.]" or "<the>" are not meanings.
  if (!strongs || !clean || /^[\[<].*[\]>]$/.test(clean)) return;
  if (!senseCounts.has(strongs)) senseCounts.set(strongs, new Map());
  const m = senseCounts.get(strongs);
  m.set(clean, (m.get(clean) || 0) + 1);
}
// "God" or "God; gods": the commonest sense, and the next when it is common too.
function shortGloss(strongs) {
  const ranked = [...(senseCounts.get(strongs) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;
  const out = [ranked[0][0]];
  if (ranked[1] && ranked[1][1] >= ranked[0][1] * 0.15 && ranked[1][0].toLowerCase() !== out[0].toLowerCase()) out.push(ranked[1][0]);
  return out
    .join('; ')
    .replace(/\//g, ', ')
    .replace(/\s*\(?(KJV|NIV|Qere)[:=.][^)]*\)?/g, '') // translators' notes
    .replace(/[([]([^)\]]+)[)\]](?=\p{L})/gu, '$1') // "(Sea of )Chinnereth", "[Ben]jaminite"
    .replace(/\s*[([][^)\]]*[)\]]?/g, '') // "serve[someone]", "(PERSON)"
    .replace(/\s+/g, ' ')
    .split(/\s*;\s*/)
    .filter((g, i, all) => g && all.findIndex((x) => x.toLowerCase() === g.toLowerCase()) === i)
    .join('; ');
}
// Internal markers used while a verse is being assembled; none appear in the output.
const BREAK = '\x07'; // followed by an indent level digit
const NOTE = '\x06'; // wraps a note index
const FS = '\x1c';
const GS = '\x1d';
const RS = '\x1e';
const US = '\x1f';

// The WEB source's Strong's tags are not used: many sit on the wrong words (Genesis 1:1
// tags "In", "God" and "and" as H8064 "heavens"; no word in the WEB carries H430). The
// app looks words up in the KJV instead, and the WEB is read as plain text.
const UNTAGGED = new Set(['WEB']);

const ALL_TRANSLATIONS = [
  { id: 'KJV', name: 'King James Version', dir: 'kjv', suffix: 'eng-kjv2006.usfm' },
  { id: 'WEB', name: 'World English Bible', dir: 'web', suffix: 'engwebp.usfm' },
  { id: 'MAL', name: 'സത്യവേദപുസ്തകം 1910', dir: 'mal2015', suffix: 'mal2015.usfm' },
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
  // Figures (\fig caption|src=… copy=…\fig*) are illustrations, not text.
  let s = raw.replace(/\\fig\s[\s\S]*?\\fig\*/g, '');
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
  let s = body.replace(/\\fig\s[\s\S]*?\\fig\*/g, '').replace(/\\(fr|xo)\s+[^\\]*/g, '');
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
  // The book's name in this translation's language: \toc2 (short name), else \h.
  const toc2 = /^\\toc2\s+(.+?)\s*$/m.exec(src);
  const h = /^\\h\s+(.+?)\s*$/m.exec(src);
  const bookName = (toc2 ?? h)?.[1] ?? null;
  const chapters = new Map(); // chapter -> Map(verse -> raw)
  const headings = []; // { chapter, beforeVerse, raw }
  let chapter = 0;
  let verse = null;
  let pendingBreak = null; // poetry or paragraph break waiting for the next text
  let pendingKind = ''; // 'p', 'b' or 'q' for that break
  const paras = new Map(); // "chapter:verse" -> break kind before the verse
  const append = (text) => {
    if (verse === null || !text || !text.trim()) return;
    const ch = chapters.get(chapter);
    if (pendingBreak !== null && !ch.has(verse)) {
      paras.set(`${chapter}:${verse}`, pendingKind === 'q' ? `q${pendingBreak}` : pendingKind);
    }
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
      pendingKind = /^q/.test(p[1]) ? 'q' : p[1] === 'b' ? 'b' : 'p';
    }
    // A line may hold several verses: split on \v markers.
    const parts = rest.split(/\\v\s+(\d+)[a-z]?\s*/);
    append(parts[0]);
    for (let i = 1; i < parts.length; i += 2) {
      verse = Number(parts[i]);
      append(parts[i + 1]);
    }
  }
  return { chapters, headings, notes, paras, bookName };
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
    // A closing section mark is written as its own segment: "אֶחָֽד\׃\ \פ".
    const text = fields[1].replace(/\\\s*\\[פס]\s*$/, '').replace(/[\/\\]/g, '').trim();
    if (!text) continue; // Qere with no written form
    const translit = fields[2].replace(/\//g, '').trim();
    const gloss = fields[3].replace(/\//g, '').replace(/\s+/g, ' ').trim();
    const root = /\{H(\d+)/.exec(fields[4]) || /\bH(\d+)/.exec(fields[4]);
    const strongs = root && Number(root[1]) < 9000 ? 'H' + Number(root[1]) : '';
    // The root's dictionary entry: "{H7225G=רֵאשִׁית=: beginning»first:1_beginning}" (a
    // sense, then the word's general gloss) or "{H1254A=בָּרָא=to create}".
    const dict = /\{H\d+[A-Z]?=[^=}]*=([^}]*)\}/.exec(fields[11] || '');
    if (dict) countSense(strongs, entryGloss(dict[1]));
    const morph = fields[5].trim();
    let flags = 0;
    if (ref.type.startsWith('X')) flags |= FLAG_LXX;
    if (ref.type.startsWith('R')) flags |= FLAG_RESTORED;
    words.push({ ...ref, text, translit, gloss, strongs, morph, flags });
  }
  return words;
}

// Which of the three printed texts lack a word, as flags, from an editions list
// such as "NA28+NA27+Tyn+SBL+WH+Treg+TR+Byz".
function editionFlags(editions) {
  return (/NA2/.test(editions) ? 0 : FLAG_NOT_IN_NA) | (/\bTR\b/.test(editions) ? 0 : FLAG_NOT_IN_TR) | (/Byz/.test(editions) ? 0 : FLAG_NOT_IN_BYZ);
}

// The Textus Receptus or Byzantine reading recorded against a word they do not have,
// e.g. "θεὸς (T=theos) God - G2316=N-NSM-T in: TR+Byz". Alternatives are separated by ¦;
// one with both texts wins, then the Textus Receptus. A reading of several words keeps
// them in one cell, numbered by its first word that is not an article or particle.
const VARIANT = /^(.+?) \([A-Za-z]=([^)]*)\) (.*?) - (G\d+[A-Z]?=\S+(?: \+ G\d+[A-Z]?=\S+)*) in: (\S+)$/;
function traditionalReading(field) {
  const readings = (field || '').split(/\s*¦\s*/).map((p) => VARIANT.exec(p.trim())).filter((m) => m && /\bTR\b|Byz/.test(m[5]));
  const rank = (m) => (/\bTR\b/.test(m[5]) && /Byz/.test(m[5]) ? 0 : /\bTR\b/.test(m[5]) ? 1 : 2);
  const m = readings.sort((a, b) => rank(a) - rank(b))[0];
  if (!m) return null;
  const codes = m[4].split(' + ').map((c) => c.split('='));
  const [code, morph] = codes.find(([, mo]) => !/^(T-|PREP|CONJ|PRT)/.test(mo)) ?? codes[0];
  return { text: m[1].trim(), translit: m[2].trim(), gloss: m[3].trim(), strongs: 'G' + Number(code.slice(1).replace(/[A-Z]$/, '')), morph, editions: m[5] };
}

function stepGreekWords() {
  const words = [];
  let skipped = 0, replaced = 0;
  for (const { ref, fields } of stepLines(STEP_FILES.greek)) {
    const editions = fields[5];
    const raw = fields[1].replace(/[¶]|\[\[|\]\]/g, '').trim();
    const split = raw.lastIndexOf(' (');
    const text = (split > 0 ? raw.slice(0, split) : raw).trim();
    const translit = split > 0 ? raw.slice(split + 2).replace(/\)$/, '').trim() : '';
    if (!text) continue;
    const gloss = fields[2].replace(/\s+/g, ' ').trim();
    if (!/\bTR\b|Byz/.test(editions)) {
      // Not in the traditional text; show what it reads here instead, if anything.
      const t = traditionalReading(fields[6]);
      if (!t) { skipped++; continue; }
      replaced++;
      const flags = FLAG_NOT_IN_NA | FLAG_REPLACES_NA | (editionFlags(t.editions) & (FLAG_NOT_IN_TR | FLAG_NOT_IN_BYZ));
      words.push({ ...ref, text: t.text, translit: t.translit, gloss: t.gloss, strongs: t.strongs, morph: t.morph, flags, alt: `${text} (${translit}) ‘${gloss}’` });
      continue;
    }
    const sm = /G(\d+)/.exec(fields[3]);
    const strongs = sm ? 'G' + Number(sm[1]) : '';
    const morph = (fields[3].split('=')[1] || '').trim();
    // The dictionary gloss ("κύριος=lord"); the column after the editions holds links to
    // people and things ("LORD@Gen.1.1"), not meanings, so it is not used here.
    countSense(strongs, (fields[4] || '').split('=').slice(1).join('='));
    words.push({ ...ref, text, translit, gloss, strongs, morph, flags: editionFlags(editions) });
  }
  return { words, skipped, replaced };
}

function buildInterlinear(db) {
  const ins = db.prepare('INSERT INTO interlinear VALUES (?,?,?)');
  const known = new Set(db.prepare('SELECT id FROM strongs').all().map((r) => r.id));
  const hebrew = stepHebrewWords();
  const { words: greek, skipped, replaced } = stepGreekWords();
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
    const packed = list.map((w) => [w.text, w.translit, w.gloss, w.strongs, w.morph, String(w.flags), ...(w.alt ? [w.alt] : [])].join(US)).join(RS);
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
  return { hebrewWords: hebrew.length, greekWords: greek.length, greekNaOnlySkipped: skipped, greekTraditionalReadings: replaced, wordsWithoutDictionaryEntry: unknown, verses: byVerse.size, chapters: byChapter.size, compressedBytes: bytes };
}

// Lowercase and strip accents, Hebrew points and other combining marks, so that
// "logos", "lógos", "λογος" and "λόγος" all compare equal.
function plainText(text) {
  if (!text) return null;
  return text.normalize('NFD').replace(/[\u0300-\u036f\u0591-\u05c7\u05f0-\u05f4]/g, '').replace(/ς/g, 'σ').replace(/[ʼʻ'’ʾʿ]/g, '').toLowerCase().trim();
}

function loadStrongs(file, varName) {
  const src = readFileSync(join(RAW, file), 'utf8');
  const start = src.indexOf('{', src.indexOf(`var ${varName}`));
  const end = src.lastIndexOf('};');
  return JSON.parse(src.slice(start, end + 1));
}

function loadGlossOverrides() {
  try {
    const doc = JSON.parse(readFileSync(join(ROOT, 'data', 'overrides', 'glosses.json'), 'utf8'));
    return Object.fromEntries(Object.entries(doc).filter(([k]) => /^[HG]\d+$/.test(k)));
  } catch {
    return {};
  }
}

// Known faults in a source text, corrected from another public-domain copy.
// See data/overrides/text-corrections.json for what is replaced and why.
function loadCorrections() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'data', 'overrides', 'text-corrections.json'), 'utf8'));
  } catch {
    return { strip: {} };
  }
}

// Word-level links from Malayalam words to Strong's numbers, made by
// scripts/align-malayalam.mjs. Only confident links (c = 2) are used.
// A verse can appear in several files when it was aligned again after its text changed;
// the newest alignment made for the verse's current text is the one used.
function loadAlignments() {
  const dir = join(ROOT, 'data', 'align', 'mal');
  const map = new Map(); // "book:chapter:verse" -> [{ ...verse, created }]
  let files = [];
  try { files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort(); } catch { return map; }
  for (const f of files) {
    const doc = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const v of doc.verses) {
      const key = `${v.book}:${v.chapter}:${v.v}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ ...v, created: doc.created ?? '' });
    }
  }
  return map;
}

function alignmentFor(alignments, key, text) {
  const hash = textHash(text);
  const matching = (alignments.get(key) ?? []).filter((a) => a.hash === hash);
  return matching.sort((a, b) => (a.created < b.created ? 1 : -1))[0];
}

// Links the aligner makes systematically wrong. Hebrew writes "your", "our", "him" as a
// suffix on the noun or verb, so a Malayalam pronoun such as നിന്റെ got the number of the
// word it is attached to (നിന്റെ ദൈവം: both words linked to Elohim). Such a pronoun is left
// unlinked unless its Hebrew counterpart is a pronoun in its own right. The object
// marker אֵת (H853) is never translated, so nothing links to it.
const ML_PRONOUNS = new Set(('എന്റെ നിന്റെ അവന്റെ അവളുടെ അതിന്റെ നമ്മുടെ ഞങ്ങളുടെ നിങ്ങളുടെ അവരുടെ തന്റെ തങ്ങളുടെ ' +
  'എന്നെ നിന്നെ അവനെ അവളെ അതിനെ നമ്മെ ഞങ്ങളെ നിങ്ങളെ അവരെ അവയെ').split(' '));
// Pronoun words, for the renderings lists: a pronoun counted as the rendering of a noun or
// verb comes from a wrong link, and would show as a chip such as "നിങ്ങൾ" under "believe".
const ML_PRONOUN_WORDS = new Set([...ML_PRONOUNS, ...('ഞാൻ നീ അവൻ അവൾ അവർ നാം ഞങ്ങൾ നിങ്ങൾ അതു അവ ' +
  'എനിക്കു നിനക്കു അവന്നു അവൾക്കു അവർക്കു നമുക്കു ഞങ്ങൾക്കു നിങ്ങൾക്കു').split(' ')]);
const GREEK_PRONOUNS = new Set(['G1473', 'G3165', 'G3427', 'G3450', 'G1698', 'G1700', 'G1691', 'G2249', 'G2257', 'G2254', 'G2248',
  'G4771', 'G4675', 'G4671', 'G4571', 'G4674', 'G5210', 'G5216', 'G5213', 'G5209', 'G5212', 'G846', 'G1438', 'G3778', 'G1683', 'G4572', 'G848']);
const HEBREW_PRONOUNS = new Set(['H589', 'H595', 'H587', 'H5168', 'H859', 'H1931', 'H1992', 'H1993', 'H2004', 'H2007', 'H1158']);
let misLinks = 0;
// In "നിങ്ങളുടെ ദൈവമായ യഹോവ" the aligner followed the Hebrew order (YHWH Elohim) and
// linked യഹോവ to God and ദൈവം to the LORD. യഹോവ always renders the divine name, so a
// യഹോവ linked to H430 is set to H3068, and a ദൈവ… word in the same verse linked to H3068
// is set to H430. `entries` and the tag `parts` are index-aligned.
let lordGodFixes = 0;
function fixLordGod(entries, parts) {
  const setId = (i, id) => {
    entries[i].id = id;
    parts[i] = parts[i].replace(/,\d+$/, ',' + id.slice(1));
    lordGodFixes++;
  };
  const crossedLord = entries.findIndex((e) => e.id === 'H430' && e.word.startsWith('യഹോവ'));
  if (crossedLord < 0) return;
  setId(crossedLord, 'H3068');
  const crossedGod = entries.findIndex((e) => e.id === 'H3068' && e.word.startsWith('ദൈവ'));
  if (crossedGod >= 0) setId(crossedGod, 'H430');
}
function misLinked(span, text) {
  const wrong = span.n === 'H853' || (span.n.startsWith('H') && ML_PRONOUNS.has(text.slice(span.s, span.e)) && !HEBREW_PRONOUNS.has(span.n));
  if (wrong) misLinks++;
  return wrong;
}

// Forms of one Malayalam word under one Strong's number, grouped by stem: the shortest
// form heads the group, and a later form joins it when it starts with the head's stem
// (three characters at least) or shares most of the head (സൃഷ്ടിച്ച, സൃഷ്ടിക്കും). The stem
// is the head less a final ം ു ്, or with a final chillu written as its consonant, since
// inflections continue from it (മകൻ: മകനെ, മകനായ). A group is labelled by its commonest
// base form (one ending in ം, ു, ് or a chillu, like ദൈവം or മകൻ) unless that form is
// rare in the group, and then by the group's commonest form.
const CHILLU = { 'ൻ': 'ന', 'ർ': 'ര', 'ൽ': 'ല', 'ൾ': 'ള', 'ൺ': 'ണ' };
const mlStem = (w) => {
  const last = w.slice(-1);
  return CHILLU[last] ? w.slice(0, -1) + CHILLU[last] : w.replace(/[ംു്]+$/u, '');
};
// Not "…ും" (and, also) or a case ending such as "…ത്തു", "…ക്കു", "…ന്നു".
const isBaseForm = (w) => /[്ൻർൽൾൺ]$|[^ു]ം$|[^ുത്കന്ട]ു$/u.test(w) && !/(ത്തു|ക്കു|ന്നു|ട്ടു)$/u.test(w);
function sharedStart(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}
function groupForms(entries) {
  const groups = [];
  const sorted = [...entries].sort((a, b) => a.display.length - b.display.length || b.refs.length - a.refs.length);
  for (const e of sorted) {
    const g = groups.find((x) => {
      if (x.stem.length >= 3 && e.display.startsWith(x.stem)) return true;
      const n = sharedStart(x.head, e.display);
      return n >= 5 && n >= 0.6 * x.head.length;
    });
    if (g) g.members.push(e);
    else groups.push({ stem: mlStem(e.display), head: e.display, members: [e] });
  }
  return groups.map((g) => {
    const commonest = (list) => list.reduce((a, b) => (b.refs.length > a.refs.length ? b : a));
    const top = commonest(g.members);
    const bases = g.members.filter((m) => isBaseForm(m.display));
    const base = bases.length ? commonest(bases) : null;
    // Else the shortest form that is still common in the group.
    const shortCommon = [...g.members].sort((a, b) => a.display.length - b.display.length).find((m) => m.refs.length >= top.refs.length * 0.3);
    g.display = base && base.refs.length >= top.refs.length * 0.3 ? base.display : (shortCommon ?? top).display;
    const seen = new Set();
    const refs = [];
    for (const m of g.members) {
      for (let i = 0; i < m.refs.length; i += 3) {
        const key = (m.refs[i] << 16) | (m.refs[i + 1] << 8) | m.refs[i + 2];
        if (!seen.has(key)) { seen.add(key); refs.push([m.refs[i], m.refs[i + 1], m.refs[i + 2]]); }
      }
    }
    refs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    return { display: g.display, refs: refs.flat() };
  });
}

// Verses numbered differently from the KJV, from data/overrides/versification.json.
function loadVerseMap() {
  try {
    const doc = JSON.parse(readFileSync(join(ROOT, 'data', 'overrides', 'versification.json'), 'utf8'));
    return Object.fromEntries(Object.entries(doc).filter(([k]) => /^[A-Z]{3}$/.test(k)));
  } catch {
    return {};
  }
}

function buildEdition(edition) {
  const TRANSLATIONS = EDITIONS[edition].map((id) => ALL_TRANSLATIONS.find((t) => t.id === id));
  const OUT = join(OUT_DIR, `bible-${edition}.db`);
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
    CREATE TABLE book_names(translation TEXT NOT NULL, book INTEGER NOT NULL, name TEXT NOT NULL, PRIMARY KEY(translation, book)) WITHOUT ROWID;
    CREATE TABLE verses(translation TEXT NOT NULL, book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
                        text TEXT NOT NULL, tags TEXT NOT NULL, omitted INTEGER NOT NULL DEFAULT 0, para TEXT NOT NULL DEFAULT '',
                        PRIMARY KEY(translation, book, chapter, verse)) WITHOUT ROWID;
    CREATE TABLE headings(translation TEXT NOT NULL, book INTEGER NOT NULL, chapter INTEGER NOT NULL, before_verse INTEGER NOT NULL,
                        text TEXT NOT NULL, PRIMARY KEY(translation, book, chapter, before_verse)) WITHOUT ROWID;
    CREATE TABLE notes(translation TEXT NOT NULL, book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
                        n INTEGER NOT NULL, pos INTEGER NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL,
                        PRIMARY KEY(translation, book, chapter, verse, n)) WITHOUT ROWID;
    CREATE TABLE renderings(strongs TEXT NOT NULL, translation TEXT NOT NULL, word TEXT NOT NULL, count INTEGER NOT NULL,
                        refs BLOB NOT NULL, PRIMARY KEY(strongs, translation, word)) WITHOUT ROWID;
    CREATE TABLE strongs(id TEXT PRIMARY KEY, lemma TEXT, translit TEXT, pron TEXT, derivation TEXT, definition TEXT, kjv_usage TEXT,
                        lemma_plain TEXT, translit_plain TEXT, gloss TEXT) WITHOUT ROWID;
    CREATE INDEX strongs_translit ON strongs(translit_plain);
    CREATE TABLE concordance(strongs TEXT NOT NULL, translation TEXT NOT NULL, count INTEGER NOT NULL, refs BLOB NOT NULL,
                        PRIMARY KEY(strongs, translation)) WITHOUT ROWID;
    CREATE TABLE interlinear(book INTEGER NOT NULL, chapter INTEGER NOT NULL, data BLOB NOT NULL,
                        PRIMARY KEY(book, chapter)) WITHOUT ROWID;
    CREATE TABLE verse_map(translation TEXT NOT NULL, book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
                        n INTEGER NOT NULL, obook INTEGER NOT NULL, ochapter INTEGER NOT NULL, overse INTEGER NOT NULL,
                        PRIMARY KEY(translation, book, chapter, verse, n)) WITHOUT ROWID;
    CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
  `);

  const insVerse = db.prepare('INSERT INTO verses VALUES (?,?,?,?,?,?,?,?)');
  const insHeading = db.prepare('INSERT OR REPLACE INTO headings VALUES (?,?,?,?,?)');
  const insNote = db.prepare('INSERT INTO notes VALUES (?,?,?,?,?,?,?,?)');
  const insRendering = db.prepare('INSERT INTO renderings VALUES (?,?,?,?,?)');
  const insBook = db.prepare('INSERT INTO books VALUES (?,?,?,?,?)');
  const insBookName = db.prepare('INSERT INTO book_names VALUES (?,?,?)');
  const insStrongs = db.prepare('INSERT INTO strongs VALUES (?,?,?,?,?,?,?,?,?,NULL)');
  const insConc = db.prepare('INSERT INTO concordance VALUES (?,?,?,?)');
  const insMeta = db.prepare('INSERT INTO meta VALUES (?,?)');

  const chapterCounts = new Map();
  const stats = {};
  const alignments = loadAlignments();
  const corrections = loadCorrections();
  for (const t of TRANSLATIONS) {
    const files = readdirSync(join(RAW, t.dir));
    const conc = new Map(); // strongs -> array of [b,c,v]
    const rend = new Map(); // strongs -> Map(lowercased word -> { forms: Map(display -> n), refs: [], lastKey })
    let verses = 0, tagCount = 0, omitted = 0, noteCount = 0, alignedVerses = 0;
    db.exec('BEGIN');
    for (const book of BOOKS) {
      const file = files.find((f) => f.endsWith(book.osis + t.suffix));
      if (!file) throw new Error(`${t.id}: no file for ${book.osis}`);
      const { chapters, headings, notes, paras, bookName } = parseBook(join(RAW, t.dir, file));
      // Replace chapters the source gets wrong, and strip stray text it contains.
      for (const [ch, versesById] of Object.entries(corrections[t.id]?.[book.id] ?? {})) {
        chapters.set(Number(ch), new Map(Object.entries(versesById).map(([v, text]) => [Number(v), text])));
        for (const k of [...paras.keys()]) if (k.startsWith(`${ch}:`)) paras.delete(k);
      }
      for (const [ref, pairs] of Object.entries(corrections.replace?.[t.id] ?? {})) {
        const [b, ch, v] = ref.split(':').map(Number);
        const raw = b === book.id ? chapters.get(ch)?.get(v) : undefined;
        if (raw === undefined) continue;
        let fixed = raw;
        for (const [from, to] of pairs) {
          if (!fixed.includes(from)) throw new Error(`text-corrections: "${from}" not found in ${t.id} ${ref}`);
          fixed = fixed.replace(from, to);
        }
        chapters.get(ch).set(v, fixed);
      }
      for (const [ref, junk] of Object.entries(corrections.strip?.[t.id] ?? {})) {
        const [b, ch, v] = ref.split(':').map(Number);
        const raw = b === book.id ? chapters.get(ch)?.get(v) : undefined;
        if (raw !== undefined) chapters.get(ch).set(v, raw.replace(junk, ''));
      }
      if (bookName) insBookName.run(t.id, book.id, bookName);
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
            insVerse.run(t.id, book.id, chapter, verse, tagged.slice(1).trim(), '', 1, paras.get(`${chapter}:${verse}`) || '');
            omitted++;
            continue;
          }
          const split = splitTags(tagged);
          const { text, notes: markers } = split;
          let tags = UNTAGGED.has(t.id) ? '' : split.tags;
          // Tagged words: the source's own tags, or for Malayalam the aligned links.
          let entries = UNTAGGED.has(t.id) ? [] : [...tagged.matchAll(/⟨([^|⟩]*)\|([HG]\d+)⟩/g)].map((m) => ({ word: m[1].trim(), id: m[2] }));
          if (t.id === 'MAL') {
            const al = alignmentFor(alignments, `${book.id}:${chapter}:${verse}`, text);
            if (al) {
              const prefix = book.id <= 39 ? 'H' : 'G';
              const spans = al.spans
                .filter((x) => x.c >= 2 && x.n.startsWith(prefix) && !misLinked(x, text))
                .sort((a, b) => a.s - b.s);
              const parts = [];
              let prevEnd = 0;
              entries = [];
              for (const sp of spans) {
                if (sp.s < prevEnd || sp.e > text.length) continue; // overlapping or out of range
                parts.push(`${sp.s - prevEnd},${sp.e - sp.s},${sp.n.slice(1)}`);
                entries.push({ word: text.slice(sp.s, sp.e), id: sp.n });
                prevEnd = sp.e;
              }
              fixLordGod(entries, parts);
              tags = parts.join(' ');
              alignedVerses++;
            }
          }
          insVerse.run(t.id, book.id, chapter, verse, text, tags, 0, paras.get(`${chapter}:${verse}`) || '');
          verses++;
          markers.forEach((mk, n) => {
            const note = notes[mk.idx];
            insNote.run(t.id, book.id, chapter, verse, n, mk.pos, note.kind, note.text);
            noteCount++;
          });
          const seen = new Set();
          const verseKey = `${book.id}:${chapter}:${verse}`;
          for (const m of entries) {
            tagCount++;
            const word = m.word;
            const lower = word.toLowerCase();
            const strayPronoun = t.id === 'MAL' && ML_PRONOUN_WORDS.has(word) && !HEBREW_PRONOUNS.has(m.id) && !GREEK_PRONOUNS.has(m.id);
            if (strayPronoun) {
              if (!seen.has(m.id)) { seen.add(m.id); if (!conc.has(m.id)) conc.set(m.id, []); conc.get(m.id).push(book.id, chapter, verse); }
              continue;
            }
            if (!rend.has(m.id)) rend.set(m.id, new Map());
            const byWord = rend.get(m.id);
            if (!byWord.has(lower)) byWord.set(lower, { forms: new Map(), refs: [], lastKey: '' });
            const entry = byWord.get(lower);
            entry.forms.set(word, (entry.forms.get(word) || 0) + 1);
            if (entry.lastKey !== verseKey) { entry.refs.push(book.id, chapter, verse); entry.lastKey = verseKey; }
            if (seen.has(m.id)) continue;
            seen.add(m.id);
            if (!conc.has(m.id)) conc.set(m.id, []);
            conc.get(m.id).push(book.id, chapter, verse);
          }
        }
      }
    }
    for (const [strongs, refs] of conc) {
      insConc.run(strongs, t.id, refs.length / 3, new Uint8Array(refs));
    }
    let renderingRows = 0;
    for (const [strongs, byWord] of rend) {
      // Display the most frequent spelling (keeps LORD rather than lord).
      let entries = [...byWord.values()].map((entry) => ({
        display: [...entry.forms.entries()].sort((a, b) => b[1] - a[1])[0][0],
        refs: entry.refs,
      }));
      if (t.id === 'MAL') entries = groupForms(entries);
      for (const entry of entries) {
        insRendering.run(strongs, t.id, entry.display, entry.refs.length / 3, new Uint8Array(entry.refs));
        renderingRows++;
      }
    }
    db.exec('COMMIT');
    stats[t.id] = { verses, omittedVerses: omitted, ...(t.id === 'MAL' ? { alignedVerses, misLinksDropped: misLinks, lordGodFixes } : {}), tags: tagCount, strongsNumbers: conc.size, notes: noteCount, renderings: renderingRows };
  }

  db.exec('BEGIN');
  for (const b of BOOKS) insBook.run(b.id, b.osis, b.name, b.testament, chapterCounts.get(b.id));
  const heb = loadStrongs('strongs-hebrew.js', 'strongsHebrewDictionary');
  const grk = loadStrongs('strongs-greek.js', 'strongsGreekDictionary');
  let nStrongs = 0;
  for (const dict of [heb, grk]) {
    for (const [id, e] of Object.entries(dict)) {
      const translit = e.xlit ?? e.translit ?? null;
      insStrongs.run(id, e.lemma ?? null, translit, e.pron ?? null,
        (e.derivation ?? '').trim() || null, (e.strongs_def ?? '').trim() || null, (e.kjv_def ?? '').trim() || null,
        plainText(e.lemma), plainText(translit));
      nStrongs++;
    }
  }
  const insMap = db.prepare('INSERT INTO verse_map VALUES (?,?,?,?,?,?,?,?)');
  let mapped = 0;
  for (const [id, entries] of Object.entries(loadVerseMap())) {
    if (!TRANSLATIONS.some((t) => t.id === id)) continue;
    for (const [from, to] of Object.entries(entries)) {
      const [b, c, v] = from.split(':').map(Number);
      [to].flat().forEach((ref, n) => insMap.run(id, b, c, v, n, ...ref.split(':').map(Number)));
      mapped++;
    }
  }
  stats.verseMap = mapped;
  insMeta.run('schema', '9');
  insMeta.run('edition', edition);
  insMeta.run('built', new Date().toISOString().slice(0, 10));
  insMeta.run('translations', JSON.stringify(TRANSLATIONS.map(({ id, name }) => ({ id, name }))));
  const SOURCES = {
    KJV: 'eBible.org eng-kjv2006, public domain',
    WEB: 'eBible.org engwebp, public domain',
    MAL: 'eBible.org mal2015, Malayalam Sathyavedapusthakam 1910 in contemporary orthography, Free Bible Foundation 2015, CC BY-SA 4.0',
  };
  insMeta.run('sources', JSON.stringify({
    ...Object.fromEntries(TRANSLATIONS.map((t) => [t.id, SOURCES[t.id]])),
    strongs: 'Open Scriptures strongs (CC BY-SA)',
    interlinear: 'STEPBible TAHOT and TAGNT, Tyndale House Cambridge (CC BY 4.0)',
  }));
  db.exec('COMMIT');
  const interlinear = buildInterlinear(db);
  const setGloss = db.prepare('UPDATE strongs SET gloss = ? WHERE id = ?');
  let glosses = 0;
  db.exec('BEGIN');
  for (const id of senseCounts.keys()) {
    const g = shortGloss(id);
    if (g && setGloss.run(g, id).changes) glosses++;
  }
  // Words the Hebrew and Greek text never uses under their own number (often forms that
  // Strong's numbered separately, such as ἐστί, "of G1510") take the gloss of the word
  // their derivation names first.
  let inherited = 0;
  for (const row of db.prepare('SELECT id, derivation FROM strongs WHERE gloss IS NULL AND derivation IS NOT NULL').all()) {
    const m = /\b([HG])0*(\d{1,4})\b/.exec(row.derivation);
    const parent = m && db.prepare('SELECT gloss FROM strongs WHERE id = ?').get(m[1] + m[2]);
    if (parent?.gloss && setGloss.run(parent.gloss, row.id).changes) inherited++;
  }
  // Hand corrections: data/overrides/glosses.json.
  let overridden = 0;
  for (const [id, g] of Object.entries(loadGlossOverrides())) if (setGloss.run(g, id).changes) overridden++;
  db.exec('COMMIT');
  stats.glosses = { fromText: glosses, inherited, overridden };
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

  // The app checks the copy it makes on the phone against this size, so a copy cut short
  // (the app closed, or the phone out of space) is noticed and made again (src/db.ts).
  const SIZES = join(ROOT, 'src', 'dbSizes.json');
  let sizes = {};
  try { sizes = JSON.parse(readFileSync(SIZES, 'utf8')); } catch { /* first build */ }
  sizes[edition] = statSync(OUT).size;
  writeFileSync(SIZES, JSON.stringify(sizes, null, 1) + '\n');
  console.log(JSON.stringify({ edition, ...stats, strongsEntries: nStrongs, bytes: statSync(OUT).size }, null, 2));
}

function main() {
  const wanted = process.argv.slice(2).filter((a) => EDITIONS[a]);
  for (const edition of wanted.length ? wanted : Object.keys(EDITIONS)) buildEdition(edition);
}

main();
