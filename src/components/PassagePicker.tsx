import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, PixelRatio, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { bookName } from '../text';
import { useTheme } from '../theme';
import type { Book, TranslationId } from '../types';
import { IconButton } from './Icon';
import { Pressable } from './Pressable';

interface Props {
  visible: boolean;
  books: Book[];
  translation: TranslationId;
  /** The chapter open now, shown chosen. */
  current: { book: number; chapter: number };
  /** The chapter last read in each book, so a book opens where it was left. */
  lastChapters: Record<string, number>;
  onPick: (book: number, chapter: number) => void;
  onClose: () => void;
}

/** A book's row: a name on up to two lines. */
const ROW = 46;
/** Rows the panel shows without scrolling, about. */
const VISIBLE_ROWS = 8;

/**
 * The passage picker, from the reader's title: a panel that drops from the top with three
 * columns side by side, the Old Testament's books, the New Testament's, and the chapters
 * of the book chosen, as on the Books tab. A tap on a book shows its chapters beside it, a
 * tap on a chapter goes there. The verses being read stay in view below the panel.
 */
export function PassagePicker({ visible, books, translation, current, lastChapters, onPick, onClose }: Props) {
  if (!visible) return null;
  return <Panel books={books} translation={translation} current={current} lastChapters={lastChapters} onPick={onPick} onClose={onClose} />;
}

function Panel({ books, translation, current, lastChapters, onPick, onClose }: Omit<Props, 'visible'>) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [book, setBook] = useState(current.book);
  const old = useMemo(() => books.filter((b) => b.testament === 'OT'), [books]);
  const fresh = useMemo(() => books.filter((b) => b.testament === 'NT'), [books]);
  const chosen = books.find((b) => b.id === book);
  const rowH = Math.ceil(ROW * Math.max(1, PixelRatio.getFontScale()));
  const oldList = useRef<ScrollView>(null);
  const newList = useRef<ScrollView>(null);

  // Both columns open at the top, side by side as on the Books tab; only a book further down
  // than the panel shows is brought into view, a couple of rows down.
  useEffect(() => {
    const list = current.book <= old.length ? oldList : newList;
    const index = (current.book <= old.length ? old : fresh).findIndex((b) => b.id === current.book);
    if (index < VISIBLE_ROWS) return;
    const timer = setTimeout(() => list.current?.scrollTo({ y: (index - 2) * rowH, animated: false }), 0);
    return () => clearTimeout(timer);
  }, [current.book, old, fresh, rowH]);

  // Android's back button closes the panel.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const column = (list: Book[], ref: React.RefObject<ScrollView | null>, last: boolean) => (
    <ScrollView ref={ref} style={[styles.column, !last && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border }]}>
      {list.map((b) => {
        const on = b.id === book;
        const name = bookName(books, b.id, translation);
        return (
          <Pressable
            key={b.id}
            onPress={() => setBook(b.id)}
            android_ripple={{ color: theme.accentSoft }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.book, { height: rowH, borderBottomColor: theme.border, backgroundColor: on ? theme.accentSoft : 'transparent' }]}
          >
            <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.bookText, { color: theme.text, fontWeight: on ? '700' : '400' }]}>
              {name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')} style={[StyleSheet.absoluteFill, styles.backdrop]} />
      <View
        accessibilityViewIsModal
        style={[styles.panel, { paddingTop: insets.top + 4, height: insets.top + Math.max(320, height * 0.58), backgroundColor: theme.bg, shadowColor: '#000' }]}
      >
        <View style={styles.head}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {chosen ? bookName(books, chosen.id, translation) : t('choosePassageTitle')}
          </Text>
          <IconButton name="close" onPress={onClose} accessibilityLabel={t('close')} color={theme.text} />
        </View>
        <View style={[styles.columns, { borderTopColor: theme.border }]}>
          {column(old, oldList, false)}
          {column(fresh, newList, false)}
          <ScrollView style={styles.chapters} contentContainerStyle={styles.grid}>
            {chosen
              ? Array.from({ length: chosen.chapters }, (_, i) => i + 1).map((c) => {
                  const active = chosen.id === current.book && c === current.chapter;
                  const last = !active && lastChapters[chosen.id] === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => onPick(chosen.id, c)}
                      android_ripple={{ color: theme.accentSoft }}
                      accessibilityRole="button"
                      accessibilityLabel={`${bookName(books, chosen.id, translation)} ${c}`}
                      accessibilityState={{ selected: active }}
                      style={styles.cell}
                    >
                      <View style={[styles.cellInner, { borderColor: active || last ? theme.accent : theme.border, backgroundColor: active ? theme.accent : last ? theme.accentSoft : theme.bg }]}>
                        <Text style={[styles.cellText, { color: active ? theme.onAccent : theme.text }]}>{c}</Text>
                      </View>
                    </Pressable>
                  );
                })
              : null}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.3)' },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 4, minHeight: 48 },
  title: { fontSize: 18, fontWeight: '600', flex: 1 },
  columns: { flex: 1, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  column: { flex: 1.1 },
  book: { justifyContent: 'center', paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  bookText: { fontSize: 14, lineHeight: 18 },
  chapters: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 4, paddingBottom: 16 },
  cell: { width: '33.333%', padding: 3 },
  cellInner: { minHeight: 40, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
