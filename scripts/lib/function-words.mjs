// Hebrew and Greek words that carry grammar rather than meaning: the article, negations,
// conjunctions, common prepositions and particles. When the BSB links one English word to
// several numbers ("Father's" to ὁ πατήρ, "I do not know" to οὐ οἶδα), the word sheet
// opens the first number that is not one of these.
export const FUNCTION_WORDS = new Set([
  // Hebrew: the object marker, not, no, and/that/if/who, to, on, until, between, from, in, with.
  'H853', 'H3808', 'H408', 'H369', 'H3588', 'H518', 'H834', 'H413', 'H5921', 'H5704', 'H996', 'H4480', 'H854', 'H5973',
  'H3651', 'H1571', 'H637', 'H2009', 'H4994',
  // Greek: the article, not, and, but, for, that, if, into, in, from, through, to, with, by.
  'G3588', 'G3756', 'G3361', 'G3364', 'G3761', 'G3383', 'G2532', 'G1161', 'G1063', 'G3754', 'G1437', 'G1487', 'G3767', 'G235',
  'G1519', 'G1722', 'G1537', 'G575', 'G1223', 'G4314', 'G3326', 'G5259', 'G1909', 'G302', 'G2443', 'G5613',
]);

/** The numbers in the order the word sheet offers them: the chief word first, no repeats. */
export function chiefFirst(ids) {
  const unique = [...new Set(ids)];
  const chief = unique.find((n) => !FUNCTION_WORDS.has(n)) ?? unique[0];
  return [chief, ...unique.filter((n) => n !== chief)];
}

/** The numbers among them that are not function words. */
export const contentNumbers = (ids) => ids.filter((n) => !FUNCTION_WORDS.has(n));
