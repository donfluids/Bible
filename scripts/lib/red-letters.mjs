// The words of Jesus for the Bibles whose sources do not mark them (the BSB, LSV and ASV, and
// the Open Malayalam Contemporary Version), carried over from a Bible that does: the KJV for
// the English ones, the Malayalam 1910 for the OMCV. Run after every translation's verses are
// in the database; fills the `jesus` column of those translations.
//
// A verse the reference does not mark stays black. One the reference marks:
// - All of it, and the target has quotation marks: the quotations are red (narrative between
//   them, "Jesus replied", stays black). No quotation marks: the whole verse is red.
// - Part of it, and the target has quotation marks: each quotation ("…" at the outer level, a
//   quotation inside it ‘…’ on its own) is red when its words, by Strong's number, are more
//   like the reference's red words than its black ones; on a tie, by who the narrative beside
//   it says is speaking; where that does not tell, by the letters it shares with each. One
//   quotation alone is red.
// - Part of it, and the target has no quotation marks: the ASV, worded like the KJV, takes the
//   red words over word by word; the others are left black (reported speech).
// A quotation is followed across verses: a verse that starts inside one is red from its start.
// Hand corrections (data/overrides/red-letters.json) give, for a verse with more than one
// quotation, the numbers of the quotations that are red, counted from 1 in the verse.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CARRY = { BSB: 'KJV', LSV: 'KJV', ASV: 'KJV', OMCV: 'MAL' };
const WORD_DIFF = new Set(['ASV']);

const key = (b, c, v) => `${b}:${c}:${v}`;
const core = (s) => s.replace(/[^\p{L}\p{N}]+/gu, '');
const hasWord = (s) => /[\p{L}\p{N}]/u.test(s);
const inside = (a, b, spans) => spans.some(([x, y]) => a >= x && b <= y);

function words(text, tags) {
  const out = [];
  let pos = 0;
  for (const p of tags ? tags.split(' ') : []) {
    const [gap, len, ids] = p.split(',');
    pos += Number(gap);
    out.push([pos, pos + Number(len), ids.split('+')]);
    pos += Number(len);
  }
  return out;
}

function grams(s) {
  const c = core(s);
  const out = new Set();
  for (let i = 0; i + 3 <= c.length; i++) out.add(c.slice(i, i + 3));
  return out;
}

const VERB = '(said|says|replied|replies|answered|answers|asked|asks|told|tells|declared|cried|called|continued|added|responded|spoke|speaks|commanded|warned|explained|rebuked|sighed|answering|saying)';
const JESUS = new RegExp(`\\bJesus,?\\s+(\\w+ly\\s+|also\\s+|then\\s+)?${VERB}|${VERB}\\s+Jesus\\b|\\bHe\\s+(\\w+ly\\s+|also\\s+)?${VERB}|(^|\\s)(യേശു|അവിടന്ന്|അവിടുന്ന്)(\\s|,|$)`);
const OTHER = new RegExp(`\\b(they|she|the\\s+\\w+|Peter|Simon|Thomas|Philip|Judas|Pilate|Martha|Mary|Nathanael|Nicodemus|John|disciples|woman|man|people|crowd|someone|one\\s+of)\\b[^“”]{0,40}?${VERB}|${VERB}\\s+(they|she|Peter|Pilate)|(^|\\s)(അവർ|അവൾ|പത്രോസ്|അയാൾ|ശിഷ്യന്മാർ|അവൻ)(\\s|,|$)`);

// Who the narrative beside a quotation says is speaking: true Jesus, false someone else, null
// when it does not tell.
function speaker(text, units, i) {
  const prev = i ? units[i - 1][1] : 0;
  const next = i + 1 < units.length ? units[i + 1][0] : text.length;
  const before = text.slice(prev, units[i][0]);
  const after = text.slice(units[i][1], next);
  for (const s of hasWord(before) ? [before, after] : [after]) {
    const j = JESUS.test(s), o = OTHER.test(s);
    if (j !== o) return j;
    if (j && o) return null;
  }
  return null;
}

// The quotations of each verse of a chapter ("…" at the outer level), followed across verses.
function quotations(verses) {
  const out = new Map();
  let open = false, chapter = null;
  for (const v of verses) {
    if (v.chapter !== chapter) { open = false; chapter = v.chapter; }
    const t = v.text, segs = [];
    let start = open ? 0 : null;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '“') {
        if (!open) { open = true; start = i; }
      } else if (t[i] === '”') {
        if (open) { segs.push([start, i + 1]); open = false; start = null; }
        else if (!segs.length) segs.push([0, i + 1]);
      }
    }
    if (open) segs.push([start ?? 0, t.length]);
    out.set(key(v.book, v.chapter, v.verse), segs);
  }
  return out;
}

// A quotation split at the quotations inside it (‘…’): each part on its own.
function unitsOf(text, segs) {
  const units = [];
  for (const [a, b] of segs) {
    const inner = [];
    let st = null;
    for (let i = a; i < b; i++) {
      if (text[i] === '‘' && st === null) st = i;
      else if (text[i] === '’' && st !== null && (i + 1 >= text.length || !/\p{L}/u.test(text[i + 1]))) { inner.push([st, i + 1]); st = null; }
    }
    if (!inner.length) { units.push([a, b]); continue; }
    let p = a;
    for (const [x, y] of inner) {
      if (hasWord(text.slice(p, x))) units.push([p, x]);
      units.push([x, y]);
      p = y;
    }
    if (hasWord(text.slice(p, b))) units.push([p, b]);
  }
  return units;
}

// Word-by-word: the reference's red words found in the target (the ASV against the KJV).
function byWords(ref, refSpans, text) {
  const tok = (s) => [...s.matchAll(/[\p{L}\p{N}_]+/gu)].map((m) => [m.index, m.index + m[0].length, m[0].toLowerCase()]);
  const A = tok(ref), B = tok(text);
  // The words both share, found as Python's difflib does (the longest run first, then the
  // same on each side of it), then the runs between them.
  const a2 = A.map((w) => w[2]), b2 = B.map((w) => w[2]);
  const blocks = [];
  const find = (alo, ahi, blo, bhi) => {
    let besti = alo, bestj = blo, bestk = 0;
    let len = new Map();
    for (let i = alo; i < ahi; i++) {
      const next = new Map();
      for (let j = blo; j < bhi; j++) {
        if (a2[i] !== b2[j]) continue;
        const k = (len.get(j - 1) ?? 0) + 1;
        next.set(j, k);
        if (k > bestk) { besti = i - k + 1; bestj = j - k + 1; bestk = k; }
      }
      len = next;
    }
    if (!bestk) return;
    find(alo, besti, blo, bestj);
    blocks.push([besti, bestj, bestk]);
    find(besti + bestk, ahi, bestj + bestk, bhi);
  };
  find(0, A.length, 0, B.length);
  const m = B.length;
  const red = new Array(m).fill(null);
  const aRed = A.map(([a, b]) => inside(a, b, refSpans));
  let i = 0, j = 0;
  for (const [bi, bj, k] of [...blocks, [A.length, m, 0]]) {
    // Between matches: the target's words take the reference's majority, or are added words.
    const ar = aRed.slice(i, bi);
    for (let x = j; x < bj; x++) red[x] = ar.length ? ar.filter(Boolean).length * 2 >= ar.length : null;
    for (let x = 0; x < k; x++) red[bj + x] = aRed[bi + x];
    i = bi + k; j = bj + k;
  }
  // Words the target adds: red when they open a red run after punctuation ("him, Again it is
  // written"), or stand between red words.
  for (let x = 0; x < m; x++) {
    if (red[x] !== null) continue;
    let q = x;
    while (q < m && red[q] === null) q++;
    if (q < m && red[q] && (x === 0 || /[,:;.]/.test(text.slice(B[x - 1][1], B[x][0])))) for (let y = x; y < q; y++) red[y] = true;
  }
  for (let x = 0; x < m; x++) {
    if (red[x] !== null) continue;
    let p = false, nx = false;
    for (let y = x - 1; y >= 0; y--) if (red[y] !== null) { p = red[y]; break; }
    for (let y = x + 1; y < m; y++) if (red[y] !== null) { nx = red[y]; break; }
    red[x] = Boolean(p && nx);
  }
  const spans = [];
  for (let x = 0; x < m; x++) {
    if (!red[x]) continue;
    let y = x;
    while (y + 1 < m && red[y + 1]) y++;
    const s = [B[x][0], B[y][1]];
    while (s[1] < text.length && ".,;:!?’'".includes(text[s[1]])) s[1]++;
    const last = spans[spans.length - 1];
    if (last && !hasWord(text.slice(last[1], s[0]))) last[1] = s[1];
    else spans.push(s);
    x = y;
  }
  return spans;
}

function loadOverrides(root) {
  try {
    return JSON.parse(readFileSync(join(root, 'data', 'overrides', 'red-letters.json'), 'utf8'));
  } catch {
    return {};
  }
}

export function carryRedLetters(db, root) {
  const have = new Set(db.prepare('SELECT DISTINCT translation t FROM verses').all().map((r) => r.t));
  const overrides = loadOverrides(root);
  const select = db.prepare('SELECT book, chapter, verse, text, tags, omitted, jesus FROM verses WHERE translation = ? AND book >= 40 ORDER BY book, chapter, verse');
  const update = db.prepare('UPDATE verses SET jesus = ? WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?');
  const stats = {};
  db.exec('BEGIN');
  for (const [target, refId] of Object.entries(CARRY)) {
    if (!have.has(target) || !have.has(refId)) continue;
    const ref = new Map(select.all(refId).map((r) => [key(r.book, r.chapter, r.verse), r]));
    const rows = select.all(target);
    const quotes = quotations(rows);
    const fixes = overrides[target] ?? {};
    const st = { verses: 0, overridden: 0, leftBlack: 0 };
    for (const row of rows) {
      const k = key(row.book, row.chapter, row.verse);
      const r = ref.get(k);
      if (!r?.jesus || row.omitted || !row.text) continue;
      const t = row.text, rt = r.text;
      const rj = r.jesus.split(' ').map((p) => p.split(',').map(Number));
      const whole = core(rj.map(([a, b]) => rt.slice(a, b)).join('')).length >= core(rt).length;
      const segs = quotes.get(k);
      let spans;
      if (!segs.length) {
        if (whole) spans = [[0, t.length]];
        else if (WORD_DIFF.has(target)) spans = byWords(rt, rj, t);
        else spans = [];
      } else if (whole) {
        spans = segs;
      } else {
        const units = unitsOf(t, segs);
        let keep;
        if (fixes[k] && units.length > 1) {
          keep = units.filter((_, n) => fixes[k].includes(n + 1));
          st.overridden++;
        } else if (units.length === 1) {
          keep = units;
        } else {
          const redIds = new Set(), blackIds = new Set();
          for (const [a, b, ids] of words(rt, r.tags)) for (const id of ids) (inside(a, b, rj) ? redIds : blackIds).add(id);
          const redOnly = new Set([...redIds].filter((x) => !blackIds.has(x)));
          const blackOnly = new Set([...blackIds].filter((x) => !redIds.has(x)));
          let rg = null, bg = null;
          const tw = words(t, row.tags);
          keep = units.filter(([a, b], n) => {
            const ids = new Set(tw.filter(([x, y]) => x >= a && y <= b).flatMap(([, , s]) => s));
            const ro = [...ids].filter((x) => redOnly.has(x)).length;
            const bo = [...ids].filter((x) => blackOnly.has(x)).length;
            if (ro !== bo) return ro > bo;
            const cue = speaker(t, units, n);
            if (cue !== null) return cue;
            rg ??= new Set(rj.flatMap(([x, y]) => [...grams(rt.slice(x, y))]));
            bg ??= grams(rj.reduce((s, [x, y]) => s.split(rt.slice(x, y)).join(' '), rt));
            const g = grams(t.slice(a, b));
            const rs = [...g].filter((x) => rg.has(x)).length / Math.max(1, rg.size);
            const bs = [...g].filter((x) => bg.has(x)).length / Math.max(1, bg.size);
            return Math.abs(rs - bs) < 0.02 ? true : rs > bs;
          });
        }
        // A quotation all of whose parts are red is red whole, its closing marks included.
        spans = [];
        for (const [a, b] of segs) {
          const mine = units.filter(([x, y]) => x >= a && y <= b);
          if (mine.length && mine.every((u) => keep.includes(u))) spans.push([a, b]);
          else spans.push(...mine.filter((u) => keep.includes(u)));
        }
      }
      if (!spans.length) { st.leftBlack++; continue; }
      update.run(spans.map(([a, b]) => `${a},${b}`).join(' '), target, row.book, row.chapter, row.verse);
      st.verses++;
    }
    stats[target] = { from: refId, ...st };
  }
  db.exec('COMMIT');
  return stats;
}
