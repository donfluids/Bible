import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { IconButton, Icon } from '../components/Icon';
import { SectionLabel } from '../components/SectionLabel';
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
  // Lists run under the system navigation bar; the last row must clear it.
  const insets = useSafeAreaInsets();
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
        <View style={styles.emptyBox}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
            <Icon name="bookmarks" size={36} color={theme.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('nothingSavedTitle')}</Text>
          <Text style={[styles.empty, { color: theme.muted }]}>{t('nothingSaved')}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.kind}:${item.key}`}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <SectionLabel text={section.title} style={[styles.section, { backgroundColor: theme.bg }]} />
          )}
          renderItem={({ item }) => {
            const verse = verses.get(item.key);
            const color = item.color ? theme.marks[item.color as keyof typeof theme.marks] : undefined;
            return (
              <Pressable
                onPress={() => onOpenRef(item.ref)}
                android_ripple={{ color: theme.accentSoft }}
                style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
              >
                <View style={styles.refRow}>
                  <Text style={[styles.ref, { color: theme.accent }]}>
                    {color ? <Text style={{ backgroundColor: color }}>  </Text> : null}
                    {color ? ' ' : ''}
                    {formatRef(books, item.ref, settings.translation)}
                  </Text>
                  <IconButton name="delete" onPress={() => remove(item)} accessibilityLabel={t('remove')} size={22} style={styles.remove} />
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
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingBottom: 96 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
  empty: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36 },
  ref: { fontSize: 14, fontWeight: '700' },
  remove: { marginRight: -12, marginVertical: -6 },
  note: { fontSize: 15, lineHeight: 21, marginBottom: 6, fontStyle: 'italic' },
});
