// Tests of the app's logic that once went wrong without anyone seeing: which Greek or
// Hebrew word a tapped word stands for, the word sheet's chips and headline, reading
// settings and saved card designs back, search order and filters, Malayalam search
// spelling, verse text, the Malayalam meanings of the database build, and patterns that
// must stay fast on long text.
//
//   npx tsx scripts/test-logic.mts
import assert from 'node:assert/strict';
import { groupForms, isTaBaseForm, taStem } from './lib/forms.mjs';
import { addPoint, decodeInk, encodeInk, packSteps, pageHeight, parseInk, pathOf, strokePath, touchesStroke, unpackSteps } from '../src/ink';
import { cleanLook, ownPhotoIn, savedCopyIn } from '../src/lookClean';
import { malayalamPattern } from '../src/malayalamSearch';
import { countCrossRefs, getBeside, getCrossRefs } from '../src/queries';
import { findReferences, parseReference } from '../src/refs';
import { newTestamentFirst, refInScope, scopeCounts } from '../src/searchScope';
import { cleanSettings } from '../src/settingsClean';
import { flattenVerse, parseSegments } from '../src/text';
import type { Book, OriginalWord, Rendering } from '../src/types';
import { headlineWords, sameSpelling, topRenderings, wordsInVerse } from '../src/wordChoice';

let passed = 0;
const failures: string[] = [];
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(`${name}: ${(e as Error).message.split('\n')[0]}`);
  }
}

// --- The word a tapped word stands for (John 1:1 has λόγος three times) ---
const w = (text: string, strongs: string, morph = 'N-NSM'): OriginalWord => ({ text, strongs, morph, translit: '', gloss: '' }) as unknown as OriginalWord;
const john1 = [w('Ἐν', 'G1722', 'PREP'), w('λόγος,', 'G3056'), w('λόγος', 'G3056'), w('θεόν,', 'G2316', 'N-ASM'), w('λόγος.', 'G3056')];
test('the 2nd of 3 gets the 2nd λόγος', () => assert.deepEqual(wordsInVerse(john1, 'G3056', [1, 3]).map((x) => x.text), ['λόγος']));
test('the 3rd of 3 gets the 3rd', () => assert.deepEqual(wordsInVerse(john1, 'G3056', [2, 3]).map((x) => x.text), ['λόγος.']));
test('counts that differ: each form once, punctuation aside', () => assert.equal(wordsInVerse(john1, 'G3056', [0, 2]).length, 1));
test('no position: each form once', () => assert.equal(wordsInVerse(john1, 'G3056').length, 1));
test('different forms both shown', () => {
  const v = [w('σκοτίᾳ', 'G4653', 'N-DSF'), w('σκοτία', 'G4653', 'N-NSF')];
  assert.equal(wordsInVerse(v, 'G4653').length, 2);
});
test('a position past the end does not crash', () => assert.ok(wordsInVerse(john1, 'G3056', [7, 3]).length >= 1));
test('transliterations compare without accents', () => assert.ok(sameSpelling('skotía', 'skotia') && !sameSpelling('logos', 'theos')));

// --- The word sheet's chips and headline ---
const r = (word: string, count: number): Rendering => ({ word, count }) as Rendering;
test('a bare "the" after the first is no chip', () => assert.deepEqual(topRenderings([r('God', 1051), r('of God', 92), r('the', 12), r("God's", 11)], 5).map((x) => x.word), ['God', 'of God', "God's"]));
test('"the" first stays (it is ὁ)', () => assert.equal(topRenderings([r('the', 9000), r('a', 50)], 5)[0].word, 'the'));
test('one-off renderings below 1% go', () => assert.deepEqual(topRenderings([r('love', 500), r('charity', 20), r('kindness', 2)], 5).map((x) => x.word), ['love', 'charity']));
test('headline: a second word when it is a real alternative', () => assert.deepEqual(headlineWords([r('ദൈവം', 900), r('ദേവന്മാർ', 100)]), ['ദൈവം', 'ദേവന്മാർ']));
test('headline: not another form of the first', () => assert.deepEqual(headlineWords([r('ജനം', 600), r('ജനത്തെ', 300)]), ['ജനം']));

// --- Settings read back ---
const defaults = { fontSize: 19, readSpeed: 1, theme: 'system', serif: false, bookmarks: [] as unknown[], notes: {} as Record<string, string> };
const sizes = [15, 17, 19, 21, 24, 28, 32, 36];
test('a value of the wrong kind falls back', () => {
  const s = cleanSettings({ serif: 'yes', bookmarks: {}, notes: [], theme: 3 } as never, defaults, sizes);
  assert.deepEqual([s.serif, Array.isArray(s.bookmarks), Array.isArray(s.notes), s.theme], [false, true, false, 'system']);
});
test('text size and speed stay in range', () => {
  const s = cleanSettings({ fontSize: 1e6, readSpeed: -3 }, defaults, sizes);
  assert.deepEqual([s.fontSize, s.readSpeed], [36, 0.5]);
});
test('a missing size takes the default', () => assert.equal(cleanSettings({ fontSize: 0 }, defaults, sizes).fontSize, 19));
test('good values are kept', () => assert.equal(cleanSettings({ serif: true, fontSize: 24 }, defaults, sizes).fontSize, 24));

// --- Saved card designs read back ---
const DOCS = 'file:///data/user/0/app/files/card-photos/';
const CACHE = 'file:///data/user/0/app/cache/';
const known = (id: string) => ['paper', 'rose'].includes(id);
const own = (u: string) => ownPhotoIn(u, DOCS, CACHE);
test('an unknown design is dropped', () => assert.equal(cleanLook({ design: 'evil' } as never, known, own), null));
test('fields out of range are corrected', () => {
  const l = cleanLook({ design: 'rose', strength: 9, veil: 'x', place: 'left', colour: 'red', extras: 'no' } as never, known, own)!;
  assert.deepEqual([l.strength, l.veil, l.place, l.colour, l.extras], [2, 'light', 'middle', undefined, true]);
});
test('the app\'s own photo copy is kept', () => assert.equal(cleanLook({ design: 'paper', photo: `${DOCS}abc123.jpg` } as never, known, own)!.photo, `${DOCS}abc123.jpg`));
test('a path out of the photo folder is refused', () => {
  for (const p of [`${DOCS}../SQLite/notes.db`, 'file:///data/user/0/app/files/SQLite/x.db', `${DOCS}sub/a.jpg`, `${CACHE}../files/x`])
    assert.equal(cleanLook({ design: 'paper', photo: p } as never, known, own)!.photo, undefined, p);
});
test('only own copies may be deleted', () => {
  assert.ok(savedCopyIn(`${DOCS}abc.jpg`, DOCS));
  assert.ok(!savedCopyIn(`${CACHE}ImagePicker/abc.jpg`, DOCS));
  assert.ok(!savedCopyIn(`${DOCS}..%2Fx.jpg`, DOCS));
});

// --- Search order and filters ---
const testament = new Map<number, 'OT' | 'NT'>([...Array(66)].map((_, i) => [i + 1, i < 39 ? 'OT' : 'NT']));
const hits = [{ book: 1, chapter: 1, verse: 1 }, { book: 19, chapter: 23, verse: 1 }, { book: 43, chapter: 3, verse: 16 }, { book: 62, chapter: 4, verse: 8 }, { book: 19, chapter: 1, verse: 2 }];
test('New Testament first, each part in book order', () => assert.deepEqual(newTestamentFirst(hits, testament).map((x) => x.book), [43, 62, 1, 19, 19]));
test('filters with counts', () => assert.deepEqual(scopeCounts(hits, testament).slice(0, 4), [{ scope: 'all', n: 5 }, { scope: 'NT', n: 2 }, { scope: 'OT', n: 3 }, { scope: 19, n: 2 }]));
test('a book filter keeps that book', () => assert.equal(hits.filter((h) => refInScope(h, 19, testament)).length, 2));
test('no filters for one match', () => assert.deepEqual(scopeCounts(hits.slice(0, 1), testament), []));

// --- Malayalam search spelling ---
const finds = (query: string, text: string) => new RegExp(malayalamPattern(query)!.source).test(text);
test('ആത്മാവ് finds ആത്മാവു', () => assert.ok(finds('ആത്മാവ്', 'ദൈവത്തിന്റെ ആത്മാവു വെള്ളത്തിൻ')));
test('കൽപിച്ചു finds കല്പിച്ചു', () => assert.ok(finds('കൽപിച്ചു', 'ദൈവം കല്പിച്ചു')));
test('അവൻ does not find അവന്നു', () => assert.ok(!finds('അവൻ', 'അവന്നു കൊടുത്തു')));
test('signs in the query are taken as letters', () => {
  assert.doesNotThrow(() => malayalamPattern('ദൈവം (.*+?[ ]'));
  assert.ok(!finds('ദൈവം.*', 'ദൈവം വചനം'));
});
test('an English query is not a Malayalam pattern', () => assert.equal(malayalamPattern('love'), null));

// --- Verse text ---
test('the KJV ¶ is left out', () => assert.equal(flattenVerse('¶ There was a man'), 'There was a man'));
test('tags become word runs, a compound with its choices', () => {
  const segs = parseSegments({ book: 43, text: 'നിത്യജീവൻ ഉണ്ടാകും', tags: `0,${'നിത്യജീവൻ'.length},2222+166` });
  assert.deepEqual([segs[0].text, segs[0].strongs, segs[0].choices], ['നിത്യജീവൻ', 'G2222', ['G2222', 'G166']]);
});
test('broken tags are skipped', () => assert.doesNotThrow(() => parseSegments({ book: 1, text: 'x', tags: 'a,b,c 0,99,1' })));

// --- The Malayalam meanings of the database build (scripts/lib/forms.mjs) ---
const forms = (list: [string, number][]) => groupForms(list.map(([display, n]) => ({ display, refs: [...Array(n)].flatMap((_, i) => [1, 1 + Math.floor(i / 50), 1 + (i % 50)]) })));
const label = (list: [string, number][]) => forms(list).sort((a: { refs: number[] }, b: { refs: number[] }) => b.refs.length - a.refs.length)[0].display;
test('Jerusalem: the plain name, not the locative', () => assert.equal(label([['യെരൂശലേമിൽ', 236], ['യെരൂശലേമിലേക്കു', 83], ['യെരൂശലേമിന്റെ', 62], ['യെരൂശലേം', 53]]), 'യെരൂശലേം'));
test('Christ: the head in ു', () => assert.equal(label([['ക്രിസ്തുവിൽ', 80], ['ക്രിസ്തുവിന്റെ', 70], ['ക്രിസ്തു', 60]]), 'ക്രിസ്തു'));
test('people: ജനം and ജനത്തെ are one word', () => assert.equal(forms([['ജനം', 275], ['ജനത്തെ', 606]]).length, 1));
test('a verb keeps its commonest form', () => assert.equal(label([['വന്നു', 500], ['വന്നപ്പോൾ', 80], ['വരുന്നു', 40]]), 'വന്നു'));
test('Tamil: two-letter stems are not grouped', () => assert.equal(groupForms([{ display: 'கல்', refs: [1, 1, 1] }, { display: 'கலை', refs: [1, 1, 2] }], taStem, isTaBaseForm).length, 2));

// --- Handwritten pages (src/ink.ts) ---
const strokeA = { c: 1, w: 3, p: [10, 20, 30, 25, 60, 40] };
const strokeH = { c: -1, w: 18, p: [100, 300, 400, 300] };
test('ink is read back as written', () => assert.deepEqual(parseInk(JSON.stringify(encodeInk({ strokes: [strokeA, strokeH] }))).strokes, [strokeA, strokeH]));
test('ink is stored as steps, written as letters', () => assert.deepEqual(unpackSteps((encodeInk({ strokes: [strokeA] }) as { s: [number, number, string][] }).s[0][2], 100), [10, 20, 20, 5, 30, 15]));
test('letters hold any step', () => {
  const values = [0, 1, -1, 15, -16, 16, -17, 600, -600, 123456, -999999];
  assert.deepEqual(unpackSteps(packSteps(values), 100), values);
});
test('a small step is one letter', () => assert.equal(packSteps([3, -2, 15, -16]).length, 4));
test('letters it could not have written are refused', () => assert.deepEqual([unpackSteps('AB"', 100), unpackSteps('g', 100), unpackSteps('A'.repeat(20), 10)], [null, null, null]));
test('a page saved by 0.4.16 (steps as numbers) is read', () => assert.deepEqual(decodeInk({ v: 1, s: [{ c: 1, w: 3, d: [10, 20, 20, 5, 30, 15] }] }).strokes, [strokeA]));
test('a damaged stroke in letters is left out', () => assert.deepEqual(decodeInk({ v: 2, s: [[0, 3, 'A!'], [7, 3, 'AA'], [0, 3, 'CE']] }).strokes, [{ c: 0, w: 3, p: [1, 2] }]));
test('the letters take under half the room of numbers', () => {
  const page = { strokes: [...Array(200)].map((_, i) => ({ c: 0, w: 3, p: [...Array(60)].flatMap((__, j) => [(i * 7 + j * 3) % 600, i * 20 + (j % 5)]) })) };
  const numbers = JSON.stringify({ v: 1, s: page.strokes.map((st) => ({ c: st.c, w: st.w, d: st.p.map((v, k) => v - (k >= 2 ? st.p[k - 2] : 0)) })) }).length;
  assert.ok(JSON.stringify(encodeInk(page)).length < numbers / 2, `${JSON.stringify(encodeInk(page)).length} vs ${numbers}`);
});
test('damaged strokes are left out, good ones kept', () => {
  const raw = { v: 1, s: [{ c: 7, w: 3, d: [1, 1] }, { c: 0, w: 'x', d: [1, 1] }, { c: 0, w: 3, d: [1] }, { c: 0, w: 3, d: [1, 'a'] }, { c: 0, w: 3, d: [5, 5, 1, 1] }, null, 'x'] };
  assert.deepEqual(decodeInk(raw).strokes, [{ c: 0, w: 3, p: [5, 5, 6, 6] }]);
});
test('ink that is not a page reads as an empty page', () => assert.deepEqual([decodeInk(null).strokes, decodeInk([1, 2]).strokes, decodeInk({ s: 'no' }).strokes], [[], [], []]));
test('ink text that is not JSON throws (the store keeps it aside)', () => assert.throws(() => parseInk('{')));
test('points off the page are refused', () => assert.equal(decodeInk({ s: [{ c: 0, w: 3, d: [5000, 10] }] }).strokes.length, 0));
test('a pen held still adds no points', () => {
  const p: number[] = [];
  addPoint(p, 10, 10);
  addPoint(p, 10.4, 10.3);
  addPoint(p, 20, 10);
  assert.deepEqual(p, [10, 10, 20, 10]);
});
test('the eraser finds a stroke it passes over, not one beside it', () => assert.ok(touchesStroke(strokeH, 250, 305, 10) && !touchesStroke(strokeH, 250, 340, 10)));
test('a stroke path has no NaN', () => assert.ok(!/NaN|undefined/.test(strokePath(strokeA.p) + strokePath([5, 5]) + strokePath([1, 2, 3, 4]))));
test('the page grows below the writing', () => assert.equal(pageHeight({ strokes: [{ c: 0, w: 3, p: [0, 2000] }] }, 800), 2500));

// --- Side by side: the other Bible beside each verse, both ways (needs the built databases) ---
const { DatabaseSync } = await import('node:sqlite');
const { existsSync: exists, readdirSync: list } = await import('node:fs');
const DB_DIR = new URL('../assets/db/', import.meta.url).pathname;
// Verses the edition's Bible does not have (Acts 15:34 and 28:29, Romans 16:24 in the Malayalam).
const NOT_IN = new Set(['MAL 44:15:34', 'MAL 44:28:29', 'MAL 45:16:24']);
for (const [ed, native] of [['ml', 'MAL'], ['ta', 'TAM']] as const) {
  const file = exists(DB_DIR) ? list(DB_DIR).find((f) => f.startsWith(`bible-${ed}`) && f.endsWith('.db')) : undefined;
  if (!file) continue;
  const raw = new DatabaseSync(DB_DIR + file, { readOnly: true });
  const db = { getAllAsync: async (q: string, ...a: unknown[]) => raw.prepare(q).all(...(a.flat() as never[])), getFirstAsync: async (q: string, ...a: unknown[]) => raw.prepare(q).get(...(a.flat() as never[])) ?? null } as never;
  const problems: string[] = [];
  const chapters = raw.prepare('SELECT DISTINCT book, chapter FROM verse_map WHERE translation = ?').all(native) as { book: number; chapter: number }[];
  for (const { book, chapter } of chapters) {
    for (const [from, to] of [[native, 'KJV'], ['KJV', native]] as const) {
      const verses = (raw.prepare('SELECT verse FROM verses WHERE translation = ? AND book = ? AND chapter = ? AND verse > 0 AND omitted = 0').all(from, book, chapter) as { verse: number }[]).map((r) => r.verse);
      const beside = await getBeside(db, from, to, book, chapter, verses);
      for (const v of verses) if (!beside.get(v)?.length && !NOT_IN.has(`${to} ${book}:${chapter}:${v}`)) problems.push(`${from} ${book}:${chapter}:${v}`);
      // Each verse is found again from the verses beside it.
      if (from !== native) continue;
      for (const v of verses)
        for (const k of beside.get(v) ?? []) {
          const back = await getBeside(db, 'KJV', native, k.book, k.chapter, [k.verse]);
          if (!(back.get(k.verse) ?? []).some((m) => m.book === book && m.chapter === chapter && m.verse === v)) problems.push(`${native} ${book}:${chapter}:${v} and back`);
        }
    }
  }
  test(`${ed} side by side: every verse of the renumbered chapters has its partner, both ways`, () => assert.deepEqual(problems.slice(0, 5), []));
  // Cross references: John 3:16 leads first to Romans 5:8, quoted in the edition's own Bible.
  const john316 = await getCrossRefs(db, native, { book: 43, chapter: 3, verse: 16 });
  test(`${ed} cross references of John 3:16, strongest first, in ${native}`, () => {
    assert.deepEqual(john316[0].start, { book: 45, chapter: 5, verse: 8 });
    assert.ok(john316.length >= 5 && john316.length <= 12, `${john316.length}`);
    const script = native === 'MAL' ? /[\u0D00-\u0D7F]/ : /[\u0B80-\u0BFF]/;
    assert.ok(john316.every((c) => c.verses.length > 0 && c.verses.every((v) => script.test(v.text))), 'every reference quoted in the edition\'s own Bible');
  });
  test(`${ed} a range is quoted in part and counted`, () => {
    const range = john316.find((c) => c.end.verse > c.start.verse);
    assert.ok(range && range.verses.length === Math.min(3, range.end.verse - range.start.verse + 1));
  });
  test(`${ed} the count in the verse menu matches the list`, async () => assert.equal(await countCrossRefs(db, native, { book: 43, chapter: 3, verse: 16 }), john316.length));
}

// --- Patterns that must stay fast on long text ---
const books = [{ id: 43, osis: 'John', name: 'John', testament: 'NT', chapters: 21, names: {} }] as Book[];
// Each takes milliseconds now; the slow patterns these guard against took seconds or minutes.
const fast = (name: string, fn: () => void, ms = 1000) =>
  test(name, () => {
    const t = Date.now();
    fn();
    assert.ok(Date.now() - t < ms, `took ${Date.now() - t} ms`);
  });
// 400 spaces: instant now; over 10 s if spaces were no longer squeezed (minutes beyond).
fast('a long search with spaces', () => parseReference(' '.repeat(400) + 'x', books));
fast('a long search of words', () => parseReference('love '.repeat(1000) + 'x', books));
fast('a long notebook page', () => findReferences('John 3:16 and some words 1 2 3 '.repeat(500), books));
fast('a long handwritten page read back', () => parseInk(JSON.stringify(encodeInk({ strokes: [...Array(3000)].map((_, i) => ({ c: 0, w: 3, p: [...Array(100)].flatMap((__, j) => [j * 5 % 600, i + j]) })) }))));
// A long handwritten page, once open: a new stroke, the save before it is written and an
// eraser touch each cost a fraction of a millisecond (they took 3 to 50 ms when every
// stroke was worked through again).
{
  const page = [...Array(3000)].map((_, i) => ({ c: i % 3, w: 3, p: [...Array(60)].flatMap((__, j) => [((i * 37) % 560) + (j % 30), Math.floor(i / 12) * 36 + (j % 7)]) }));
  page.forEach(pathOf);
  encodeInk({ strokes: page });
  fast('a long handwritten page: paths, saving and the eraser after a new stroke', () => {
    const next = [...page, { c: 0, w: 3, p: [1, 9000, 2, 9001] }];
    next.forEach(pathOf);
    encodeInk({ strokes: next });
    next.filter((st) => touchesStroke(st, 300, 4000, 10));
  }, 25);
}
fast('a long Malayalam search', () => new RegExp(malayalamPattern('ൻ്റ'.repeat(200))!.source).test('ന്റ'.repeat(5000)));

if (failures.length) {
  console.log(`${failures.length} failed, ${passed} passed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`all ${passed} logic tests passed`);
