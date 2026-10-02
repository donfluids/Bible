import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, DarkTheme, NavigationContainer, StackActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { DATABASE_ASSET, DATABASE_NAME, databaseCopyExists, removeStaleDatabases } from './src/db';
import { navigationRef } from './src/navigation';
import type { RootStackParamList } from './src/navigation';
import { translate, useT } from './src/i18n';
import type { StringKey } from './src/i18n';
import { CONFIGURED_EDITION, EDITIONS, EditionContext, isEditionId } from './src/edition';
import type { Edition, Language } from './src/edition';
import { getBooks, getMeta } from './src/queries';
import { SettingsProvider, useSettings } from './src/settings';
import { useTheme } from './src/theme';
import type { Book, Ref, WordPick } from './src/types';
import { WordSheet } from './src/components/WordSheet';
import { SavedScreen } from './src/screens/SavedScreen';
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
        <ErrorBoundary>
          <Database />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const STARTUP_LANGUAGE = CONFIGURED_EDITION.languages[0];

/**
 * Opens the database. The first launch copies it out of the app (about 45 MB); if that
 * fails, for instance for lack of storage, the reader can try again instead of being
 * left with a blank screen.
 */
function Database() {
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // The bundled copy is needed only when there is no copy on the phone yet.
  const firstCopy = useMemo(() => !databaseCopyExists(), [attempt]);
  const assetSource = useMemo(() => (firstCopy ? { assetId: DATABASE_ASSET } : undefined), [firstCopy]);
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
      <SQLiteProvider key={attempt} databaseName={DATABASE_NAME} assetSource={assetSource} onInit={onInit} onError={onError}>
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
  const [edition, setEdition] = useState<Edition | null>(null);
  useEffect(() => {
    getMeta(db)
      .then((meta) => setEdition(isEditionId(meta.edition) ? EDITIONS[meta.edition] : CONFIGURED_EDITION))
      .catch(() => setEdition(CONFIGURED_EDITION));
  }, [db]);
  if (!edition) return <Loading message={translate(CONFIGURED_EDITION.languages[0], 'loading')} />;
  return (
    <EditionContext.Provider value={edition}>
      <SettingsProvider edition={edition}>
        <Shell />
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

function Shell() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings, update } = useSettings();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [booksFailed, setBooksFailed] = useState(false);
  const [booksAttempt, setBooksAttempt] = useState(0);
  // Word sheet entries; following a link in the derivation pushes, the back arrow pops.
  const [picks, setPicks] = useState<WordPick[]>([]);
  const pick = picks.length > 0 ? picks[picks.length - 1] : null;

  useEffect(() => {
    setBooksFailed(false);
    getBooks(db)
      .then(setBooks)
      .catch(() => setBooksFailed(true));
  }, [db, booksAttempt]);

  // The current database is open by now, so older copies can go.
  useEffect(() => removeStaleDatabases(), []);

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

  if (booksFailed) return <Failure language={settings.language} title="loadFailed" onRetry={() => setBooksAttempt((n) => n + 1)} />;
  if (!appValue) return <Loading message={translate(settings.language, 'loading')} />;

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
      onOpenBooks={() => navigation.navigate('Books')}
      onOpenSearch={() => navigation.navigate('Search')}
      onOpenSettings={() => navigation.navigate('Settings')}
      onWord={onWord}
    />
  );
}

function BooksRoute({ navigation }: Props<'Books'>) {
  const { books } = useApp();
  const { settings, update } = useSettings();
  return (
    <BooksScreen
      books={books}
      current={settings.position.book}
      onPick={(book) => navigation.navigate('Chapters', { bookId: book.id })}
      onOpenBookmarks={() => navigation.navigate('Bookmarks')}
      onOpenRecent={(place) => {
        update({ position: { book: place.book, chapter: place.chapter } });
        navigation.popToTop();
      }}
      bookmarkCount={settings.bookmarks.length + Object.keys(settings.highlights).length + Object.keys(settings.notes).length}
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
  const t = useT();
  const openRef = useOpenRef(navigation, t('saved'));
  return <SavedScreen books={books} onOpenRef={openRef} onWord={onWord} onBack={() => navigation.goBack()} />;
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
  failure: { paddingHorizontal: 28 },
  failureTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  failureText: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  retry: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10, minHeight: 44, justifyContent: 'center' },
  retryText: { fontSize: 16, fontWeight: '600' },
});
