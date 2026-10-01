import { createNavigationContainerRef } from '@react-navigation/native';

export type RootStackParamList = {
  /** `from` is the back-button label when the reader was pushed from a list. */
  Reader: { from?: string } | undefined;
  Books: undefined;
  Chapters: { bookId: number };
  Bookmarks: undefined;
  Search: undefined;
  Concordance: { strongs: string };
  Settings: undefined;
};

/** Lets the word sheet, which sits outside the navigator, open the concordance. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
