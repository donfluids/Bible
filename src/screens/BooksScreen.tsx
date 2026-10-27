import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '../components/Pressable';
import { Header } from '../components/Header';
import { IconButton } from '../components/Icon';
import { SheetAction, SimpleSheet } from '../components/SimpleSheet';
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
/** Recently read chapters in the clock's sheet (the reader keeps eight, the open one among them). */
const MAX_RECENT = 7;

type View3 = 'ALL' | 'OT' | 'NT';

/**
 * The book list: all 66 at once, the Old Testament down the left and the New down the
 * right, or one Testament at a time with the switch above; names only. It opens at the book being
 * read. The clock in the title bar lists the chapters read lately, to go back to.
 */
export function BooksScreen({ books, current, onPick, onOpenRecent }: Props) {
  const theme = useTheme();
  const t = useT();
  const { settings } = useSettings();

  const currentTestament = books.find((b) => b.id === current)?.testament ?? 'OT';
  const [view, setView] = useState<View3>('ALL');
  const [showRecent, setShowRecent] = useState(false);
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
        <Text style={[styles.cellName, { color: theme.text, fontWeight: active ? '700' : '400' }]}>{name(b)}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {/* The chapters read lately, behind a clock in the title bar, so the list starts at the top. */}
      <Header
        title={t('books')}
        right={recent.length > 0 ? <IconButton name="history" onPress={() => setShowRecent(true)} accessibilityLabel={t('recent')} color={theme.text} /> : undefined}
      />
      <SimpleSheet visible={showRecent} title={t('recent')} onClose={() => setShowRecent(false)}>
        {recent.map((r) => (
          <SheetAction
            key={`${r.book}:${r.chapter}`}
            icon="history"
            label={`${bookName(books, r.book, settings.translation)} ${r.chapter}`}
            onPress={() => {
              setShowRecent(false);
              onOpenRecent(r);
            }}
          />
        ))}
      </SimpleSheet>
      {/* On a tablet the list keeps to the reading width. */}
      <View style={styles.column}>
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
              <Text style={[styles.segmentText, { color: on ? theme.onAccent : theme.accent, fontWeight: on ? '700' : '500' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {t(id === 'ALL' ? 'all' : id === 'OT' ? 'oldTestament' : 'newTestament')}
              </Text>
              <Text style={[styles.segmentCount, { color: on ? theme.onAccent : theme.accent }]}>{counts[id]}</Text>
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
  switch: { flexDirection: 'row', marginHorizontal: 16, marginTop: 2, marginBottom: 8, borderRadius: 24, padding: 4 },
  segment: { flex: 1, minHeight: 48, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 4 },
  segmentText: { fontSize: 13, textAlign: 'center' },
  segmentCount: { fontSize: 12, fontWeight: '400', opacity: 0.85 },
  row: {
    height: ROW_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pairRow: { height: PAIR_ROW_H, flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  cellName: { fontSize: 15, lineHeight: 19 },
  listEnd: { paddingBottom: 24 },
  column: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  name: { fontSize: 17 },
});
