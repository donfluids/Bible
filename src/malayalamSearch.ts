/**
 * Malayalam search that matches everyday spelling. Phone keyboards type modern forms;
 * the 1910 text keeps older ones, so these count as the same:
 *
 * - a word ending in ് or ു (ആത്മാവ് finds ആത്മാവു);
 * - a chillu and its consonant with ് before another consonant (കൽപിച്ചു finds
 *   കല്പിച്ചു; ൻ, ർ, ൾ, ൺ, ൿ alike), but not in a doubled letter or ന്റ (അവൻ does not
 *   find അവന്നു or അവന്റെ);
 * - a ് with or without the zero-width non-joiner the text puts after some (ചെയ്വാൻ
 *   finds ചെയ്‌വാൻ), which keyboards do not type;
 * - the old and new signs for ൗ.
 *
 * A word is still matched as typed, not with its other forms: ആത്മാവ് does not find
 * ആത്മാവിനെ (type ആത്മാവ for that), as in English search.
 */

const CHILLU_BASE: Record<string, string> = { 'ൺ': 'ണ', 'ൻ': 'ന', 'ർ': 'ര', 'ൽ': 'ല', 'ൾ': 'ള', 'ൿ': 'ക' };
const BASE_CHILLU: Record<string, string> = Object.fromEntries(Object.entries(CHILLU_BASE).map(([c, b]) => [b, c]));
const VIRAMA = '\u0d4d';
const U_SIGN = '\u0d41';
const ZWNJ = '\u200c';

const isMalayalamLetter = (c: string | undefined) => !!c && /[\u0d00-\u0d7f]/.test(c);
const isConsonant = (c: string | undefined) => !!c && /[\u0d15-\u0d3a]/.test(c);
// A consonant with ് stands for a chillu only before another consonant: not before itself
// (എല്ലാ, അവന്നു) and, for ന, not before റ (അവന്റെ).
const notChillu = (base: string) => (base === 'ന' ? '[നറ]' : base);
const chillu = (base: string, after: string | undefined) =>
  !isMalayalamLetter(after) || (isConsonant(after) && !new RegExp(`^${notChillu(base)}$`).test(after!));
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c);

export interface MalayalamPattern {
  /** A LIKE pattern (escape character \) that every match satisfies; it finds candidates. */
  like: string;
  /**
   * Tighter LIKE patterns, one of which every match satisfies: each place where the text
   * may differ is spelled out both ways instead of left open. Empty when there are too many
   * combinations or nothing to gain; then `like` alone is used.
   */
  alternatives: string[];
  /** The exact match, as a regular expression source. */
  source: string;
}

/** At most this many alternative patterns; past it, the open pattern alone is used. */
const MAX_ALTERNATIVES = 8;

/** Joins runs of the LIKE wildcard %, leaving an escaped \% alone. */
function collapseWildcards(pattern: string): string {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\') {
      out += c + (pattern[i + 1] ?? '');
      i++;
    } else if (c !== '%' || !out.endsWith('%') || out.endsWith('\\%')) {
      out += c;
    }
  }
  return out;
}

/** The pattern for a query, or null when the query has no Malayalam letters. */
export function malayalamPattern(query: string): MalayalamPattern | null {
  const q = query.replace(/[\u200c\u200d]/g, '').trim().replace(/\s+/g, ' ');
  if (!/[\u0d00-\u0d7f]/.test(q)) return null;
  const chars = [...q];
  let re = '';
  let like = '%';
  let alternatives: string[] | null = ['%'];
  // Each alternative goes on with each of the given continuations.
  const branch = (options: string[]) => {
    if (!alternatives) return;
    const next: string[] = [];
    for (const a of alternatives) for (const o of options) next.push(a + o);
    alternatives = next.length > MAX_ALTERNATIVES ? null : next;
  };
  // A place where the text can differ from the query becomes % in the LIKE pattern.
  const loose = () => {
    if (!like.endsWith('%')) like += '%';
  };
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];
    const wordEnd = !isMalayalamLetter(next);
    if (CHILLU_BASE[c]) {
      re += `(?:${c}|${CHILLU_BASE[c]}${VIRAMA}(?!${notChillu(CHILLU_BASE[c])}))${ZWNJ}?`;
      loose();
      branch([`${c}%`, `${CHILLU_BASE[c]}${VIRAMA}%`]);
    } else if (BASE_CHILLU[c] && next === VIRAMA && chillu(c, chars[i + 2])) {
      const end = !isMalayalamLetter(chars[i + 2]);
      re += `(?:${c}${end ? `[${VIRAMA}${U_SIGN}]` : VIRAMA}${ZWNJ}?|${BASE_CHILLU[c]})`;
      loose();
      branch([`${c}${end ? '_' : VIRAMA}%`, `${BASE_CHILLU[c]}%`]);
      i++;
    } else if ((c === VIRAMA || c === U_SIGN) && wordEnd) {
      re += `[${VIRAMA}${U_SIGN}]`;
      like += '_';
      branch(['_']);
    } else if (c === VIRAMA) {
      re += `${VIRAMA}${ZWNJ}?`;
      like += VIRAMA;
      loose();
      branch([`${VIRAMA}%`]);
    } else if (c === '\u0d4c' || c === '\u0d57') {
      re += '(?:\u0d4c|\u0d46?\u0d57)';
      loose();
      branch(['\u0d4c%', '%\u0d57%']);
    } else {
      re += escapeRegex(c);
      like += escapeLike(c);
      branch([escapeLike(c)]);
    }
  }
  loose();
  const alts: string[] = alternatives ?? [];
  // One alternative is no tighter than the open pattern.
  return { like, alternatives: alts.length > 1 ? alts.map((a) => collapseWildcards(a + '%')) : [], source: re };
}
