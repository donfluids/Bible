import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSQLiteContext } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { CompareSheet } from '../components/CompareSheet';
import { Header, HeaderButton } from '../components/Header';
import { useEdition } from '../edition';
import { scriptureFont } from '../fonts';
import { useT } from '../i18n';
import { InterlinearVerse } from '../components/InterlinearVerse';
import { SheetAction, SimpleSheet } from '../components/SimpleSheet';
import { noteLetter, VerseText } from '../components/VerseText';
import { getChapter, getInterlinear, getNotes, mapRef } from '../queries';
import type { ChapterData } from '../queries';
import { FONT_SIZES, useSettings } from '../settings';
import type { Settings } from '../settings';
import { getPlace, moveMainReader, selectBook, selectChapter, updatePlace, usePlace } from '../place';
import type { Position } from '../place';
import { MAX_CONTENT_WIDTH, bookName, flattenVerse, formatRef, parseSegments } from '../text';
import { useTheme } from '../theme';
import { HIGHLIGHT_COLORS, translationInfo } from '../types';
import type { Book, HighlightColor, Note, OriginalWord, Ref, TranslationId, VerseRow, WordPick } from '../types';

// Width at each screen edge where a horizontal swipe belongs to the system back gesture.
const EDGE = 32;

interface Props {
  books: Book[];
  /** Open at this verse with a place of its own (a reader pushed from a list). */
  jumpTo?: Ref;
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

function firstVerseOf(item: Item): number | null {
  return item.kind === 'verse' ? item.verse.verse : item.kind === 'para' ? item.verses[0].verse : null;
}

interface ChapterContent extends ChapterData {
  notes: Map<number, Note[]>;
}

// The last few chapters read, and the ones either side, so turning a page does not
// wait on the database.
const chapterCache = new Map<string, Promise<ChapterContent>>();

function loadChapter(db: SQLiteDatabase, translation: TranslationId, book: number, chapter: number): Promise<ChapterContent> {
  const key = `${translation}:${book}:${chapter}`;
  const hit = chapterCache.get(key);
  if (hit) {
    chapterCache.delete(key);
    chapterCache.set(key, hit);
    return hit;
  }
  const load = Promise.all([getChapter(db, translation, book, chapter), getNotes(db, translation, book, chapter)]).then(([data, notes]) => ({
    ...data,
    notes,
  }));
  chapterCache.set(key, load);
  load.catch(() => chapterCache.delete(key));
  while (chapterCache.size > 8) chapterCache.delete(chapterCache.keys().next().value as string);
  return load;
}

/** The chapter before or after, crossing into the neighbouring book. */
function neighbour(books: Book[], book: number, chapter: number, delta: 1 | -1): { book: number; chapter: number } | null {
  const idx = books.findIndex((b) => b.id === book);
  if (idx < 0) return null;
  const next = chapter + delta;
  if (next >= 1 && next <= books[idx].chapters) return { book, chapter: next };
  const other = books[idx + delta];
  if (!other) return null;
  return { book: other.id, chapter: delta === 1 ? 1 : other.chapters };
}

function KeepAwake() {
  useKeepAwake();
  return null;
}

export function ReaderScreen({ books, jumpTo, onBack, backLabel, onOpenBooks, onOpenSearch, onOpenSettings, onWord }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const t = useT();
  const edition = useEdition();
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
    tipSeen,
    bookmarks,
    highlights,
    notes: userNotes,
    layout,
    keepAwake,
  } = settings;
  // A reader pushed from a list keeps its own place; the main reader uses the saved one.
  const [ownPosition, setOwnPosition] = useState<{ book: number; chapter: number } | null>(
    jumpTo ? { book: jumpTo.book, chapter: jumpTo.chapter } : null,
  );
  // The main reader follows the saved place; it redraws only when the chapter changes,
  // not when the first verse on screen is saved.
  const mainBook = usePlace(selectBook);
  const mainChapter = usePlace(selectChapter);
  const mainPosition = useMemo(() => ({ book: mainBook, chapter: mainChapter }), [mainBook, mainChapter]);
  const position: Position = ownPosition ?? mainPosition;
  const pushed = ownPosition !== null;
  // Paragraph layout cannot hold the interlinear cells, so the interlinear view uses one verse per line.
  const paragraphs = layout === 'paragraphs' && !interlinear;
  const [items, setItems] = useState<Item[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Original words with the chapter they belong to, so a page turn never shows the last chapter's.
  const [original, setOriginal] = useState<{ key: string; words: Map<number, OriginalWord[]> } | null>(null);
  const [notes, setNotes] = useState<Map<number, Note[]>>(new Map());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<number | null>(null);
  const [note, setNote] = useState<{ verse: VerseRow; note: Note } | null>(null);
  const [actions, setActions] = useState<VerseRow | null>(null);
  const [wordsFor, setWordsFor] = useState<VerseRow | null>(null);
  const [compare, setCompare] = useState<Ref | null>(null);
  const [noteEditor, setNoteEditor] = useState<{ verse: VerseRow; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const listRef = useRef<FlatList<Item>>(null);

  const book = books.find((b) => b.id === position.book) ?? books[0];
  const chapterKey = `${position.book}:${position.chapter}`;
  const originalKey = `${translation}:${chapterKey}`;
  const originalWords = original?.key === originalKey ? original.words : null;

  // Where to scroll once the next verses are on screen: a verse (flashed after a jump
  // from a list), or the top. The main reader opens where it was left.
  const scrollTarget = useRef<{ verse?: number; flash: boolean } | null>(
    jumpTo ? { verse: jumpTo.verse, flash: true } : getPlace().position.verse !== undefined ? { verse: getPlace().position.verse, flash: false } : null,
  );
  const shownKey = useRef<string | null>(null);
  // The scroll the list is asked for, kept for its retry when the row is not laid out yet.
  const pendingScroll = useRef<{ index: number; viewPosition: number } | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The first verse on screen, for keeping the place across a translation switch and a relaunch.
  const firstVisible = useRef<{ key: string; verse: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    loadChapter(db, translation, position.book, position.chapter)
      .then(({ verses, headings, notes: noteMap }) => {
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
        if (shownKey.current !== chapterKey) {
          // A new chapter starts at the top unless a verse was asked for.
          if (!scrollTarget.current) scrollTarget.current = { flash: false };
          shownKey.current = chapterKey;
          setExpanded(new Set());
          const recent = getPlace().recent;
          if (recent[0]?.book !== position.book || recent[0]?.chapter !== position.chapter) {
            updatePlace({
              recent: [{ book: position.book, chapter: position.chapter }, ...recent.filter((r) => r.book !== position.book || r.chapter !== position.chapter)].slice(0, 8),
            });
          }
        }
        setNotes(noteMap);
        setItems(out);
        for (const delta of [1, -1] as const) {
          const n = neighbour(books, position.book, position.chapter, delta);
          if (n) loadChapter(db, translation, n.book, n.chapter).catch(() => undefined);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, translation, position.book, position.chapter, paragraphs, attempt]);

  // The Hebrew or Greek words are loaded only while the interlinear view is on.
  useEffect(() => {
    if (!interlinear) {
      setOriginal(null);
      return;
    }
    let cancelled = false;
    getInterlinear(db, position.book, position.chapter, translation)
      .then((words) => {
        if (!cancelled) setOriginal({ key: originalKey, words });
      })
      .catch(() => {
        if (!cancelled) setOriginal({ key: originalKey, words: new Map() });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, interlinear, position.book, position.chapter, translation]);

  // Scroll once the verses a scroll was waiting for are on screen.
  useEffect(() => {
    const target = scrollTarget.current;
    if (!items || !target) return;
    scrollTarget.current = null;
    const index =
      target.verse === undefined
        ? -1
        : items.findIndex(
            (it) => (it.kind === 'verse' && it.verse.verse === target.verse) || (it.kind === 'para' && it.verses.some((v) => v.verse === target.verse)),
          );
    if (index < 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      return;
    }
    // A jump shows the verse a little below the top; a restored place puts it at the top,
    // so the verse saved next time is the same one.
    pendingScroll.current = { index, viewPosition: target.flash ? 0.15 : 0 };
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ ...pendingScroll.current!, animated: false });
      if (target.flash) setFlash(target.verse ?? null);
    }, 60);
    return () => {
      clearTimeout(timer);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [items]);

  // Remember the first verse on screen, so the main reader reopens there.
  const placeRef = useRef({ pushed, chapterKey, position });
  placeRef.current = { pushed, chapterKey, position };
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);
  const viewability = useRef({ itemVisiblePercentThreshold: 10 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<Item>[] }) => {
    const verse = viewableItems.map((v) => (v.item ? firstVerseOf(v.item) : null)).find((v): v is number => v !== null);
    if (verse === undefined) return;
    const place = placeRef.current;
    if (shownKey.current !== place.chapterKey) return; // still showing the previous chapter
    firstVisible.current = { key: place.chapterKey, verse };
    if (place.pushed) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const now = placeRef.current;
      const seen = firstVisible.current;
      if (!seen || seen.key !== now.chapterKey || getPlace().position.verse === seen.verse) return;
      updatePlace({ position: { book: now.position.book, chapter: now.position.chapter, verse: seen.verse } });
    }, 1000);
  }).current;

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

  const moveTo = useCallback(
    (target: { book: number; chapter: number }, extra: Partial<Settings> = {}) => {
      if (pushed) {
        setOwnPosition({ book: target.book, chapter: target.chapter });
        if (Object.keys(extra).length > 0) update(extra);
      } else {
        moveMainReader({ book: target.book, chapter: target.chapter });
        if (Object.keys(extra).length > 0) update(extra);
      }
    },
    [pushed, update],
  );

  const go = useCallback(
    (delta: 1 | -1) => {
      const n = neighbour(books, position.book, position.chapter, delta);
      if (!n) return;
      scrollTarget.current = { flash: false };
      moveTo(n);
    },
    [books, position.book, position.chapter, moveTo],
  );

  const goRef = useRef(go);
  goRef.current = go;
  // Swipe left for the next chapter, right for the previous. Vertical movement fails the
  // gesture quickly so scrolling is unaffected, and a swipe starting at either edge is
  // left to Android's back gesture.
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .hitSlop({ left: -EDGE, right: -EDGE })
        .maxPointers(1)
        .activeOffsetX([-30, 30])
        .failOffsetY([-15, 15])
        .runOnJS(true)
        .onEnd((e) => {
          if (e.translationX < -80) goRef.current(1);
          else if (e.translationX > 80) goRef.current(-1);
        }),
    [],
  );

  // Pinch the text to change its size: spreading two fingers steps up through the text
  // sizes, pinching steps down. Each step applies at once, with a tick and a note of the
  // size; on release the verse that was at the top of the screen is brought back there.
  const pinchStart = useRef(fontSize);
  const pinchRef = useRef({ fontSize, items, update });
  pinchRef.current = { fontSize, items, update };
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onStart(() => {
          pinchStart.current = pinchRef.current.fontSize;
        })
        .onUpdate((e) => {
          const wanted = pinchStart.current * e.scale;
          const size = FONT_SIZES.reduce((best, s) => (Math.abs(s - wanted) < Math.abs(best - wanted) ? s : best), FONT_SIZES[0]);
          if (size === pinchRef.current.fontSize) return;
          pinchRef.current.update({ fontSize: size });
          Haptics.selectionAsync().catch(() => undefined);
          setToast(`${t('textSize')} ${FONT_SIZES.indexOf(size) + 1}/${FONT_SIZES.length}`);
        })
        .onEnd(() => {
          const seen = firstVisible.current;
          const list = pinchRef.current.items;
          if (pinchStart.current === pinchRef.current.fontSize || !seen || !list) return;
          const index = list.findIndex((it) => (it.kind === 'verse' && it.verse.verse === seen.verse) || (it.kind === 'para' && it.verses.some((v) => v.verse === seen.verse)));
          if (index < 0) return;
          pendingScroll.current = { index, viewPosition: 0 };
          setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0, animated: false }), 80);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
  const gestures = useMemo(() => Gesture.Simultaneous(swipe, pinch), [swipe, pinch]);

  // Cycle through the translations bundled in this edition, staying on the verse at the
  // top of the screen (which can have another number, or chapter, in the other translation).
  const toggleTranslation = async () => {
    const list = edition.translations;
    const next = list[(list.indexOf(translation) + 1) % list.length];
    const seen = firstVisible.current;
    let target: Ref | null = null;
    if (seen && seen.key === chapterKey) {
      target = await mapRef(db, translation, next, { book: position.book, chapter: position.chapter, verse: seen.verse }).catch(() => null);
    }
    scrollTarget.current = target ? { verse: target.verse, flash: false } : null;
    if (target && (target.book !== position.book || target.chapter !== position.chapter)) {
      shownKey.current = `${target.book}:${target.chapter}`;
      moveTo(target, { translation: next });
    } else {
      update({ translation: next });
    }
  };
  const originalLanguage = (v: { book: number }) => (v.book <= 39 ? t('hebrew') : t('greek'));

  // Words tapped in this reader carry its translation, so it marks only its own word.
  const handleWord = useCallback(
    (pick: WordPick) => {
      if (!tipSeen) update({ tipSeen: true });
      onWord(pick.at ? { ...pick, at: { ...pick.at, translation } } : pick);
    },
    [tipSeen, update, onWord, translation],
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

  const scriptFont = scriptureFont(translation === 'MAL', settings.serif) ?? theme.font;

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
        return (
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: theme.muted, fontSize: fontSize - 3, fontFamily: scriptFont }, translation === 'MAL' && styles.headingMalayalam]}
          >
            {item.text}
          </Text>
        );
      }
      if (item.kind === 'para') {
        return (
          <Text style={[styles.para, { fontSize, lineHeight: Math.round(fontSize * translationInfo(translation).lineHeight), color: theme.text, fontFamily: scriptFont }]}>
            {item.verses.map((v, i) => (
              <React.Fragment key={v.verse}>
                {i > 0 ? ' ' : null}
                <VerseText
                  verse={v}
                  fontSize={fontSize}
                  onWord={handleWord}
                  onLongPress={() => openActions(v)}
                  onNumberPress={() => openActions(v)}
                  numberLabel={t('verseActions', { n: v.verse })}
                  notes={notes.get(v.verse)}
                  onNote={(n) => setNote({ verse: v, note: n })}
                  underline={underlineWords}
                  flash={flash === v.verse}
                  bookmarked={bookmarked.has(bookmarkKey(v))}
                  highlightColor={highlights[bookmarkKey(v)] ? theme.marks[highlights[bookmarkKey(v)]] : undefined}
                  hasNote={bookmarkKey(v) in userNotes}
                  onNotePress={() => openNote(v)}
                  selectionTranslation={translation}
                />
              </React.Fragment>
            ))}
          </Text>
        );
      }
      const v = item.verse;
      const flashing = flash === v.verse;
      const tapMode = interlinear && interlinearMode === 'tap';
      const showOriginal = interlinear && (interlinearMode === 'all' || expanded.has(v.verse));
      const words = showOriginal ? originalWords?.get(v.verse) : undefined;
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
            // The verse number opens the verse's actions, or in tap mode shows its words.
            onNumberPress={tapMode ? () => toggleExpanded(v.verse) : () => openActions(v)}
            numberLabel={tapMode ? t('tapVerseNumber', { lang: originalLanguage(v) }) : t('verseActions', { n: v.verse })}
            underlineNumber={tapMode}
            notes={notes.get(v.verse)}
            onNote={(n) => setNote({ verse: v, note: n })}
            underline={underlineWords}
            selectionTranslation={translation}
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
    [theme, fontSize, handleWord, underlineWords, flash, interlinear, interlinearMode, expanded, originalWords, notes, bookmarked, highlights, userNotes, showTranslit, hideCantillation, toggleExpanded, translation, t, scriptFont],
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
      <GestureDetector gesture={gestures}>
        <View style={styles.body}>
      {loadFailed ? (
        <View style={styles.failed}>
          <Text style={[styles.failedText, { color: theme.muted }]}>{t('loadFailed')}</Text>
          <Pressable onPress={() => setAttempt((n) => n + 1)} accessibilityRole="button" hitSlop={8} style={styles.failedButton}>
            <Text style={[styles.nav, { color: theme.accent }]}>{t('tryAgain')}</Text>
          </Pressable>
        </View>
      ) : !items ? (
        <ActivityIndicator style={styles.loading} color={theme.accent} accessibilityLabel={t('loading')} />
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(it) => it.key}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          initialNumToRender={20}
          viewabilityConfig={viewability}
          onViewableItemsChanged={onViewableItemsChanged}
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
            // The row is not measured yet: get near it, then retry with the same placement.
            const pending = pendingScroll.current;
            if (!pending || pending.index !== info.index) return;
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
            if (retryTimer.current) clearTimeout(retryTimer.current);
            retryTimer.current = setTimeout(() => listRef.current?.scrollToIndex({ ...pending, animated: false }), 120);
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
          <Text style={[styles.pillText, { color: interlinear ? theme.onAccent : theme.muted }]}>
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
            {actions.tags ? (
              <SheetAction
                label={t('wordsInVerse')}
                detail={t('wordsInVerseDetail')}
                onPress={() => {
                  setActions(null);
                  setWordsFor(actions);
                }}
              />
            ) : null}
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
                <Text style={[styles.noteSaveText, { color: theme.onAccent }]}>{t('save')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </SimpleSheet>

      <SimpleSheet visible={!!wordsFor} title={wordsFor ? `${t('wordsInVerse')} · ${formatRef(books, wordsFor, translation)}` : ''} onClose={() => setWordsFor(null)}>
        {wordsFor
          ? parseSegments(wordsFor)
              .filter((seg) => seg.strongs)
              .map((seg, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setWordsFor(null);
                    handleWord({ strongs: seg.strongs!, word: seg.text });
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.wordRow, { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.wordRowText, { color: theme.text }]}>{seg.text}</Text>
                  <Text style={[styles.wordRowId, { color: theme.muted }]}>{seg.strongs}</Text>
                </Pressable>
              ))
          : null}
      </SimpleSheet>

      <CompareSheet target={compare} translation={translation} books={books} onClose={() => setCompare(null)} onWord={handleWord} />
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
  // Letter spacing breaks up Malayalam conjuncts on some phones.
  headingMalayalam: { letterSpacing: 0 },
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
  noteSaveText: { fontSize: 16, fontWeight: '600' },
  actionsPreview: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  failed: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  failedText: { fontSize: 16, textAlign: 'center' },
  failedButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  wordRowText: { fontSize: 17, flexShrink: 1 },
  wordRowId: { fontSize: 14, fontVariant: ['tabular-nums'] },
});
