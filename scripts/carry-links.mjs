// Carries the 1910 Malayalam Bible's word links over to the Malayalam IRV, a light revision
// of it: a verse whose words are the 1910's, spelling aside, takes the 1910's links word for
// word. The verses that differ more are left for scripts/align.mjs --lang irv, and listed.
//
//   node scripts/carry-links.mjs        # needs assets/db/bible-ml.db built with both Bibles
//
// Writes data/align/irv/carried.json, in scripts/align.mjs's format (one file, confident
// links only, made for each verse's current text), and data/align/irv-to-align.json (beside
// the folder, which the build reads), the verses for:
//   node scripts/align.mjs --lang irv --verses data/align/irv-to-align.json
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { textHash, tokenize, wordSpan } from './lib/tokens.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'align', 'irv');
// Unchanged verses only: at most this share of the IRV's words may differ from the 1910's,
// and those are left unlinked; a verse that differs more goes to the model.
const MAX_CHANGED = 0.1;

const db = new DatabaseSync(join(ROOT, 'assets', 'db', 'bible-ml.db'), { readOnly: true });
const verses = (id) =>
  new Map(db.prepare('SELECT book, chapter, verse, text, tags FROM verses WHERE translation = ? AND omitted = 0').all(id).map((r) => [`${r.book}:${r.chapter}:${r.verse}`, r]));
const mal = verses('MAL');
const irv = verses('IRV');
// Verses numbered differently from the KJV in either Bible are left to the model.
const mapped = new Set(db.prepare("SELECT translation || ':' || book || ':' || chapter || ':' || verse k FROM verse_map").all().map((r) => r.k));

// The same word in either spelling: the IRV writes ന്‍റ for ന്റ (with a joiner), and a
// word's closing half-u as ് where the 1910 has ു (ആത്മാവ് / ആത്മാവു, എനിക്ക് / എനിക്കു,
// പ്രാപിക്കേണ്ടതിന് / പ്രാപിക്കേണ്ടതിന്നു). The old chillu letters (consonant, virama,
// joiner) count as the atomic ones; joiners are dropped and edge punctuation taken off.
const CHILLU = { 'ണ': 'ൺ', 'ന': 'ൻ', 'ര': 'ർ', 'ല': 'ൽ', 'ള': 'ൾ', 'ക': 'ൿ' };
const norm = (word) =>
  word
    .normalize('NFC')
    .replace(/^[^ഀ-ൿ\w]+|[^ഀ-ൿ\w]+$/gu, '')
    .replace(/ന്‍റ|ൻറ/g, 'ന്റ')
    .replace(/([ണനരലളക])്‍/g, (_, c) => CHILLU[c])
    .replace(/[‌‍]/g, '')
    .replace(/ന്നു$/, 'ന്')
    .replace(/ു$/, '്');

/** Words of a verse: each token's word part and its normal form. */
const words = (text) =>
  tokenize(text)
    .map((t) => ({ t, span: wordSpan(t) }))
    .filter((w) => w.span)
    .map(({ span }) => ({ s: span.start, e: span.end, key: norm(text.slice(span.start, span.end)) }));

/** Pairs of equal words in order (longest common subsequence): i in a -> j in b. */
function lineUp(a, b) {
  const n = a.length;
  const m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i].key === b[j].key ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pairs = new Map();
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i].key === b[j].key) pairs.set(i++, j++);
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

/** The 1910 verse's links from its tags ("gap,length,number[+number]" each): [{ s, e, ids }]. */
function links(text, tags, book) {
  const out = [];
  let at = 0;
  for (const part of tags.split(' ').filter(Boolean)) {
    const [gap, len, nums] = part.split(',');
    const s = at + Number(gap);
    const e = s + Number(len);
    out.push({ s, e, ids: nums.split('+').map((n) => (book <= 39 ? 'H' : 'G') + n) });
    at = e;
  }
  return out;
}

const carried = [];
const toAlign = [];
let linksCarried = 0;
for (const [key, v] of irv) {
  const old = mal.get(key);
  if (!old || mapped.has(`MAL:${key}`) || mapped.has(`IRV:${key}`)) {
    toAlign.push(key);
    continue;
  }
  const a = words(old.text);
  const b = words(v.text);
  const pairs = lineUp(a, b);
  if (b.length === 0 || (b.length - pairs.size) / b.length > MAX_CHANGED || (a.length - pairs.size) / Math.max(1, a.length) > MAX_CHANGED) {
    toAlign.push(key);
    continue;
  }
  const spans = [];
  for (const link of links(old.text, old.tags, v.book)) {
    const i = a.findIndex((w) => w.s <= link.s && link.e <= w.e);
    if (i < 0 || !pairs.has(i)) continue;
    const w = b[pairs.get(i)];
    for (const n of link.ids) spans.push({ s: w.s, e: w.e, n, c: 2 });
  }
  linksCarried += spans.length;
  carried.push({ book: v.book, chapter: v.chapter, v: v.verse, hash: textHash(v.text), spans });
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'carried.json'), JSON.stringify({ method: 'carried from the 1910 Malayalam Bible (scripts/carry-links.mjs)', created: '2026-11-22T00:00:00Z', verses: carried }) + '\n');
writeFileSync(join(OUT, '..', 'irv-to-align.json'), JSON.stringify(toAlign) + '\n');
console.log(`IRV: ${carried.length} verses carried over (${linksCarried} links); ${toAlign.length} left for the model`);
