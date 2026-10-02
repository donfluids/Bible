import { useCallback, useSyncExternalStore } from 'react';
import type { TranslationId } from './types';

/**
 * The word whose sheet is open, as the reader marks it in its verse. Kept outside React
 * context so that opening or closing the sheet redraws only the verse it is in, not the
 * whole chapter in every open reader.
 */
export interface Selection {
  translation: TranslationId;
  book: number;
  chapter: number;
  verse: number;
  /** Start offset of the word in the verse text. */
  start: number;
}

let current: Selection | null = null;
const listeners = new Set<() => void>();

export function setSelection(next: Selection | null): void {
  if (current === next) return;
  current = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Offset of the selected word in this verse, or undefined when it is in another verse. */
export function useSelectedStart(translation: TranslationId | undefined, book: number, chapter: number, verse: number): number | undefined {
  const get = useCallback(
    () =>
      translation && current && current.translation === translation && current.book === book && current.chapter === chapter && current.verse === verse
        ? current.start
        : undefined,
    [translation, book, chapter, verse],
  );
  return useSyncExternalStore(subscribe, get, get);
}
