import { createNavigationContainerRef } from '@react-navigation/native';
import type { Ref } from './types';

export type RootStackParamList = {
  /**
   * `from` is the back-button label when the reader was pushed from a list, and `ref`
   * the verse it opens at; a pushed reader keeps its own place.
   */
  Reader: { from?: string; ref?: Ref } | undefined;
  Books: undefined;
  Chapters: { bookId: number };
  Bookmarks: undefined;
  Search: undefined;
  /** `rendering` opens the list filtered to verses that translate the word that way. */
  Concordance: { strongs: string; rendering?: string };
  Settings: undefined;
  Licences: undefined;
  Notebook: undefined;
  /** `isNew` opens a page just made, ready for writing. */
  NotePage: { id: string; isNew?: boolean };
};

/** Lets the word sheet, which sits outside the navigator, open the concordance. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
