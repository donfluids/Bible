import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { DATABASE_ASSET, DATABASE_NAME } from './src/db';
import { getBooks } from './src/queries';
import { SettingsProvider, useSettings } from './src/settings';
import { useTheme } from './src/theme';
import type { Book, Ref, WordPick } from './src/types';
import { WordSheet } from './src/components/WordSheet';
import { BooksScreen } from './src/screens/BooksScreen';
import { ChaptersScreen } from './src/screens/ChaptersScreen';
import { ConcordanceScreen } from './src/screens/ConcordanceScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

type Route =
  | { name: 'reader'; fromResults?: boolean }
  | { name: 'books' }
  | { name: 'chapters'; book: Book }
  | { name: 'search' }
  | { name: 'concordance'; strongs: string }
  | { name: 'settings' };

export default function App() {
  return (
    <SafeAreaProvider>
      <Suspense fallback={<Loading message="Preparing the Bible text…" />}>
        <SQLiteProvider databaseName={DATABASE_NAME} assetSource={{ assetId: DATABASE_ASSET }} useSuspense>
          <SettingsProvider>
            <Shell />
          </SettingsProvider>
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}

function Shell() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings, update } = useSettings();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [stack, setStack] = useState<Route[]>([{ name: 'reader' }]);
  const [pick, setPick] = useState<WordPick | null>(null);

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

  const push = useCallback((route: Route) => setStack((s) => [...s, route]), []);
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const home = useCallback(() => setStack([{ name: 'reader' }]), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pick) {
        setPick(null);
        return true;
      }
      if (stack.length > 1) {
        pop();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [pick, stack.length, pop]);

  // Opening a verse from search or the concordance keeps that list underneath,
  // so the reader shows a "Results" back button.
  const openRef = useCallback(
    (ref: Ref) => {
      update({ position: { book: ref.book, chapter: ref.chapter, verse: ref.verse } });
      setPick(null);
      push({ name: 'reader', fromResults: true });
    },
    [update, push],
  );

  const showOccurrences = useCallback(
    (strongs: string) => {
      setPick(null);
      push({ name: 'concordance', strongs });
    },
    [push],
  );

  const onWord = useCallback((p: WordPick) => setPick(p), []);

  if (!books) return <Loading message="Loading…" />;

  const route = stack[stack.length - 1];
  let screen: React.ReactNode;
  switch (route.name) {
    case 'reader':
      screen = (
        <ReaderScreen
          books={books}
          onBack={route.fromResults ? pop : undefined}
          onOpenBooks={() => push({ name: 'books' })}
          onOpenSearch={() => push({ name: 'search' })}
          onOpenSettings={() => push({ name: 'settings' })}
          onWord={onWord}
        />
      );
      break;
    case 'books':
      screen = <BooksScreen books={books} current={settings.position.book} onPick={(book) => push({ name: 'chapters', book })} onBack={pop} />;
      break;
    case 'chapters':
      screen = (
        <ChaptersScreen
          book={route.book}
          current={settings.lastChapters[route.book.id] ?? (route.book.id === settings.position.book ? settings.position.chapter : undefined)}
          onPick={(chapter) => {
            update({ position: { book: route.book.id, chapter } });
            home();
          }}
          onBack={pop}
        />
      );
      break;
    case 'search':
      screen = <SearchScreen books={books} onOpenRef={openRef} onWord={onWord} onBack={pop} />;
      break;
    case 'concordance':
      screen = <ConcordanceScreen strongs={route.strongs} books={books} onOpenRef={openRef} onWord={onWord} onBack={pop} />;
      break;
    case 'settings':
      screen = <SettingsScreen onBack={pop} />;
      break;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {screen}
      <WordSheet pick={pick} translation={settings.translation} onClose={() => setPick(null)} onPick={onWord} onShowOccurrences={showOccurrences} />
    </View>
  );
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
