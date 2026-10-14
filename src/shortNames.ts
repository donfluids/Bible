import { ENGLISH_SHORT_NAMES, MALAYALAM_SHORT_NAMES, TAMIL_SHORT_NAMES } from './refs';
import type { TranslationId } from './types';

/** The short name of a book for the reader's top bar (see MALAYALAM_SHORT_NAMES in refs.ts). */
export function shortBookName(book: number, translation: TranslationId): string {
  const list = translation === 'MAL' ? MALAYALAM_SHORT_NAMES : translation === 'TAM' ? TAMIL_SHORT_NAMES : ENGLISH_SHORT_NAMES;
  return list[book - 1] ?? '';
}
