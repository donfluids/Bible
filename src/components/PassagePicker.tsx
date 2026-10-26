import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { shortBookName } from '../shortNames';
import { scriptOf, scriptureFont } from '../fonts';
import { useT } from '../i18n';
import type { StringKey } from '../i18n';
import { useSettings } from '../settings';
import { bookName } from '../text';
import { useTheme } from '../theme';
import type { Book, TranslationId } from '../types';
import { Pressable } from './Pressable';
import { Segmented } from './Segmented';
import { SimpleSheet } from './SimpleSheet';

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

/** The books in their traditional groups, so a book is found by where it sits. */
const GROUPS: { label: StringKey; testament: 'OT' | 'NT'; from: number; to: number }[] = [
  { label: 'groupLaw', testament: 'OT', from: 1, to: 5 },
  { label: 'groupHistory', testament: 'OT', from: 6, to: 17 },
  { label: 'groupPoetry', testament: 'OT', from: 18, to: 22 },
  { label: 'groupProphets', testament: 'OT', from: 23, to: 39 },
  { label: 'groupGospels', testament: 'NT', from: 40, to: 43 },
  { label: 'groupActs', testament: 'NT', from: 44, to: 44 },
  { label: 'groupLetters', testament: 'NT', from: 45, to: 65 },
  { label: 'groupRevelation', testament: 'NT', from: 66, to: 66 },
];

/**
 * The passage picker, from the reader's title: a sheet with the Testament, the books as a
 * grid of short names in Bible order under their groups (Law, History…; Gospels, Letters…),
 * then the book's chapter numbers. Two taps from any chapter to any other.
 */
export function PassagePicker({ visible, books, translation, current, lastChapters, onPick, onClose }: Props) {
  const theme = useTheme();
  const t = useT();
  const { settings } = useSettings();
  const { width } = useWindowDimensions();
  const [testament, setTestament] = useState<'OT' | 'NT'>(current.book <= 39 ? 'OT' : 'NT');
  const [book, setBook] = useState<number | null>(null);
  // Each opening starts at the chapter being read: its Testament, its book's chapters.
  useEffect(() => {
    if (visible) {
      setTestament(current.book <= 39 ? 'OT' : 'NT');
      setBook(current.book);
    }
  }, [visible, current.book]);
  const chosen = book ? books.find((b) => b.id === book) : undefined;
  const name = chosen ? bookName(books, chosen.id, translation) : '';
  const nameFont = scriptureFont(scriptOf(name), settings.serif, true);
  const shortFont = scriptureFont(scriptOf(shortBookName(1, translation)), settings.serif, true);
  // Columns of short names: 4 on a phone, more on a tablet; chapter cells at least 48 points.
  const inner = Math.min(width, 720) - 40;
  const bookColumns = Math.max(4, Math.min(6, Math.floor(inner / 84)));
  const chapterColumns = Math.max(5, Math.floor((inner + 8) / 56));
  const groups = useMemo(() => GROUPS.filter((g) => g.testament === testament), [testament]);
  return (
    <SimpleSheet visible={visible} title={chosen ? name : t('choosePassageTitle')} onClose={onClose}>
      <View style={styles.body}>
        {chosen ? (
          <>
            <Pressable onPress={() => setBook(null)} accessibilityRole="button" style={styles.backRow} hitSlop={6}>
              <Text style={[styles.backText, { color: theme.accent }]}>{t('allBooks')}</Text>
            </Pressable>
            <View style={styles.grid}>
              {Array.from({ length: chosen.chapters }, (_, i) => i + 1).map((c) => {
                const active = chosen.id === current.book && c === current.chapter;
                const last = !active && lastChapters[chosen.id] === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => onPick(chosen.id, c)}
                    android_ripple={{ color: theme.accentSoft }}
                    accessibilityRole="button"
                    accessibilityLabel={`${name} ${c}`}
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.cell,
                      { width: `${100 / chapterColumns}%` as `${number}%` },
                    ]}
                  >
                    <View style={[styles.cellInner, { borderColor: active ? theme.accent : last ? theme.accent : theme.border, backgroundColor: active ? theme.accent : last ? theme.accentSoft : theme.bg }]}>
                      <Text style={[styles.cellText, { color: active ? theme.onAccent : theme.text }]}>{c}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Segmented
              options={[
                ['OT', t('oldTestament')],
                ['NT', t('newTestament')],
              ]}
              value={testament}
              onChange={setTestament}
            />
            {groups.map((g) => (
              <View key={g.label} style={styles.group}>
                <Text style={[styles.groupLabel, { color: theme.muted }]}>{t(g.label)}</Text>
                <View style={styles.grid}>
                  {books
                    .filter((b) => b.id >= g.from && b.id <= g.to)
                    .map((b) => {
                      const active = b.id === current.book;
                      const full = bookName(books, b.id, translation);
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => setBook(b.id)}
                          android_ripple={{ color: theme.accentSoft }}
                          accessibilityRole="button"
                          accessibilityLabel={full}
                          accessibilityState={{ selected: active }}
                          style={[styles.cell, { width: `${100 / bookColumns}%` as `${number}%` }]}
                        >
                          <View style={[styles.cellInner, { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accent : theme.bg }]}>
                            <Text
                              numberOfLines={1}
                              style={[styles.bookText, { color: active ? theme.onAccent : theme.text }, shortFont ? { fontFamily: shortFont, fontWeight: 'normal' } : null]}
                            >
                              {shortBookName(b.id, translation) || full}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </SimpleSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  backRow: { minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 15, fontWeight: '600' },
  group: { gap: 6 },
  groupLabel: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { padding: 4 },
  cellInner: { minHeight: 44, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cellText: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  bookText: { fontSize: 15, fontWeight: '600' },
});
