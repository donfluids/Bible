import React, { useMemo, useState } from 'react';
import { FlatList, PixelRatio, StyleSheet, Text, View } from 'react-native';
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
import { translationInfo } from '../types';
import type { Book } from '../types';

interface Props {
  books: Book[];
  current: number;
  onPick: (book: Book) => void;
  /** Go back to a recently read chapter. */
  onOpenRecent: (place: { book: number; chapter: number }) => void;
}

/** A row of the two-column list: a name on two lines if need be. */
const PAIR_ROW_H = 56;
/** The two-column names' size; Malayalam, Tamil and Hindi lines get more height for their vowel signs. */
const CELL_SIZE = 15;
/** Recently read chapters in the clock's sheet (the reader keeps eight, the open one among them). */
const MAX_RECENT = 7;

/**
 * The book list: all 66 at once, the Old Testament down the left and the New down the
 * right; names only. It opens at the book being read. The clock in the title bar lists the chapters read lately, to go back to.
 */
export function BooksScreen({ books, current, onPick, onOpenRecent }: Props) {
  const theme = useTheme();
  const t = useT();
  const { settings } = useSettings();

  const currentTestament = books.find((b) => b.id === current)?.testament ?? 'OT';
  const [showRecent, setShowRecent] = useState(false);
  const old = useMemo(() => books.filter((b) => b.testament === 'OT'), [books]);
  const fresh = useMemo(() => books.filter((b) => b.testament === 'NT'), [books]);
  // In the two-column view, row i holds the i-th book of each Testament.
  const pairs = useMemo(() => old.map((left, i) => ({ left, right: fresh[i] as Book | undefined })), [old, fresh]);

  // Recently read chapters other than the one open now.
  const allRecent = usePlace(selectRecent);
  const position = usePlace(selectPosition);
  const recent = allRecent.filter((r) => r.book !== position.book || r.chapter !== position.chapter).slice(0, MAX_RECENT);

  // The list opens a few rows above the book being read.
  const currentRow = (currentTestament === 'OT' ? old : fresh).findIndex((b) => b.id === current);
  const initialIndex = Math.max(0, currentRow - 3);
  // Rows have a fixed height (the list jumps to the open book), so they grow with the
  // phone's text size: a name of two lines must fit at Large text too.
  const scale = Math.max(1, PixelRatio.getFontScale());
  const cellLine = Math.round(CELL_SIZE * (translationInfo(settings.translation).script ? 1.5 : 1.27));
  const pairRowH = Math.max(PAIR_ROW_H, Math.ceil(2 * cellLine * scale + 12));
  const rowHeight = pairRowH;

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
        <Text style={[styles.cellName, { lineHeight: cellLine, color: theme.text, fontWeight: active ? '700' : '400' }]} numberOfLines={2}>
          {name(b)}
        </Text>
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
        <FlatList
          data={pairs}
          keyExtractor={(p) => String(p.left.id)}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
          renderItem={({ item }) => (
            <View style={[styles.pairRow, { height: pairRowH, borderBottomColor: theme.border }]}>
              {cell(item.left, 'left')}
              {cell(item.right, 'right')}
            </View>
          )}
          contentContainerStyle={styles.listEnd}
        />
      </View>
      <TabBar current="Books" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pairRow: { height: PAIR_ROW_H, flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  cellName: { fontSize: CELL_SIZE },
  listEnd: { paddingBottom: 24 },
  column: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
});
