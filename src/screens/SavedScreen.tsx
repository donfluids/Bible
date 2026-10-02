import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { useT } from '../i18n';
import { VerseText } from '../components/VerseText';
import { getVerses } from '../queries';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, formatRef } from '../text';
import { useTheme } from '../theme';
import type { Book, Ref, VerseRow, WordPick } from '../types';

interface Props {
  books: Book[];
  onOpenRef: (ref: Ref) => void;
  onWord: (pick: WordPick) => void;
  onBack: () => void;
}

type Saved = { kind: 'bookmark' | 'highlight' | 'note'; ref: Ref; key: string; color?: string; note?: string; order: number };

const keyOf = (r: Ref) => `${r.book}:${r.chapter}:${r.verse}`;
const parseKey = (key: string): Ref => {
  const [book, chapter, verse] = key.split(':').map(Number);
  return { book, chapter, verse };
};

/** Bookmarks, highlighted verses and notes, each in its own section, newest or latest first. */
export function SavedScreen({ books, onOpenRef, onWord, onBack }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const t = useT();
  const { settings, update } = useSettings();
  const [verses, setVerses] = useState<Map<string, VerseRow>>(new Map());

  const sections = useMemo(() => {
    const canon = (r: Ref) => r.book * 1000000 + r.chapter * 1000 + r.verse;
    const bookmarks: Saved[] = [...settings.bookmarks]
      .sort((a, b) => b.added - a.added)
      .map((b) => ({ kind: 'bookmark', ref: b, key: keyOf(b), order: b.added }));
    const highlights: Saved[] = Object.entries(settings.highlights)
      .map(([key, color]) => ({ kind: 'highlight' as const, ref: parseKey(key), key, color, order: 0 }))
      .sort((a, b) => canon(a.ref) - canon(b.ref));
    const notes: Saved[] = Object.entries(settings.notes)
      .map(([key, note]) => ({ kind: 'note' as const, ref: parseKey(key), key, note, order: 0 }))
      .sort((a, b) => canon(a.ref) - canon(b.ref));
    return [
      { title: t('bookmarks'), data: bookmarks },
      { title: t('highlights'), data: highlights },
      { title: t('notes'), data: notes },
    ].filter((s) => s.data.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.bookmarks, settings.highlights, settings.notes, settings.language]);

  useEffect(() => {
    let cancelled = false;
    const refs = new Map<string, Ref>();
    for (const s of sections) for (const item of s.data) refs.set(item.key, item.ref);
    getVerses(db, settings.translation, [...refs.values()])
      .then((rows) => {
        if (!cancelled) setVerses(new Map(rows.map((r) => [keyOf(r), r])));
      })
      .catch(() => undefined); // the list still shows each reference without its text
    return () => {
      cancelled = true;
    };
  }, [db, settings.translation, sections]);

  const remove = (item: Saved) => {
    if (item.kind === 'bookmark') update({ bookmarks: settings.bookmarks.filter((b) => keyOf(b) !== item.key) });
    else if (item.kind === 'highlight') {
      const next = { ...settings.highlights };
      delete next[item.key];
      update({ highlights: next });
    } else {
      const next = { ...settings.notes };
      delete next[item.key];
      update({ notes: next });
    }
  };

  const listFont = Math.min(settings.fontSize, 18);
  const empty = sections.length === 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={t('saved')} onBack={onBack} />
      {empty ? (
        <Text style={[styles.empty, { color: theme.muted }]}>{t('nothingSaved')}</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.kind}:${item.key}`}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <Text style={[styles.section, { color: theme.muted, backgroundColor: theme.bg }]}>{section.title.toUpperCase()}</Text>
          )}
          renderItem={({ item }) => {
            const verse = verses.get(item.key);
            const color = item.color ? theme.marks[item.color as keyof typeof theme.marks] : undefined;
            return (
              <Pressable
                onPress={() => onOpenRef(item.ref)}
                style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
              >
                <View style={styles.refRow}>
                  <Text style={[styles.ref, { color: theme.accent }]}>
                    {color ? <Text style={{ backgroundColor: color }}>  </Text> : null}
                    {color ? ' ' : ''}
                    {formatRef(books, item.ref, settings.translation)}
                  </Text>
                  <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('remove')}>
                    <Text style={[styles.remove, { color: theme.muted }]}>{t('remove')}</Text>
                  </Pressable>
                </View>
                {item.note ? <Text style={[styles.note, { color: theme.text }]}>{item.note}</Text> : null}
                {verse ? (
                  <VerseText verse={verse} fontSize={listFont} onWord={onWord} underline={false} showNumber={false} numberOfLines={3} />
                ) : null}
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
  list: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  empty: { padding: 24, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ref: { fontSize: 14, fontWeight: '700' },
  remove: { fontSize: 13 },
  note: { fontSize: 15, lineHeight: 21, marginBottom: 6, fontStyle: 'italic' },
});
