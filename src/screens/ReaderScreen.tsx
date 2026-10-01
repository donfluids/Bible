import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Header, HeaderButton } from '../components/Header';
import { InterlinearVerse } from '../components/InterlinearVerse';
import { VerseText } from '../components/VerseText';
import { getChapter, getInterlinear } from '../queries';
import { useSettings } from '../settings';
import { bookName } from '../text';
import { useTheme } from '../theme';
import type { Book, OriginalWord, VerseRow, WordPick } from '../types';

interface Props {
  books: Book[];
  /** Present when the reader was opened from a results list; goes back to it. */
  onBack?: () => void;
  onOpenBooks: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onWord: (pick: WordPick) => void;
}

type Item = { kind: 'heading'; key: string; text: string } | { kind: 'verse'; key: string; verse: VerseRow };

export function ReaderScreen({ books, onBack, onOpenBooks, onOpenSearch, onOpenSettings, onWord }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const { translation, fontSize, underlineWords, interlinear, position, tipSeen } = settings;
  const [items, setItems] = useState<Item[] | null>(null);
  const [original, setOriginal] = useState<Map<number, OriginalWord[]> | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const listRef = useRef<FlatList<Item>>(null);

  const book = books.find((b) => b.id === position.book) ?? books[0];

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    getChapter(db, translation, position.book, position.chapter).then(({ verses, headings }) => {
      if (cancelled) return;
      const out: Item[] = [];
      for (const v of verses) {
        for (const h of headings) {
          if (h.before_verse === v.verse) out.push({ kind: 'heading', key: `h${h.before_verse}`, text: h.text });
        }
        out.push({ kind: 'verse', key: `v${v.verse}`, verse: v });
      }
      setItems(out);
    });
    return () => {
      cancelled = true;
    };
  }, [db, translation, position.book, position.chapter]);

  // The Hebrew or Greek words are loaded only while the interlinear view is on.
  useEffect(() => {
    if (!interlinear) {
      setOriginal(null);
      return;
    }
    let cancelled = false;
    getInterlinear(db, position.book, position.chapter).then((map) => {
      if (!cancelled) setOriginal(map);
    });
    return () => {
      cancelled = true;
    };
  }, [db, interlinear, position.book, position.chapter]);

  // Scroll to a requested verse once the chapter has rendered.
  useEffect(() => {
    if (!items || position.verse === undefined) return;
    const index = items.findIndex((it) => it.kind === 'verse' && it.verse.verse === position.verse);
    if (index < 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, viewPosition: 0.15, animated: false });
      setFlash(position.verse ?? null);
    }, 60);
    return () => clearTimeout(timer);
  }, [items, position.verse]);

  useEffect(() => {
    if (flash === null) return;
    const timer = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(timer);
  }, [flash]);

  const go = useCallback(
    (delta: 1 | -1) => {
      const idx = books.findIndex((b) => b.id === position.book);
      let chapter = position.chapter + delta;
      let target = books[idx];
      if (chapter < 1) {
        if (idx === 0) return;
        target = books[idx - 1];
        chapter = target.chapters;
      } else if (chapter > target.chapters) {
        if (idx === books.length - 1) return;
        target = books[idx + 1];
        chapter = 1;
      }
      update({ position: { book: target.id, chapter } });
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    },
    [books, position, update],
  );

  const toggleTranslation = () => update({ translation: translation === 'KJV' ? 'WEB' : 'KJV' });

  const handleWord = useCallback(
    (pick: WordPick) => {
      if (!tipSeen) update({ tipSeen: true });
      onWord(pick);
    },
    [tipSeen, update, onWord],
  );

  const renderItem = useCallback(
    ({ item }: { item: Item }) => {
      if (item.kind === 'heading') {
        return <Text style={[styles.heading, { color: theme.muted, fontSize: fontSize - 3 }]}>{item.text}</Text>;
      }
      const flashing = flash === item.verse.verse;
      const words = interlinear ? original?.get(item.verse.verse) : undefined;
      return (
        <View style={[styles.verse, interlinear && [styles.verseInterlinear, { borderBottomColor: theme.border }], flashing && { backgroundColor: theme.highlight }]}>
          <VerseText verse={item.verse} fontSize={fontSize} onWord={handleWord} underline={underlineWords} />
          {words && words.length > 0 ? <InterlinearVerse words={words} hebrew={item.verse.book <= 39} fontSize={fontSize} onWord={handleWord} /> : null}
        </View>
      );
    },
    [theme, fontSize, handleWord, underlineWords, flash, interlinear, original],
  );

  const title = useMemo(() => `${bookName(books, position.book)} ${position.chapter}`, [books, position]);
  const atStart = position.book === books[0]?.id && position.chapter === 1;
  const atEnd = position.book === books[books.length - 1]?.id && position.chapter === book?.chapters;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header
        onBack={onBack}
        backLabel="Results"
        center={
          <Pressable onPress={onOpenBooks} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${title}, choose passage`}>
            <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
              {title} <Text style={{ color: theme.accent }}>▾</Text>
            </Text>
          </Pressable>
        }
        right={
          <>
            <HeaderButton label={translation} onPress={toggleTranslation} active accessibilityLabel="Switch translation" />
            <HeaderButton label="Aa" onPress={onOpenSettings} accessibilityLabel="Settings" />
            <HeaderButton label="Search" onPress={onOpenSearch} />
          </>
        }
      />
      {!items ? (
        <ActivityIndicator style={styles.loading} color={theme.accent} />
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(it) => it.key}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          initialNumToRender={20}
          ListHeaderComponent={
            tipSeen ? null : (
              <View style={[styles.tip, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
                <Text style={[styles.tipText, { color: theme.text }]}>
                  Tap any underlined word to see the Hebrew or Greek behind it. The button below shows the whole verse in the
                  original language.
                </Text>
                <Pressable onPress={() => update({ tipSeen: true })} hitSlop={8} accessibilityRole="button">
                  <Text style={[styles.tipDismiss, { color: theme.accent }]}>Got it</Text>
                </Pressable>
              </View>
            )
          }
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0.15, animated: false }), 120);
          }}
          ListFooterComponent={<View style={{ height: 24 }} />}
        />
      )}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8, borderTopColor: theme.border, backgroundColor: theme.bg }]}>
        <NavButton label="‹ Previous" onPress={() => go(-1)} disabled={atStart} />
        <Pressable
          onPress={() => update({ interlinear: !interlinear })}
          hitSlop={6}
          accessibilityRole="switch"
          accessibilityState={{ checked: interlinear }}
          style={({ pressed }) => [
            styles.pill,
            { borderColor: interlinear ? theme.accent : theme.border, backgroundColor: interlinear ? theme.accent : 'transparent', opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.pillText, { color: interlinear ? '#fff' : theme.muted }]}>
            {book?.testament === 'OT' ? 'Hebrew' : 'Greek'} interlinear
          </Text>
        </Pressable>
        <NavButton label="Next ›" onPress={() => go(1)} disabled={atEnd} />
      </View>
    </View>
  );
}

function NavButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} style={({ pressed }) => ({ opacity: disabled ? 0.3 : pressed ? 0.6 : 1 })}>
      <Text style={[styles.nav, { color: theme.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  loading: { flex: 1 },
  list: { paddingHorizontal: 18, paddingTop: 12 },
  verse: { paddingVertical: 5, borderRadius: 6 },
  tip: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 10 },
  tipText: { fontSize: 15, lineHeight: 21 },
  tipDismiss: { fontSize: 15, fontWeight: '700', marginTop: 8, alignSelf: 'flex-end' },
  verseInterlinear: { paddingBottom: 10, marginBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '600' },
  heading: { fontWeight: '700', letterSpacing: 1, marginTop: 14, marginBottom: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nav: { fontSize: 16, fontWeight: '600' },
});
