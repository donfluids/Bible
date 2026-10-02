import React, { useMemo, useRef } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header } from '../components/Header';
import { useT } from '../i18n';
import { selectPosition, selectRecent, usePlace } from '../place';
import { useSettings } from '../settings';
import { bookName } from '../text';
import { useTheme } from '../theme';
import type { Book } from '../types';

interface Props {
  books: Book[];
  current: number;
  onPick: (book: Book) => void;
  onOpenBookmarks: () => void;
  bookmarkCount: number;
  /** Go back to a recently read chapter. */
  onOpenRecent: (place: { book: number; chapter: number }) => void;
  onBack: () => void;
}

type Row = { kind: 'header'; key: string; title: string } | { kind: 'book'; key: string; book: Book };

const HEADER_H = 44;
const ROW_H = 50;

/** Book list that opens scrolled to the book being read. */
export function BooksScreen({ books, current, onPick, onOpenBookmarks, bookmarkCount, onOpenRecent, onBack }: Props) {
  const theme = useTheme();
  const t = useT();
  const { settings } = useSettings();
  const listRef = useRef<FlatList<Row>>(null);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const [testament, title] of [['OT', t('oldTestament')], ['NT', t('newTestament')]] as const) {
      out.push({ kind: 'header', key: testament, title });
      for (const book of books.filter((b) => b.testament === testament)) out.push({ kind: 'book', key: String(book.id), book });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, settings.language]);

  const offsets = useMemo(() => {
    const out: number[] = [];
    let y = 0;
    for (const row of rows) {
      out.push(y);
      y += row.kind === 'header' ? HEADER_H : ROW_H;
    }
    return out;
  }, [rows]);

  // Recently read chapters other than the one open now.
  const allRecent = usePlace(selectRecent);
  const position = usePlace(selectPosition);
  const recent = allRecent.filter((r) => r.book !== position.book || r.chapter !== position.chapter);

  const currentIndex = rows.findIndex((r) => r.kind === 'book' && r.book.id === current);
  const initialIndex = Math.max(0, currentIndex - 3);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={t('books')} onBack={onBack} />
      <Pressable
        onPress={onOpenBookmarks}
        style={({ pressed }) => [styles.bookmarks, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
        accessibilityRole="button"
      >
        <Text style={[styles.name, { color: theme.accent, fontWeight: '600' }]} numberOfLines={1}>{t('savedRow')}</Text>
        <Text style={[styles.count, { color: theme.muted }]}>{bookmarkCount}</Text>
      </Pressable>
      {recent.length > 0 ? (
        <View style={[styles.recent, { borderBottomColor: theme.border }]}>
          <Text style={[styles.recentLabel, { color: theme.muted }]}>{t('recent')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {recent.map((r) => (
              <Pressable
                key={`${r.book}:${r.chapter}`}
                onPress={() => onOpenRecent(r)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.chip, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
              >
                <Text style={[styles.chipText, { color: theme.text }]}>{`${bookName(books, r.book, settings.translation)} ${r.chapter}`}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => r.key}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: rows[index].kind === 'header' ? HEADER_H : ROW_H, offset: offsets[index], index })}
        onScrollToIndexFailed={() => listRef.current?.scrollToOffset({ offset: offsets[initialIndex] ?? 0, animated: false })}
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return <Text style={[styles.section, { color: theme.muted, backgroundColor: theme.bg }]}>{item.title.toUpperCase()}</Text>;
          }
          const active = item.book.id === current;
          return (
            <Pressable
              onPress={() => onPick(item.book)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: theme.border, backgroundColor: pressed || active ? theme.accentSoft : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.name, { color: theme.text, fontWeight: active ? '700' : '400' }]}>{bookName(books, item.book.id, settings.translation)}</Text>
              <Text style={[styles.count, { color: theme.muted }]}>{item.book.chapters}</Text>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: { height: HEADER_H, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 6 },
  row: {
    height: ROW_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bookmarks: {
    height: ROW_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recent: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  recentLabel: { fontSize: 13, fontWeight: '600' },
  recentRow: { gap: 8, paddingRight: 18 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontSize: 15 },
  name: { fontSize: 17 },
  count: { fontSize: 15, fontVariant: ['tabular-nums'] },
});
