export type TranslationId = 'KJV' | 'WEB';

export const TRANSLATIONS: { id: TranslationId; name: string }[] = [
  { id: 'KJV', name: 'King James Version' },
  { id: 'WEB', name: 'World English Bible' },
];

export interface Book {
  id: number;
  osis: string;
  name: string;
  testament: 'OT' | 'NT';
  chapters: number;
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
}

/** A run of verse text. When `strongs` is set the run is one tagged word or phrase. */
export interface Segment {
  text: string;
  strongs?: string;
}

/** The word the reader tapped, carried to the word sheet. */
export interface WordPick {
  strongs: string;
  /** English word or phrase that was tapped, if any. */
  word?: string;
}
