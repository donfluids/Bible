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
import { Header, HeaderChip, HeaderIconButton } from '../components/Header';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { useEdition } from '../edition';
import { isMalayalam, scriptureFont } from '../fonts';
import { shortBookName } from '../shortNames';
import { useT } from '../i18n';
import { InterlinearVerse } from '../components/InterlinearVerse';
import { MarkableVerse } from '../components/MarkableVerse';
import type { WordSlot } from '../components/MarkableVerse';
import { addMark, comparePoints, eraseMarks, markRanges } from '../marks';
import { SheetAction, SimpleSheet } from '../components/SimpleSheet';
import { noteLetter, VerseText } from '../components/VerseText';
import { getChapter, getInterlinear, getNotes, mapRef } from '../queries';
import type { ChapterData } from '../queries';
import { FONT_SIZES, useSettings } from '../settings';
import type { Settings } from '../settings';
import { getPlace, moveMainReader, selectBook, selectChapter, updatePlace, usePlace } from '../place';
import type { Position } from '../place';
import { MAX_CONTENT_WIDTH, bookName, flattenVerse, formatRef, parseSegments, shareText } from '../text';
import { useTheme } from '../theme';
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
  // The words being marked while a finger is down, and whether one is (the list then holds still).
  const [selection, setSelection] = useState<{ from: TextPoint; to: TextPoint } | null>(null);
  const [dragging, setDragging] = useState(false);
  // Paragraph layout cannot hold the interlinear cells or the words of marker mode, so those
  // use one verse per line.
  const paragraphs = layout === 'paragraphs' && !interlinear && !marking;
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
    setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition, animated: false }), 80);
  }, [items, originalWords, interlinear, marking, paragraphs]);

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

  // The marked parts of each verse on screen, kept per verse so a verse redraws only when its own marks change.
  const verseMarks = useMemo(() => {
    const out = new Map<number, [number, number, HighlightColor][]>();
    if (!items || marks.length === 0) return out;
    for (const it of items) {
      for (const v of it.kind === 'verse' ? [it.verse] : it.kind === 'para' ? it.verses : []) {
        const ranges = markRanges(marks, translation, v.book, v.chapter, v.verse, v.text.length);
        if (ranges.length > 0) out.set(v.verse, ranges);
      }
    }
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

  const verseForClipboard = (v: VerseRow) => shareText(books, v, translation, flattenVerse(v.text));

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
                  marks={verseMarks.get(v.verse)}
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
              register={registerWord}
            />
          </View>
        );
      }
      const tapMode = interlinear && interlinearMode === 'tap';
      const showOriginal = interlinear && (interlinearMode === 'all' || expanded.has(v.verse));
      const words = showOriginal ? originalWords?.get(v.verse) : undefined;
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
          {tapMode ? (
            // In tap mode the number stands in a column the height of the verse, and the
            // whole column shows or hides the verse's words: an easy target at any text size.
            <View style={styles.tapRow}>
              <Pressable
                onPress={() => toggleExpanded(v.verse)}
                onLongPress={() => openActions(v)}
                android_ripple={{ color: theme.accentSoft }}
                accessibilityRole="button"
                accessibilityLabel={`${v.verse}, ${t('tapVerseNumber', { lang: originalLanguage(v) })}`}
                accessibilityState={{ expanded: expanded.has(v.verse) }}
                style={[styles.tapColumn, { width: Math.max(40, Math.round(fontSize * 2)) }]}
              >
                {v.verse > 0 ? (
                  <Text
                    style={[
                      styles.tapNumber,
                      { color: theme.accent, fontSize: Math.max(14, fontSize - 4), lineHeight: Math.round(fontSize * translationInfo(translation).lineHeight) },
                    ]}
                  >
                    {v.verse}
                  </Text>
                ) : null}
                <Icon name={expanded.has(v.verse) ? 'expand_less' : 'expand_more'} size={Math.max(18, fontSize - 2)} color={theme.accent} />
              </Pressable>
              <View style={styles.tapText}>
                <VerseText
                  verse={v}
                  fontSize={fontSize}
                  onWord={handleWord}
                  onLongPress={() => openActions(v)}
                  hasNote={bookmarkKey(v) in userNotes}
                  onNotePress={() => openNote(v)}
                  showNumber={false}
                  notes={notes.get(v.verse)}
                  onNote={(n) => setNote({ verse: v, note: n })}
                  underline={underlineWords}
                  marks={verseMarks.get(v.verse)}
                  selectionTranslation={translation}
                />
              </View>
            </View>
          ) : (
            <VerseText
              verse={v}
              fontSize={fontSize}
              onWord={handleWord}
              onLongPress={() => openActions(v)}
              hasNote={bookmarkKey(v) in userNotes}
              onNotePress={() => openNote(v)}
              // The verse number opens the verse's actions.
              onNumberPress={() => openActions(v)}
              numberLabel={t('verseActions', { n: v.verse })}
              notes={notes.get(v.verse)}
              onNote={(n) => setNote({ verse: v, note: n })}
              underline={underlineWords}
              marks={verseMarks.get(v.verse)}
              selectionTranslation={translation}
            />
          )}
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
    [theme, fontSize, handleWord, underlineWords, flash, interlinear, interlinearMode, expanded, originalWords, notes, bookmarked, highlights, userNotes, showTranslit, hideCantillation, toggleExpanded, translation, t, scriptFont, verseMarks, marking, markTool, selection, registerWord],
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
          <ReaderTitle
            name={bookName(books, position.book, translation)}
            short={shortBookName(position.book, translation)}
            chapter={position.chapter}
            malayalam={translation === 'MAL'}
            onPress={onOpenBooks}
            accessibilityLabel={t('choosePassage', { title })}
          />
        }
        right={
          <>
            {/* The Malayalam app tells its two Bibles apart by language (MAL, ENG); the English
                app has two English ones, so it uses their names (KJV, WEB). Settings lists each
                version in full. */}
            <HeaderChip
              icon="swap_horiz"
              label={edition.translations.includes('MAL') ? (translation === 'MAL' ? 'MAL' : 'ENG') : translation}
              onPress={toggleTranslation}
              accessibilityLabel={t('switchTranslation')}
            />
            <HeaderIconButton
              icon="ink_highlighter"
              onPress={marking ? stopMarking : () => startMarking()}
              accessibilityLabel={marking ? t('markDone') : t('markText')}
            />
            <HeaderIconButton icon="search" onPress={onOpenSearch} accessibilityLabel={t('search')} />
            <HeaderIconButton icon="settings" onPress={onOpenSettings} accessibilityLabel={t('settings')} />
          </>
        }
      />
      {keepAwake ? <KeepAwake /> : null}
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
          keyExtractor={(it) => it.key}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          scrollEnabled={!dragging}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          onContentSizeChange={(_w, h) => {
            contentHeight.current = h;
          }}
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
              {!marking && interlinear && interlinearMode === 'tap' ? (
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
      {marking ? (
        <View style={[styles.markBar, { paddingBottom: insets.bottom + 8, borderTopColor: theme.border, backgroundColor: theme.bg }]}>
          <Text style={[styles.markHint, { color: theme.muted }]}>{markTool === 'erase' ? t('eraseHint') : t('markHint')}</Text>
          <View style={styles.markRow}>
            <View style={styles.markTools}>
              {HIGHLIGHT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => chooseTool(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('highlight')} ${c}`}
                  accessibilityState={{ selected: markTool === c }}
                  hitSlop={4}
                  style={[
                    styles.markSwatch,
                    { backgroundColor: theme.marks[c], borderColor: markTool === c ? theme.accent : theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)' },
                    markTool === c && styles.markSwatchChosen,
                  ]}
                >
                  {markTool === c ? <Icon name="check" size={18} color={theme.text} /> : null}
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
      ) : (
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8, borderTopColor: theme.border, backgroundColor: theme.bg }]}>
        <NavButton label={t('previous')} onPress={() => go(-1)} disabled={atStart} />
        <Pressable
          android_ripple={{ color: theme.accentSoft }}
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
      )}

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
                    accessibilityLabel={`${t('highlight')} ${c}`}
                    accessibilityState={{ selected: chosen }}
                    hitSlop={6}
                    style={[styles.swatch, { backgroundColor: theme.marks[c], borderColor: theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)' }]}
                  >
                    {chosen ? <Icon name="check" size={20} color={theme.text} /> : null}
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
            <SheetAction icon="ink_highlighter" label={t('markText')} detail={t('markTextDetail')} onPress={() => startMarking(actions)} />
            <SheetAction
              icon="compare_arrows"
              label={t('compare')}
              detail={t('compareDetail', { lang: originalLanguage(actions) })}
              onPress={() => {
                setActions(null);
                setCompare({ book: actions.book, chapter: actions.chapter, verse: actions.verse });
              }}
            />
            {actions.tags ? (
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

function NavButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable android_ripple={{ color: theme.accentSoft }} onPress={onPress} disabled={disabled} hitSlop={8} style={({ pressed }) => ({ opacity: disabled ? 0.3 : pressed ? 0.6 : 1 })}>
      <Text style={[styles.nav, { color: theme.accent }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * The reader's title: book name and chapter, opening the book list. The full name is used
 * when it fits beside the buttons, else the short one (2. തിമൊഥെയൊസ് → 2 തിമൊ), and the
 * chapter number is its own text, so it is never cut off even when the name has to be.
 */
function ReaderTitle({ name, short, chapter, malayalam, onPress, accessibilityLabel }: { name: string; short: string; chapter: number; malayalam: boolean; onPress: () => void; accessibilityLabel: string }) {
  const theme = useTheme();
  const [room, setRoom] = useState(0);
  const [fullWidth, setFullWidth] = useState(0);
  const useShort = !!short && room > 0 && fullWidth > 0 && fullWidth + ARROW_WIDTH > room;
  const fontStyle = [styles.title, { color: theme.text }, malayalam && { fontFamily: scriptureFont(true, false, true), fontWeight: 'normal' as const, fontSize: 20 }];
  return (
    <View style={styles.titleRoom} onLayout={(e) => setRoom(e.nativeEvent.layout.width)}>
      {/* The full title laid out off screen, to see whether it fits. */}
      <View style={styles.titleMeasure} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={fontStyle} onLayout={(e) => setFullWidth(e.nativeEvent.layout.width)}>
          {`${name} ${chapter}`}
        </Text>
      </View>
      <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.titleButton}>
        <Text numberOfLines={1} style={[fontStyle, styles.titleName]}>
          {useShort ? short : name}
        </Text>
        <Text style={fontStyle}>{` ${chapter}`}</Text>
        <Icon name="arrow_drop_down" color={theme.accent} />
      </Pressable>
    </View>
  );
}

const ARROW_WIDTH = 28;

const NO_MARKS: [number, number, HighlightColor][] = [];

/** One of the four round buttons at the top of the verse sheet: an icon over a short label. */
function ActionButton({ icon, label, onPress, accessibilityLabel }: { icon: IconName; label: string; onPress: () => void; accessibilityLabel?: string }) {
  const theme = useTheme();
  const malayalam = isMalayalam(label);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} android_ripple={{ color: theme.accentSoft }} style={styles.actionButton}>
      <View style={[styles.actionIcon, { backgroundColor: theme.accentSoft }]}>
        <Icon name={icon} color={theme.accent} />
      </View>
      <Text style={[styles.actionLabel, { color: theme.text }, malayalam && { fontFamily: scriptureFont(true, false), fontWeight: 'normal' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  titleButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 48, maxWidth: '100%' },
  title: { fontSize: 22, fontWeight: '500' },
  titleName: { flexShrink: 1 },
  titleRoom: { flex: 1, justifyContent: 'center' },
  titleMeasure: { position: 'absolute', left: 0, top: 0, width: 2000, flexDirection: 'row', opacity: 0 },
  body: { flex: 1 },
  loading: { flex: 1 },
  para: { marginBottom: 12 },
  list: { paddingHorizontal: 18, paddingTop: 12, alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  verse: { paddingVertical: 5, borderRadius: 6 },
  verseInterlinear: { paddingBottom: 10, marginBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  tapRow: { flexDirection: 'row', alignItems: 'stretch' },
  tapColumn: { alignItems: 'center', marginLeft: -8, marginRight: 4, borderRadius: 8, overflow: 'hidden' },
  tapNumber: { fontWeight: '700' },
  tapText: { flex: 1 },
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
  markBar: { paddingHorizontal: 18, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  markHint: { fontSize: 13, lineHeight: 18 },
  markRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  markTools: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  markSwatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  markSwatchChosen: { borderWidth: 2 },
  markDone: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
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
