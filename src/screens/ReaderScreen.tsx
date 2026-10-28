import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, AppState, FlatList, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../components/Pressable';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSQLiteContext } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { READ_SPEEDS, spokenText, useReadAloud, voiceFor } from '../readAloud';
import { hasVoice } from '../speech';
import { CompareSheet } from '../components/CompareSheet';
import { useIsFocused } from '@react-navigation/native';
import { HEADER_MAX_FONT_SCALE, Header, HeaderIconButton, SHORT_SCREEN } from '../components/Header';
import { useHardwareKeys } from '../keys';
import { TAB_BAR_HEIGHT, TabBar } from '../components/TabBar';
import { Icon, IconButton } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { nativeTranslation, useEdition } from '../edition';
import { scriptOf, scriptureFont } from '../fonts';
import type { Script } from '../fonts';
import { shortBookName } from '../shortNames';
import { PassagePicker } from '../components/PassagePicker';
import { useT } from '../i18n';
import { InterlinearVerse } from '../components/InterlinearVerse';
import { MarkableVerse } from '../components/MarkableVerse';
import type { WordSlot } from '../components/MarkableVerse';
import { addMark, comparePoints, eraseMarks, markRanges } from '../marks';
import { pageName, useNotebook } from '../notebook';
import { SheetAction, SimpleSheet } from '../components/SimpleSheet';
import { noteLetter, VerseText } from '../components/VerseText';
import { countCrossRefs, getBeside, getChapter, getCrossRefs, getInterlinear, getNotes, mapRef } from '../queries';
import type { CrossRef, LinkKind } from '../queries';
import type { ChapterData } from '../queries';
import { FONT_SIZES, useSettings } from '../settings';
import type { Settings } from '../settings';
import { getPlace, moveMainReader, savePlaceNow, selectBook, selectChapter, selectLastChapters, updatePlace, usePlace } from '../place';
import type { Position } from '../place';
import { MAX_CONTENT_WIDTH, bookName, flattenVerse, formatRef, parseSegments, shareText } from '../text';
import { useTheme } from '../theme';
import { useWriteToUs } from '../writeToUs';
import { FEEDBACK_NEVER, feedbackCardDue, feedbackLater } from '../feedback';
import type { Theme } from '../theme';
import { HIGHLIGHT_COLORS, translationInfo } from '../types';
import type { Book, HighlightColor, Note, OriginalWord, Ref, TextPoint, TranslationId, VerseRow, WordPick } from '../types';

// Width at each screen edge where a horizontal swipe belongs to the system back gesture.
const EDGE = 32;

interface Props {
  books: Book[];
  /** Open at this verse with a place of its own (a reader pushed from a list). */
  jumpTo?: Ref;
  /** Present when the reader was opened from a list; goes back to it. */
  onBack?: () => void;
  backLabel?: string;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  /** Opens the How to use page (from the first-time tip). */
  onOpenHowTo: () => void;
  /** Open a notebook page; `isNew` for one just made from a verse. */
  onOpenNotePage: (id: string, isNew?: boolean) => void;
  onOpenCard: (ref: Ref, translation: TranslationId) => void;
  /** Opens the introduction to a book. */
  onOpenIntro: (book: number) => void;
  /** Open a verse in a reader of its own; `from` names where it was opened from, for going back. */
  onOpenRef: (ref: Ref, from: string) => void;
  onWord: (pick: WordPick) => void;
  /** The main reader shows the bottom tab bar; a reader opened from a list does not. */
  tabs?: boolean;
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

/** Side by side needs this much width (a tablet, or a phone on its side) and uses at most the other. */
const SIDE_BY_SIDE_MIN_WIDTH = 720;
const SIDE_BY_SIDE_MAX_WIDTH = 1200;

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

/** Starts loading a chapter, so the reader finds it ready. */
export function preloadChapter(db: SQLiteDatabase, translation: TranslationId, book: number, chapter: number): void {
  loadChapter(db, translation, book, chapter).catch(() => undefined);
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

/** A word in marker mode as measured on screen, in window coordinates at the time of measuring. */
interface WordBox {
  verse: number;
  start: number;
  end: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The word under a point, or the one nearest to it (a finger between words or past a line's end). */
function nearestWord(boxes: WordBox[], x: number, y: number): WordBox | null {
  let best: WordBox | null = null;
  let bestScore = Infinity;
  for (const b of boxes) {
    const dy = Math.max(0, b.top - y, y - b.bottom);
    const dx = Math.max(0, b.left - x, x - b.right);
    const score = dy * 1000 + dx;
    if (score < bestScore) {
      best = b;
      bestScore = score;
    }
  }
  return best;
}

/** The stretch from one word to another, whichever comes first. */
function spanOf(a: WordBox, b: WordBox): { from: TextPoint; to: TextPoint } {
  const [first, last] = a.verse < b.verse || (a.verse === b.verse && a.start <= b.start) ? [a, b] : [b, a];
  return { from: { verse: first.verse, offset: first.start }, to: { verse: last.verse, offset: last.end } };
}

// The colour marker mode starts with: the one used last.
let lastMarkColor: HighlightColor = 'yellow';

// Height of the band at the top and bottom of the text where a marking finger scrolls it.
const SCROLL_BAND = 56;
/** How far the text scrolls one way before the tab bar folds away or comes back. */
const BAR_SCROLL = 32;

function KeepAwake() {
  useKeepAwake();
  return null;
}

/** Highlight colours as TalkBack says them, in the interface language. */
const COLOUR_NAMES = { yellow: 'colourYellow', green: 'colourGreen', blue: 'colourBlue', pink: 'colourPink' } as const;

export function ReaderScreen({ books, jumpTo, onBack, backLabel, onOpenSearch, onOpenSettings, onOpenHowTo, onOpenNotePage, onOpenCard, onOpenIntro, onOpenRef, onWord, tabs = false }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const t = useT();
  const edition = useEdition();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // A phone on its side: the bars take less height, so more of the text shows.
  const shortScreen = windowHeight < SHORT_SCREEN;
  const { settings, update, commit } = useSettings();
  const {
    translation,
    fontSize,
    underlineWords: underlineSetting,
    interlinear: interlinearSetting,
    interlinearMode,
    showTranslit,
    hideCantillation,
    tipSeen,
    feedbackDue,
    bookmarks,
    highlights,
    notes: userNotes,
    marks,
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
  // Marker mode: the colour a finger marks words with, or the eraser; null while reading.
  const [markTool, setMarkTool] = useState<HighlightColor | 'erase' | null>(null);
  const marking = markTool !== null;
  // On a wide screen the edition's own Bible stands on the left and the KJV beside it,
  // verse by verse (Settings: side by side). Marker mode keeps one column.
  const nativeBible = nativeTranslation(edition);
  const sideBySide = !!nativeBible && settings.sideBySide && windowWidth >= SIDE_BY_SIDE_MIN_WIDTH && !marking;
  // A plain reader without the study tools: no tappable words, no Hebrew or Greek, and the
  // verse menu without cross references, parallels, Compare and Words in this verse.
  const study = settings.study;
  const writeToUs = useWriteToUs();
  const interlinear = study && interlinearSetting;
  const underlineWords = study && underlineSetting;
  // The words being marked while a finger is down, and whether one is (the list then holds still).
  const [selection, setSelection] = useState<{ from: TextPoint; to: TextPoint } | null>(null);
  const [dragging, setDragging] = useState(false);
  // Paragraph layout cannot hold the interlinear cells or the words of marker mode, so those
  // use one verse per line.
  const paragraphs = layout === 'paragraphs' && !interlinear && !marking && !sideBySide;
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
  // The passage picker, from the title: any book and chapter in two taps.
  const [picking, setPicking] = useState(false);
  const lastChapters = usePlace(selectLastChapters);
  // Cross references and parallel passages: how many the verse in the menu has, and the list once opened.
  const [crossCount, setCrossCount] = useState<{ key: string; n: number; parallels: number } | null>(null);
  const [cross, setCross] = useState<{ verse: VerseRow; kind: LinkKind; list: CrossRef[] | null } | null>(null);
  useEffect(() => {
    if (!actions) return;
    let cancelled = false;
    const key = bookmarkKey(actions);
    Promise.all([countCrossRefs(db, translation, actions).catch(() => 0), countCrossRefs(db, translation, actions, 'parallels').catch(() => 0)])
      .then(([n, parallels]) => !cancelled && setCrossCount({ key, n, parallels }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, db, translation]);
  const openCross = (verse: VerseRow, kind: LinkKind) => {
    setActions(null);
    setCross({ verse, kind, list: null });
    getCrossRefs(db, translation, verse, kind)
      .then((list) => setCross((c) => (c && c.verse === verse && c.kind === kind ? { verse, kind, list } : c)))
      .catch(() => setCross((c) => (c && c.verse === verse && c.kind === kind ? { verse, kind, list: [] } : c)));
  };
  const [noteEditor, setNoteEditor] = useState<{ verse: VerseRow; text: string } | null>(null);
  // The verse being added to the notebook, while its page is chosen.
  const [toNotebook, setToNotebook] = useState<VerseRow | null>(null);
  const notebook = useNotebook();
  const [toast, setToast] = useState<string | null>(null);
  // Said by a screen reader too, since the toast itself takes no focus.
  useEffect(() => {
    if (toast) AccessibilityInfo.announceForAccessibility(toast);
  }, [toast]);
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
  // A scroll made a moment later must still fit the rows then on screen: scrollToIndex
  // past the end throws, and thrown from a timer it closes the app. One meant for a
  // chapter no longer shown is dropped.
  const itemsRef = useRef<Item[] | null>(null);
  itemsRef.current = items;
  const scrollToRow = useCallback((row: { index: number; viewPosition: number }, forChapter: string | null) => {
    const rows = itemsRef.current;
    if (!rows || row.index < 0 || row.index >= rows.length || shownKey.current !== forChapter) return;
    listRef.current?.scrollToIndex({ ...row, animated: false });
  }, []);
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
    let prefetch: ReturnType<typeof setTimeout> | null = null;
    getInterlinear(db, position.book, position.chapter, translation)
      .then((words) => {
        if (cancelled) return;
        setOriginal({ key: originalKey, words });
        // Decode the chapters either side a moment later, so turning the page shows the words at once.
        prefetch = setTimeout(() => {
          for (const delta of [1, -1] as const) {
            const n = neighbour(books, position.book, position.chapter, delta);
            if (n) getInterlinear(db, n.book, n.chapter, translation).catch(() => undefined);
          }
        }, 400);
      })
      .catch(() => {
        if (!cancelled) setOriginal({ key: originalKey, words: new Map() });
      });
    return () => {
      cancelled = true;
      if (prefetch) clearTimeout(prefetch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, interlinear, position.book, position.chapter, translation]);

  // Scroll once the verses a scroll was waiting for are on screen. With every verse's
  // Hebrew or Greek words shown, a scroll to a verse also waits for the words: they make
  // the rows above it taller, and scrolling first would land on an earlier verse.
  const wordsReady = !(interlinear && interlinearMode === 'all' && !marking) || !!originalWords;
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );
  useEffect(() => {
    const target = scrollTarget.current;
    if (!items || !target) return;
    if (target.verse !== undefined && !wordsReady) return;
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
    const forChapter = shownKey.current;
    if (jumpTimer.current) clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => {
      jumpTimer.current = null;
      if (pendingScroll.current) scrollToRow(pendingScroll.current, forChapter);
      if (target.flash) setFlash(target.verse ?? null);
    }, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, wordsReady]);

  // Keep the place when the Hebrew or Greek words or marker mode are switched on or off.
  // The rows change height once the words arrive, and in paragraph layout the list is
  // rebuilt verse by verse, so the list is scrolled back to the verse that was at the top
  // once the new rows are in (not before: the old list or missing words would put it in
  // the wrong place). Marker mode opened from a verse's sheet brings that verse back instead.
  const restoreVerse = useRef<{ verse: number; viewPosition: number } | null>(null);
  const markFrom = useRef<number | null>(null);
  const lastView = useRef({ interlinear, marking });
  if (lastView.current.interlinear !== interlinear || lastView.current.marking !== marking) {
    lastView.current = { interlinear, marking };
    const seen = firstVisible.current;
    restoreVerse.current =
      markFrom.current !== null ? { verse: markFrom.current, viewPosition: 0.15 } : seen && seen.key === chapterKey ? { verse: seen.verse, viewPosition: 0 } : null;
    markFrom.current = null;
  }
  useEffect(() => {
    const target = restoreVerse.current;
    if (target === null || !items) return;
    if (interlinear && !marking && !originalWords) return;
    if (paragraphs !== items.some((it) => it.kind === 'para')) return;
    restoreVerse.current = null;
    const { verse, viewPosition } = target;
    const index = items.findIndex((it) => (it.kind === 'verse' && it.verse.verse === verse) || (it.kind === 'para' && it.verses.some((v) => v.verse === verse)));
    if (index < 0) return;
    pendingScroll.current = { index, viewPosition };
    const forChapter = shownKey.current;
    setTimeout(() => scrollToRow({ index, viewPosition }, forChapter), 80);
  }, [items, originalWords, interlinear, marking, paragraphs]);

  // Remember the first verse on screen, so the main reader reopens there.
  const placeRef = useRef({ pushed, chapterKey, position });
  placeRef.current = { pushed, chapterKey, position };
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeenVerse = useCallback(() => {
    saveTimer.current = null;
    const now = placeRef.current;
    const seen = firstVisible.current;
    if (!seen || seen.key !== now.chapterKey || getPlace().position.verse === seen.verse) return;
    updatePlace({ position: { book: now.position.book, chapter: now.position.chapter, verse: seen.verse } });
  }, []);
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);
  // Timers stop when Android puts the app away, so a place still waiting is saved now.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' || !saveTimer.current) return;
      clearTimeout(saveTimer.current);
      saveSeenVerse();
      savePlaceNow();
    });
    return () => sub.remove();
  }, [saveSeenVerse]);
  const viewability = useRef({ itemVisiblePercentThreshold: 10 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<Item>[] }) => {
    const verse = viewableItems.map((v) => (v.item ? firstVerseOf(v.item) : null)).find((v): v is number => v !== null);
    if (verse === undefined) return;
    const place = placeRef.current;
    if (shownKey.current !== place.chapterKey) return; // still showing the previous chapter
    firstVisible.current = { key: place.chapterKey, verse };
    if (place.pushed) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSeenVerse(), 1000);
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
  // A keyboard (a Chromebook's): the arrows turn the chapter, Ctrl+F opens search. Only the
  // reader on top listens, and not while marking or under a sheet (src/keys.ts).
  const focused = useIsFocused();
  useHardwareKeys((key) => (key === 'find' ? onOpenSearch() : go(key === 'left' ? -1 : 1)), focused && !marking);

  // Reading the chapter aloud with the phone's voice, verse by verse, on into the next chapter.
  const chapterVerses = useMemo(() => {
    if (!items) return null;
    const out: VerseRow[] = [];
    for (const it of items) {
      if (it.kind === 'verse') out.push(it.verse);
      else if (it.kind === 'para') out.push(...it.verses);
    }
    return out.filter((v) => !v.omitted && spokenText(v) !== '');
  }, [items]);
  const readOn = useCallback(() => {
    const n = neighbour(books, position.book, position.chapter, 1);
    if (!n) return false;
    scrollTarget.current = { flash: false };
    moveTo(n);
    return true;
  }, [books, position.book, position.chapter, moveTo]);
  const reading = useReadAloud({ chapterKey, verses: chapterVerses, translation, rate: settings.readSpeed, nextChapter: readOn });
  const readingVerse = reading.verse;
  // The verse being read is kept in view until the reader scrolls the page themselves.
  const [following, setFollowing] = useState(true);
  useEffect(() => {
    if (readingVerse === null || !following) return;
    const rows = itemsRef.current;
    if (!rows) return;
    const index = rows.findIndex((it) => (it.kind === 'verse' && it.verse.verse === readingVerse) || (it.kind === 'para' && it.verses.some((v) => v.verse === readingVerse)));
    if (index < 0) return;
    listRef.current?.scrollToIndex({ index, viewPosition: 0.2, animated: true });
  }, [readingVerse, following, items]);
  const NO_VOICE = { english: 'noEnglishVoice', malayalam: 'noMalayalamVoice', tamil: 'noTamilVoice', hindi: 'noHindiVoice' } as const;
  const startReading = async (from?: number) => {
    setActions(null);
    if (marking) setMarkTool(null);
    const language = voiceFor(translation) as keyof typeof NO_VOICE;
    if ((await hasVoice(language)) === false) {
      Alert.alert(t('noVoiceTitle'), t(NO_VOICE[language]));
      return;
    }
    setFollowing(true);
    const seen = firstVisible.current;
    reading.start(from ?? (seen && seen.key === chapterKey ? seen.verse : undefined));
  };
  const cycleSpeed = () => {
    const i = READ_SPEEDS.indexOf(settings.readSpeed);
    update({ readSpeed: READ_SPEEDS[(i + 1) % READ_SPEEDS.length] });
  };
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
          const forChapter = shownKey.current;
          setTimeout(() => scrollToRow({ index, viewPosition: 0 }, forChapter), 80);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  // The marked parts of each verse on screen, kept per verse so a verse redraws only when its own marks change:
  // a verse whose ranges are as before keeps the same array.
  const lastVerseMarks = useRef(new Map<number, [number, number, HighlightColor][]>());
  const verseMarks = useMemo(() => {
    const out = new Map<number, [number, number, HighlightColor][]>();
    if (items && marks.length > 0) {
      const before = lastVerseMarks.current;
      for (const it of items) {
        for (const v of it.kind === 'verse' ? [it.verse] : it.kind === 'para' ? it.verses : []) {
          const ranges = markRanges(marks, translation, v.book, v.chapter, v.verse, v.text.length);
          if (ranges.length === 0) continue;
          const old = before.get(v.verse);
          out.set(v.verse, old && sameRanges(old, ranges) ? old : ranges);
        }
      }
    }
    lastVerseMarks.current = out;
    return out;
  }, [items, marks, translation]);

  // Marker mode. Each word is its own view; when a finger has been held still on one, every
  // word of the chapter is measured once, and the finger is matched against those boxes as
  // it moves. The list's scroll since then is added in, so near the top or bottom edge the
  // text scrolls on under the finger without measuring again.
  const bodyRef = useRef<View>(null);
  const wordSlots = useRef(new Map<string, WordSlot>());
  const registerWord = useCallback((key: string, slot: WordSlot | null) => {
    if (slot) wordSlots.current.set(key, slot);
    else wordSlots.current.delete(key);
  }, []);
  const scrollY = useRef(0);
  const contentHeight = useRef(0);
  const listHeight = useRef(0);

  // The tab bar folds away while the text is scrolled down, and comes back on scrolling
  // up a little, near the top or end of the chapter, and on a new chapter.
  const [barHidden, setBarHidden] = useState(false);
  const scrollRun = useRef(0);
  const onListScroll = useCallback(
    (y: number) => {
      const dy = y - scrollY.current;
      scrollY.current = y;
      if (!tabs || dy === 0) return;
      if (Math.sign(dy) !== Math.sign(scrollRun.current)) scrollRun.current = 0;
      scrollRun.current += dy;
      const nearEnd = y + listHeight.current >= contentHeight.current - 48;
      if (y < 48 || nearEnd || scrollRun.current < -BAR_SCROLL) setBarHidden(false);
      else if (scrollRun.current > BAR_SCROLL) setBarHidden(true);
    },
    [tabs],
  );
  useEffect(() => setBarHidden(false), [position.book, position.chapter]);
  type DragState = {
    boxes: WordBox[] | null;
    body: { x: number; y: number; height: number } | null;
    scrollAt: number;
    point: { x: number; y: number };
    anchor: WordBox | null;
    current: WordBox | null;
    ended: boolean;
  };
  const drag = useRef<DragState | null>(null);
  const autoScroll = useRef<ReturnType<typeof setInterval> | null>(null);
  const markRef = useRef({ markTool, marks, translation, position, update });
  markRef.current = { markTool, marks, translation, position, update };

  const measureWords = (): Promise<{ boxes: WordBox[]; body: { x: number; y: number; height: number } | null }> => {
    const { position: at } = markRef.current;
    const prefix = `${at.book}:${at.chapter}:`;
    const slots = [...wordSlots.current].filter(([key]) => key.startsWith(prefix)).map(([, slot]) => slot);
    const boxes: WordBox[] = [];
    let body: { x: number; y: number; height: number } | null = null;
    return new Promise((resolve) => {
      let left = slots.length + 1;
      // A view that has gone from the screen may never answer; settle with what has.
      const timer = setTimeout(() => resolve({ boxes, body }), 400);
      const done = () => {
        left -= 1;
        if (left === 0) {
          clearTimeout(timer);
          resolve({ boxes, body });
        }
      };
      if (bodyRef.current) {
        bodyRef.current.measureInWindow((x, y, _w, height) => {
          body = { x, y, height };
          done();
        });
      } else done();
      for (const slot of slots) {
        slot.view.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) boxes.push({ verse: slot.verse, start: slot.start, end: slot.end, left: x, top: y, right: x + w, bottom: y + h });
          done();
        });
      }
    });
  };

  // Match the finger to a word and show the stretch from the first word to it.
  const followFinger = (state: DragState) => {
    if (!state.boxes || !state.body) return;
    const x = state.body.x + state.point.x;
    const y = state.body.y + state.point.y + (scrollY.current - state.scrollAt);
    const hit = nearestWord(state.boxes, x, y);
    if (!hit || hit === state.current) return;
    if (!state.anchor) state.anchor = hit;
    state.current = hit;
    setSelection(spanOf(state.anchor, hit));
  };

  const stopAutoScroll = () => {
    if (autoScroll.current) clearInterval(autoScroll.current);
    autoScroll.current = null;
  };

  const finishMark = (state: DragState) => {
    stopAutoScroll();
    if (drag.current === state) drag.current = null;
    setSelection(null);
    setDragging(false);
    const { markTool: tool, marks: saved, translation: tr, position: at, update: save } = markRef.current;
    if (!tool || !state.anchor || !state.current) return;
    const { from, to } = spanOf(state.anchor, state.current);
    if (tool === 'erase') {
      const next = eraseMarks(saved, tr, at.book, at.chapter, from, to);
      if (next.length !== saved.length) save({ marks: next });
    } else {
      const now = Date.now();
      save({ marks: addMark(saved, { id: `${now}`, translation: tr, book: at.book, chapter: at.chapter, from, to, color: tool, added: now }) });
    }
    Haptics.selectionAsync().catch(() => undefined);
  };

  const markHandlers = useRef({
    start: (_x: number, _y: number) => undefined as void,
    move: (_x: number, _y: number) => undefined as void,
    end: () => undefined as void,
    cancel: () => undefined as void,
  });
  markHandlers.current = {
    start: (x, y) => {
      if (!markRef.current.markTool) return;
      const state: DragState = { boxes: null, body: null, scrollAt: scrollY.current, point: { x, y }, anchor: null, current: null, ended: false };
      drag.current = state;
      setDragging(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      measureWords().then(({ boxes, body }) => {
        if (drag.current !== state) return;
        state.boxes = boxes;
        state.body = body;
        state.scrollAt = scrollY.current;
        followFinger(state);
        if (state.ended) finishMark(state);
      });
    },
    move: (x, y) => {
      const state = drag.current;
      if (!state) return;
      state.point = { x, y };
      followFinger(state);
      // Near the top or bottom of the text, scroll on while the finger stays there.
      const height = state.body?.height ?? 0;
      const speed = height > 0 ? (y < SCROLL_BAND ? -1 : y > height - SCROLL_BAND ? 1 : 0) : 0;
      if (speed === 0) {
        stopAutoScroll();
        return;
      }
      if (autoScroll.current) return;
      autoScroll.current = setInterval(() => {
        const now = drag.current;
        if (!now || !now.body) return stopAutoScroll();
        const dir = now.point.y < SCROLL_BAND ? -1 : now.point.y > now.body.height - SCROLL_BAND ? 1 : 0;
        const max = Math.max(0, contentHeight.current - now.body.height);
        const next = Math.min(max, Math.max(0, scrollY.current + dir * 14));
        if (dir === 0 || next === scrollY.current) return stopAutoScroll();
        scrollY.current = next;
        listRef.current?.scrollToOffset({ offset: next, animated: false });
        followFinger(now);
      }, 16);
    },
    end: () => {
      const state = drag.current;
      if (!state) return;
      if (!state.boxes) state.ended = true;
      else finishMark(state);
    },
    cancel: () => {
      const state = drag.current;
      if (!state || state.ended) return;
      state.anchor = null;
      finishMark(state);
    },
  };
  useEffect(() => stopAutoScroll, []);

  // Hold a word still, then drag to the last word to mark and let go. A finger that moves
  // before the hold is a scroll, as usual.
  const markPan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(300)
        .maxPointers(1)
        .runOnJS(true)
        .onStart((e) => markHandlers.current.start(e.x, e.y))
        .onUpdate((e) => markHandlers.current.move(e.x, e.y))
        // A drag cut short (a second finger, a call coming in) marks nothing.
        .onEnd((_e, success) => (success ? markHandlers.current.end() : markHandlers.current.cancel())),
    [],
  );

  const gestures = useMemo(() => (marking ? Gesture.Simultaneous(markPan, pinch) : Gesture.Simultaneous(swipe, pinch)), [marking, markPan, swipe, pinch]);

  const startMarking = (from?: VerseRow) => {
    setActions(null);
    reading.stop();
    if (from) markFrom.current = from.verse;
    setMarkTool(lastMarkColor);
  };
  const chooseTool = (tool: HighlightColor | 'erase') => {
    if (tool !== 'erase') lastMarkColor = tool;
    setMarkTool(tool);
  };
  const stopMarking = () => {
    const state = drag.current;
    if (state) {
      state.anchor = null;
      finishMark(state);
    }
    setMarkTool(null);
  };

  // Cycle through the translations bundled in this edition, staying on the verse at the
  // top of the screen (which can have another number, or chapter, in the other translation).
  const native = nativeTranslation(edition);
  const nextTranslation = edition.translations[(edition.translations.indexOf(translation) + 1) % edition.translations.length];
  const switchTranslation = async (next: TranslationId) => {
    if (next === translation) return;
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
  // Side by side shows both Bibles: the one open on the left (it is the one read aloud,
  // and stays open when the phone is turned back), the other beside it.
  const besideTranslation: TranslationId = translation === nativeBible ? 'KJV' : nativeBible ?? 'KJV';
  // The other Bible's verses beside each verse of the chapter, with the chapter they belong to.
  const [beside, setBeside] = useState<{ key: string; verses: Map<number, VerseRow[]> } | null>(null);
  const besideKey = `${translation}:${besideTranslation}:${chapterKey}`;
  useEffect(() => {
    if (!sideBySide || !items) return;
    let cancelled = false;
    const verses = items.flatMap((it) => (it.kind === 'verse' ? [it.verse.verse] : []));
    getBeside(db, translation, besideTranslation, position.book, position.chapter, verses)
      .then((map) => {
        if (!cancelled) setBeside({ key: besideKey, verses: map });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideBySide, items, besideKey]);
  const besideVerses = sideBySide && beside?.key === besideKey ? beside.verses : null;

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

  const verseForClipboard = (v: VerseRow) => shareText(books, v, translation, flattenVerse(v.text));

  const copyVerse = async (v: VerseRow) => {
    setActions(null);
    await Clipboard.setStringAsync(verseForClipboard(v));
    setToast(t('copied'));
  };
  // A verse goes on a page as its reference, which the page shows with the verse text.
  const addToPage = (v: VerseRow, pageId: string | null) => {
    setToNotebook(null);
    const line = formatRef(books, v, translation);
    if (pageId) {
      notebook.append(pageId, line);
      const p = notebook.pages.find((x) => x.id === pageId);
      setToast(t('addedToPage', { title: p ? pageName(p, t('untitled')) : t('notebook') }));
    } else {
      onOpenNotePage(notebook.create(`${line}\n`), true);
    }
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
  // The notes with the one being written put in (or taken out, when its text is cleared).
  const notesWith = (editor: { verse: VerseRow; text: string }) => {
    const next = { ...userNotes };
    const text = editor.text.trim();
    if (text) next[bookmarkKey(editor.verse)] = text;
    else delete next[bookmarkKey(editor.verse)];
    return next;
  };
  const noteChanged = (editor: { verse: VerseRow; text: string }) => editor.text.trim() !== (userNotes[bookmarkKey(editor.verse)] ?? '');
  const saveNote = () => {
    if (!noteEditor) return;
    const text = noteEditor.text.trim();
    update({ notes: notesWith(noteEditor) });
    setNoteEditor(null);
    confirmHaptic();
    setToast(text ? t('noteSaved') : t('noteRemoved'));
  };
  // Closing the note any other way (outside, back, a swipe down) keeps what was typed, as
  // Save does; a note left as it was just closes.
  const closeNote = () => {
    if (noteEditor && noteChanged(noteEditor)) saveNote();
    else setNoteEditor(null);
  };
  // Leaving the app with a note open writes it at once (Android may close the app without
  // another word); the note stays open for when the reader comes back.
  const noteState = useRef({ noteEditor, noteChanged, notesWith, commit });
  noteState.current = { noteEditor, noteChanged, notesWith, commit };
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const { noteEditor: editor, noteChanged: changed, notesWith: withNote, commit: save } = noteState.current;
      if (state === 'active' || !editor || !changed(editor)) return;
      save({ notes: withNote(editor) });
    });
    return () => sub.remove();
  }, []);

  const scriptFont = scriptureFont(translationInfo(translation).script, settings.serif) ?? theme.font;

  const toggleExpanded = useCallback((verse: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(verse)) next.delete(verse);
      else next.add(verse);
      return next;
    });
  }, []);

  // Rows call back into the reader through this ref, so their callbacks never change and
  // a memoised row redraws only when its own verse's state does.
  const rowActions = useRef<RowActions>(null as unknown as RowActions);
  rowActions.current = {
    word: handleWord,
    actions: (v) => openActions(v),
    note: (v, n) => setNote({ verse: v, note: n }),
    userNote: (v) => openNote(v),
    toggle: toggleExpanded,
  };
  const onRowWord = useCallback((pick: WordPick) => rowActions.current.word(pick), []);
  const wordTap = study ? onRowWord : undefined;

  const renderItem = useCallback(
    ({ item }: { item: Item }) => {
      if (item.kind === 'heading') {
        return (
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: theme.muted, fontSize: fontSize - 3, fontFamily: scriptFont }, !!translationInfo(translation).script && styles.headingMalayalam]}
          >
            {item.text}
          </Text>
        );
      }
      if (item.kind === 'para') {
        return (
          <Text style={[styles.para, { fontSize, lineHeight: Math.round(fontSize * translationInfo(translation).lineHeight), color: theme.text, fontFamily: scriptFont }]}>
            {item.verses.map((v, i) => {
              const color = highlights[bookmarkKey(v)];
              return (
                <React.Fragment key={v.verse}>
                  {i > 0 ? ' ' : null}
                  <ParaVerse
                    verse={v}
                    fontSize={fontSize}
                    onWord={wordTap}
                    actions={rowActions}
                    numberLabel={t('verseActions', { n: v.verse })}
                    notes={notes.get(v.verse)}
                    underline={underlineWords}
                    flash={flash === v.verse || readingVerse === v.verse}
                    bookmarked={bookmarked.has(bookmarkKey(v))}
                    highlightColor={color ? theme.marks[color] : undefined}
                    marks={verseMarks.get(v.verse)}
                    hasNote={bookmarkKey(v) in userNotes}
                    translation={translation}
                  />
                </React.Fragment>
              );
            })}
          </Text>
        );
      }
      const v = item.verse;
      const flashing = flash === v.verse || readingVerse === v.verse;
      const marked = bookmarked.has(bookmarkKey(v));
      const mark = highlights[bookmarkKey(v)];
      if (marking && !v.omitted) {
        // Only the part of the selection inside this verse, so other verses keep their props.
        const inVerse =
          selection && v.verse >= selection.from.verse && v.verse <= selection.to.verse
            ? ([v.verse === selection.from.verse ? selection.from.offset : 0, v.verse === selection.to.verse ? selection.to.offset : v.text.length] as [number, number])
            : null;
        return (
          <View style={[styles.verse, marked && [styles.verseBookmarked, { borderLeftColor: theme.accent }], mark ? { backgroundColor: theme.marks[mark] } : null]}>
            <MarkableVerse
              verse={v}
              fontSize={fontSize}
              lineHeight={Math.round(fontSize * translationInfo(translation).lineHeight)}
              font={scriptFont}
              theme={theme}
              marks={verseMarks.get(v.verse) ?? NO_MARKS}
              selection={inVerse}
              selectionColor={markTool === 'erase' || !markTool ? theme.border : theme.marks[markTool]}
              selectionText={markTool === 'erase' || !markTool ? theme.text : theme.markText}
              highlighted={!!mark}
              register={registerWord}
            />
          </View>
        );
      }
      const isExpanded = expanded.has(v.verse);
      // Side by side, the Hebrew or Greek words run under both columns, for every verse.
      const showOriginal = interlinear && (sideBySide || interlinearMode === 'all' || isExpanded);
      const verseRow = (
        <ReaderVerse
          verse={v}
          fontSize={fontSize}
          lineHeight={Math.round(fontSize * translationInfo(translation).lineHeight)}
          theme={theme}
          translation={translation}
          interlinear={interlinear && !sideBySide}
          tapMode={interlinear && !sideBySide && interlinearMode === 'tap'}
          expanded={isExpanded}
          words={showOriginal && !sideBySide ? originalWords?.get(v.verse) : undefined}
          flashing={flashing}
          marked={marked}
          markColor={mark ? theme.marks[mark] : undefined}
          hasNote={bookmarkKey(v) in userNotes}
          notes={notes.get(v.verse)}
          underlineWords={underlineWords}
          marks={verseMarks.get(v.verse)}
          showTranslit={showTranslit}
          hideCantillation={hideCantillation}
          numberLabel={t('verseActions', { n: v.verse })}
          tapLabel={`${v.verse}, ${t('tapVerseNumber', { lang: originalLanguage(v) })}`}
          onWord={wordTap}
          actions={rowActions}
        />
      );
      if (!sideBySide) return verseRow;
      // The other Bible beside the verse, and the Hebrew or Greek words across both columns.
      const english = besideVerses?.get(v.verse) ?? [];
      const words = showOriginal ? originalWords?.get(v.verse) : undefined;
      return (
        <View style={[styles.pair, { borderBottomColor: theme.border }]}>
          <View style={styles.pairRow}>
            <View style={styles.pairColumn}>{verseRow}</View>
            <View style={[styles.pairColumn, styles.pairRight, mark ? { backgroundColor: theme.marks[mark] } : null, flashing && { backgroundColor: theme.highlight }]}>
              {english.map((e) => (
                <VerseText
                  key={`${e.book}:${e.chapter}:${e.verse}`}
                  verse={e}
                  fontSize={fontSize}
                  onWord={wordTap}
                  onLongPress={() => rowActions.current.actions(v)}
                  underline={underlineWords && !interlinear}
                  onHighlight={!!mark && !flashing}
                  selectionTranslation={besideTranslation}
                  withChapter={e.chapter !== v.chapter}
                />
              ))}
            </View>
          </View>
          {words && words.length > 0 ? (
            <InterlinearVerse words={words} hebrew={v.book <= 39} fontSize={fontSize} onWord={onRowWord} showTranslit={showTranslit} hideCantillation={hideCantillation} />
          ) : null}
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sideBySide, besideVerses, theme, fontSize, wordTap, onRowWord, underlineWords, flash, readingVerse, interlinear, interlinearMode, expanded, originalWords, notes, bookmarked, highlights, userNotes, showTranslit, hideCantillation, translation, t, scriptFont, verseMarks, marking, markTool, selection, registerWord],
  );

  // The list's own props stay the same objects between renders, so a change elsewhere on
  // the screen (the tab bar, a toast, a sheet) does not redraw the rows.
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => onListScroll(e.nativeEvent.contentOffset.y), [onListScroll]);
  const onListLayout = useCallback((e: LayoutChangeEvent) => {
    listHeight.current = e.nativeEvent.layout.height;
  }, []);
  const onContentSizeChange = useCallback((_w: number, h: number) => {
    contentHeight.current = h;
  }, []);
  const listHeader = useMemo(
    () => (
      <>
        {tipSeen ? null : (
          <View style={[styles.tip, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
            <Text style={[styles.tipText, { color: theme.text }]}>{translationInfo(translation).tagged ? t('tip') : t('tipNoTags')}</Text>
            <View style={styles.tipButtons}>
              <Pressable onPress={onOpenHowTo} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.tipDismiss, { color: theme.accent }]}>{t('howTo')}</Text>
              </Pressable>
              <Pressable onPress={() => update({ tipSeen: true })} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.tipDismiss, { color: theme.accent }]}>{t('gotIt')}</Text>
              </Pressable>
            </View>
          </View>
        )}
        {/* After a fortnight with the app, once: an invitation to write to us. */}
        {tipSeen && !marking && feedbackCardDue(feedbackDue, Date.now()) ? (
          <View style={[styles.tip, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
            <Text style={[styles.tipText, { color: theme.text }]}>{t('feedbackCard')}</Text>
            <View style={styles.tipButtons}>
              <Pressable onPress={() => update({ feedbackDue: feedbackLater(Date.now()) })} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.tipDismiss, { color: theme.accent }]}>{t('feedbackNotNow')}</Text>
              </Pressable>
              <Pressable onPress={() => update({ feedbackDue: FEEDBACK_NEVER })} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.tipDismiss, { color: theme.accent }]}>{t('feedbackNever')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  update({ feedbackDue: FEEDBACK_NEVER });
                  writeToUs();
                }}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={[styles.tipDismiss, { color: theme.accent }]}>{t('feedback')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {/* The book's introduction, offered where a book is begun (it is also above the chapter numbers). */}
        {study && position.chapter === 1 && !marking ? (
          <Pressable
            onPress={() => onOpenIntro(position.book)}
            android_ripple={{ color: theme.accentSoft }}
            accessibilityRole="link"
            accessibilityLabel={t('aboutBook')}
            style={({ pressed }) => [styles.aboutRow, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="info" size={18} color={theme.accent} />
            <Text style={[styles.aboutText, { color: theme.accent, fontFamily: scriptureFont(scriptOf(bookName(books, position.book, translation)), settings.serif) ?? theme.font }]}>
              {t('aboutBookNamed', { book: bookName(books, position.book, translation) })}
            </Text>
            <Icon name="chevron_right" size={18} color={theme.accent} />
          </Pressable>
        ) : null}
        {!marking && interlinear && interlinearMode === 'tap' ? (
          <Text style={[styles.modeHint, { color: theme.muted }]}>{t('tapVerseNumber', { lang: book?.testament === 'OT' ? t('hebrew') : t('greek') })}</Text>
        ) : null}
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tipSeen, feedbackDue, writeToUs, theme, translation, t, update, marking, interlinear, interlinearMode, book?.testament, position.chapter, position.book, books, settings.serif, onOpenIntro, study, onOpenHowTo],
  );
  const onScrollToIndexFailed = useCallback((info: { index: number; averageItemLength: number }) => {
    // The row is not measured yet: get near it, then retry with the same placement.
    const pending = pendingScroll.current;
    if (!pending || pending.index !== info.index) return;
    listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
    if (retryTimer.current) clearTimeout(retryTimer.current);
    const forChapter = shownKey.current;
    retryTimer.current = setTimeout(() => scrollToRow(pending, forChapter), 120);
  }, [scrollToRow]);

  const title = useMemo(() => `${bookName(books, position.book, translation)} ${position.chapter}`, [books, position, translation]);
  // With the tab bar, it keeps the space for the phone's navigation bar.
  const bottomInset = tabs ? 0 : insets.bottom;
  // On a tablet the chapter row and the player keep to the reading width, under the text.
  const barSide = Math.max(0, (windowWidth - (sideBySide ? SIDE_BY_SIDE_MAX_WIDTH : MAX_CONTENT_WIDTH)) / 2);
  const atStart = position.book === books[0]?.id && position.chapter === 1;
  const atEnd = position.book === books[books.length - 1]?.id && position.chapter === book?.chapters;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header
        onBack={onBack}
        backLabel={backLabel}
        maxWidth={sideBySide ? SIDE_BY_SIDE_MAX_WIDTH : undefined}
        center={
          <ReaderTitle
            name={bookName(books, position.book, translation)}
            short={shortBookName(position.book, translation)}
            chapter={position.chapter}
            script={translationInfo(translation).script ?? null}
            onPress={() => setPicking(true)}
            accessibilityLabel={t('choosePassage', { title })}
          />
        }
        right={
          <>
            {/* Study tools on and off: a filled cap when on. */}
            <IconButton
              name={study ? 'school_fill' : 'school'}
              color={study ? theme.accent : theme.text}
              onPress={() => {
                update({ study: !study });
                setToast(t(study ? 'studyToolsOffNote' : 'studyToolsOnNote'));
              }}
              accessibilityLabel={t(study ? 'studyToolsOff' : 'studyToolsOn')}
            />
            <HeaderIconButton icon="volume_up" onPress={() => startReading()} accessibilityLabel={t('readAloud')} />
            <HeaderIconButton icon="search" onPress={onOpenSearch} accessibilityLabel={t('search')} />
            <HeaderIconButton icon="settings" onPress={onOpenSettings} accessibilityLabel={t('settings')} />
          </>
        }
      />
      {keepAwake || (reading.active && reading.playing) ? <KeepAwake /> : null}
      <GestureDetector gesture={gestures}>
        <View style={styles.body} ref={bodyRef} collapsable={false}>
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
          keyExtractor={itemKey}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, sideBySide && styles.listWide]}
          scrollEnabled={!dragging}
          onScroll={onScroll}
          onScrollBeginDrag={reading.active ? () => setFollowing(false) : undefined}
          onLayout={onListLayout}
          scrollEventThrottle={16}
          onContentSizeChange={onContentSizeChange}
          initialNumToRender={20}
          viewabilityConfig={viewability}
          onViewableItemsChanged={onViewableItemsChanged}
          ListHeaderComponent={listHeader}
          onScrollToIndexFailed={onScrollToIndexFailed}
          ListFooterComponent={LIST_FOOTER}
        />
      )}
        </View>
      </GestureDetector>
      {marking ? (
        <View style={[styles.markBar, { paddingBottom: bottomInset + 8, borderTopColor: theme.border, backgroundColor: theme.bg }]}>
          <Text style={[styles.markHint, { color: theme.muted }]}>{markTool === 'erase' ? t('eraseHint') : t('markHint')}</Text>
          <View style={styles.markRow}>
            <View style={styles.markTools}>
              {HIGHLIGHT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => chooseTool(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('highlight')} ${t(COLOUR_NAMES[c])}`}
                  accessibilityState={{ selected: markTool === c }}
                  hitSlop={4}
                  style={[
                    styles.markSwatch,
                    { backgroundColor: theme.marks[c], borderColor: markTool === c ? theme.accent : theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)' },
                    markTool === c && styles.markSwatchChosen,
                  ]}
                >
                  {markTool === c ? <Icon name="check" size={18} color={theme.markText} /> : null}
                </Pressable>
              ))}
              <Pressable
                onPress={() => chooseTool('erase')}
                accessibilityRole="button"
                accessibilityLabel={t('eraser')}
                accessibilityState={{ selected: markTool === 'erase' }}
                hitSlop={4}
                style={[
                  styles.markSwatch,
                  { borderColor: markTool === 'erase' ? theme.accent : theme.border, backgroundColor: markTool === 'erase' ? theme.accentSoft : 'transparent' },
                  markTool === 'erase' && styles.markSwatchChosen,
                ]}
              >
                <Icon name="ink_eraser" size={20} color={markTool === 'erase' ? theme.accent : theme.muted} />
              </Pressable>
            </View>
            <Pressable onPress={stopMarking} accessibilityRole="button" style={({ pressed }) => [styles.markDone, { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.markDoneText, { color: theme.onAccent }]}>{t('markDone')}</Text>
            </Pressable>
          </View>
        </View>
      ) : reading.active ? (
        <View style={[styles.playerBar, { paddingBottom: bottomInset + 8, paddingHorizontal: 10 + barSide, borderTopColor: theme.border, backgroundColor: theme.bg }]}>
          {!following ? (
            <Pressable
              onPress={() => setFollowing(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.backToReading, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={[styles.backToReadingText, { color: theme.onAccent }]}>{t('backToReading')}</Text>
            </Pressable>
          ) : null}
          <View style={styles.playerRow}>
            <Text numberOfLines={1} style={[styles.playerRef, { color: theme.muted }]}>
              {`${shortBookName(position.book, translation)} ${position.chapter}${readingVerse ? `:${readingVerse}` : ''}`}
            </Text>
            <IconButton name="skip_previous" onPress={() => reading.step(-1)} accessibilityLabel={t('previousVerse')} color={theme.text} />
            <Pressable
              onPress={reading.playing ? reading.pause : reading.resume}
              accessibilityRole="button"
              accessibilityLabel={reading.playing ? t('pauseReading') : t('resumeReading')}
              style={({ pressed }) => [styles.playButton, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}
            >
              <Icon name={reading.playing ? 'pause' : 'play_arrow'} size={30} color={theme.onAccent} />
            </Pressable>
            <IconButton name="skip_next" onPress={() => reading.step(1)} accessibilityLabel={t('nextVerse')} color={theme.text} />
            <Pressable
              onPress={cycleSpeed}
              accessibilityRole="button"
              accessibilityLabel={`${t('readingSpeed')} ${settings.readSpeed}×`}
              hitSlop={6}
              style={[styles.speedChip, { borderColor: theme.border }]}
            >
              <Text style={[styles.speedText, { color: theme.text }]}>{settings.readSpeed}×</Text>
            </Pressable>
            <IconButton name="close" onPress={reading.stop} accessibilityLabel={t('stopReading')} color={theme.muted} />
          </View>
        </View>
      ) : (
      <View style={[styles.footer, shortScreen && styles.footerShort, { paddingBottom: bottomInset + (shortScreen ? 4 : 8), paddingHorizontal: 12 + barSide, borderTopColor: theme.border, backgroundColor: theme.bg }]}>
        <ChapterArrow icon="chevron_left" onPress={() => go(-1)} disabled={atStart} accessibilityLabel={t('previousChapter')} />
        <View style={styles.footerMiddle}>
          {/* One button for the Bibles. The Malayalam and Tamil apps name the other one, the
              language a tap takes you to, in the interface language (ENG or ഇംഗ്ലീഷ് while
              reading Malayalam, MAL or മലയാളം while reading English); the English app names the one open (KJV) and moves on to the next
              (BSB, then WEB) with each tap. Settings lists each version in full. */}
          {/* Side by side shows both Bibles, so there is nothing to switch. */}
          {sideBySide ? null : (
          <Pressable
            android_ripple={{ color: theme.accentSoft }}
            onPress={() => switchTranslation(nextTranslation)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('switchTo', { name: translationInfo(nextTranslation).name })}
            style={({ pressed }) => [styles.pill, { borderColor: theme.accent, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.pillText, { color: theme.accent }]}>
              {native ? t(nextTranslation === 'MAL' ? 'bibleMalayalam' : nextTranslation === 'TAM' ? 'bibleTamil' : 'bibleEnglish') : translation}
            </Text>
          </Pressable>
          )}
          {study ? (
          <Pressable
            android_ripple={{ color: theme.accentSoft }}
            onPress={() => update({ interlinear: !interlinearSetting })}
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
          ) : null}
        </View>
        <ChapterArrow icon="chevron_right" onPress={() => go(1)} disabled={atEnd} accessibilityLabel={t('nextChapter')} />
      </View>
      )}

      {tabs ? <TabBar current="Reader" hidden={barHidden || marking} /> : null}

      {toast ? (
        <View style={[styles.toast, { backgroundColor: theme.text, bottom: insets.bottom + 70 + (tabs && !barHidden && !marking ? TAB_BAR_HEIGHT : 0) }]} pointerEvents="none">
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
            <Text style={[styles.actionsPreview, { color: theme.muted, fontFamily: scriptFont }]} numberOfLines={3}>
              {flattenVerse(actions.text)}
            </Text>
            <View style={styles.actionButtons}>
              <ActionButton icon="content_copy" label={t('actCopy')} onPress={() => copyVerse(actions)} />
              <ActionButton icon="share" label={t('actShare')} onPress={() => shareVerse(actions)} />
              {bookmarked.has(bookmarkKey(actions)) ? (
                <ActionButton icon="bookmark_fill" label={t('actBookmarked')} onPress={() => toggleBookmark(actions)} accessibilityLabel={t('removeBookmark')} />
              ) : (
                <ActionButton icon="bookmark_add" label={t('actBookmark')} onPress={() => toggleBookmark(actions)} />
              )}
              <ActionButton icon="edit_note" label={t('actNote')} onPress={() => openNote(actions)} accessibilityLabel={bookmarkKey(actions) in userNotes ? t('editNote') : t('addNote')} />
            </View>
            {bookmarkKey(actions) in userNotes ? (
              <Pressable onPress={() => openNote(actions)} accessibilityRole="button" accessibilityLabel={t('editNote')} style={[styles.notePreview, { backgroundColor: theme.accentSoft }]}>
                <Icon name="sticky_note_2" size={20} color={theme.accent} />
                <Text style={[styles.notePreviewText, { color: theme.text }]} numberOfLines={3}>
                  {userNotes[bookmarkKey(actions)]}
                </Text>
              </Pressable>
            ) : null}
            <Text style={[styles.swatchLabel, { color: theme.muted }]}>{t('highlight')}</Text>
            <View style={styles.swatchRow}>
              {HIGHLIGHT_COLORS.map((c) => {
                const chosen = highlights[bookmarkKey(actions)] === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setHighlight(actions, c)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('highlight')} ${t(COLOUR_NAMES[c])}`}
                    accessibilityState={{ selected: chosen }}
                    hitSlop={6}
                    style={[styles.swatch, { backgroundColor: theme.marks[c], borderColor: theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)' }]}
                  >
                    {chosen ? <Icon name="check" size={20} color={theme.markText} /> : null}
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setHighlight(actions, null)}
                disabled={!highlights[bookmarkKey(actions)]}
                accessibilityRole="button"
                accessibilityLabel={t('noHighlight')}
                hitSlop={6}
                style={[styles.swatch, { borderColor: theme.border, opacity: highlights[bookmarkKey(actions)] ? 1 : 0.4 }]}
              >
                <Icon name="format_color_reset" size={20} color={theme.muted} />
              </Pressable>
            </View>
            <View style={[styles.actionsDivider, { backgroundColor: theme.border }]} />
            <SheetAction
              icon="image"
              label={t('shareAsCard')}
              detail={t('shareAsCardDetail')}
              onPress={() => {
                setActions(null);
                onOpenCard({ book: actions.book, chapter: actions.chapter, verse: actions.verse }, translation);
              }}
            />
            <SheetAction
              icon="note_add"
              label={t('addToNotebook')}
              detail={t('addToNotebookDetail')}
              onPress={() => {
                setActions(null);
                setToNotebook(actions);
              }}
            />
            <SheetAction icon="volume_up" label={t('readFromHere')} detail={t('readFromHereDetail')} onPress={() => startReading(actions.verse)} />
            <SheetAction icon="ink_highlighter" label={t('markText')} detail={t('markTextDetail')} onPress={() => startMarking(actions)} />
            {study ? (
            <SheetAction
              icon="compare_arrows"
              label={t('compare')}
              detail={t('compareDetail', { lang: originalLanguage(actions) })}
              onPress={() => {
                setActions(null);
                setCompare({ book: actions.book, chapter: actions.chapter, verse: actions.verse });
              }}
            />
            ) : null}
            {/* Shown once their counts are known; last, so their coming moves nothing under them. */}
            {study && actions.tags ? (
              <SheetAction
                icon="translate"
                label={t('wordsInVerse')}
                detail={t('wordsInVerseDetail')}
                onPress={() => {
                  setActions(null);
                  setWordsFor(actions);
                }}
              />
            ) : null}
            {study && crossCount && crossCount.key === bookmarkKey(actions) && crossCount.n > 0 ? (
              <SheetAction icon="link" label={t('crossReferences')} detail={t('crossReferencesDetail', { n: crossCount.n })} onPress={() => openCross(actions, 'crossrefs')} />
            ) : null}
            {study && crossCount && crossCount.key === bookmarkKey(actions) && crossCount.parallels > 0 ? (
              <SheetAction icon="view_column" label={t('parallelPassages')} detail={t('parallelPassagesDetail', { n: crossCount.parallels })} onPress={() => openCross(actions, 'parallels')} />
            ) : null}
          </>
        ) : null}
      </SimpleSheet>

      <SimpleSheet visible={!!cross} title={cross ? `${formatRef(books, cross.verse, translation)} · ${t(cross.kind === 'parallels' ? 'parallelPassages' : 'crossReferences')}` : ''} onClose={() => setCross(null)}>
        {cross ? (
          <View>
            {cross.list === null ? <Text style={[styles.crossLoading, { color: theme.muted }]}>…</Text> : null}
            {(cross.list ?? []).map((c) => {
              const label =
                formatRef(books, c.start, translation) +
                (c.end.chapter !== c.start.chapter ? `–${c.end.chapter}:${c.end.verse}` : c.end.verse !== c.start.verse ? `–${c.end.verse}` : '');
              return (
                <Pressable
                  key={label}
                  onPress={() => {
                    const from = formatRef(books, cross.verse, translation);
                    setCross(null);
                    onOpenRef(c.start, from);
                  }}
                  android_ripple={{ color: theme.accentSoft }}
                  accessibilityRole="link"
                  style={({ pressed }) => [styles.crossRow, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
                >
                  <Text style={[styles.crossRef, { color: theme.accent, fontSize: Math.max(15, fontSize - 3) }, !!scriptOf(label) && { fontFamily: scriptureFont(scriptOf(label), settings.serif, true), fontWeight: 'normal' }]}>{label}</Text>
                  {c.verses.length ? (
                    <Text style={{ color: theme.text, fontSize: Math.max(15, fontSize - 3), lineHeight: Math.round(Math.max(15, fontSize - 3) * translationInfo(translation).lineHeight), fontFamily: scriptFont }} numberOfLines={4}>
                      {c.verses.map((v) => flattenVerse(v.text)).join(' ')}
                    </Text>
                  ) : null}
                  {c.more > 0 ? <Text style={[styles.crossMore, { color: theme.muted }]}>{t('moreVerses', { n: c.more })}</Text> : null}
                </Pressable>
              );
            })}
            {cross.list ? <Text style={[styles.crossSource, { color: theme.muted }]}>{t(cross.kind === 'parallels' ? 'parallelPassagesSource' : 'crossReferencesSource')}</Text> : null}
          </View>
        ) : null}
      </SimpleSheet>

      <PassagePicker
        visible={picking}
        books={books}
        translation={translation}
        current={{ book: position.book, chapter: position.chapter }}
        lastChapters={lastChapters}
        onPick={(b, c) => {
          setPicking(false);
          scrollTarget.current = { flash: false };
          moveTo({ book: b, chapter: c });
        }}
        onClose={() => setPicking(false)}
      />

      <SimpleSheet visible={!!toNotebook} title={toNotebook ? `${t('choosePage')} · ${formatRef(books, toNotebook, translation)}` : ''} onClose={() => setToNotebook(null)}>
        {toNotebook ? (
          <>
            <SheetAction icon="add" label={t('newPage')} onPress={() => addToPage(toNotebook, null)} />
            {notebook.pages.filter((p) => !p.ink).map((p) => (
              <SheetAction key={p.id} icon="note_stack" label={pageName(p, t('untitled'))} onPress={() => addToPage(toNotebook, p.id)} />
            ))}
          </>
        ) : null}
      </SimpleSheet>

      <SimpleSheet visible={!!noteEditor} title={noteEditor ? `${t('note')} · ${formatRef(books, noteEditor.verse, translation)}` : ''} onClose={closeNote}>
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
                  android_ripple={{ color: theme.accentSoft }}
                  key={i}
                  onPress={() => {
                    setWordsFor(null);
                    handleWord({ strongs: seg.strongs!, word: seg.text, choices: seg.choices });
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.wordRow, { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.wordRowText, { color: theme.text }]}>{seg.text}</Text>
                  <Text style={[styles.wordRowId, { color: theme.muted }]}>{(seg.choices ?? [seg.strongs]).join(' + ')}</Text>
                </Pressable>
              ))
          : null}
      </SimpleSheet>

      <CompareSheet target={compare} translation={translation} books={books} onClose={() => setCompare(null)} onWord={handleWord} />
    </View>
  );
}

/** A chapter arrow: a round, see-through button at an end of the bottom row. */
function ChapterArrow({ icon, onPress, disabled, accessibilityLabel }: { icon: IconName; onPress: () => void; disabled?: boolean; accessibilityLabel: string }) {
  const theme = useTheme();
  return (
    <Pressable
      android_ripple={{ color: theme.accentSoft, borderless: true }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.arrow, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent', opacity: disabled ? 0.3 : 1 }]}
    >
      <Icon name={icon} size={26} color={theme.accent} />
    </Pressable>
  );
}

/**
 * The reader's title: book name and chapter, opening the book list. The full name is used
 * when it fits beside the buttons, else the short one (2. തിമൊഥെയൊസ് → 2 തിമൊ), and the
 * chapter number is its own text, so it is never cut off even when the name has to be.
 * When even the short name does not fit (a narrow phone, or large system text), the
 * letters shrink to fit, down to MIN_TITLE_SCALE of their size, and on the narrowest
 * screens the drop-down arrow is left out.
 */
function ReaderTitle({ name, short, chapter, script, onPress, accessibilityLabel }: { name: string; short: string; chapter: number; script: Script | null; onPress: () => void; accessibilityLabel: string }) {
  const theme = useTheme();
  const [room, setRoom] = useState(0);
  const [fullWidth, setFullWidth] = useState(0);
  const [shortWidth, setShortWidth] = useState(0);
  const measured = room > 0 && fullWidth > 0;
  const useShort = !!short && measured && fullWidth > room - ARROW_WIDTH;
  const needed = useShort ? shortWidth : fullWidth;
  // On the narrowest screens the drop-down arrow gives up its room before the name is cut.
  const showArrow = !measured || needed * MIN_TITLE_SCALE <= room - ARROW_WIDTH - 2;
  const avail = showArrow ? room - ARROW_WIDTH : room;
  // A couple of pixels' margin, so rounding never leaves the name a hair too wide.
  const scale = measured && needed > avail && needed > 0 ? Math.max(MIN_TITLE_SCALE, Math.floor(((avail - 2) / needed) * 100) / 100) : 1;
  const baseSize = script ? 20 : 22;
  const fontStyle = [styles.title, { color: theme.text }, !!script && { fontFamily: scriptureFont(script, false, true), fontWeight: 'normal' as const, fontSize: 20 }];
  // Both pieces get the same line height, so a shrunk name stays level with its number.
  const shownStyle = [fontStyle, scale < 1 && { fontSize: baseSize * scale, lineHeight: Math.round(baseSize * 1.5) }];
  return (
    <View style={styles.titleRoom} onLayout={(e) => setRoom(e.nativeEvent.layout.width)}>
      {/* The full and short titles laid out off screen, to see which fits. */}
      <View style={styles.titleMeasure} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={fontStyle} maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE} onLayout={(e) => setFullWidth(e.nativeEvent.layout.width)}>
          {`${name} ${chapter}`}
        </Text>
      </View>
      {short ? (
        <View style={styles.titleMeasure} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={fontStyle} maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE} onLayout={(e) => setShortWidth(e.nativeEvent.layout.width)}>
            {`${short} ${chapter}`}
          </Text>
        </View>
      ) : null}
      <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.titleButton}>
        <Text numberOfLines={1} maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE} style={[shownStyle, styles.titleName]}>
          {useShort ? short : name}
        </Text>
        <Text maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE} style={shownStyle}>{` ${chapter}`}</Text>
        {showArrow ? <Icon name="arrow_drop_down" color={theme.accent} /> : null}
      </Pressable>
    </View>
  );
}

const MIN_TITLE_SCALE = 0.6;
const ARROW_WIDTH = 28;

const NO_MARKS: [number, number, HighlightColor][] = [];
const itemKey = (it: Item) => it.key;
const LIST_FOOTER = <View style={{ height: 24 }} />;

function sameRanges(a: [number, number, HighlightColor][], b: [number, number, HighlightColor][]): boolean {
  return a.length === b.length && a.every((r, i) => r[0] === b[i][0] && r[1] === b[i][1] && r[2] === b[i][2]);
}

/** What a verse row calls back into the reader. */
interface RowActions {
  word: (pick: WordPick) => void;
  actions: (v: VerseRow) => void;
  note: (v: VerseRow, n: Note) => void;
  userNote: (v: VerseRow) => void;
  toggle: (verse: number) => void;
}

/** One verse's callbacks, the same while the verse is. */
function useVerseCallbacks(v: VerseRow, actions: React.RefObject<RowActions>) {
  return useMemo(
    () => ({
      openActions: () => actions.current.actions(v),
      openNote: (n: Note) => actions.current.note(v, n),
      openUserNote: () => actions.current.userNote(v),
      toggle: () => actions.current.toggle(v.verse),
    }),
    [v, actions],
  );
}

/** A verse inside a paragraph. */
const ParaVerse = memo(function ParaVerse({
  verse: v,
  fontSize,
  onWord,
  actions,
  numberLabel,
  notes,
  underline,
  flash,
  bookmarked,
  highlightColor,
  marks,
  hasNote,
  translation,
}: {
  verse: VerseRow;
  fontSize: number;
  /** Absent in the plain reader, where words are not tapped. */
  onWord?: (pick: WordPick) => void;
  actions: React.RefObject<RowActions>;
  numberLabel: string;
  notes: Note[] | undefined;
  underline: boolean;
  flash: boolean;
  bookmarked: boolean;
  highlightColor: string | undefined;
  marks: [number, number, HighlightColor][] | undefined;
  hasNote: boolean;
  translation: TranslationId;
}) {
  const cb = useVerseCallbacks(v, actions);
  return (
    <VerseText
      verse={v}
      fontSize={fontSize}
      onWord={onWord}
      onLongPress={cb.openActions}
      onNumberPress={cb.openActions}
      numberLabel={numberLabel}
      notes={notes}
      onNote={cb.openNote}
      underline={underline}
      flash={flash}
      bookmarked={bookmarked}
      highlightColor={highlightColor}
      marks={marks}
      hasNote={hasNote}
      onNotePress={cb.openUserNote}
      selectionTranslation={translation}
    />
  );
});

/** A verse on its own row, with its Hebrew or Greek words when they are shown. */
const ReaderVerse = memo(function ReaderVerse({
  verse: v,
  fontSize,
  lineHeight,
  theme,
  translation,
  interlinear,
  tapMode,
  expanded,
  words,
  flashing,
  marked,
  markColor,
  hasNote,
  notes,
  underlineWords,
  marks,
  showTranslit,
  hideCantillation,
  numberLabel,
  tapLabel,
  onWord,
  actions,
}: {
  verse: VerseRow;
  fontSize: number;
  lineHeight: number;
  theme: Theme;
  translation: TranslationId;
  interlinear: boolean;
  tapMode: boolean;
  expanded: boolean;
  words: OriginalWord[] | undefined;
  flashing: boolean;
  marked: boolean;
  markColor: string | undefined;
  hasNote: boolean;
  notes: Note[] | undefined;
  underlineWords: boolean;
  marks: [number, number, HighlightColor][] | undefined;
  showTranslit: boolean;
  hideCantillation: boolean;
  numberLabel: string;
  tapLabel: string;
  onWord?: (pick: WordPick) => void;
  actions: React.RefObject<RowActions>;
}) {
  const cb = useVerseCallbacks(v, actions);
  // While a verse shows its Hebrew or Greek words, those are what is tapped: the verse's
  // own words do not open the word sheet. With the Hebrew/Greek words on, no verse
  // underlines its words.
  const showingWords = !!words && words.length > 0;
  const underlined = underlineWords && !interlinear;
  // A flash (a jump here, or the verse being read aloud) covers the highlight colour, so
  // the text goes back to the colours made for the page.
  const onMark = !!markColor && !flashing;
  return (
    <View
      style={[
        styles.verse,
        interlinear && [styles.verseInterlinear, { borderBottomColor: theme.border }],
        marked && [styles.verseBookmarked, { borderLeftColor: theme.accent }],
        markColor ? { backgroundColor: markColor } : null,
        flashing && { backgroundColor: theme.highlight },
      ]}
    >
      {tapMode ? (
        // In tap mode the number stands in a column the height of the verse, and the
        // whole column shows or hides the verse's words: an easy target at any text size.
        <View style={styles.tapRow}>
          <Pressable
            onPress={cb.toggle}
            onLongPress={cb.openActions}
            android_ripple={{ color: theme.accentSoft }}
            accessibilityRole="button"
            accessibilityLabel={tapLabel}
            accessibilityState={{ expanded }}
            style={[styles.tapColumn, { width: Math.max(40, Math.round(fontSize * 2)) }]}
          >
            {v.verse > 0 ? (
              <Text style={[styles.tapNumber, { color: onMark ? theme.markAccent : theme.accent, fontSize: Math.max(14, fontSize - 4), lineHeight }]}>{v.verse}</Text>
            ) : null}
            <Icon name={expanded ? 'expand_less' : 'expand_more'} size={Math.max(12, Math.round(fontSize * 0.6))} color={onMark ? theme.markMuted : theme.muted} />
          </Pressable>
          <View style={styles.tapText}>
            <VerseText
              verse={v}
              fontSize={fontSize}
              onWord={showingWords ? undefined : onWord}
              onLongPress={cb.openActions}
              hasNote={hasNote}
              onNotePress={cb.openUserNote}
              showNumber={false}
              notes={notes}
              onNote={cb.openNote}
              underline={underlined}
              onHighlight={onMark}
              marks={marks}
              selectionTranslation={translation}
            />
          </View>
        </View>
      ) : (
        <VerseText
          verse={v}
          fontSize={fontSize}
          onWord={showingWords ? undefined : onWord}
          onLongPress={cb.openActions}
          hasNote={hasNote}
          onNotePress={cb.openUserNote}
          // The verse number opens the verse's actions.
          onNumberPress={cb.openActions}
          numberLabel={numberLabel}
          notes={notes}
          onNote={cb.openNote}
          underline={underlined}
          onHighlight={onMark}
          marks={marks}
          selectionTranslation={translation}
        />
      )}
      {words && words.length > 0 && onWord ? (
        <InterlinearVerse words={words} hebrew={v.book <= 39} fontSize={fontSize} onWord={onWord} showTranslit={showTranslit} hideCantillation={hideCantillation} highlighted={onMark} />
      ) : null}
    </View>
  );
});

/** One of the four round buttons at the top of the verse sheet: an icon over a short label. */
function ActionButton({ icon, label, onPress, accessibilityLabel }: { icon: IconName; label: string; onPress: () => void; accessibilityLabel?: string }) {
  const theme = useTheme();
  const script = scriptOf(label);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} android_ripple={{ color: theme.accentSoft }} style={styles.actionButton}>
      <View style={[styles.actionIcon, { backgroundColor: theme.accentSoft }]}>
        <Icon name={icon} color={theme.accent} />
      </View>
      <Text style={[styles.actionLabel, { color: theme.text }, !!script && { fontFamily: scriptureFont(script, false), fontWeight: 'normal' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  crossLoading: { fontSize: 18, paddingVertical: 12, paddingHorizontal: 20 },
  crossRow: { paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  crossRef: { fontSize: 15, fontWeight: '600' },
  crossMore: { fontSize: 13 },
  crossSource: { fontSize: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  screen: { flex: 1 },
  titleButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 48, maxWidth: '100%' },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '500' },
  titleName: { flexShrink: 1 },
  titleRoom: { flex: 1, justifyContent: 'center' },
  titleMeasure: { position: 'absolute', left: 0, top: 0, width: 2000, flexDirection: 'row', opacity: 0 },
  body: { flex: 1 },
  loading: { flex: 1 },
  para: { marginBottom: 12 },
  list: { paddingHorizontal: 18, paddingTop: 12, alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  listWide: { maxWidth: SIDE_BY_SIDE_MAX_WIDTH },
  pair: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 4, marginBottom: 4 },
  pairRow: { flexDirection: 'row', gap: 20 },
  pairColumn: { flex: 1 },
  pairRight: { paddingVertical: 2, paddingHorizontal: 4, borderRadius: 6 },
  verse: { paddingVertical: 5, borderRadius: 6 },
  verseInterlinear: { paddingBottom: 10, marginBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  tapRow: { flexDirection: 'row', alignItems: 'stretch' },
  tapColumn: { alignItems: 'center', marginLeft: -8, marginRight: 4, borderRadius: 8, overflow: 'hidden' },
  tapNumber: { fontWeight: '700' },
  tapText: { flex: 1 },
  verseBookmarked: { borderLeftWidth: 3, paddingLeft: 8, marginLeft: -11 },
  tip: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 10 },
  tipText: { fontSize: 15, lineHeight: 21 },
  tipButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 24, rowGap: 8, marginTop: 8 },
  tipDismiss: { fontSize: 15, fontWeight: '700' },
  modeHint: { fontSize: 12, marginBottom: 6 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginBottom: 4 },
  aboutText: { fontSize: 15, fontWeight: '600' },
  pill: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 14, fontWeight: '600' },
  heading: { fontWeight: '700', letterSpacing: 1, marginTop: 14, marginBottom: 2 },
  // Letter spacing breaks up Malayalam conjuncts on some phones.
  headingMalayalam: { letterSpacing: 0 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerShort: { paddingTop: 4 },
  nav: { fontSize: 16, fontWeight: '600' },
  footerMiddle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginHorizontal: 8 },
  arrow: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  playerBar: { paddingHorizontal: 10, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  playerRef: { flex: 1, fontSize: 14, marginLeft: 6 },
  playButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  speedChip: { minWidth: 52, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, marginLeft: 4 },
  speedText: { fontSize: 14, fontWeight: '600' },
  backToReading: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, marginBottom: 6 },
  backToReadingText: { fontSize: 14, fontWeight: '600' },
  markBar: { paddingHorizontal: 18, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  markHint: { fontSize: 13, lineHeight: 18 },
  markRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  markTools: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  markSwatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  markSwatchChosen: { borderWidth: 2 },
  markDone: { paddingHorizontal: 20, minHeight: 48, justifyContent: 'center', borderRadius: 999 },
  markDoneText: { fontSize: 15, fontWeight: '600' },
  toast: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  toastText: { fontSize: 14, fontWeight: '600' },
  noteText: { fontSize: 16, lineHeight: 23, paddingBottom: 8 },
  swatchLabel: { fontSize: 13, fontWeight: '500', marginBottom: 10 },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  actionButton: { width: 80, alignItems: 'center', gap: 6, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  actionIcon: { width: 56, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  notePreview: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, marginBottom: 16 },
  notePreviewText: { flex: 1, fontSize: 14, lineHeight: 20 },
  actionsDivider: { height: StyleSheet.hairlineWidth, marginBottom: 4 },
  noteInput: { minHeight: 110, maxHeight: 220, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  noteButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  noteDelete: { fontSize: 15 },
  noteSave: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  noteSaveText: { fontSize: 16, fontWeight: '600' },
  actionsPreview: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  failed: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  failedText: { fontSize: 16, textAlign: 'center' },
  failedButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  wordRowText: { fontSize: 17, flexShrink: 1 },
  wordRowId: { fontSize: 14, fontVariant: ['tabular-nums'] },
});
