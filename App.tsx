import React, { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, DarkTheme, NavigationContainer, StackActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { DATABASE_ASSET, DATABASE_NAME } from './src/db';
import { navigationRef } from './src/navigation';
import type { RootStackParamList } from './src/navigation';
import { getBooks } from './src/queries';
import { SettingsProvider, useSettings } from './src/settings';
import { useTheme } from './src/theme';
import type { Book, Ref, WordPick } from './src/types';
import { WordSheet } from './src/components/WordSheet';
import { BookmarksScreen } from './src/screens/BookmarksScreen';
import { BooksScreen } from './src/screens/BooksScreen';
import { ChaptersScreen } from './src/screens/ChaptersScreen';
import { ConcordanceScreen } from './src/screens/ConcordanceScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Suspense fallback={<Loading message="Preparing the Bible text…" />}>
          <SQLiteProvider databaseName={DATABASE_NAME} assetSource={{ assetId: DATABASE_ASSET }} useSuspense>
            <SettingsProvider>
              <Shell />
            </SettingsProvider>
          </SQLiteProvider>
        </Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** What every screen needs besides its own route params. */
interface AppContextValue {
  books: Book[];
  /** Open the word sheet for a tapped word. */
  onWord: (pick: WordPick) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside the app shell');
  return ctx;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

function Shell() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings, update } = useSettings();
  const [books, setBooks] = useState<Book[] | null>(null);
  // Word sheet entries; following a link in the derivation pushes, the back arrow pops.
  const [picks, setPicks] = useState<WordPick[]>([]);
  const pick = picks.length > 0 ? picks[picks.length - 1] : null;

  useEffect(() => {
    getBooks(db).then(setBooks);
  }, [db]);

  // Remember the last chapter visited in each book, for the chapter picker.
  useEffect(() => {
    const { book, chapter } = settings.position;
    if (settings.lastChapters[book] !== chapter) {
      update({ lastChapters: { ...settings.lastChapters, [book]: chapter } });
    }
  }, [settings.position, settings.lastChapters, update]);

  const onWord = useCallback((p: WordPick) => setPicks([p]), []);
  const closeSheet = useCallback(() => setPicks([]), []);
  const followLink = useCallback((p: WordPick) => setPicks((prev) => [...prev, p]), []);
  const backEntry = useCallback(() => setPicks((prev) => prev.slice(0, -1)), []);
  const showOccurrences = useCallback((strongs: string) => {
    setPicks([]);
    if (navigationRef.isReady()) navigationRef.dispatch(StackActions.push('Concordance', { strongs }));
  }, []);

  const appValue = useMemo(() => (books ? { books, onWord } : null), [books, onWord]);

  const navTheme = useMemo(
    () => ({
      ...(theme.dark ? DarkTheme : DefaultTheme),
      colors: { ...(theme.dark ? DarkTheme : DefaultTheme).colors, background: theme.bg, card: theme.bg, text: theme.text, primary: theme.accent },
    }),
    [theme],
  );

  if (!appValue) return <Loading message="Loading…" />;

  return (
    <AppContext.Provider value={appValue}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="Reader" component={ReaderRoute} />
          <Stack.Screen name="Books" component={BooksRoute} />
          <Stack.Screen name="Chapters" component={ChaptersRoute} />
          <Stack.Screen name="Bookmarks" component={BookmarksRoute} />
          <Stack.Screen name="Search" component={SearchRoute} />
          <Stack.Screen name="Concordance" component={ConcordanceRoute} />
          <Stack.Screen name="Settings" component={SettingsRoute} />
        </Stack.Navigator>
      </NavigationContainer>
      <WordSheet
        pick={pick}
        translation={settings.translation}
        onClose={closeSheet}
        onBack={picks.length > 1 ? backEntry : undefined}
        onPick={followLink}
        onShowOccurrences={showOccurrences}
      />
    </AppContext.Provider>
  );
}

type Props<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

/** Jump to a verse from a list, keeping the list underneath for the back button. */
function useOpenRef(navigation: Props<keyof RootStackParamList>['navigation'], from: string) {
  const { update } = useSettings();
  return useCallback(
    (ref: Ref) => {
      update({ position: { book: ref.book, chapter: ref.chapter, verse: ref.verse } });
      navigation.push('Reader', { from });
    },
    [navigation, update, from],
  );
}

function ReaderRoute({ navigation, route }: Props<'Reader'>) {
  const { books, onWord } = useApp();
  const from = route.params?.from;
  return (
    <ReaderScreen
      books={books}
      onBack={from ? () => navigation.goBack() : undefined}
      backLabel={from}
      onOpenBooks={() => navigation.navigate('Books')}
      onOpenSearch={() => navigation.navigate('Search')}
      onOpenSettings={() => navigation.navigate('Settings')}
      onWord={onWord}
    />
  );
}

function BooksRoute({ navigation }: Props<'Books'>) {
  const { books } = useApp();
  const { settings } = useSettings();
  return (
    <BooksScreen
      books={books}
      current={settings.position.book}
      onPick={(book) => navigation.navigate('Chapters', { bookId: book.id })}
      onOpenBookmarks={() => navigation.navigate('Bookmarks')}
      bookmarkCount={settings.bookmarks.length}
      onBack={() => navigation.goBack()}
    />
  );
}

function ChaptersRoute({ navigation, route }: Props<'Chapters'>) {
  const { books } = useApp();
  const { settings, update } = useSettings();
  const book = books.find((b) => b.id === route.params.bookId) ?? books[0];
  return (
    <ChaptersScreen
      book={book}
      current={settings.lastChapters[book.id] ?? (book.id === settings.position.book ? settings.position.chapter : undefined)}
      onPick={(chapter) => {
        update({ position: { book: book.id, chapter } });
        navigation.popToTop();
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

function BookmarksRoute({ navigation }: Props<'Bookmarks'>) {
  const { books, onWord } = useApp();
  const openRef = useOpenRef(navigation, 'Bookmarks');
  return <BookmarksScreen books={books} onOpenRef={openRef} onWord={onWord} onBack={() => navigation.goBack()} />;
}

function SearchRoute({ navigation }: Props<'Search'>) {
  const { books, onWord } = useApp();
  const openRef = useOpenRef(navigation, 'Results');
  return <SearchScreen books={books} onOpenRef={openRef} onWord={onWord} onBack={() => navigation.goBack()} />;
}

function ConcordanceRoute({ navigation, route }: Props<'Concordance'>) {
  const { books, onWord } = useApp();
  const openRef = useOpenRef(navigation, 'Results');
  return <ConcordanceScreen strongs={route.params.strongs} books={books} onOpenRef={openRef} onWord={onWord} onBack={() => navigation.goBack()} />;
}

function SettingsRoute({ navigation }: Props<'Settings'>) {
  return <SettingsScreen onBack={() => navigation.goBack()} />;
}

function Loading({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.root, styles.center, { backgroundColor: theme.bg }]}>
      <ActivityIndicator color={theme.accent} />
      <Text style={[styles.loadingText, { color: theme.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
});
