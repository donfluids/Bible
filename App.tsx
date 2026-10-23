import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, DarkTheme, NavigationContainer, StackActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { DATABASE_ASSET, DATABASE_DIRECTORY, DATABASE_NAME, databaseCopyComplete, removeIncompleteCopy, removeStaleDatabases } from './src/db';
import { navigationRef } from './src/navigation';
import { getPlace, initPlace, moveMainReader, selectBook, selectLastChapters, selectPosition, usePlace } from './src/place';
import { setSelection } from './src/selection';
import type { RootStackParamList } from './src/navigation';
import { translate, useT } from './src/i18n';
import type { StringKey } from './src/i18n';
import { CONFIGURED_EDITION, EDITIONS, EditionContext, isEditionId } from './src/edition';
import type { Edition, Language } from './src/edition';
import { getBooks, getMeta } from './src/queries';
import { SettingsProvider, useSettings } from './src/settings';
import { NotebookProvider } from './src/notebook';
import { useTheme } from './src/theme';
import type { Book, Ref, WordPick } from './src/types';
import { PANEL_MIN_WIDTH, WordSheet } from './src/components/WordSheet';
import { SavedScreen } from './src/screens/SavedScreen';
import { BooksScreen } from './src/screens/BooksScreen';
import { ChaptersScreen } from './src/screens/ChaptersScreen';
import { ConcordanceScreen } from './src/screens/ConcordanceScreen';
import { ReaderScreen, preloadChapter } from './src/screens/ReaderScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { LicencesScreen } from './src/screens/LicencesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { NotebookScreen } from './src/screens/NotebookScreen';
import { NotePageScreen } from './src/screens/NotePageScreen';
import { CardScreen } from './src/screens/CardScreen';
import { switchTab } from './src/components/TabBar';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <Database />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const STARTUP_LANGUAGE = CONFIGURED_EDITION.languages[0];


// Whether this launch copied the database from the app; its leftovers are then kept
// until the next launch, in case the copy has to be made again.
let copiedThisLaunch = false;

/**
 * Opens the database. The first launch copies it out of the app (about 45 MB); if that
 * fails, for instance for lack of storage, the reader can try again instead of being
 * left with a blank screen. A copy that is not complete (the app was closed during it)
 * is deleted and made again.
 */
function Database() {
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // The bundled copy is needed only when there is no complete copy on the phone.
  const firstCopy = useMemo(() => {
    if (databaseCopyComplete()) return false;
    removeIncompleteCopy();
    // A copy from an earlier version is never opened again; removing it first leaves room
    // for the new one on a nearly full phone.
    removeStaleDatabases(false);
    copiedThisLaunch = true;
    return true;
  }, [attempt]);
  const assetSource = useMemo(() => (firstCopy ? { assetId: DATABASE_ASSET, forceOverwrite: true } : undefined), [firstCopy]);
  const onInit = useCallback(async () => setReady(true), []);
  // The provider reports errors while rendering, so record them afterwards.
  const onError = useCallback(() => {
    Promise.resolve().then(() => setFailed(true));
  }, []);
  if (failed) {
    return (
      <Failure
        language={STARTUP_LANGUAGE}
        title="openFailed"
        detail="openFailedDetail"
        onRetry={() => {
          setFailed(false);
          setReady(false);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  return (
    <View style={styles.root}>
      {ready ? null : <Loading message={translate(STARTUP_LANGUAGE, firstCopy ? 'preparing' : 'loading')} />}
      <SQLiteProvider
        key={attempt}
        databaseName={DATABASE_NAME}
        directory={DATABASE_DIRECTORY}
        assetSource={assetSource}
        onInit={onInit}
        onError={onError}
      >
        <EditionGate />
      </SQLiteProvider>
    </View>
  );
}

/** Anything that throws while rendering ends here, with a way back in. */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <Failure language={STARTUP_LANGUAGE} title="somethingWrong" message={this.state.error.message} onRetry={() => this.setState({ error: null })} />;
  }
}

function Failure({
  language,
  title,
  detail,
  message,
  onRetry,
}: {
  language: Language;
  title: StringKey;
  detail?: StringKey;
  message?: string;
  onRetry: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.root, styles.center, styles.failure, { backgroundColor: theme.bg }]}>
      <Text style={[styles.failureTitle, { color: theme.text }]} accessibilityRole="header">
        {translate(language, title)}
      </Text>
      {detail ? <Text style={[styles.failureText, { color: theme.muted }]}>{translate(language, detail)}</Text> : null}
      {message ? <Text style={[styles.failureText, { color: theme.muted }]}>{message}</Text> : null}
      <Pressable onPress={onRetry} accessibilityRole="button" style={[styles.retry, { backgroundColor: theme.accent }]}>
        <Text style={[styles.retryText, { color: theme.onAccent }]}>{translate(language, 'tryAgain')}</Text>
      </Pressable>
    </View>
  );
}

/**
 * The bundled database records the edition it was built for. Trust it over the
 * build configuration, so the right texts and interface language always appear.
 */
function EditionGate() {
  const db = useSQLiteContext();
  const [ready, setReady] = useState<{ edition: Edition; books: Book[] | null } | null>(null);
  useEffect(() => {
    // The book list is read in the same round as the edition, and both are waited for, so
    // the shell does not read the books a second time; if the list fails, Shell retries.
    Promise.all([
      getMeta(db)
        .then((meta) => (isEditionId(meta.edition) ? EDITIONS[meta.edition] : CONFIGURED_EDITION))
        .catch(() => CONFIGURED_EDITION),
      getBooks(db).catch(() => null),
    ]).then(([edition, books]) => setReady({ edition, books }));
  }, [db]);
  if (!ready) return <Loading message={translate(CONFIGURED_EDITION.languages[0], 'loading')} />;
  const { edition, books } = ready;
  initPlace(edition);
  return (
    <EditionContext.Provider value={edition}>
      <SettingsProvider edition={edition}>
        <NotebookProvider edition={edition}>
          <Shell initialBooks={books} />
        </NotebookProvider>
      </SettingsProvider>
    </EditionContext.Provider>
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
// Tabs switch in place: no slide, and on iPhone no swipe back from one tab to the reading.
const TAB_SCREEN = { animation: 'none', gestureEnabled: false } as const;

function Shell({ initialBooks }: { initialBooks: Book[] | null }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings } = useSettings();
  const wide = useWindowDimensions().width >= PANEL_MIN_WIDTH;
  const [loadedBooks, setBooks] = useState<Book[] | null>(null);
  const books = loadedBooks ?? initialBooks;
  const [booksFailed, setBooksFailed] = useState(false);
  const [booksAttempt, setBooksAttempt] = useState(0);
  // Word sheet entries; following a link in the derivation pushes, the back arrow pops.
  const [picks, setPicks] = useState<WordPick[]>([]);
  const pick = picks.length > 0 ? picks[picks.length - 1] : null;

  useEffect(() => {
    if (initialBooks && booksAttempt === 0) return;
    setBooksFailed(false);
    getBooks(db)
      .then(setBooks)
      .catch(() => setBooksFailed(true));
  }, [db, booksAttempt]);

  // The current database is open by now, so older copies can go.
  useEffect(() => removeStaleDatabases(!copiedThisLaunch), []);

  // Start reading the chapter the reader opens at while the screens are being built.
  useState(() => {
    const at = getPlace().position;
    preloadChapter(db, settings.translation, at.book, at.chapter);
  });


  const onWord = useCallback((p: WordPick) => setPicks([p]), []);
  const closeSheet = useCallback(() => setPicks([]), []);
  const followLink = useCallback((p: WordPick) => setPicks((prev) => [...prev, p]), []);
  const backEntry = useCallback(() => setPicks((prev) => prev.slice(0, -1)), []);
  // Another part of the same compound word: replaces the entry rather than stacking on it.
  const switchEntry = useCallback((p: WordPick) => setPicks((prev) => [...prev.slice(0, -1), p]), []);
  const showOccurrences = useCallback((strongs: string, rendering?: string) => {
    setPicks([]);
    if (navigationRef.isReady()) navigationRef.dispatch(StackActions.push('Concordance', { strongs, rendering }));
  }, []);
  const openRefFromSheet = useCallback(
    (ref: Ref) => {
      setPicks([]);
      if (navigationRef.isReady()) {
        navigationRef.dispatch(StackActions.push('Reader', { from: translate(settings.language, 'back'), ref: { book: ref.book, chapter: ref.chapter, verse: ref.verse } }));
      }
    },
    [settings.language],
  );

  const appValue = useMemo(() => (books ? { books, onWord } : null), [books, onWord]);
  // The reader marks the open word through a small store, so only its verse redraws.
  useEffect(() => {
    const at = pick?.at;
    setSelection(at?.translation ? { translation: at.translation, book: at.book, chapter: at.chapter, verse: at.verse, start: at.start } : null);
  }, [pick]);

  const navTheme = useMemo(
    () => ({
      ...(theme.dark ? DarkTheme : DefaultTheme),
      colors: { ...(theme.dark ? DarkTheme : DefaultTheme).colors, background: theme.bg, card: theme.bg, text: theme.text, primary: theme.accent },
    }),
    [theme],
  );

  if (booksFailed) return <Failure language={settings.language} title="loadFailed" onRetry={() => setBooksAttempt((n) => n + 1)} />;
  if (!appValue) return <Loading message={translate(settings.language, 'loading')} />;

  return (
    <AppContext.Provider value={appValue}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {/* On a wide screen (a tablet on its side, a Chromebook) the word sheet stands as a
          panel at the right and the screens make room for it, so the text stays in view. */}
      <View style={[styles.root, wide && styles.rootWide]}>
      <View style={styles.root}>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="Reader" component={ReaderRoute} />
          {/* The tabs of the bottom bar change without sliding, as tabs do. */}
          <Stack.Screen name="Books" component={BooksRoute} options={TAB_SCREEN} />
          <Stack.Screen name="Chapters" component={ChaptersRoute} />
          <Stack.Screen name="Bookmarks" component={BookmarksRoute} options={TAB_SCREEN} />
          <Stack.Screen name="Search" component={SearchRoute} />
          <Stack.Screen name="Concordance" component={ConcordanceRoute} />
          <Stack.Screen name="Settings" component={SettingsRoute} />
          <Stack.Screen name="Licences" component={LicencesRoute} />
          <Stack.Screen name="Notebook" component={NotebookRoute} options={TAB_SCREEN} />
          <Stack.Screen name="NotePage" component={NotePageRoute} />
          <Stack.Screen name="Card" component={CardRoute} />
        </Stack.Navigator>
      </NavigationContainer>
      </View>
      <WordSheet
        panel={wide}
        pick={pick}
        translation={settings.translation}
        onClose={closeSheet}
        onBack={picks.length > 1 ? backEntry : undefined}
        onPick={followLink}
        onSwitch={switchEntry}
        onShowOccurrences={showOccurrences}
        onOpenRef={openRefFromSheet}
        rootPick={picks[0] ?? null}
        books={appValue.books}
      />
      </View>
    </AppContext.Provider>
  );
}

type Props<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

/**
 * Jump to a verse from a list, keeping the list underneath for the back button. The
 * pushed reader has its own place, so the main reader stays where the reader left it.
 */
function useOpenRef(navigation: Props<keyof RootStackParamList>['navigation'], from: string) {
  return useCallback(
    (ref: Ref) => {
      navigation.push('Reader', { from, ref: { book: ref.book, chapter: ref.chapter, verse: ref.verse } });
    },
    [navigation, from],
  );
}

function ReaderRoute({ navigation, route }: Props<'Reader'>) {
  const { books, onWord } = useApp();
  const from = route.params?.from;
  return (
    <ReaderScreen
      books={books}
      jumpTo={route.params?.ref}
      onBack={from ? () => navigation.goBack() : undefined}
      backLabel={from}
      onOpenBooks={() => switchTab('Books')}
      tabs={!from}
      onOpenSearch={() => navigation.navigate('Search')}
      onOpenSettings={() => navigation.navigate('Settings')}
      onOpenNotePage={(id, isNew) => navigation.push('NotePage', { id, isNew })}
      onOpenCard={(ref, translation) => navigation.push('Card', { ref, translation })}
      onWord={onWord}
    />
  );
}

function BooksRoute({ navigation }: Props<'Books'>) {
  const { books } = useApp();
  const current = usePlace(selectBook);
  return (
    <BooksScreen
      books={books}
      current={current}
      onPick={(book) => navigation.navigate('Chapters', { bookId: book.id })}
      onOpenRecent={(place) => {
        moveMainReader({ book: place.book, chapter: place.chapter });
        navigation.popToTop();
      }}
    />
  );
}

function ChaptersRoute({ navigation, route }: Props<'Chapters'>) {
  const { books } = useApp();
  const position = usePlace(selectPosition);
  const lastChapters = usePlace(selectLastChapters);
  const book = books.find((b) => b.id === route.params.bookId) ?? books[0];
  return (
    <ChaptersScreen
      book={book}
      current={lastChapters[book.id] ?? (book.id === position.book ? position.chapter : undefined)}
      onPick={(chapter) => {
        moveMainReader({ book: book.id, chapter });
        navigation.popToTop();
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

function BookmarksRoute({ navigation }: Props<'Bookmarks'>) {
  const { books, onWord } = useApp();
  const t = useT();
  const openRef = useOpenRef(navigation, t('saved'));
  return <SavedScreen books={books} onOpenRef={openRef} onWord={onWord} />;
}

function SearchRoute({ navigation }: Props<'Search'>) {
  const { books, onWord } = useApp();
  const t = useT();
  const openRef = useOpenRef(navigation, t('results'));
  return <SearchScreen books={books} onOpenRef={openRef} onWord={onWord} onBack={() => navigation.goBack()} />;
}

function ConcordanceRoute({ navigation, route }: Props<'Concordance'>) {
  const { books, onWord } = useApp();
  const t = useT();
  const openRef = useOpenRef(navigation, t('results'));
  return <ConcordanceScreen strongs={route.params.strongs} rendering={route.params.rendering} books={books} onOpenRef={openRef} onWord={onWord} onBack={() => navigation.goBack()} />;
}

function SettingsRoute({ navigation }: Props<'Settings'>) {
  return <SettingsScreen onBack={() => navigation.goBack()} onOpenLicences={() => navigation.navigate('Licences')} />;
}

function NotebookRoute({ navigation }: Props<'Notebook'>) {
  return <NotebookScreen onOpenPage={(id, isNew) => navigation.push('NotePage', { id, isNew })} />;
}

function NotePageRoute({ navigation, route }: Props<'NotePage'>) {
  const { books } = useApp();
  const t = useT();
  const openRef = useOpenRef(navigation, t('notebook'));
  return <NotePageScreen id={route.params.id} isNew={route.params.isNew} books={books} onOpenRef={openRef} onBack={() => navigation.goBack()} />;
}

function CardRoute({ navigation, route }: Props<'Card'>) {
  const { books } = useApp();
  return <CardScreen books={books} at={route.params.ref} translation={route.params.translation} onBack={() => navigation.goBack()} />;
}

function LicencesRoute({ navigation }: Props<'Licences'>) {
  return <LicencesScreen onBack={() => navigation.goBack()} />;
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
  rootWide: { flexDirection: 'row' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  failure: { paddingHorizontal: 28 },
  failureTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  failureText: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  retry: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10, minHeight: 44, justifyContent: 'center' },
  retryText: { fontSize: 16, fontWeight: '600' },
});
