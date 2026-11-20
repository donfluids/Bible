// Strong's links for an English Bible that has none of its own (the LSV, the ASV), carried
// over from the two English Bibles whose links are right: the KJV and the BSB.
//
// For each verse the target's words are lined up with the KJV's words and with the BSB's
// (a monotone word alignment: the heaviest common subsequence of word forms, after light
// normalisation: lowercase, "-eth"/"-est"/"-s"/"-ed" endings, thee/thou/you, hath/has,
// unto/to, said/says, LORD/Jehovah/YHWH …). A target word takes the Strong's number of the
// word it lines up with when:
//   - that number is one of the Hebrew or Greek words of the verse (the interlinear),
//   - the KJV and the BSB agree, or only one of them links the word, or they differ and
//     only one of their numbers is in the verse;
//   - a little word (the, and, of, he, I …) lines up as part of a run of two or more
//     matching words, so a stray "the" is not paired with a "the" elsewhere in the verse.
// Words left over then get a number from two weaker signals, only when the number is
// in the verse and not already used as often as the original has it:
//   - the gloss: the word matches the English gloss of exactly one original word;
//   - the memory: across the whole Bible the KJV and the BSB render exactly one of the
//     verse's numbers with this word (three times or more, and at least a fifth of the
//     word's uses).
// Words in single square brackets (the LSV's supplied "[is]") and the object marker אֵת
// (H853, never translated) are never linked. Precision matters more than coverage: a word
// with doubtful evidence is left unlinked.
//
// Shared by scripts/build-db.mjs (which writes the links) and scripts/align.mjs (which
// sends the words left unlinked to a language model).
import { FUNCTION_WORDS } from './function-words.mjs';

// Old and new forms written alike, so "hath" lines up with "has" and "saith" with "says".
// Irregular verbs are grouped under one form: the Strong's number is the lemma's anyway.
const FORMS = {};
const group = (to, list) => { for (const w of list.split(' ')) FORMS[w] = to; };
group('you', 'thee thou ye you');
group('your', 'thy thine your yours');
group('yourself', 'thyself yourself yourselves');
group('have', 'hath has have had hast hadst having');
group('do', 'doth does do did didst dost doeth done doing');
group('be', 'art are is am was were be been being wast wert');
group('to', 'unto to');
group('shall', 'shalt shall');
group('will', 'wilt will');
group('say', 'saith says say said saying sayest sayeth');
group('speak', 'spake spoke speak spoken speaketh speaks speaking spakest');
group('come', 'came come cometh comes coming camest comest');
group('go', 'went go goeth goes gone going wentest');
group('see', 'saw see seen seeth sees seeing sawest');
group('give', 'gave give given giveth gives giving gavest');
group('take', 'took take taken taketh takes taking tookest');
group('make', 'made make maketh makes making madest');
group('bring', 'brought bring bringeth brings bringing');
group('eat', 'ate eat eaten eateth eats eating');
group('know', 'knew know known knoweth knows knowing knowest');
group('beget', 'begat begot begotten beget begetteth fathered');
group('sit', 'sat sit sitteth sits sitting');
group('stand', 'stood stand standeth stands standing');
group('find', 'found find findeth finds finding');
group('tell', 'told tell telleth tells telling');
group('hear', 'heard hear heareth hears hearing');
group('send', 'sent send sendeth sends sending');
group('slay', 'slew slay slain slayeth slays');
group('smite', 'smote smite smitten smiteth strike struck');
group('rise', 'arose arise ariseth rose rise riseth risen');
group('bear', 'bare bore born borne bear beareth');
group('dwell', 'dwelt dwell dwelleth dwells dwelling');
group('man', 'man men');
group('woman', 'woman women');
group('child', 'child children');
group('brother', 'brother brothers brethren');
group('fall', 'fell fall fallen falleth falls');
group('lie', 'lay lie lieth lain lies');
group('hold', 'held hold holdeth holds');
group('lead', 'led lead leadeth leads');
group('keep', 'kept keep keepeth keeps');
group('leave', 'left leave leaveth leaves');
group('ox', 'ox oxen');
group('foot', 'foot feet');
group('tooth', 'tooth teeth');
group('yhwh', 'jehovah yhwh yahweh');
group('yah', 'jah yah');
group('behold', 'behold lo');

// English words that carry grammar more than meaning. They are linked only when they line
// up within a run of matching words, and never by the gloss or the memory.
const STOP = new Set(('the a an and or but nor for of in into on upon at by with from to as that this these those then than ' +
  'which who whom whose what when where whither whence while if not no nay yea o oh there ' +
  'i me my mine myself we us our ours ourselves you your yourself he him his himself she her hers herself it its itself ' +
  'they them their theirs themselves be have do shall will may might can could must would should let ' +
  'about after against among before behind below beneath beside between beyond down off out over through toward towards ' +
  'under until up were').split(' '));

/** A word's form for lining up: lowercase, old forms written as new, endings off. */
export function normWord(raw, nt = false) {
  if (!nt && /^(LORD|GOD|JEHOVAH|YHWH)$/.test(raw)) return 'yhwh';
  let w = raw.toLowerCase().replace(/['’]s$|['’]$/, '').replace(/['’]/g, '');
  if (FORMS[w]) return FORMS[w];
  if (STOP.has(w)) return w;
  if (w.length > 4) {
    if (/ies$|ied$/.test(w)) w = w.slice(0, -3) + 'y';
    else {
      const m = /(eth|est|ing|ed|es|s)$/.exec(w);
      if (m && w.length - m[1].length >= 3 && !/ss$/.test(w)) w = w.slice(0, -m[1].length);
    }
  }
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

export const isStop = (norm) => STOP.has(norm);
const AUX = new Set('be have do shall will may might can could must would should let'.split(' '));
// A possessive is "of us", "of him" in a gloss: the form to look for there.
const POSSESSIVE = { my: 'me', mine: 'me', our: 'us', ours: 'us', your: 'you', his: 'him', their: 'them', theirs: 'them', its: 'it' };

/** Whether a set of gloss forms has the word (a possessive by its pronoun). */
export const glossHas = (forms, norm) => forms.has(norm) || forms.has(POSSESSIVE[norm]);

/**
 * The words of a verse: runs of letters and digits (a hyphen or a dash divides words, an
 * apostrophe does not), each with its character span, its form for lining up, and whether
 * it stands in single square brackets (a word the translators supplied).
 */
export function verseWords(text, nt = false) {
  const out = [];
  let depth = 0;
  const re = /\[\[|\]\]|\[|\]|[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu;
  let m;
  while ((m = re.exec(text))) {
    const t = m[0];
    if (t === '[[' || t === ']]') continue; // the LSV's double brackets: words the oldest manuscripts lack
    if (t === '[') { depth++; continue; }
    if (t === ']') { depth = Math.max(0, depth - 1); continue; }
    const norm = normWord(t, nt);
    out.push({ s: m.index, e: m.index + t.length, raw: t, norm, stop: STOP.has(norm), supplied: depth > 0 });
  }
  return out;
}

/** "gap,length,number" triples to spans. */
export function decodeTags(tags) {
  const spans = [];
  let pos = 0;
  for (const t of (tags || '').split(' ').filter(Boolean)) {
    const [gap, len, ids] = t.split(',');
    const s = pos + Number(gap);
    spans.push({ s, e: s + Number(len), ids: ids.split('+') });
    pos = s + Number(len);
  }
  return spans;
}

/** The English gloss words of each original word, as forms for lining up. */
function glossForms(gloss, nt) {
  return (gloss || '')
    .replace(/\[[^\]]*\]|<[^>]*>|\([^)]*\)/g, ' ')
    .split(/[^\p{L}'’]+/u)
    .filter(Boolean)
    .map((w) => normWord(w, nt))
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

/**
 * The words of a tagged verse, each with the number it carries: a tag on one word gives it
 * its number; a tag on a phrase (the BSB's "is my shepherd", "the heavens") gives it to the
 * phrase's words of meaning, or when it has none ("I shall not") to the word that matches
 * the original word's gloss. A tag with several numbers gives its chief number when it has
 * exactly one that is not a function word. H853 is dropped.
 */
export function taggedWords(text, tags, prefix, original) {
  const nt = prefix === 'G';
  const words = verseWords(text, nt);
  // Every word of each number's glosses, the little ones too ("not", "they", "was"), but not
  // the words a gloss supplies in square brackets ("you who [are]"); "<the>" is the article.
  const glossOf = new Map();
  for (const w of original ?? []) {
    if (!w.strongs) continue;
    if (!glossOf.has(w.strongs)) glossOf.set(w.strongs, new Set());
    for (const g of (w.gloss || '').replace(/\[[^\]]*\]/g, ' ').split(/[^\p{L}'’]+/u).filter(Boolean)) glossOf.get(w.strongs).add(normWord(g, nt));
  }
  const inGloss = (w, n) => glossHas(glossOf.get(n) ?? new Set(), w.norm);
  for (const span of decodeTags(tags)) {
    let ids = span.ids.map((n) => prefix + n);
    if (ids.length > 1) {
      const content = ids.filter((n) => !FUNCTION_WORDS.has(n));
      if (content.length !== 1) continue;
      ids = content;
    }
    const n = ids[0];
    if (n === 'H853') continue;
    const inside = words.filter((w) => w.s >= span.s && w.e <= span.e);
    if (!inside.length) continue;
    let heads = inside.length === 1 ? inside : inside.filter((w) => !w.stop);
    if (!heads.length) {
      heads = inside.filter((w) => inGloss(w, n));
      if (heads.length > 1) heads = [];
    }
    // A little word tagged with a word of meaning stands for it ("and" for God in the
    // BSB's "and He separated", "should" for perish): kept only when the gloss has it.
    // A helping verb on a function word ("art" for the article in "who art in heaven") likewise.
    heads = heads.filter((w) => !w.stop || (FUNCTION_WORDS.has(n) && !AUX.has(w.norm)) || inGloss(w, n));
    for (const w of heads) w.num = n;
  }
  return words;
}

/** Word forms to numbers, counted over the KJV's and the BSB's links. */
export function makeMemory() {
  const counts = new Map(); // form -> Map(number -> count)
  const totals = new Map();
  return {
    add(words) {
      for (const w of words) {
        if (!w.num || w.stop) continue;
        if (!counts.has(w.norm)) counts.set(w.norm, new Map());
        const m = counts.get(w.norm);
        m.set(w.num, (m.get(w.num) || 0) + 1);
        totals.set(w.norm, (totals.get(w.norm) || 0) + 1);
      }
    },
    /** How often the form renders the number, and how often the form is linked at all. */
    get(norm, n) {
      return { n: counts.get(norm)?.get(n) ?? 0, total: totals.get(norm) ?? 0 };
    },
  };
}

/** The heaviest common subsequence of two word lists: pairs [i, j]. */
function lineUp(a, b) {
  const n = a.length, m = b.length;
  const W = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      let best = Math.max(W[i + 1][j], W[i][j + 1]);
      if (a[i].norm === b[j].norm) best = Math.max(best, W[i + 1][j + 1] + (a[i].stop ? 1 : 3));
      W[i][j] = best;
    }
  }
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i].norm === b[j].norm && W[i][j] === W[i + 1][j + 1] + (a[i].stop ? 1 : 3)) { pairs.push([i, j]); i++; j++; }
    else if (W[i + 1][j] >= W[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

/**
 * Links for one verse of the target. sources: [{ id, words }] from taggedWords; original:
 * the verse's Hebrew or Greek words [{ gloss, strongs }]. Returns the target's words with
 * num (the number, with its letter) and via ('both', the source id, 'gloss', 'memory') on
 * those linked, and the spans to write: adjacent words that took the same number from one
 * source phrase ("burnt offering", the two halves of "Beth-el") form one span.
 */
export function projectVerse(text, sources, original, memory, prefix, opts = {}) {
  const { memMin = 3, memShare = 0.2, glossMem = 1 } = opts;
  const nt = prefix === 'G';
  const words = verseWords(text, nt);
  const inVerse = new Map(); // number -> how many original words have it
  for (const w of original ?? []) if (w.strongs) inVerse.set(w.strongs, (inVerse.get(w.strongs) || 0) + 1);
  const cand = words.map(() => []); // per target word: { src, n }
  for (const src of sources) {
    const pairs = lineUp(words, src.words);
    const at = new Map(pairs);
    for (const [i, j] of pairs) {
      const sw = src.words[j];
      if (!sw.num || words[i].supplied) continue;
      // A little word must sit in a run of matches, next to a neighbour that matches too.
      if (words[i].stop && at.get(i - 1) !== j - 1 && at.get(i + 1) !== j + 1) continue;
      cand[i].push({ src: src.id, n: sw.num });
    }
  }
  const used = new Map(); // number -> words linked to it (runs of adjacent words count once)
  const take = (i, n, via) => {
    Object.assign(words[i], { num: n, via });
    const prev = words[i - 1];
    if (!(prev && prev.num === n)) used.set(n, (used.get(n) || 0) + 1);
  };
  // Gloss forms of each number in the verse.
  const glossNums = new Map(); // form -> Set(number)
  for (const w of original ?? []) {
    if (!w.strongs || FUNCTION_WORDS.has(w.strongs) || w.strongs === 'H853') continue;
    for (const g of glossForms(w.gloss, nt)) {
      if (!glossNums.has(g)) glossNums.set(g, new Set());
      glossNums.get(g).add(w.strongs);
    }
  }
  const byGloss = (w) => {
    const s = glossNums.get(w.norm);
    return s && s.size === 1 ? [...s][0] : null;
  };
  words.forEach((w, i) => {
    const cs = cand[i].filter((c) => inVerse.has(c.n) && c.n !== 'H853');
    if (!cs.length) return;
    const nums = [...new Set(cs.map((c) => c.n))];
    if (nums.length === 1) return take(i, nums[0], cs.length > 1 ? 'both' : cs[0].src);
    // The KJV and the BSB give different numbers, both in the verse: the gloss decides.
    const g = byGloss(w);
    if (g && nums.includes(g)) take(i, g, 'gloss');
  });
  // The weaker signals, for words of meaning still unlinked.
  words.forEach((w, i) => {
    if (w.num || w.stop || w.supplied || w.norm.length < 3) return;
    let g = byGloss(w);
    if (g && memory && memory.get(w.norm, g).n < glossMem) g = null;
    let mem = null;
    if (memory) {
      const fits = [...inVerse.keys()].filter((n) => {
        if (n === 'H853') return false;
        const { n: k, total } = memory.get(w.norm, n);
        return k >= memMin && k >= total * memShare;
      });
      if (fits.length === 1) mem = fits[0];
    }
    const n = g && mem && g !== mem ? null : g ?? mem;
    if (!n) return;
    const prev = words[i - 1];
    if ((used.get(n) || 0) >= inVerse.get(n) && !(prev && prev.num === n)) return;
    take(i, n, g ? 'gloss' : 'memory');
  });
  // Spans: adjacent words joined by a space or a hyphen that took one number from one source phrase merge.
  const spans = [];
  for (const w of words) {
    if (!w.num) continue;
    const last = spans.at(-1);
    const between = last ? text.slice(last.e, w.s) : '';
    // Two words side by side that took one number from the KJV or the BSB are one phrase
    // ("according to", "all things"); so are the halves of a hyphenated word.
    const phrase = last && last.projected && !['gloss', 'memory'].includes(w.via) && between === ' ';
    if (last && last.n === w.num && (phrase || between === '-')) last.e = w.e;
    else spans.push({ s: w.s, e: w.e, n: w.num, via: w.via, projected: !['gloss', 'memory'].includes(w.via) });
  }
  return { words, spans: spans.map(({ s, e, n, via }) => ({ s, e, n, via })) };
}

/**
 * A projector over a whole Bible. sources: Map("book:chapter:verse" -> [{ id, text, tags }])
 * for the KJV and the BSB (KJV numbering); original: Map(same key -> [{ gloss, strongs }]).
 * project(key, text) gives the target verse's words and spans (projectVerse).
 */
export function makeProjector(sources, original) {
  const prefix = (key) => (Number(key.split(':')[0]) <= 39 ? 'H' : 'G');
  const tagged = new Map();
  const memory = makeMemory();
  for (const [key, list] of sources) {
    const words = list.map((src) => ({ id: src.id, words: taggedWords(src.text, src.tags, prefix(key), original.get(key)) }));
    tagged.set(key, words);
    for (const w of words) memory.add(w.words);
  }
  return {
    project: (key, text) => projectVerse(text, tagged.get(key) ?? [], original.get(key) ?? [], memory, prefix(key)),
  };
}
