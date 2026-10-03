export type TranslationId = 'KJV' | 'WEB' | 'MAL';

export interface Translation {
  id: TranslationId;
  name: string;
  /** Has Strong's tags, so words can be tapped and the concordance built. */
  tagged: boolean;
  /** Line height multiplier; scripts with stacked marks need more room. */
  lineHeight: number;
}

export const TRANSLATIONS: Translation[] = [
  { id: 'KJV', name: 'King James Version', tagged: true, lineHeight: 1.55 },
  // The WEB source's Strong's tags are unreliable, so they are not built (scripts/build-db.mjs).
  { id: 'WEB', name: 'World English Bible', tagged: false, lineHeight: 1.55 },
  // Tagged by scripts/align-malayalam.mjs (machine alignment, confident links only).
  { id: 'MAL', name: 'സത്യവേദപുസ്തകം 1910 (Malayalam)', tagged: true, lineHeight: 1.75 },
];

export function translationInfo(id: TranslationId): Translation {
  return TRANSLATIONS.find((t) => t.id === id) ?? TRANSLATIONS[0];
}

/** The translation whose Strong's tags back the concordance: itself if tagged, else the KJV. */
export function taggedTranslation(id: TranslationId): TranslationId {
  return translationInfo(id).tagged ? id : 'KJV';
}

export interface Book {
  id: number;
  osis: string;
  /** English name. */
  name: string;
  testament: 'OT' | 'NT';
  chapters: number;
  /** Name in each translation's own language, where the source gives one. */
  names: Partial<Record<TranslationId, string>>;
}

export interface Ref {
  book: number;
  chapter: number;
  verse: number;
}

export interface VerseRow extends Ref {
  text: string;
  /** Offset encoded Strong's tags, see scripts/build-db.mjs. */
  tags: string;
  /** 1 when the translation omits this verse; `text` then holds the translators' note. */
  omitted: number;
  /** Break before the verse: '' none, 'p' paragraph, 'b' blank line, 'q0'..'q2' poetry line. */
  para: string;
}

/** A translators' footnote (kind f) or cross reference (kind x) anchored in a verse. */
export interface Note {
  verse: number;
  n: number;
  /** Character offset in the verse text where the marker belongs. */
  pos: number;
  kind: 'f' | 'x';
  text: string;
}

/** How a Strong's number is rendered in a translation. */
export interface Rendering {
  word: string;
  count: number;
}

export interface Bookmark extends Ref {
  translation: TranslationId;
  added: number;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';
export const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];

/** A dictionary entry as listed in search results. */
export interface LexiconHit extends StrongsEntry {
  /** 0 = transliteration or lemma match, 1 = KJV rendering, 2 = definition. */
  rank: number;
}

export interface Heading {
  before_verse: number;
  text: string;
}

export interface StrongsEntry {
  id: string;
  lemma: string | null;
  translit: string | null;
  pron: string | null;
  derivation: string | null;
  definition: string | null;
  kjv_usage: string | null;
  /** A short modern meaning, e.g. "God" or "word; thing". */
  gloss: string | null;
  /** How many times the word is used in the Hebrew or Greek text. */
  uses: number | null;
}

/** A word linked to another through Strong's derivations. */
export interface RelatedWord {
  id: string;
  lemma: string | null;
  gloss: string | null;
}

/** A run of verse text. When `strongs` is set the run is one tagged word or phrase. */
export interface Segment {
  text: string;
  strongs?: string;
  /** Every number a Malayalam compound links to, the chief first (നിത്യജീവൻ: life, eternal). */
  choices?: string[];
}

/** One Hebrew or Greek word of a verse, as shown in the interlinear view. */
export interface OriginalWord {
  text: string;
  translit: string;
  gloss: string;
  /** Empty for words with no dictionary entry (rare). */
  strongs: string;
  /** Grammar code, see src/morph.ts. */
  morph: string;
  flags: number;
  /** For a Textus Receptus or Byzantine word that replaces another, the Nestle-Aland word. */
  alt?: string;
}

export const FLAG_NOT_IN_NA = 1;
export const FLAG_LXX = 2;
export const FLAG_RESTORED = 4;
export const FLAG_NOT_IN_TR = 8;
export const FLAG_NOT_IN_BYZ = 16;
export const FLAG_REPLACES_NA = 32;

/** The word the reader tapped, carried to the word sheet. */
export interface WordPick {
  strongs: string;
  /** English word or phrase that was tapped, if any. */
  word?: string;
  /** The original-language word, when tapped in the interlinear view. */
  original?: OriginalWord;
  /** For a compound word, every number it links to; the sheet offers each. */
  choices?: string[];
  /**
   * Where the tapped word is: its verse, its start offset in the verse text and, when it
   * was tapped in the reader, the translation (so the reader marks it only there).
   */
  at?: Ref & { start: number; translation?: TranslationId };
}
