import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Header } from '../components/Header';
import { Icon } from '../components/Icon';
import { TabBar } from '../components/TabBar';
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
  /** Go back to a recently read chapter. */
  onOpenRecent: (place: { book: number; chapter: number }) => void;
}

const ROW_H = 50;
/** Recently read chapters shown above the list; the reader keeps more. */
const MAX_RECENT = 4;

/**
 * The book list, one testament at a time, opening on the testament and book being read.
 * Above it, the chapters read lately, to go back to.
 */
export function BooksScreen({ books, current, onPick, onOpenRecent }: Props) {
  const theme = useTheme();
  const t = useT();
  const { settings } = useSettings();

  const currentTestament = books.find((b) => b.id === current)?.testament ?? 'OT';
  const [testament, setTestament] = useState<'OT' | 'NT'>(currentTestament);
  const shown = useMemo(() => books.filter((b) => b.testament === testament), [books, testament]);
  const counts = useMemo(() => ({ OT: books.filter((b) => b.testament === 'OT').length, NT: books.filter((b) => b.testament === 'NT').length }), [books]);

  // Recently read chapters other than the one open now.
  const allRecent = usePlace(selectRecent);
  const position = usePlace(selectPosition);
  const recent = allRecent.filter((r) => r.book !== position.book || r.chapter !== position.chapter).slice(0, MAX_RECENT);

  const currentIndex = shown.findIndex((b) => b.id === current);
  const initialIndex = Math.max(0, currentIndex - 3);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={t('books')} />
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
      <View style={[styles.switch, { backgroundColor: theme.accentSoft }]} accessibilityRole="tablist">
        {(['OT', 'NT'] as const).map((id) => {
          const on = id === testament;
          return (
            <Pressable
              key={id}
              onPress={() => setTestament(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.segment, on && { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.segmentText, { color: on ? theme.onAccent : theme.accent, fontWeight: on ? '700' : '500' }]} numberOfLines={1}>
                {t(id === 'OT' ? 'oldTestament' : 'newTestament')}
                <Text style={styles.segmentCount}>{`  ${counts[id]}`}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        // A new list for each testament, so it opens at its own start or at the current book.
        key={testament}
        data={shown}
        keyExtractor={(b) => String(b.id)}
        initialScrollIndex={testament === currentTestament ? initialIndex : 0}
        getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
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
              <Text style={[styles.name, { color: theme.text, fontWeight: active ? '700' : '400' }]}>{bookName(books, item.id, settings.translation)}</Text>
              <Text style={[styles.count, { color: theme.muted }]}>{item.chapters}</Text>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.listEnd}
      />
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
  segment: { flex: 1, minHeight: 40, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentText: { fontSize: 15 },
  segmentCount: { fontSize: 12, fontWeight: '400' },
  row: {
    height: ROW_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listEnd: { paddingBottom: 24 },
  name: { fontSize: 17 },
  count: { fontSize: 15, fontVariant: ['tabular-nums'] },
});
