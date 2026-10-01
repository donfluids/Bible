import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSQLiteContext } from 'expo-sqlite';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { CompareSheet } from '../components/CompareSheet';
import { Header, HeaderButton } from '../components/Header';
import { EDITION } from '../edition';
import { useT } from '../i18n';
import { InterlinearVerse } from '../components/InterlinearVerse';
import { SheetAction, SimpleSheet } from '../components/SimpleSheet';
import { noteLetter, VerseText } from '../components/VerseText';
import { getChapter, getInterlinear, getNotes } from '../queries';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, bookName, flattenVerse, formatRef } from '../text';
import { useTheme } from '../theme';
import { HIGHLIGHT_COLORS, translationInfo } from '../types';
import type { Book, HighlightColor, Note, OriginalWord, Ref, VerseRow, WordPick } from '../types';

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

type Item =
  | { kind: 'heading'; key: string; text: string }
  | { kind: 'verse'; key: string; verse: VerseRow }
  | { kind: 'para'; key: string; verses: VerseRow[] };

/** Group a chapter's verses into paragraphs and poetry lines using the breaks the source marks. */
function groupParagraphs(verses: VerseRow[], headings: { before_verse: number; text: string }[]): Item[] {
  const out: Item[] = [];
  let current: VerseRow[] | null = null;
  for (const v of verses) {
    let broke = false;
    for (const h of headings) {
      if (h.before_verse === v.verse) {
        out.push({ kind: 'heading', key: `h${h.before_verse}`, text: h.text });
        broke = true;
      }
    }
    const standalone = v.verse === 0 || v.omitted === 1 || v.para.startsWith('q') || v.para === 'b';
    if (standalone) {
      out.push({ kind: 'para', key: `p${v.verse}`, verses: [v] });
      current = null;
      continue;
    }
    if (current === null || broke || v.para === 'p') {
      current = [v];
      out.push({ kind: 'para', key: `p${v.verse}`, verses: current });
    } else {
      current.push(v);
    }
  }
  return out;
}

function KeepAwake() {
  useKeepAwake();
  return null;
}

export function ReaderScreen({ books, onBack, backLabel, onOpenBooks, onOpenSearch, onOpenSettings, onWord }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const {
    translation,
    fontSize,
    underlineWords,
    interlinear,
    interlinearMode,
    showTranslit,
    hideCantillation,
    position,
    tipSeen,
    bookmarks,
    highlights,
    notes: userNotes,
    layout,
    keepAwake,
  } = settings;
  // Paragraph layout cannot hold the interlinear cells, so the interlinear view uses one verse per line.
  const paragraphs = layout === 'paragraphs' && !interlinear;
  const [items, setItems] = useState<Item[] | null>(null);
  const [original, setOriginal] = useState<Map<number, OriginalWord[]> | null>(null);
  const [notes, setNotes] = useState<Map<number, Note[]>>(new Map());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<number | null>(null);
  const [note, setNote] = useState<{ verse: VerseRow; note: Note } | null>(null);
  const [actions, setActions] = useState<VerseRow | null>(null);
  const [compare, setCompare] = useState<Ref | null>(null);
  const [noteEditor, setNoteEditor] = useState<{ verse: VerseRow; text: string } | null>(null);
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
      let out: Item[];
      if (paragraphs) {
        out = groupParagraphs(verses, headings);
      } else {
        out = [];
        for (const v of verses) {
          for (const h of headings) {
            if (h.before_verse === v.verse) out.push({ kind: 'heading', key: `h${h.before_verse}`, text: h.text });
          }
          out.push({ kind: 'verse', key: `v${v.verse}`, verse: v });
        }
      }
      setNotes(noteMap);
      setItems(out);
    });
    return () => {
      cancelled = true;
    };
  }, [db, translation, position.book, position.chapter, paragraphs]);

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
    const index = items.findIndex(
      (it) => (it.kind === 'verse' && it.verse.verse === position.verse) || (it.kind === 'para' && it.verses.some((v) => v.verse === position.verse)),
    );
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

  const goRef = useRef(go);
  goRef.current = go;
  // Swipe left for the next chapter, right for the previous. Vertical movement fails the
  // gesture quickly so scrolling is unaffected.
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-15, 15])
        .runOnJS(true)
        .onEnd((e) => {
          if (e.translationX < -80) goRef.current(1);
          else if (e.translationX > 80) goRef.current(-1);
        }),
    [],
  );

  // Cycle through the translations bundled in this edition.
  const toggleTranslation = () => {
    const list = EDITION.translations;
    update({ translation: list[(list.indexOf(translation) + 1) % list.length] });
  };
  const originalLanguage = (v: { book: number }) => (v.book <= 39 ? t('hebrew') : t('greek'));

  const handleWord = useCallback(
    (pick: WordPick) => {
      if (!tipSeen) update({ tipSeen: true });
      onWord(pick);
    },
    [tipSeen, update, onWord],
  );

  const bookmarkKey = (v: VerseRow) => `${v.book}:${v.chapter}:${v.verse}`;
  const bookmarked = useMemo(() => new Set(bookmarks.map((b) => `${b.book}:${b.chapter}:${b.verse}`)), [bookmarks]);

  const verseForClipboard = (v: VerseRow) => `${flattenVerse(v.text)} (${formatRef(books, v, translation)}, ${translation})`;

  const copyVerse = async (v: VerseRow) => {
    setActions(null);
    await Clipboard.setStringAsync(verseForClipboard(v));
    setToast(t('copied'));
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
      setToast(t('bookmarkRemoved'));
    } else {
      update({ bookmarks: [...bookmarks, { book: v.book, chapter: v.chapter, verse: v.verse, translation, added: Date.now() }] });
      confirmHaptic();
      setToast(t('bookmarked'));
    }
  };

  const openActions = (v: VerseRow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setActions(v);
  };
  const confirmHaptic = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

  const setHighlight = (v: VerseRow, color: HighlightColor | null) => {
    setActions(null);
    const next = { ...highlights };
    if (color) next[bookmarkKey(v)] = color;
    else delete next[bookmarkKey(v)];
    update({ highlights: next });
    confirmHaptic();
    setToast(color ? t('highlighted') : t('highlightRemoved'));
  };

  const openNote = (v: VerseRow) => {
    setActions(null);
    setNoteEditor({ verse: v, text: userNotes[bookmarkKey(v)] ?? '' });
  };
  const saveNote = () => {
    if (!noteEditor) return;
    const next = { ...userNotes };
    const text = noteEditor.text.trim();
    if (text) next[bookmarkKey(noteEditor.verse)] = text;
    else delete next[bookmarkKey(noteEditor.verse)];
    update({ notes: next });
    setNoteEditor(null);
    confirmHaptic();
    setToast(text ? t('noteSaved') : t('noteRemoved'));
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
        return <Text style={[styles.heading, { color: theme.muted, fontSize: fontSize - 3, fontFamily: theme.font }]}>{item.text}</Text>;
      }
      if (item.kind === 'para') {
        return (
          <Text style={[styles.para, { fontSize, lineHeight: Math.round(fontSize * translationInfo(translation).lineHeight), color: theme.text, fontFamily: theme.font }]}>
            {item.verses.map((v, i) => (
              <React.Fragment key={v.verse}>
                {i > 0 ? ' ' : null}
                <VerseText
                  verse={v}
                  fontSize={fontSize}
                  onWord={handleWord}
                  onLongPress={() => openActions(v)}
                  notes={notes.get(v.verse)}
                  onNote={(n) => setNote({ verse: v, note: n })}
                  underline={underlineWords}
                  flash={flash === v.verse}
                  bookmarked={bookmarked.has(bookmarkKey(v))}
                  highlightColor={highlights[bookmarkKey(v)] ? theme.marks[highlights[bookmarkKey(v)]] : undefined}
                  hasNote={bookmarkKey(v) in userNotes}
                  onNotePress={() => openNote(v)}
                />
              </React.Fragment>
            ))}
          </Text>
        );
      }
      const v = item.verse;
      const flashing = flash === v.verse;
      const showOriginal = interlinear && (interlinearMode === 'all' || expanded.has(v.verse));
      const words = showOriginal ? original?.get(v.verse) : undefined;
      const marked = bookmarked.has(bookmarkKey(v));
      const mark = highlights[bookmarkKey(v)];
      return (
        <View
          style={[
            styles.verse,
            interlinear && [styles.verseInterlinear, { borderBottomColor: theme.border }],
            marked && [styles.verseBookmarked, { borderLeftColor: theme.accent }],
            mark ? { backgroundColor: theme.marks[mark] } : null,
            flashing && { backgroundColor: theme.highlight },
          ]}
        >
          <VerseText
            verse={v}
            fontSize={fontSize}
            onWord={handleWord}
            onLongPress={() => openActions(v)}
            hasNote={bookmarkKey(v) in userNotes}
            onNotePress={() => openNote(v)}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, fontSize, handleWord, underlineWords, flash, interlinear, interlinearMode, expanded, original, notes, bookmarked, highlights, userNotes, showTranslit, hideCantillation, toggleExpanded, translation],
  );

  const title = useMemo(() => `${bookName(books, position.book, translation)} ${position.chapter}`, [books, position, translation]);
  const atStart = position.book === books[0]?.id && position.chapter === 1;
  const atEnd = position.book === books[books.length - 1]?.id && position.chapter === book?.chapters;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header
        onBack={onBack}
        backLabel={backLabel}
        center={
          <Pressable onPress={onOpenBooks} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('choosePassage', { title })}>
            <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
              {title} <Text style={{ color: theme.accent }}>▾</Text>
            </Text>
          </Pressable>
        }
        right={
          <>
            <HeaderButton label={translation} onPress={toggleTranslation} active accessibilityLabel={t('switchTranslation')} />
            <HeaderButton label="Aa" onPress={onOpenSettings} accessibilityLabel={t('settings')} />
            <HeaderButton label={t('search')} onPress={onOpenSearch} />
          </>
        }
      />
      {keepAwake ? <KeepAwake /> : null}
      <GestureDetector gesture={swipe}>
        <View style={styles.body}>
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
                  <Text style={[styles.tipText, { color: theme.text }]}>{translationInfo(translation).tagged ? t('tip') : t('tipNoTags')}</Text>
                  <Pressable onPress={() => update({ tipSeen: true })} hitSlop={8} accessibilityRole="button">
                    <Text style={[styles.tipDismiss, { color: theme.accent }]}>{t('gotIt')}</Text>
                  </Pressable>
                </View>
              )}
              {interlinear && interlinearMode === 'tap' ? (
                <Text style={[styles.modeHint, { color: theme.muted }]}>{t('tapVerseNumber', { lang: book?.testament === 'OT' ? t('hebrew') : t('greek') })}</Text>
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
        </View>
      </GestureDetector>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8, borderTopColor: theme.border, backgroundColor: theme.bg }]}>
        <NavButton label={t('previous')} onPress={() => go(-1)} disabled={atStart} />
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
            {book?.testament === 'OT' ? t('hebrewInterlinear') : t('greekInterlinear')}
          </Text>
        </Pressable>
        <NavButton label={t('next')} onPress={() => go(1)} disabled={atEnd} />
      </View>

      {toast ? (
        <View style={[styles.toast, { backgroundColor: theme.text, bottom: insets.bottom + 70 }]} pointerEvents="none">
          <Text style={[styles.toastText, { color: theme.bg }]}>{toast}</Text>
        </View>
      ) : null}

      <SimpleSheet
        visible={!!note}
        title={note ? `${formatRef(books, note.verse, translation)} · ${note.note.kind === 'x' ? t('crossReference') : t('footnote')} ${noteLetter(note.note.n)}` : ''}
        onClose={() => setNote(null)}
      >
        {note ? <Text style={[styles.noteText, { color: theme.text }]}>{note.note.text}</Text> : null}
      </SimpleSheet>

      <SimpleSheet visible={!!actions} title={actions ? formatRef(books, actions, translation) : ''} onClose={() => setActions(null)}>
        {actions ? (
          <>
            <Text style={[styles.actionsPreview, { color: theme.muted }]} numberOfLines={3}>
              {flattenVerse(actions.text)}
            </Text>
            <View style={[styles.swatchRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.swatchLabel, { color: theme.text }]}>{t('highlight')}</Text>
              {HIGHLIGHT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setHighlight(actions, c)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('highlight')} ${c}`}
                  style={[
                    styles.swatch,
                    { backgroundColor: theme.marks[c], borderColor: highlights[bookmarkKey(actions)] === c ? theme.accent : theme.border },
                  ]}
                />
              ))}
              {highlights[bookmarkKey(actions)] ? (
                <Pressable onPress={() => setHighlight(actions, null)} hitSlop={8} accessibilityRole="button">
                  <Text style={[styles.swatchClear, { color: theme.muted }]}>{t('clear')}</Text>
                </Pressable>
              ) : null}
            </View>
            <SheetAction
              label={bookmarkKey(actions) in userNotes ? t('editNote') : t('addNote')}
              detail={userNotes[bookmarkKey(actions)]}
              onPress={() => openNote(actions)}
            />
            <SheetAction
              label={t('compare')}
              detail={t('compareDetail', { lang: originalLanguage(actions) })}
              onPress={() => {
                setActions(null);
                setCompare({ book: actions.book, chapter: actions.chapter, verse: actions.verse });
              }}
            />
            <SheetAction label={t('copy')} detail={t('copyDetail')} onPress={() => copyVerse(actions)} />
            <SheetAction label={t('share')} onPress={() => shareVerse(actions)} />
            <SheetAction
              label={bookmarked.has(bookmarkKey(actions)) ? t('removeBookmark') : t('bookmark')}
              detail={t('bookmarkDetail')}
              onPress={() => toggleBookmark(actions)}
            />
          </>
        ) : null}
      </SimpleSheet>

      <SimpleSheet visible={!!noteEditor} title={noteEditor ? `${t('note')} · ${formatRef(books, noteEditor.verse, translation)}` : ''} onClose={() => setNoteEditor(null)}>
        {noteEditor ? (
          <View>
            <TextInput
              value={noteEditor.text}
              onChangeText={(text) => setNoteEditor({ ...noteEditor, text })}
              placeholder={t('notePlaceholder')}
              placeholderTextColor={theme.muted}
              multiline
              autoFocus
              style={[styles.noteInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
            />
            <View style={styles.noteButtons}>
              {userNotes[bookmarkKey(noteEditor.verse)] ? (
                <Pressable onPress={() => setNoteEditor({ ...noteEditor, text: '' })} hitSlop={8} accessibilityRole="button">
                  <Text style={[styles.noteDelete, { color: theme.muted }]}>{t('delete')}</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable onPress={saveNote} style={[styles.noteSave, { backgroundColor: theme.accent }]} accessibilityRole="button">
                <Text style={styles.noteSaveText}>{t('save')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </SimpleSheet>

      <CompareSheet target={compare} books={books} onClose={() => setCompare(null)} onWord={handleWord} />
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
  body: { flex: 1 },
  loading: { flex: 1 },
  para: { marginBottom: 12 },
  list: { paddingHorizontal: 18, paddingTop: 12, alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
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
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  swatchLabel: { fontSize: 17, marginRight: 4 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2 },
  swatchClear: { fontSize: 14, marginLeft: 4 },
  noteInput: { minHeight: 110, maxHeight: 220, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  noteButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  noteDelete: { fontSize: 15 },
  noteSave: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  noteSaveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actionsPreview: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
});
