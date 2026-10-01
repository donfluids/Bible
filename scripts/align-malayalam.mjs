// Links each word of the Malayalam Bible to the Hebrew or Greek word it renders,
// using the Claude CLI in headless mode (no API key: it uses the CLI's own login).
//
//   node scripts/align-malayalam.mjs --chapters 1:1,19:23,23:53,43:3,45:8   # book:chapter
//   node scripts/align-malayalam.mjs --all                                  # every chapter
//   node scripts/align-malayalam.mjs --report 43:3                          # readable result
//
// Options: --model claude-sonnet-5-5  --effort medium  --concurrency 3
//          --chunk 20 (verses per call)  --dry-run  --redo  --out data/align/mal
//          --nt-first (with --all: New Testament before Old)
//
// When the CLI reports a usage or rate limit, every worker pauses (until the reset
// time the CLI gives, else 5 to 30 minutes) and carries on; those waits do not count
// as failed attempts. Re-running the same command skips chunks already cached.
//
// Needs assets/db/bible-ml.db (npm run build-db first). Each chunk is cached as one
// JSON file under data/align/mal/, so an interrupted run resumes where it stopped.
// scripts/build-db.mjs reads those files and writes the tags into the database.
import { DatabaseSync } from 'node:sqlite';
import { inflateRawSync } from 'node:zlib';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenize, wordSpan, textHash } from './lib/tokens.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : fallback;
};
const MODEL = opt('model', 'claude-sonnet-5-5');
const EFFORT = opt('effort', 'medium');
const CONCURRENCY = Number(opt('concurrency', 3));
const CHUNK = Number(opt('chunk', 20));
const MAX_WORDS = 650; // original-language words per call, to bound the output
const OUT = join(ROOT, opt('out', 'data/align/mal'));
const DB_PATH = join(ROOT, 'assets', 'db', 'bible-ml.db');

const BOOK_NAMES = ('Genesis Exodus Leviticus Numbers Deuteronomy Joshua Judges Ruth 1Samuel 2Samuel 1Kings 2Kings 1Chronicles 2Chronicles Ezra Nehemiah Esther Job Psalms Proverbs Ecclesiastes SongOfSongs Isaiah Jeremiah Lamentations Ezekiel Daniel Hosea Joel Amos Obadiah Jonah Micah Nahum Habakkuk Zephaniah Haggai Zechariah Malachi Matthew Mark Luke John Acts Romans 1Corinthians 2Corinthians Galatians Ephesians Philippians Colossians 1Thessalonians 2Thessalonians 1Timothy 2Timothy Titus Philemon Hebrews James 1Peter 2Peter 1John 2John 3John Jude Revelation').split(' ');

const SYSTEM = `You align a Malayalam Bible translation with the Hebrew or Greek text it translates.

For each verse you get the Malayalam as numbered tokens and the original-language words as numbered words, each with transliteration, an English gloss and a Strong's number. For every Malayalam token that renders an original word, output [token, word, confidence].

Rules:
- A token links to the ONE original word it chiefly renders. When a token also carries a prefix, article, preposition or conjunction of that word, still link the content word.
- Malayalam is agglutinative: case endings, postpositions and the attached "and" (ഉം) are part of the token. Judge by the word stem.
- Several tokens may point to the same original word (a phrase rendering one word). A token never points to two words.
- Omit tokens that have no counterpart in the original: words added for sense, auxiliary or linking words, punctuation. Omit original words nothing renders.
- Names link to the name's word.
- Confidence 2 means you are sure. Confidence 1 means plausible but uncertain. If you would be guessing, leave the token out entirely (never write confidence 0). A wrong link is worse than a missing one.
- Never link by position alone. If a verse's original words clearly do not correspond to its Malayalam (verse numbering sometimes differs), return no links for that verse.

Return only the JSON requested.`;

const SCHEMA = {
  type: 'object',
  properties: {
    verses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          v: { type: 'integer' },
          links: { type: 'array', items: { type: 'array', items: { type: 'integer' }, minItems: 3, maxItems: 3 } },
        },
        required: ['v', 'links'],
        additionalProperties: false,
      },
    },
  },
  required: ['verses'],
  additionalProperties: false,
};

const FS = '\x1c', GS = '\x1d', RS = '\x1e', US = '\x1f';
const stripCantillation = (s) => s.replace(/[֑-֯]/g, '');

function loadChapter(db, book, chapter) {
  const verses = db.prepare("SELECT verse, text FROM verses WHERE translation = 'MAL' AND book = ? AND chapter = ? AND omitted = 0 ORDER BY verse").all(book, chapter);
  const row = db.prepare('SELECT data FROM interlinear WHERE book = ? AND chapter = ?').get(book, chapter);
  const words = new Map();
  if (row) {
    for (const part of inflateRawSync(Buffer.from(row.data)).toString('utf8').split(FS)) {
      const sep = part.indexOf(GS);
      words.set(Number(part.slice(0, sep)), part.slice(sep + 1).split(RS).map((rec) => {
        const [text = '', translit = '', gloss = '', strongs = ''] = rec.split(US);
        return { text: book <= 39 ? stripCantillation(text) : text, translit, gloss, strongs };
      }));
    }
  }
  return verses.map((v) => ({ v: v.verse, text: v.text, tokens: tokenize(v.text), words: words.get(v.verse) ?? [] })).filter((v) => v.tokens.length > 0 && v.words.length > 0);
}

function chunkVerses(verses) {
  const chunks = [];
  let cur = [], n = 0;
  for (const v of verses) {
    if (cur.length && (cur.length >= CHUNK || n + v.words.length > MAX_WORDS)) { chunks.push(cur); cur = []; n = 0; }
    cur.push(v); n += v.words.length;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

function buildPrompt(book, chapter, verses) {
  const lang = book <= 39 ? 'Hebrew' : 'Greek';
  const parts = [`${BOOK_NAMES[book - 1]} ${chapter}. Original language: ${lang}.`];
  for (const v of verses) {
    parts.push(`\n### Verse ${v.v}`);
    parts.push('Malayalam tokens: ' + v.tokens.map((t, i) => `${i + 1} ${t.text}`).join(' | '));
    parts.push(`${lang} words:\n` + v.words.map((w, i) => `${i + 1}. ${w.text} (${w.translit}) "${w.gloss}" ${w.strongs || '-'}`).join('\n'));
  }
  return parts.join('\n');
}

const LIMIT_RE = /usage limit|rate.?limit|429|overloaded|quota|too many requests|limit reached/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pausedUntil = 0;
let limitStreak = 0;
let pausedTotal = 0;
const MAX_PAUSE_TOTAL = 12 * 3600e3;

async function waitIfPaused() {
  while (Date.now() < pausedUntil) await sleep(Math.min(60e3, pausedUntil - Date.now()));
}

function pauseForLimit(message) {
  const reset = /\|(\d{10})\b/.exec(message);
  const wait = reset
    ? Math.max(60e3, Number(reset[1]) * 1000 - Date.now() + 60e3)
    : Math.min(30 * 60e3, 5 * 60e3 * 2 ** Math.min(limitStreak, 3));
  limitStreak++;
  if (Date.now() + wait > pausedUntil) {
    pausedTotal += wait;
    pausedUntil = Date.now() + wait;
    console.log(`LIMIT pausing ${(wait / 60e3).toFixed(0)} min until ${new Date(pausedUntil).toISOString()}: ${message.slice(0, 140)}`);
  }
}

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', [
      '-p', '--model', MODEL, '--effort', EFFORT, '--system-prompt', SYSTEM, '--tools', '', '--disable-slash-commands',
      '--no-session-persistence', '--strict-mcp-config', '--setting-sources', '', '--output-format', 'json', '--json-schema', JSON.stringify(SCHEMA),
    ], { cwd: '/tmp', stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) => {
      try {
        const j = JSON.parse(out);
        if (j.is_error || !j.structured_output) return reject(new Error(`claude error: ${String(j.result ?? err).slice(0, 300)}`));
        resolve(j);
      } catch {
        reject(new Error(`claude exit ${code}: ${(err || out).slice(0, 300)}`));
      }
    });
    child.stdin.end(prompt);
  });
}

/** Turn the model's [token, word, confidence] triples into validated character spans. */
function resolve(book, chapter, verses, structured) {
  const byV = new Map((structured.verses ?? []).map((x) => [x.v, x.links]));
  const problems = [];
  const out = [];
  for (const v of verses) {
    const links = byV.get(v.v);
    if (!links) { problems.push(`verse ${v.v} missing from the answer`); continue; }
    const used = new Set();
    const spans = [];
    for (const [t, w, c] of links) {
      if (c === 0) continue; // the model's way of saying "no link"
      if (!(t >= 1 && t <= v.tokens.length && w >= 1 && w <= v.words.length && (c === 1 || c === 2))) { problems.push(`verse ${v.v}: bad link [${t},${w},${c}]`); continue; }
      if (used.has(t)) continue;
      used.add(t);
      const strongs = v.words[w - 1].strongs;
      const span = wordSpan(v.tokens[t - 1]);
      if (!strongs || !span) continue;
      spans.push({ s: span.start, e: span.end, n: strongs, c, t, w });
    }
    spans.sort((a, b) => a.s - b.s);
    out.push({ book, chapter, v: v.v, hash: textHash(v.text), tokens: v.tokens.length, spans });
  }
  return { verses: out, problems };
}

async function alignChunk(job, stats) {
  const file = join(OUT, `${job.book}-${job.chapter}-${job.verses[0].v}.json`);
  if (!opt('redo', false) && existsSync(file)) { stats.cached++; return; }
  const prompt = buildPrompt(job.book, job.chapter, job.verses);
  if (opt('dry-run', false)) { console.log(prompt.slice(0, 1800) + '\n…'); return; }
  let lastError;
  for (let attempt = 1; attempt <= 3; ) {
    await waitIfPaused();
    try {
      const res = await runClaude(prompt);
      limitStreak = 0;
      const { verses, problems } = resolve(job.book, job.chapter, job.verses, res.structured_output);
      if (verses.length === 0 || problems.length > job.verses.length) throw new Error(`unusable answer: ${problems.slice(0, 3).join('; ')}`);
      writeFileSync(file, JSON.stringify({ model: MODEL, effort: EFFORT, created: new Date().toISOString(), cost: res.total_cost_usd, usage: res.usage && { in: res.usage.input_tokens, cacheRead: res.usage.cache_read_input_tokens, cacheCreate: res.usage.cache_creation_input_tokens, out: res.usage.output_tokens }, problems, verses }, null, 1));
      stats.done++; stats.cost += res.total_cost_usd ?? 0; stats.out += res.usage?.output_tokens ?? 0; stats.problems += problems.length;
      console.log(`ok   ${BOOK_NAMES[job.book - 1]} ${job.chapter}:${job.verses[0].v}-${job.verses.at(-1).v}  $${(res.total_cost_usd ?? 0).toFixed(3)}  ${problems.length} problems`);
      if ((stats.done + stats.failed) % 50 === 0) {
        console.log(`progress ${stats.done + stats.cached + stats.failed}/${stats.total} chunks, ${stats.failed} failed, $${stats.cost.toFixed(2)} so far, at ${BOOK_NAMES[job.book - 1]} ${job.chapter}`);
      }
      return;
    } catch (e) {
      lastError = e;
      if (LIMIT_RE.test(e.message) && pausedTotal < MAX_PAUSE_TOTAL) {
        stats.limited++;
        pauseForLimit(e.message);
        continue;
      }
      attempt++;
      await sleep(4000 * attempt);
    }
  }
  stats.failed++;
  console.log(`FAIL ${BOOK_NAMES[job.book - 1]} ${job.chapter}:${job.verses[0].v}  ${lastError?.message}`);
}

function report(db, book, chapter) {
  const lines = [`# ${BOOK_NAMES[book - 1]} ${chapter}: Malayalam to ${book <= 39 ? 'Hebrew' : 'Greek'}\n`];
  const verses = loadChapter(db, book, chapter);
  const files = existsSync(OUT) ? readdirSync(OUT).filter((f) => f.startsWith(`${book}-${chapter}-`)) : [];
  const spans = new Map();
  for (const f of files) for (const v of JSON.parse(readFileSync(join(OUT, f), 'utf8')).verses) spans.set(v.v, v);
  for (const v of verses) {
    const a = spans.get(v.v);
    lines.push(`\n## ${v.v}\n${v.text.replace(/\s+/g, ' ')}\n`);
    if (!a) { lines.push('(not aligned)'); continue; }
    const linked = new Set(a.spans.map((s) => s.t));
    for (const s of a.spans) {
      const w = v.words[s.w - 1];
      lines.push(`- ${s.c === 2 ? '' : '(?) '}${v.text.slice(s.s, s.e)}  →  ${w.text} ${w.translit} "${w.gloss}" ${w.strongs}`);
    }
    const free = v.tokens.map((t, i) => (linked.has(i + 1) ? null : t.text)).filter(Boolean);
    if (free.length) lines.push(`- unlinked: ${free.join(' ')}`);
  }
  return lines.join('\n');
}

async function main() {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const rep = opt('report', false);
  if (rep) {
    const [b, c] = String(rep).split(':').map(Number);
    console.log(report(db, b, c));
    return;
  }
  let targets;
  if (opt('all', false)) {
    targets = db.prepare('SELECT id, chapters FROM books ORDER BY id').all().flatMap((b) => Array.from({ length: b.chapters }, (_, i) => [b.id, i + 1]));
    if (opt('nt-first', false)) targets = [...targets.filter(([b]) => b >= 40), ...targets.filter(([b]) => b < 40)];
  } else {
    targets = String(opt('chapters', '')).split(',').filter(Boolean).map((s) => s.split(':').map(Number));
  }
  if (!targets.length) { console.error('give --chapters book:chapter,… or --all'); process.exit(1); }
  mkdirSync(OUT, { recursive: true });
  const jobs = targets.flatMap(([book, chapter]) => chunkVerses(loadChapter(db, book, chapter)).map((verses) => ({ book, chapter, verses })));
  console.log(`${jobs.length} calls for ${targets.length} chapters, model ${MODEL}, effort ${EFFORT}, ${CONCURRENCY} at a time`);
  const stats = { total: jobs.length, done: 0, cached: 0, failed: 0, limited: 0, cost: 0, out: 0, problems: 0 };
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (next < jobs.length) await alignChunk(jobs[next++], stats); }));
  console.log(JSON.stringify(stats));
}

main();
