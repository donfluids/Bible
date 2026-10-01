import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { VerseListItem } from '../components/VerseListItem';
import { searchLexicon, searchText } from '../queries';
import { parseReference } from '../refs';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, bookName, formatCount } from '../text';
import { useTheme } from '../theme';
import type { Book, LexiconHit, Ref, VerseRow, WordPick } from '../types';

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
  const [entries, setEntries] = useState<LexiconHit[]>([]);
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
      setEntries([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(async () => {
      const [rows, hits] = await Promise.all([searchText(db, translation, q, LIMIT), searchLexicon(db, q, 8)]);
      if (latest.current !== id) return;
      setResults(rows);
      setEntries(hits);
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
      {entries.length > 0 && !busy ? (
        <View style={[styles.lexicon, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.lexiconTitle, { color: theme.muted }]}>DICTIONARY</Text>
          {entries.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => onWord({ strongs: e.id })}
              style={({ pressed }) => [styles.entry, { borderTopColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
              accessibilityRole="button"
            >
              <Text style={[styles.entryId, { color: theme.accent }]}>{e.id}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.entryLemma, { color: theme.text }]} numberOfLines={1}>
                  {e.lemma} <Text style={{ color: theme.muted, fontSize: 14 }}>{e.translit}</Text>
                </Text>
                <Text style={[styles.entryGloss, { color: theme.muted }]} numberOfLines={1}>
                  {e.kjv_usage || e.definition || ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
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
        contentContainerStyle={styles.list}
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
  list: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  input: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH - 28,
    margin: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 17,
  },
  spinner: { marginVertical: 12 },
  lexicon: { marginHorizontal: 14, marginBottom: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  lexiconTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  entryId: { fontSize: 13, fontWeight: '700', width: 56, fontVariant: ['tabular-nums'] },
  entryLemma: { fontSize: 17 },
  entryGloss: { fontSize: 13, marginTop: 1 },
  strongsRow: { marginHorizontal: 14, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  strongsText: { fontSize: 17, fontWeight: '600' },
  strongsSub: { fontSize: 13, marginTop: 2 },
  count: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 13 },
});
