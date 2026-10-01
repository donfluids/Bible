import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import * as Clipboard from 'expo-clipboard';
import { Header, HeaderButton } from '../components/Header';
import { InterlinearVerse } from '../components/InterlinearVerse';
import { SheetAction, SimpleSheet } from '../components/SimpleSheet';
import { noteLetter, VerseText } from '../components/VerseText';
import { getChapter, getInterlinear, getNotes } from '../queries';
import { useSettings } from '../settings';
import { bookName, flattenVerse, formatRef } from '../text';
import { useTheme } from '../theme';
import type { Book, Note, OriginalWord, VerseRow, WordPick } from '../types';

interface Props {
  books: Book[];
  /** Present when the reader was opened from a list; goes back to it. */
  onBack?: () => void;
  backLabel?: string;
  onOpenBooks: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onWord: (pick: WordPick) => void;
}

type Item = { kind: 'heading'; key: string; text: string } | { kind: 'verse'; key: string; verse: VerseRow };

export function ReaderScreen({ books, onBack, backLabel, onOpenBooks, onOpenSearch, onOpenSettings, onWord }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const { translation, fontSize, underlineWords, interlinear, interlinearMode, showTranslit, hideCantillation, position, tipSeen, bookmarks } =
    settings;
  const [items, setItems] = useState<Item[] | null>(null);
  const [original, setOriginal] = useState<Map<number, OriginalWord[]> | null>(null);
  const [notes, setNotes] = useState<Map<number, Note[]>>(new Map());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<number | null>(null);
  const [note, setNote] = useState<{ verse: VerseRow; note: Note } | null>(null);
  const [actions, setActions] = useState<VerseRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const listRef = useRef<FlatList<Item>>(null);

  const book = books.find((b) => b.id === position.book) ?? books[0];

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setExpanded(new Set());
    Promise.all([
      getChapter(db, translation, position.book, position.chapter),
      getNotes(db, translation, position.book, position.chapter),
    ]).then(([{ verses, headings }, noteMap]) => {
      if (cancelled) return;
      const out: Item[] = [];
      for (const v of verses) {
        for (const h of headings) {
          if (h.before_verse === v.verse) out.push({ kind: 'heading', key: `h${h.before_verse}`, text: h.text });
        }
        out.push({ kind: 'verse', key: `v${v.verse}`, verse: v });
      }
      setNotes(noteMap);
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

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(timer);
  }, [toast]);

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

  const bookmarkKey = (v: VerseRow) => `${v.book}:${v.chapter}:${v.verse}`;
  const bookmarked = useMemo(() => new Set(bookmarks.map((b) => `${b.book}:${b.chapter}:${b.verse}`)), [bookmarks]);

  const verseForClipboard = (v: VerseRow) => `${flattenVerse(v.text)} (${formatRef(books, v)}, ${translation})`;

  const copyVerse = async (v: VerseRow) => {
    setActions(null);
    await Clipboard.setStringAsync(verseForClipboard(v));
    setToast('Copied');
  };
  const shareVerse = async (v: VerseRow) => {
    setActions(null);
    await Share.share({ message: verseForClipboard(v) });
  };
  const toggleBookmark = (v: VerseRow) => {
    setActions(null);
    const key = bookmarkKey(v);
    if (bookmarked.has(key)) {
      update({ bookmarks: bookmarks.filter((b) => `${b.book}:${b.chapter}:${b.verse}` !== key) });
      setToast('Bookmark removed');
    } else {
      update({ bookmarks: [...bookmarks, { book: v.book, chapter: v.chapter, verse: v.verse, translation, added: Date.now() }] });
      setToast('Bookmarked');
    }
  };

  const toggleExpanded = useCallback((verse: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(verse)) next.delete(verse);
      else next.add(verse);
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => {
      if (item.kind === 'heading') {
        return <Text style={[styles.heading, { color: theme.muted, fontSize: fontSize - 3 }]}>{item.text}</Text>;
      }
      const v = item.verse;
      const flashing = flash === v.verse;
      const showOriginal = interlinear && (interlinearMode === 'all' || expanded.has(v.verse));
      const words = showOriginal ? original?.get(v.verse) : undefined;
      const marked = bookmarked.has(bookmarkKey(v));
      return (
        <View
          style={[
            styles.verse,
            interlinear && [styles.verseInterlinear, { borderBottomColor: theme.border }],
            marked && [styles.verseBookmarked, { borderLeftColor: theme.accent }],
            flashing && { backgroundColor: theme.highlight },
          ]}
        >
          <VerseText
            verse={v}
            fontSize={fontSize}
            onWord={handleWord}
            onLongPress={() => setActions(v)}
            onNumberPress={interlinear && interlinearMode === 'tap' ? () => toggleExpanded(v.verse) : undefined}
            notes={notes.get(v.verse)}
            onNote={(n) => setNote({ verse: v, note: n })}
            underline={underlineWords}
          />
          {words && words.length > 0 ? (
            <InterlinearVerse
              words={words}
              hebrew={v.book <= 39}
              fontSize={fontSize}
              onWord={handleWord}
              showTranslit={showTranslit}
              hideCantillation={hideCantillation}
            />
          ) : null}
        </View>
      );
    },
    [theme, fontSize, handleWord, underlineWords, flash, interlinear, interlinearMode, expanded, original, notes, bookmarked, showTranslit, hideCantillation, toggleExpanded],
  );

  const title = useMemo(() => `${bookName(books, position.book)} ${position.chapter}`, [books, position]);
  const atStart = position.book === books[0]?.id && position.chapter === 1;
  const atEnd = position.book === books[books.length - 1]?.id && position.chapter === book?.chapters;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header
        onBack={onBack}
        backLabel={backLabel}
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
            <>
              {tipSeen ? null : (
                <View style={[styles.tip, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
                  <Text style={[styles.tipText, { color: theme.text }]}>
                    Tap any underlined word to see the Hebrew or Greek behind it. Hold a verse to copy, share or bookmark it. The
                    button below shows the whole verse in the original language.
                  </Text>
                  <Pressable onPress={() => update({ tipSeen: true })} hitSlop={8} accessibilityRole="button">
                    <Text style={[styles.tipDismiss, { color: theme.accent }]}>Got it</Text>
                  </Pressable>
                </View>
              )}
              {interlinear && interlinearMode === 'tap' ? (
                <Text style={[styles.modeHint, { color: theme.muted }]}>Tap a verse number to show its {book?.testament === 'OT' ? 'Hebrew' : 'Greek'}</Text>
              ) : null}
            </>
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

      {toast ? (
        <View style={[styles.toast, { backgroundColor: theme.text, bottom: insets.bottom + 70 }]} pointerEvents="none">
          <Text style={[styles.toastText, { color: theme.bg }]}>{toast}</Text>
        </View>
      ) : null}

      <SimpleSheet
        visible={!!note}
        title={note ? `${formatRef(books, note.verse)} · ${note.note.kind === 'x' ? 'Cross reference' : 'Footnote'} ${noteLetter(note.note.n)}` : ''}
        onClose={() => setNote(null)}
      >
        {note ? <Text style={[styles.noteText, { color: theme.text }]}>{note.note.text}</Text> : null}
      </SimpleSheet>

      <SimpleSheet visible={!!actions} title={actions ? formatRef(books, actions) : ''} onClose={() => setActions(null)}>
        {actions ? (
          <>
            <Text style={[styles.actionsPreview, { color: theme.muted }]} numberOfLines={3}>
              {flattenVerse(actions.text)}
            </Text>
            <SheetAction label="Copy" detail="Verse text with its reference" onPress={() => copyVerse(actions)} />
            <SheetAction label="Share…" onPress={() => shareVerse(actions)} />
            <SheetAction
              label={bookmarked.has(bookmarkKey(actions)) ? 'Remove bookmark' : 'Bookmark'}
              detail="Bookmarks are listed at the top of the Books screen"
              onPress={() => toggleBookmark(actions)}
            />
          </>
        ) : null}
      </SimpleSheet>
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
  verseInterlinear: { paddingBottom: 10, marginBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  verseBookmarked: { borderLeftWidth: 3, paddingLeft: 8, marginLeft: -11 },
  tip: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 10 },
  tipText: { fontSize: 15, lineHeight: 21 },
  tipDismiss: { fontSize: 15, fontWeight: '700', marginTop: 8, alignSelf: 'flex-end' },
  modeHint: { fontSize: 12, marginBottom: 6 },
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
  toast: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  toastText: { fontSize: 14, fontWeight: '600' },
  noteText: { fontSize: 16, lineHeight: 23, paddingBottom: 8 },
  actionsPreview: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
});
