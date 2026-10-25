// Book introductions (data/intros/<lang>/<book>.json, written for these apps; see
// data/intros/GUIDE.md): checked against the KJV's verses and put in each edition's database
// in the languages its interface offers.
//
// intros(book, lang, data): the file's JSON, less its `name`.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const INTRO_LANGUAGES = { en: ['en'], ml: ['ml', 'en'], ta: ['ta', 'en'] };

const VERSE = /^(\d+):(\d+)$/;
const RANGE = /^(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/;

/** The KJV's verses, as `kjv(book)` -> ordered ["c:v", ...]. */
export function kjvVerses(db) {
  const byBook = new Map();
  for (const r of db.prepare("SELECT book, chapter, verse FROM verses WHERE translation = 'KJV' AND verse > 0 ORDER BY book, chapter, verse").all()) {
    if (!byBook.has(r.book)) byBook.set(r.book, []);
    byBook.get(r.book).push(`${r.chapter}:${r.verse}`);
  }
  return byBook;
}

const words = (text) => text.split(/\s+/).filter(Boolean).length;

/**
 * The problems with one introduction (an empty list when there are none). `english` is the
 * English introduction of the same book, which a translation must match in its references.
 */
export function checkIntro(intro, book, verses, lang, english) {
  const problems = [];
  const say = (text) => problems.push(`${lang}/${book}: ${text}`);
  if (!intro || typeof intro !== 'object') return [`${lang}/${book}: not an object`];
  if (intro.book !== book) say(`book is ${intro.book}`);
  const index = new Map(verses.map((v, i) => [v, i]));
  const str = (v) => typeof v === 'string' && v.trim().length > 0;
  for (const k of ['author', 'date', 'audience']) if (!str(intro.facts?.[k])) say(`facts.${k} missing`);
  if (!Array.isArray(intro.about) || intro.about.length < 1 || intro.about.length > 4 || !intro.about.every(str)) say('about must be 1-4 paragraphs');
  if (!Array.isArray(intro.themes) || intro.themes.length < 3 || intro.themes.length > 5 || !intro.themes.every((t) => str(t?.title) && str(t?.text))) say('themes must be 3-5 with title and text');
  if (!Array.isArray(intro.outline) || intro.outline.length < 2 || intro.outline.length > 9) say('outline must have 2-9 sections');
  else {
    let next = 0;
    intro.outline.forEach((s, i) => {
      if (!str(s?.title)) say(`outline ${i + 1}: no title`);
      const a = index.get(s?.from);
      const b = index.get(s?.to);
      if (a === undefined || b === undefined) return say(`outline ${i + 1}: ${s?.from}-${s?.to} not KJV verses`);
      if (a !== next) say(`outline ${i + 1}: starts at ${s.from}, expected ${verses[next]}`);
      if (b < a) say(`outline ${i + 1}: ends before it starts`);
      next = b + 1;
    });
    if (next !== verses.length) say(`outline ends at ${verses[next - 1]}, the book ends at ${verses[verses.length - 1]}`);
  }
  if (!Array.isArray(intro.keyVerses) || intro.keyVerses.length < 1 || intro.keyVerses.length > 5) say('keyVerses must be 1-5');
  else
    for (const k of intro.keyVerses) {
      const m = typeof k === 'string' ? RANGE.exec(k) : null;
      if (!m) {
        say(`key verse ${k}: not chapter:verse`);
        continue;
      }
      const a = index.get(`${m[1]}:${m[2]}`);
      const b = m[4] ? index.get(`${m[3] ?? m[1]}:${m[4]}`) : a;
      if (a === undefined || b === undefined || b < a) say(`key verse ${k}: not KJV verses`);
    }
  // References in the texts: "(8:29)" or "(8:29-31)", of this book.
  const texts = [...(intro.about ?? []), ...(intro.themes ?? []).map((t) => t?.text ?? ''), ...Object.values(intro.facts ?? {})];
  for (const text of texts)
    for (const m of String(text).matchAll(/\((\d+:\d+(?:-(?:\d+:)?\d+)?)\)/g)) {
      const r = RANGE.exec(m[1]);
      if (!index.has(`${r[1]}:${r[2]}`)) say(`reference (${m[1]}) is not a KJV verse`);
    }
  if (lang === 'en') {
    const n = (intro.about ?? []).map(words).reduce((a, b) => a + b, 0);
    if (n < 90 || n > 260) say(`about has ${n} words (120-200 wanted)`);
    if (/[ഀ-෿஀-௿]/.test(JSON.stringify(intro))) say('Malayalam or Tamil letters in the English file');
  } else {
    const script = lang === 'ml' ? /[ഀ-ൿ]/ : /[஀-௿]/;
    for (const text of [...texts, ...(intro.themes ?? []).map((t) => t?.title ?? ''), ...(intro.outline ?? []).map((s) => s?.title ?? '')])
      if (!script.test(String(text))) say(`not translated: "${String(text).slice(0, 40)}"`);
    if (english) {
      if (JSON.stringify(english.outline.map((s) => [s.from, s.to])) !== JSON.stringify((intro.outline ?? []).map((s) => [s?.from, s?.to]))) say('outline sections differ from the English');
      if (JSON.stringify(english.keyVerses) !== JSON.stringify(intro.keyVerses)) say('key verses differ from the English');
      if ((english.themes ?? []).length !== (intro.themes ?? []).length) say('a different number of themes from the English');
      const refs = (x) => JSON.stringify([...JSON.stringify(x).matchAll(/\((\d+:\d+(?:-(?:\d+:)?\d+)?)\)/g)].map((m) => m[1]).sort());
      if (refs(english.about) !== refs(intro.about)) say('references in "about" differ from the English');
    }
  }
  return problems;
}

/** Reads every introduction of `langs`; returns { intros: Map("lang:book" -> intro), problems }. */
export function readIntros(root, verses, langs = ['en', 'ml', 'ta']) {
  const intros = new Map();
  const problems = [];
  for (const lang of ['en', ...langs.filter((l) => l !== 'en')]) {
    for (let book = 1; book <= 66; book++) {
      const file = join(root, 'data', 'intros', lang, `${book}.json`);
      if (!existsSync(file)) {
        problems.push(`${lang}/${book}: missing`);
        continue;
      }
      let intro;
      try {
        intro = JSON.parse(readFileSync(file, 'utf8'));
      } catch (e) {
        problems.push(`${lang}/${book}: not JSON (${e.message})`);
        continue;
      }
      problems.push(...checkIntro(intro, book, verses.get(book) ?? [], lang, lang === 'en' ? null : intros.get(`en:${book}`)));
      intros.set(`${lang}:${book}`, intro);
    }
  }
  return { intros, problems };
}

/** Adds the intros table to an open database for `edition`; throws on any problem. */
export function addIntros(db, root, edition) {
  const langs = INTRO_LANGUAGES[edition];
  const { intros, problems } = readIntros(root, kjvVerses(db), langs);
  if (problems.length) throw new Error(`book introductions:\n  ${problems.slice(0, 40).join('\n  ')}`);
  db.exec(`DROP TABLE IF EXISTS intros;
    CREATE TABLE intros(book INTEGER NOT NULL, lang TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(book, lang)) WITHOUT ROWID;`);
  const ins = db.prepare('INSERT INTO intros VALUES (?,?,?)');
  db.exec('BEGIN');
  for (const lang of langs)
    for (let book = 1; book <= 66; book++) {
      const { name: _name, ...rest } = intros.get(`${lang}:${book}`);
      ins.run(book, lang, JSON.stringify(rest));
    }
  db.exec('COMMIT');
  return { books: 66, languages: langs };
}

export { VERSE };
