import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '../components/Pressable';
import { Header } from '../components/Header';
import { Icon } from '../components/Icon';
import { TabBar } from '../components/TabBar';
import { useT } from '../i18n';
import { selectPosition, selectRecent, usePlace } from '../place';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, bookName } from '../text';
import { useTheme } from '../theme';
import type { Book } from '../types';

interface Props {
  books: Book[];
  current: number;
  onPick: (book: Book) => void;
  /** Go back to a recently read chapter. */
  onOpenRecent: (place: { book: number; chapter: number }) => void;
}

const ROW_H = 50;
/** A row of the two-column list: a name on two lines if need be. */
const PAIR_ROW_H = 56;
/** Recently read chapters shown above the list; the reader keeps more. */
const MAX_RECENT = 4;

type View3 = 'ALL' | 'OT' | 'NT';

/**
 * The book list: all 66 at once, the Old Testament down the left and the New down the
 * right, or one Testament at a time with the switch above. It opens at the book being
 * read. Above it, the chapters read lately, to go back to.
 */
export function BooksScreen({ books, current, onPick, onOpenRecent }: Props) {
  const theme = useTheme();
  const t = useT();
  const { settings } = useSettings();

  const currentTestament = books.find((b) => b.id === current)?.testament ?? 'OT';
  const [view, setView] = useState<View3>('ALL');
  const old = useMemo(() => books.filter((b) => b.testament === 'OT'), [books]);
  const fresh = useMemo(() => books.filter((b) => b.testament === 'NT'), [books]);
  const counts = { ALL: books.length, OT: old.length, NT: fresh.length };
  const shown = view === 'OT' ? old : fresh;
  // In the two-column view, row i holds the i-th book of each Testament.
  const pairs = useMemo(() => old.map((left, i) => ({ left, right: fresh[i] as Book | undefined })), [old, fresh]);

  // Recently read chapters other than the one open now.
  const allRecent = usePlace(selectRecent);
  const position = usePlace(selectPosition);
  const recent = allRecent.filter((r) => r.book !== position.book || r.chapter !== position.chapter).slice(0, MAX_RECENT);

  // The list opens a few rows above the book being read.
  const currentRow = (view === 'ALL' ? (currentTestament === 'OT' ? old : fresh) : shown).findIndex((b) => b.id === current);
  const initialIndex = view === 'ALL' || view === currentTestament ? Math.max(0, currentRow - 3) : 0;
  const rowHeight = view === 'ALL' ? PAIR_ROW_H : ROW_H;

  const name = (b: Book) => bookName(books, b.id, settings.translation);
  const cell = (b: Book | undefined, side: 'left' | 'right') => {
    if (!b) return <View style={styles.cell} />;
    const active = b.id === current;
    return (
      <Pressable
        onPress={() => onPick(b)}
        android_ripple={{ color: theme.accentSoft }}
        style={({ pressed }) => [
          styles.cell,
          side === 'left' && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border },
          { backgroundColor: pressed || active ? theme.accentSoft : 'transparent' },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text numberOfLines={2} style={[styles.cellName, { color: theme.text, fontWeight: active ? '700' : '400' }]}>{name(b)}</Text>
        <Text style={[styles.cellCount, { color: theme.muted }]}>{b.chapters}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={t('books')} />
      {/* On a tablet the list keeps to the reading width. */}
      <View style={styles.column}>
      {recent.length > 0 ? (
        <View style={styles.recent}>
          <View style={styles.recentHead}>
            <Icon name="history" size={18} color={theme.muted} />
            <Text style={[styles.recentLabel, { color: theme.muted }]}>{t('recent')}</Text>
          </View>
          <View style={styles.recentRow}>
            {recent.map((r) => (
              <Pressable
                key={`${r.book}:${r.chapter}`}
                onPress={() => onOpenRecent(r)}
                accessibilityRole="button"
                android_ripple={{ color: theme.accentSoft }}
                style={({ pressed }) => [styles.chip, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : theme.card }]}
              >
                <Text style={[styles.chipText, { color: theme.text }]} numberOfLines={1}>{`${bookName(books, r.book, settings.translation)} ${r.chapter}`}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {/* All books, or one Testament: a filter on the list. */}
      <View style={[styles.switch, { backgroundColor: theme.accentSoft }]} accessibilityRole="tablist">
        {(['ALL', 'OT', 'NT'] as const).map((id) => {
          const on = id === view;
          return (
            <Pressable
              key={id}
              onPress={() => setView(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.segment, on && { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.segmentText, { color: on ? theme.onAccent : theme.accent, fontWeight: on ? '700' : '500' }]} numberOfLines={2}>
                {t(id === 'ALL' ? 'all' : id === 'OT' ? 'oldTestament' : 'newTestament')}
                <Text style={styles.segmentCount}>{`  ${counts[id]}`}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>
      {view === 'ALL' ? (
        <FlatList
          key="all"
          data={pairs}
          keyExtractor={(p) => String(p.left.id)}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
          renderItem={({ item }) => (
            <View style={[styles.pairRow, { borderBottomColor: theme.border }]}>
              {cell(item.left, 'left')}
              {cell(item.right, 'right')}
            </View>
          )}
          contentContainerStyle={styles.listEnd}
        />
      ) : (
        <FlatList
          // A new list for each Testament, so it opens at its own start or at the current book.
          key={view}
          data={shown}
          keyExtractor={(b) => String(b.id)}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
          renderItem={({ item }) => {
            const active = item.id === current;
            return (
              <Pressable
                onPress={() => onPick(item)}
                android_ripple={{ color: theme.accentSoft }}
                style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed || active ? theme.accentSoft : 'transparent' }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.name, { color: theme.text, fontWeight: active ? '700' : '400' }]}>{name(item)}</Text>
                <Text style={[styles.count, { color: theme.muted }]}>{item.chapters}</Text>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.listEnd}
        />
      )}
      </View>
      <TabBar current="Books" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  recent: { paddingHorizontal: 16, paddingBottom: 10, gap: 6 },
  recentHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentLabel: { fontSize: 13, fontWeight: '600' },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, maxWidth: '100%', paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, justifyContent: 'center', overflow: 'hidden' },
  chipText: { fontSize: 15 },
  switch: { flexDirection: 'row', marginHorizontal: 16, marginTop: 2, marginBottom: 8, borderRadius: 22, padding: 4 },
  segment: { flex: 1, minHeight: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segmentText: { fontSize: 14, textAlign: 'center' },
  segmentCount: { fontSize: 12, fontWeight: '400' },
  row: {
    height: ROW_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pairRow: { height: PAIR_ROW_H, flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, paddingRight: 10 },
  cellName: { flex: 1, fontSize: 15, lineHeight: 19 },
  cellCount: { fontSize: 13, fontVariant: ['tabular-nums'] },
  listEnd: { paddingBottom: 24 },
  column: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  name: { fontSize: 17 },
  count: { fontSize: 15, fontVariant: ['tabular-nums'] },
});
