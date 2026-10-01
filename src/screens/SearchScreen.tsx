import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { VerseListItem } from '../components/VerseListItem';
import { searchText } from '../queries';
import { parseReference } from '../refs';
import { useSettings } from '../settings';
import { bookName, formatCount } from '../text';
import { useTheme } from '../theme';
import type { Book, Ref, VerseRow, WordPick } from '../types';

interface Props {
  books: Book[];
  onOpenRef: (ref: Ref) => void;
  onWord: (pick: WordPick) => void;
  onBack: () => void;
}

const LIMIT = 300;

export function SearchScreen({ books, onOpenRef, onWord, onBack }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings } = useSettings();
  const { translation } = settings;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VerseRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = useRef(0);

  // "John 3:16", "Ps 23" and the like are offered as a direct jump.
  const goTo = parseReference(query, books);
  // A Strong's number such as G3056 or h430 is offered as a direct link.
  const strongsMatch = /^([hg])\s*0*(\d{1,4})$/i.exec(query.trim());
  const strongsId = strongsMatch ? strongsMatch[1].toUpperCase() + strongsMatch[2] : null;

  useEffect(() => {
    const q = query.trim();
    const id = ++latest.current;
    if (q.length < 2 || strongsId || goTo) {
      setResults(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(async () => {
      const rows = await searchText(db, translation, q, LIMIT);
      if (latest.current !== id) return;
      setResults(rows);
      setBusy(false);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, translation, query, strongsId, goTo?.book, goTo?.chapter, goTo?.verse]);

  const listFont = Math.min(settings.fontSize, 18);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={`Search the ${translation}`} onBack={onBack} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Words, a reference like John 3:16, or G26"
        placeholderTextColor={theme.muted}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
      />
      {goTo ? (
        <Pressable
          onPress={() => onOpenRef({ book: goTo.book, chapter: goTo.chapter, verse: goTo.verse })}
          style={({ pressed }) => [styles.strongsRow, { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border }]}
          accessibilityRole="button"
        >
          <Text style={[styles.strongsText, { color: theme.accent }]}>
            Go to {bookName(books, goTo.book)} {goTo.chapter}
            {goTo.chapterOnly ? '' : `:${goTo.verse}`}
          </Text>
          <Text style={[styles.strongsSub, { color: theme.muted }]}>Open in the {translation}</Text>
        </Pressable>
      ) : null}
      {strongsId ? (
        <Pressable
          onPress={() => onWord({ strongs: strongsId })}
          style={({ pressed }) => [styles.strongsRow, { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border }]}
          accessibilityRole="button"
        >
          <Text style={[styles.strongsText, { color: theme.accent }]}>Open {strongsId}</Text>
          <Text style={[styles.strongsSub, { color: theme.muted }]}>{strongsId.startsWith('H') ? 'Hebrew' : 'Greek'} dictionary entry</Text>
        </Pressable>
      ) : null}
      {busy ? <ActivityIndicator style={styles.spinner} color={theme.accent} /> : null}
      {results && !busy ? (
        <Text style={[styles.count, { color: theme.muted }]}>
          {results.length === 0
            ? 'No verses found'
            : results.length >= LIMIT
              ? `First ${formatCount(LIMIT)} verses, narrow the search for more`
              : `${formatCount(results.length)} ${results.length === 1 ? 'verse' : 'verses'}`}
        </Text>
      ) : null}
      <FlatList
        data={results ?? []}
        keyExtractor={(v) => `${v.book}:${v.chapter}:${v.verse}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <VerseListItem verse={item} books={books} fontSize={listFont} onOpen={onOpenRef} onWord={onWord} highlightText={query} />
        )}
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  input: {
    margin: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 17,
  },
  spinner: { marginVertical: 12 },
  strongsRow: { marginHorizontal: 14, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  strongsText: { fontSize: 17, fontWeight: '600' },
  strongsSub: { fontSize: 13, marginTop: 2 },
  count: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 13 },
});
