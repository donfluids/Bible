import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { VerseText } from '../components/VerseText';
import { getVerses } from '../queries';
import { useSettings } from '../settings';
import { formatRef } from '../text';
import { useTheme } from '../theme';
import type { Book, Bookmark, Ref, VerseRow, WordPick } from '../types';

interface Props {
  books: Book[];
  onOpenRef: (ref: Ref) => void;
  onWord: (pick: WordPick) => void;
  onBack: () => void;
}

/** Saved verses, newest first, shown in the current translation. */
export function BookmarksScreen({ books, onOpenRef, onWord, onBack }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings, update } = useSettings();
  const [verses, setVerses] = useState<Map<string, VerseRow>>(new Map());

  const sorted = [...settings.bookmarks].sort((a, b) => b.added - a.added);

  useEffect(() => {
    let cancelled = false;
    getVerses(db, settings.translation, sorted).then((rows) => {
      if (!cancelled) setVerses(new Map(rows.map((r) => [`${r.book}:${r.chapter}:${r.verse}`, r])));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, settings.translation, settings.bookmarks]);

  const remove = (b: Bookmark) =>
    update({ bookmarks: settings.bookmarks.filter((x) => !(x.book === b.book && x.chapter === b.chapter && x.verse === b.verse)) });

  const listFont = Math.min(settings.fontSize, 18);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title="Bookmarks" onBack={onBack} />
      {sorted.length === 0 ? (
        <Text style={[styles.empty, { color: theme.muted }]}>No bookmarks yet. Hold a verse in the reader and choose Bookmark.</Text>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(b) => `${b.book}:${b.chapter}:${b.verse}`}
          renderItem={({ item }) => {
            const verse = verses.get(`${item.book}:${item.chapter}:${item.verse}`);
            return (
              <Pressable
                onPress={() => onOpenRef(item)}
                style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
              >
                <View style={styles.refRow}>
                  <Text style={[styles.ref, { color: theme.accent }]}>{formatRef(books, item)}</Text>
                  <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Remove bookmark">
                    <Text style={[styles.remove, { color: theme.muted }]}>Remove</Text>
                  </Pressable>
                </View>
                {verse ? <VerseText verse={verse} fontSize={listFont} onWord={onWord} underline={false} showNumber={false} numberOfLines={4} /> : null}
              </Pressable>
            );
          }}
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  empty: { padding: 24, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ref: { fontSize: 14, fontWeight: '700' },
  remove: { fontSize: 13 },
});
