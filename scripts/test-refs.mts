// Checks how typed references are read, against the real book lists and verse counts.
// Run: node --experimental-strip-types scripts/test-refs.mts
// Cases come from the reviewers' reports: references people write in sermon notes, and
// ordinary words and numbers that must stay plain text.
import { DatabaseSync } from 'node:sqlite';
import { findReferences, parseReference } from '../src/refs.ts';
import { formatRef } from '../src/text.ts';

type Expect = [string, string];

function load(edition: 'ml' | 'en') {
  const db = new DatabaseSync(new URL(`../assets/db/bible-${edition}.db`, import.meta.url).pathname, { readOnly: true });
  const rows = db.prepare('SELECT id, osis, name, testament, chapters FROM books ORDER BY id').all() as any[];
  const names = db.prepare('SELECT translation, book, name FROM book_names').all() as any[];
  const books = rows.map((b) => ({ ...b, names: Object.fromEntries(names.filter((n) => n.book === b.id).map((n) => [n.translation, n.name])) }));
  const translation = edition === 'ml' ? 'MAL' : 'KJV';
  const counts = new Map<string, number>();
  for (const r of db.prepare('SELECT book, chapter, MAX(verse) AS n FROM verses WHERE translation = ? GROUP BY book, chapter').all(translation) as any[]) counts.set(`${r.book}:${r.chapter}`, r.n);
  return { db, books, translation, count: (b: number, c: number) => counts.get(`${b}:${c}`) };
}

/** The references found in a line, written as book:chapter:verse[-chapter:verse]. */
function links(text: string, ctx: ReturnType<typeof load>): string {
  return findReferences(text, ctx.books as any, ctx.translation as any, ctx.count)
    .filter((p) => p.ref)
    .map((p) => {
      const r = p.ref!;
      const range = r.toChapter !== r.chapter ? `-${r.toChapter}:${r.toVerse}` : r.toVerse !== r.verse ? `-${r.toVerse}` : '';
      return `${r.book}:${r.chapter}${r.chapterOnly ? '' : `:${r.verse}`}${range}`;
    })
    .join(' ');
}

const ML: Expect[] = [
  ['ദൈവം ലോകത്തെ സ്നേഹിച്ച വിധം: യോഹന്നാൻ 3:16', '43:3:16'],
  ['സ്നേഹം – 1 കൊരി 13:4-7', '46:13:4-7'],
  ['യോഹ. 3:16; 4:24', '43:3:16 43:4:24'],
  ['റോമ. 8:28, 29', '45:8:28 45:8:29'],
  ['എഫെ. 2:8, 9', '49:2:8 49:2:9'],
  ['മത്താ. 5:1-7:29', '40:5:1-7:29'],
  ['സങ്കീർത്തനം 23', '19:23'],
  ['സങ്കീ. 23', '19:23'],
  ['യൂദാ 24', '65:1:24'],
  ['ഫിലേമോൻ 6', '57:1:6'],
  ['ഓബദ്യാവ് 15', '31:1:15'],
  ['3 യോഹ. 2', '64:1:2'],
  ['ഒന്നാം കൊരിന്ത്യർ 13', '46:13'],
  ['1-ാം കൊരി. 13:4', '46:13:4'],
  ['സദൃശ്യവാക്യങ്ങൾ 3:5', '20:3:5'],
  ['ഫിലിപ്പ്യർ 4:13', '50:4:13'],
  ['മാർക്കോസ് 16:15', '41:16:15'],
  ['യോഹന്നാൻ 3:16-ൽ', '43:3:16'],
  ['അപ്പൊ. പ്രവൃത്തികൾ 2:1-4 (പെന്തെക്കൊസ്ത്)', '44:2:1-4'],
  ['1. ദിനവൃത്താന്തം 7:14', '13:7:14'],
  ['സങ്കീർത്തനങ്ങൾ 3 (ശീർഷകം)', '19:3:0'],
  // Ordinary words and numbers: no link.
  ['യേശു 12 ശിഷ്യന്മാരെ തിരഞ്ഞെടുത്തു', ''],
  ['യേശു 40 ദിവസം ഉപവസിച്ചു', ''],
  ['യേശു 5000 പേരെ പോഷിപ്പിച്ചു', ''],
  ['വെള്ളം 6 കൽഭരണികളിൽ', ''],
  ['സംഖ്യ 7 പൂർണ്ണതയുടെ അടയാളം', ''],
  ['എബ്രായ 3 വാക്ക്', ''],
  ['ന്യായം 3', ''],
  ['ദാനീയേൽ 1260 ദിവസം', ''],
  ['യോഹന്നാൻ 2024-ൽ', ''],
  ['ഞാൻ 12 പേരെ കണ്ടു, 2024-ൽ', ''],
];

const EN: Expect[] = [
  ['Read John 3:16 and Ps 23:1-3 today.', '43:3:16 19:23:1-3'],
  ['Romans 8', '45:8'],
  ['Ps 23', '19:23'],
  ['Jude 3', '65:1:3'],
  ['3 John 4', '64:1:4'],
  ['2 John 12', '63:1:12'],
  ['1 John 6:1', ''],
  ['Song of Songs 2:1', '22:2:1'],
  ['John 3:16-18, 20', '43:3:16-18 43:3:20'],
  ['Genesis 1:1–2:3', '1:1:1-2:3'],
  ['Psalms 3 (title)', '19:3:0'],
  ['Daniel 1260 days', ''],
  ['John 2024 notes', ''],
  ['Genesis 1000 years', ''],
  ['Prayer meeting is 7:30 tonight', ''],
  ['he 1:3', ''],
  ['Number 12', ''],
  ['mark 3 people', ''],
  ['Romans 8 is long; is 5 people; I am 3 years old.', '45:8'],
];

// What the search box opens. Malayalam names exist only in the Malayalam edition.
const SEARCH: [string, string, 'ml' | 'both'][] = [
  ['സങ്കീ. 23:1-6', '19:23:1', 'ml'],
  ['1 കൊരി. 13:4-7', '46:13:4', 'ml'],
  ['യൂദാ 24', '65:1:24', 'ml'],
  ['Jude 24', '65:1:24', 'both'],
  ['John 3:16', '43:3:16', 'both'],
  ['Ps 23:1-6', '19:23:1', 'both'],
];

let failed = 0;
for (const [edition, cases] of [['ml', ML], ['en', EN]] as const) {
  const ctx = load(edition);
  for (const [text, want] of cases) {
    const got = links(text, ctx);
    if (got !== want) {
      failed++;
      console.log(`FAIL ${edition} ${JSON.stringify(text)}: got "${got}", want "${want}"`);
    }
  }
  for (const [text, want, where] of SEARCH) {
    if (where === 'ml' && edition !== 'ml') continue;
    const r = parseReference(text, ctx.books as any, ctx.translation as any);
    const got = r ? `${r.book}:${r.chapter}:${r.verse}` : '';
    if (got !== want) {
      failed++;
      console.log(`FAIL search ${edition} ${JSON.stringify(text)}: got "${got}", want "${want}"`);
    }
  }
  // Every verse, written the way "Add to notebook" writes it, reads back as itself.
  let bad = 0;
  for (const v of ctx.db.prepare('SELECT book, chapter, verse FROM verses WHERE translation = ?').all(ctx.translation) as any[]) {
    const label = formatRef(ctx.books as any, v, ctx.translation as any);
    const got = links(label, ctx);
    if (got !== `${v.book}:${v.chapter}:${v.verse}`) {
      if (bad++ < 5) console.log(`FAIL round trip ${edition} ${label}: got "${got}"`);
    }
  }
  failed += bad;
  console.log(`${edition}: ${cases.length} cases, round trip ${bad ? `${bad} failures` : 'clean'}`);
}
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);
