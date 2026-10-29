// Rewrites the strings table in docs/tamil-review.md or docs/hindi-review.md from
// src/i18n.ts, so the review always covers every string the app has in that language.
// Notes a reviewer has written in the Check column are kept for keys whose text is unchanged.
//
//   node scripts/review-strings.mjs ta
//   node scripts/review-strings.mjs hi
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'src/i18n.ts'), 'utf8');

/** One table of src/i18n.ts as key -> text. */
function table(name) {
  const start = src.search(new RegExp(`^const ${name}\\b[^=]*= \\{`, 'm'));
  const body = src.slice(start, src.indexOf('\n};', start));
  const out = new Map();
  for (const m of body.matchAll(/^ {2}(\w+): ('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`),?$/gm)) {
    out.set(m[1], m[2].slice(1, -1).replace(/\\(.)/g, '$1'));
  }
  return out;
}
const LANGUAGES = { ta: { doc: 'docs/tamil-review.md', name: 'Tamil' }, hi: { doc: 'docs/hindi-review.md', name: 'Hindi' } };
const lang = LANGUAGES[process.argv[2]];
if (!lang) throw new Error('give the language: ta or hi');
const en = table('en');
const ta = table(process.argv[2]);

const DOC = join(ROOT, lang.doc);
const doc = readFileSync(DOC, 'utf8');
const head = `| Key | English | ${lang.name} | Check |\n| --- | --- | --- | --- |\n`;
const at = doc.indexOf(head);
if (at < 0) throw new Error(`strings table not found in ${lang.doc}`);
let end = at + head.length;
while (end < doc.length && doc.startsWith('|', end)) end = doc.indexOf('\n', end) + 1 || doc.length;

// Earlier checks, kept where the Tamil they were written against is unchanged.
const checks = new Map();
for (const line of doc.slice(at + head.length, end).split('\n')) {
  const cells = line.split(' | ');
  if (cells.length < 4) continue;
  const key = cells[0].replace(/^\| /, '');
  const check = cells[cells.length - 1].replace(/ ?\|$/, '').trim();
  if (check) checks.set(key, { tamil: cells[2], check });
}

const cell = (s) => s.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
const rows = [...ta.keys()].map((key) => {
  const old = checks.get(key);
  const check = old && old.tamil === cell(ta.get(key)) ? old.check : '';
  return `| ${key} | ${cell(en.get(key) ?? '')} | ${cell(ta.get(key))} |${check ? ` ${check} ` : ' '}|\n`;
});
writeFileSync(DOC, doc.slice(0, at) + head + rows.join('') + doc.slice(end));
console.log(`${rows.length} strings written to ${lang.doc}`);
