import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { VerseListItem } from '../components/VerseListItem';
import { getConcordance, getStrongs, getVerses } from '../queries';
import { useSettings } from '../settings';
import { formatCount } from '../text';
import { useTheme } from '../theme';
import type { Book, Ref, StrongsEntry, VerseRow, WordPick } from '../types';

interface Props {
  strongs: string;
  books: Book[];
  onOpenRef: (ref: Ref) => void;
  onWord: (pick: WordPick) => void;
  onBack: () => void;
}

const PAGE = 40;

/** Every verse in the current translation tagged with one Strong's number. */
export function ConcordanceScreen({ strongs, books, onOpenRef, onWord, onBack }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings } = useSettings();
  const { translation } = settings;
  const [entry, setEntry] = useState<StrongsEntry | null>(null);
  const [refs, setRefs] = useState<Ref[] | null>(null);
  const [verses, setVerses] = useState<VerseRow[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRefs(null);
    setVerses([]);
    Promise.all([getStrongs(db, strongs), getConcordance(db, strongs, translation)]).then(async ([e, r]) => {
      if (cancelled) return;
      setEntry(e);
      setRefs(r);
      const first = await getVerses(db, translation, r.slice(0, PAGE));
      if (!cancelled) setVerses(first);
    });
    return () => {
      cancelled = true;
    };
  }, [db, strongs, translation]);

  const loadMore = useCallback(async () => {
    if (!refs || loadingMore || verses.length >= refs.length) return;
    setLoadingMore(true);
    const next = await getVerses(db, translation, refs.slice(verses.length, verses.length + PAGE));
    setVerses((prev) => [...prev, ...next]);
    setLoadingMore(false);
  }, [db, translation, refs, verses.length, loadingMore]);

  const listFont = Math.min(settings.fontSize, 18);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={strongs} onBack={onBack} />
      <View style={[styles.summary, { borderBottomColor: theme.border }]}>
        <Text style={[styles.lemma, { color: theme.text }]}>
          {entry?.lemma ?? ''}
          {entry?.translit ? <Text style={[styles.translit, { color: theme.muted }]}>  {entry.translit}</Text> : null}
        </Text>
        <Text style={[styles.count, { color: theme.muted }]}>
          {refs ? `${formatCount(refs.length)} ${refs.length === 1 ? 'verse' : 'verses'} in the ${translation}` : 'Loading…'}
        </Text>
      </View>
      {!refs ? (
        <ActivityIndicator style={styles.loading} color={theme.accent} />
      ) : (
        <FlatList
          data={verses}
          keyExtractor={(v) => `${v.book}:${v.chapter}:${v.verse}`}
          renderItem={({ item }) => (
            <VerseListItem verse={item} books={books} fontSize={listFont} onOpen={onOpenRef} onWord={onWord} emphasize={strongs} />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            verses.length < refs.length ? <ActivityIndicator style={styles.more} color={theme.accent} /> : <View style={{ height: 40 }} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  summary: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  lemma: { fontSize: 26, lineHeight: 34 },
  translit: { fontSize: 17 },
  count: { fontSize: 13, marginTop: 2 },
  loading: { marginTop: 40 },
  more: { marginVertical: 20 },
});
