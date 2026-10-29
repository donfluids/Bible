// Checks the book introductions (data/intros, see data/intros/GUIDE.md):
//   node --no-warnings scripts/check-intros.mjs [en|ml|ta|hi ...] [--books 1-5,41]
// With no language, all four. Missing files are listed last as a count.
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kjvVerses, readIntros } from './lib/intros.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const langs = args.filter((a) => ['en', 'ml', 'ta', 'hi'].includes(a));
const booksArg = args[args.indexOf('--books') + 1];
const books = new Set();
if (args.includes('--books'))
  for (const part of booksArg.split(',')) {
    const [a, b = a] = part.split('-').map(Number);
    for (let n = a; n <= b; n++) books.add(n);
  }
const db = new DatabaseSync(join(ROOT, 'assets', 'db', 'bible-en.db'), { readOnly: true });
const { problems } = readIntros(ROOT, kjvVerses(db), langs.length ? langs : ['en', 'ml', 'ta', 'hi']);
db.close();
const wanted = (p) => {
  const m = /^(\w+)\/(\d+):/.exec(p);
  return (!langs.length || langs.includes(m[1])) && (!books.size || books.has(Number(m[2])));
};
const shown = problems.filter(wanted);
const missing = shown.filter((p) => p.endsWith(': missing'));
for (const p of shown.filter((p) => !p.endsWith(': missing'))) console.log(p);
if (missing.length) console.log(`${missing.length} missing: ${missing.map((p) => p.split(':')[0]).join(' ')}`);
if (!shown.length) console.log('book introductions: no problems');
process.exitCode = shown.length ? 1 : 0;
