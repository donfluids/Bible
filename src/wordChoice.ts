// Choices the word sheet makes from the data, kept apart from the sheet so they can be
// tested without a phone (scripts/test-logic.mts): which Hebrew or Greek word of the
// verse a tapped word stands for, which renderings get a chip, and the Malayalam or Tamil
// headline. Types only are imported.
import type { OriginalWord, Rendering } from './types';

/** A word without its punctuation. */
export const bare = (s: string) => s.replace(/[^\p{L}\p{M}]/gu, '');
/** A transliteration without accents or case. */
const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Two transliterations that read the same, accents and case aside (skotía, skotia). */
export const sameSpelling = (a: string, b: string) => plain(a) === plain(b);

/**
 * The verse's Hebrew or Greek words for a tapped word with this number. When the verse has
 * as many of them as the translation (`nth`: which of them the tapped word is, and how
 * many there are), the nth word goes with the nth; otherwise each form once, punctuation
 * aside.
 */
export function wordsInVerse(verseWords: OriginalWord[], strongs: string, nth?: [number, number]): OriginalWord[] {
  const matching = verseWords.filter((w) => w.strongs === strongs);
  if (nth && nth[1] === matching.length && matching[nth[0]]) return [matching[nth[0]]];
  const seen = new Set<string>();
  return matching.filter((w) => {
    const key = `${bare(w.text)}|${w.morph}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** English words that only travel with a tagged word (θεός: "the 12"), not renderings of it. */
const LONE_FUNCTION_WORDS = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'in', 'that', 'for', 'by', 'with', 'is', 'be', 'it']);

/**
 * The renderings worth a chip: the main ones, not one-off phrasings or the stray words a
 * machine-made link leaves (under 1% of the verses, and never fewer than two), nor a bare
 * "the" or "of" after the first (which stays: for ὁ or καί it is the rendering).
 */
export function topRenderings(list: Rendering[], max: number, total?: number): Rendering[] {
  const floor = Math.max(2, (total ?? list[0]?.count ?? 0) * 0.01);
  return list.filter((r, i) => i === 0 || (r.count >= floor && !LONE_FUNCTION_WORDS.has(r.word.toLowerCase()))).slice(0, max);
}

/**
 * The Malayalam headline: the commonest rendering, and a second one when it is a real
 * alternative: at least 4% of uses, and not another form of the first (ജനം beside
 * ജനത്തെ, ദൈവസ്നേഹം beside സ്നേഹം, മരിക്കും beside മരിച്ചു, by the same first two
 * letters). ദൈവം · ദേവന്മാർ, സമാധാനം · സുഖം, സ്നേഹം.
 */
export function headlineWords(list: Rendering[]): string[] {
  if (list.length === 0) return [];
  const total = list.reduce((n, r) => n + r.count, 0);
  const first = list[0].word;
  const stem = (word: string) => word.slice(0, -1);
  const sameWord = (word: string) => word.slice(0, 2) === first.slice(0, 2) || word.includes(stem(first)) || first.includes(stem(word));
  const second = list.slice(1).find((r) => r.count >= total * 0.04 && !sameWord(r.word));
  return second ? [first, second.word] : [first];
}
