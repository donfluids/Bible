import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { VerseListItem } from '../components/VerseListItem';
import { getConcordance, getRenderingRefs, getRenderings, getStrongs, getVerses } from '../queries';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, formatCount } from '../text';
import { useTheme } from '../theme';
import type { Book, Ref, Rendering, StrongsEntry, VerseRow, WordPick } from '../types';

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
  const [renderings, setRenderings] = useState<Rendering[]>([]);
  const [total, setTotal] = useState(0);
  /** The English rendering the list is filtered to, or null for all verses. */
  const [filter, setFilter] = useState<string | null>(null);
  const [refs, setRefs] = useState<Ref[] | null>(null);
  const [verses, setVerses] = useState<VerseRow[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFilter(null);
    Promise.all([getStrongs(db, strongs), getRenderings(db, strongs, translation)]).then(([e, r]) => {
      if (cancelled) return;
      setEntry(e);
      setRenderings(r);
    });
    return () => {
      cancelled = true;
    };
  }, [db, strongs, translation]);

  useEffect(() => {
    let cancelled = false;
    setRefs(null);
    setVerses([]);
    const load = filter === null ? getConcordance(db, strongs, translation) : getRenderingRefs(db, strongs, translation, filter);
    load.then(async (r) => {
      if (cancelled) return;
      if (filter === null) setTotal(r.length);
      setRefs(r);
      const first = await getVerses(db, translation, r.slice(0, PAGE));
      if (!cancelled) setVerses(first);
    });
    return () => {
      cancelled = true;
    };
  }, [db, strongs, translation, filter]);

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
          {refs ? `${formatCount(refs.length)} ${refs.length === 1 ? 'verse' : 'verses'} in the ${translation}${filter ? ` as “${filter}”` : ''}` : 'Loading…'}
        </Text>
      </View>
      {renderings.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chips, { borderBottomColor: theme.border }]} contentContainerStyle={styles.chipsContent}>
          <Chip label="All" count={total} active={filter === null} onPress={() => setFilter(null)} />
          {renderings.map((r) => (
            <Chip key={r.word} label={r.word} count={r.count} active={filter === r.word} onPress={() => setFilter(filter === r.word ? null : r.word)} />
          ))}
        </ScrollView>
      ) : null}
      {!refs ? (
        <ActivityIndicator style={styles.loading} color={theme.accent} />
      ) : (
        <FlatList
          data={verses}
          keyExtractor={(v) => `${v.book}:${v.chapter}:${v.verse}`}
          renderItem={({ item }) => (
            <VerseListItem verse={item} books={books} fontSize={listFont} onOpen={onOpenRef} onWord={onWord} emphasize={strongs} />
          )}
          contentContainerStyle={styles.list}
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

function Chip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accent : pressed ? theme.accentSoft : theme.card },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#fff' : theme.text }]}>
        {label} <Text style={{ color: active ? '#fff' : theme.muted, fontWeight: '400' }}>{formatCount(count)}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  summary: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  lemma: { fontSize: 26, lineHeight: 34 },
  translit: { fontSize: 17 },
  count: { fontSize: 13, marginTop: 2 },
  chips: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  chipsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '600' },
  loading: { marginTop: 40 },
  more: { marginVertical: 20 },
});
