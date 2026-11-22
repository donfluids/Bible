import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '../components/Pressable';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { TAB_BAR_HEIGHT, TabBar } from '../components/TabBar';
import { Toast, useToast } from '../components/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { scriptureFont } from '../fonts';
import { useT } from '../i18n';
import { VerseText } from '../components/VerseText';
import { getVerses } from '../queries';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, formatRef } from '../text';
import { useTheme } from '../theme';
import { translationInfo } from '../types';
import type { Book, HighlightColor, Ref, TextMark, TranslationId, VerseRow, WordPick } from '../types';

interface Props {
  books: Book[];
  onOpenRef: (ref: Ref) => void;
  onWord: (pick: WordPick) => void;
}

type Saved = { kind: 'bookmark' | 'highlight' | 'note' | 'mark'; ref: Ref; key: string; color?: string; note?: string; mark?: TextMark; order: number };

const keyOf = (r: Ref) => `${r.book}:${r.chapter}:${r.verse}`;
const parseKey = (key: string): Ref => {
  const [book, chapter, verse] = key.split(':').map(Number);
  return { book, chapter, verse };
};

/** The words a mark covers, from the verses of its translation. */
function markedWords(mark: TextMark, verses: Map<string, VerseRow>): string | null {
  const parts: string[] = [];
  for (let v = mark.from.verse; v <= mark.to.verse; v++) {
    const row = verses.get(`${mark.translation}:${mark.book}:${mark.chapter}:${v}`);
    if (!row) return null;
    const start = v === mark.from.verse ? mark.from.offset : 0;
    const end = v === mark.to.verse ? mark.to.offset : row.text.length;
    parts.push(row.text.slice(start, end));
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

type Tab = 'bookmark' | 'highlight' | 'note';
const COLOURS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];
const COLOUR_NAME = { yellow: 'colourYellow', green: 'colourGreen', blue: 'colourBlue', pink: 'colourPink' } as const;

/**
 * Bookmarks, highlights and notes, each in its own tab. Highlights holds the highlighted
 * verses and the marked text together, in Bible order, and can show one colour only.
 */
export function SavedScreen({ books, onOpenRef, onWord }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const t = useT();
  const { settings, update } = useSettings();
  const [verses, setVerses] = useState<Map<string, VerseRow>>(new Map());
  // Verses of marked text, keyed with their translation: a mark belongs to the Bible it was made in.
  const [markVerses, setMarkVerses] = useState<Map<string, VerseRow>>(new Map());

  const sections = useMemo(() => {
    const canon = (r: Ref) => r.book * 1000000 + r.chapter * 1000 + r.verse;
    const bookmarks: Saved[] = [...settings.bookmarks]
      .sort((a, b) => b.added - a.added)
      .map((b) => ({ kind: 'bookmark', ref: b, key: keyOf(b), order: b.added }));
    const highlights: Saved[] = Object.entries(settings.highlights)
      .map(([key, color]) => ({ kind: 'highlight' as const, ref: parseKey(key), key, color, order: 0 }))
      .sort((a, b) => canon(a.ref) - canon(b.ref));
    const marks: Saved[] = [...settings.marks]
      .map((m) => ({ kind: 'mark' as const, ref: { book: m.book, chapter: m.chapter, verse: m.from.verse }, key: m.id, color: m.color, mark: m, order: m.from.offset }))
      .sort((a, b) => canon(a.ref) - canon(b.ref) || a.order - b.order);
    const notes: Saved[] = Object.entries(settings.notes)
      .map(([key, note]) => ({ kind: 'note' as const, ref: parseKey(key), key, note, order: 0 }))
      .sort((a, b) => canon(a.ref) - canon(b.ref));
    const coloured = [...highlights, ...marks].sort((a, b) => canon(a.ref) - canon(b.ref) || a.order - b.order);
    return { bookmark: bookmarks, highlight: coloured, note: notes };
  }, [settings.bookmarks, settings.highlights, settings.marks, settings.notes]);
  const firstFull = (['bookmark', 'highlight', 'note'] as Tab[]).find((k) => sections[k].length > 0) ?? 'bookmark';
  const [tab, setTab] = useState<Tab>(firstFull);
  const [colour, setColour] = useState<HighlightColor | null>(null);
  const shownColours = COLOURS.filter((c) => sections.highlight.some((i) => i.color === c));
  // A colour filter holds only while its colour is there and the chips are shown: deleting
  // the last highlight of a colour must not leave an empty list with no way out.
  const chosen = colour && shownColours.length > 1 && shownColours.includes(colour) ? colour : null;
  const shown = tab === 'highlight' && chosen ? sections.highlight.filter((i) => i.color === chosen) : sections[tab];

  useEffect(() => {
    let cancelled = false;
    const refs = new Map<string, Ref>();
    for (const list of Object.values(sections)) for (const item of list) if (item.kind !== 'mark') refs.set(item.key, item.ref);
    getVerses(db, settings.translation, [...refs.values()])
      .then((rows) => {
        if (!cancelled) setVerses(new Map(rows.map((r) => [keyOf(r), r])));
      })
      .catch(() => undefined); // the list still shows each reference without its text
    return () => {
      cancelled = true;
    };
  }, [db, settings.translation, sections]);

  useEffect(() => {
    let cancelled = false;
    const wanted = new Map<TranslationId, Ref[]>();
    for (const m of settings.marks) {
      const list = wanted.get(m.translation) ?? [];
      for (let v = m.from.verse; v <= m.to.verse; v++) list.push({ book: m.book, chapter: m.chapter, verse: v });
      wanted.set(m.translation, list);
    }
    Promise.all([...wanted].map(([tr, refs]) => getVerses(db, tr, refs).then((rows) => rows.map((r) => [`${tr}:${keyOf(r)}`, r] as const))))
      .then((lists) => {
        if (!cancelled) setMarkVerses(new Map(lists.flat()));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [db, settings.marks]);

  // Taking an item out says so, with an undo that puts it back into the settings as they
  // are then (other changes made meanwhile stay).
  const latest = useRef(settings);
  latest.current = settings;
  const { toast, show } = useToast();
  const insets = useSafeAreaInsets();
  const remove = (item: Saved) => {
    if (item.kind === 'mark') {
      const mark = settings.marks.find((m) => m.id === item.key);
      update({ marks: settings.marks.filter((m) => m.id !== item.key) });
      if (mark) show(t('highlightRemoved'), () => {
        const now = latest.current.marks;
        if (!now.some((m) => m.id === mark.id)) update({ marks: [...now, mark] });
      });
    } else if (item.kind === 'bookmark') {
      const bookmark = settings.bookmarks.find((b) => keyOf(b) === item.key);
      update({ bookmarks: settings.bookmarks.filter((b) => keyOf(b) !== item.key) });
      if (bookmark) show(t('bookmarkRemoved'), () => {
        const now = latest.current.bookmarks;
        if (!now.some((b) => keyOf(b) === item.key)) update({ bookmarks: [...now, bookmark] });
      });
    } else if (item.kind === 'highlight') {
      const colour = settings.highlights[item.key];
      const next = { ...settings.highlights };
      delete next[item.key];
      update({ highlights: next });
      if (colour) show(t('highlightRemoved'), () => update({ highlights: { ...latest.current.highlights, [item.key]: colour } }));
    } else {
      const text = settings.notes[item.key];
      const next = { ...settings.notes };
      delete next[item.key];
      update({ notes: next });
      if (text) show(t('noteRemoved'), () => update({ notes: { ...latest.current.notes, [item.key]: text } }));
    }
  };

  const listFont = Math.min(settings.fontSize, 18);

  // A mark's reference, across verses when it runs on (John 3:16-17), with its Bible when
  // that is not the one being read.
  const markRef = (m: TextMark) => {
    const ref = formatRef(books, { book: m.book, chapter: m.chapter, verse: m.from.verse }, m.translation);
    const range = m.to.verse > m.from.verse ? `${ref}-${m.to.verse}` : ref;
    return m.translation === settings.translation ? range : `${range} · ${m.translation}`;
  };
  const markText = (m: TextMark, color: string | undefined) => {
    const text = markedWords(m, markVerses);
    if (!text) return null;
    const script = translationInfo(m.translation).script;
    // One block of the mark's colour: a colour behind the text itself leaves bands between the lines.
    return (
      <View style={[styles.markBlock, color ? { backgroundColor: color } : null]}>
        <Text
          numberOfLines={3}
          style={[{ fontSize: listFont, lineHeight: Math.round(listFont * translationInfo(m.translation).lineHeight), color: color ? theme.markText : theme.text, fontFamily: scriptureFont(script, settings.serif) ?? theme.font }]}
        >
          {text}
        </Text>
      </View>
    );
  };
  const empty = Object.values(sections).every((list) => list.length === 0);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={t('saved')} />
      {empty ? (
        <View style={styles.emptyBox}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
            <Icon name="bookmarks" size={36} color={theme.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('nothingSavedTitle')}</Text>
          <Text style={[styles.empty, { color: theme.muted }]}>{t('nothingSaved')}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          <View style={styles.tabs}>
            <Segmented
              options={[
                ['bookmark', `${t('bookmarks')} ${sections.bookmark.length}`],
                ['highlight', `${t('highlights')} ${sections.highlight.length}`],
                ['note', `${t('notes')} ${sections.note.length}`],
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>
          {tab === 'highlight' && shownColours.length > 1 ? (
            // One colour at a time, or all.
            <View style={styles.colours} accessibilityRole="radiogroup">
              <Pressable
                onPress={() => setColour(null)}
                accessibilityRole="radio"
                accessibilityState={{ checked: !chosen }}
                style={[styles.allChip, { borderColor: theme.accent, backgroundColor: !chosen ? theme.accent : 'transparent' }]}
              >
                <Text style={[styles.allText, { color: !chosen ? theme.onAccent : theme.accent }]}>{t('all')}</Text>
              </Pressable>
              {shownColours.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColour(chosen === c ? null : c)}
                  accessibilityRole="radio"
                  accessibilityLabel={t(COLOUR_NAME[c])}
                  accessibilityState={{ checked: chosen === c }}
                  hitSlop={6}
                  style={[styles.swatch, { backgroundColor: theme.marks[c], borderColor: chosen === c ? theme.accent : theme.border, borderWidth: chosen === c ? 3 : 1 }]}
                />
              ))}
            </View>
          ) : null}
          <FlatList
            data={shown}
            keyExtractor={(item) => `${item.kind}:${item.key}`}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={<Text style={[styles.emptyTab, { color: theme.muted }]}>{t('nothingHere')}</Text>}
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
                      {item.mark ? markRef(item.mark) : formatRef(books, item.ref, settings.translation)}
                    </Text>
                    <IconButton
                      name="delete"
                      onPress={() => remove(item)}
                      accessibilityLabel={`${t('remove')}, ${item.mark ? markRef(item.mark) : formatRef(books, item.ref, settings.translation)}`}
                      size={22}
                      style={styles.remove}
                    />
                  </View>
                  {item.note ? <Text style={[styles.note, { color: theme.text }]}>{item.note}</Text> : null}
                  {item.mark ? (
                    markText(item.mark, color)
                  ) : verse ? (
                    <VerseText verse={verse} fontSize={listFont} onWord={onWord} underline={false} showNumber={false} numberOfLines={3} />
                  ) : null}
                </Pressable>
              );
            }}
            ListFooterComponent={<View style={{ height: 40 }} />}
          />
        </View>
      )}
      <Toast toast={toast} bottom={insets.bottom + TAB_BAR_HEIGHT + 16} onDone={() => show(null)} />
      <TabBar current="Bookmarks" />
    </View>
  );
}

const styles = StyleSheet.create({
  markBlock: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 2 },
  screen: { flex: 1 },
  list: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  tabs: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 },
  colours: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 6 },
  allChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, minHeight: 32, justifyContent: 'center' },
  allText: { fontSize: 14, fontWeight: '600' },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  emptyTab: { fontSize: 15, textAlign: 'center', padding: 32 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingBottom: 96 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
  empty: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36 },
  ref: { fontSize: 14, fontWeight: '700' },
  remove: { marginRight: -12, marginVertical: -6 },
  note: { fontSize: 15, lineHeight: 21, marginBottom: 6, fontStyle: 'italic' },
});
