// Tests of the app's logic that once went wrong without anyone seeing: which Greek or
// Hebrew word a tapped word stands for, the word sheet's chips and headline, reading
// settings and saved card designs back, search order and filters, Malayalam search
// spelling, verse text, the Malayalam meanings of the database build, and patterns that
// must stay fast on long text.
//
//   npx tsx scripts/test-logic.mts
import assert from 'node:assert/strict';
import { groupForms, isTaBaseForm, taStem } from './lib/forms.mjs';
import { cleanLook, ownPhotoIn, savedCopyIn } from '../src/lookClean';
import { malayalamPattern } from '../src/malayalamSearch';
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
fast('a long Malayalam search', () => new RegExp(malayalamPattern('ൻ്റ'.repeat(200))!.source).test('ന്റ'.repeat(5000)));

if (failures.length) {
  console.log(`${failures.length} failed, ${passed} passed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`all ${passed} logic tests passed`);
