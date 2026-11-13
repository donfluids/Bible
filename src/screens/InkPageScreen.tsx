import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, AppState, BackHandler, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, PointerType } from 'react-native-gesture-handler';
import type { GestureTouchEvent } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Line, Path } from 'react-native-svg';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { HEADER_MAX_FONT_SCALE, Header } from '../components/Header';
import { SheetAction, SimpleSheet } from '../components/SimpleSheet';
import { sharePdf, stageShared } from '../notebookFiles';
import { afterSheet, captureSize } from '../platform';
import { inkPageHtml } from '../pagePdf';
import { Icon, IconButton } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { useEdition } from '../edition';
import { languageScript, scriptOf, scriptureFont } from '../fonts';
import { useT } from '../i18n';
import type { StringKey } from '../i18n';
import {
  ERASER_RADIUS,
  HIGHLIGHTER_WIDTH,
  LINE_GAP,
  PAGE_WIDTH,
  PEN_COLOURS,
  PEN_WIDTHS,
  PAGE_STROKES,
  addPoint,
  boundsOf,
  emptyInk,
  encodeInk,
  inkKey,
  lowestPoint,
  pageHeight,
  parseInk,
  pathOf,
  strokePath,
  touchesStroke,
} from '../ink';
import type { Ink, PenSize, Stroke, Tool } from '../ink';
import { useNotebook } from '../notebook';
import { loadEntry, useAutosave } from '../persist';
import { tellLoadProblem, tellSaveFailed, useSettings } from '../settings';
import { MAX_CONTENT_WIDTH } from '../text';
import { useTheme } from '../theme';
import type { Theme } from '../theme';

interface Props {
  id: string;
  onBack: () => void;
}

/** Ink colours on the light and on the dark page, by pen colour index; then the highlighter. */
const INK = {
  light: { pens: ['#1E1B16', '#1F4FB4', '#C0392B'], highlighter: '#FFD400', highlighterOpacity: 0.45 },
  dark: { pens: ['#ECE6DA', '#86ABFF', '#FF8A7A'], highlighter: '#E8C400', highlighterOpacity: 0.35 },
};
const PEN_LABELS: StringKey[] = ['penBlack', 'penBlue', 'penRed'];
/** A stroke this young or this short when a second finger comes down was the start of a scroll. */
const SCROLL_START_MS = 250;
const UNDO_STEPS = 100;
/** How far two fingers must part or close, as a share of their distance, to make the page larger or smaller. */
const PINCH_START = 0.15;
/** The same once they have begun moving the page together. */
const PINCH_LATE = 0.35;
/** The title's height on a shared picture, in points. */
const SHARED_TITLE = 60;

/** Strokes are drawn in groups of this many; a new stroke redraws only the last group. */
const GROUP = 100;

const sameStrokes = (a: { strokes: Stroke[]; dark: boolean }, b: { strokes: Stroke[]; dark: boolean }) =>
  a.dark === b.dark && a.strokes.length === b.strokes.length && a.strokes.every((s, i) => s === b.strokes[i]);

/** A group of finished strokes, drawn again only when one of them changes. */
const StrokeGroup = memo(function StrokeGroup({ strokes, dark }: { strokes: Stroke[]; dark: boolean }) {
  const ink = dark ? INK.dark : INK.light;
  return (
    <>
      {strokes.map((s, i) => (
        <Path key={i} d={pathOf(s)} stroke={s.c < 0 ? ink.highlighter : ink.pens[s.c]} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
    </>
  );
}, sameStrokes);

const groups = (list: Stroke[]) => {
  const out: Stroke[][] = [];
  for (let i = 0; i < list.length; i += GROUP) out.push(list.slice(i, i + GROUP));
  return out;
};

/** The finished strokes, not drawn again while a stroke is written. */
const Strokes = memo(function Strokes({ strokes, dark }: { strokes: Stroke[]; dark: boolean }) {
  const ink = dark ? INK.dark : INK.light;
  // Highlighter under the pens, so it does not dull the writing.
  const highlights = groups(strokes.filter((s) => s.c < 0));
  const pens = groups(strokes.filter((s) => s.c >= 0));
  return (
    <>
      <G opacity={ink.highlighterOpacity}>
        {highlights.map((g, i) => (
          <StrokeGroup key={i} strokes={g} dark={dark} />
        ))}
      </G>
      {pens.map((g, i) => (
        <StrokeGroup key={i} strokes={g} dark={dark} />
      ))}
    </>
  );
});

/**
 * The stroke being written. It has its state of its own, so a pen's movement redraws only
 * this line, not the page and its tools; and it is drawn on a layer only as tall as the
 * part of the page on screen (`view`: its top and height, in points), not the whole page.
 */
function LiveStroke({
  setter,
  dark,
  width,
  scale,
  view,
}: {
  setter: React.MutableRefObject<((s: Stroke | null) => void) | null>;
  dark: boolean;
  width: number;
  scale: number;
  view: () => { top: number; height: number };
}) {
  const [live, setLive] = useState<Stroke | null>(null);
  setter.current = setLive;
  if (!live) return null;
  const ink = dark ? INK.dark : INK.light;
  const { top, height } = view();
  return (
    <Svg style={[StyleSheet.absoluteFill, { top, height }]} width={width} height={height} viewBox={`0 ${top / scale} ${PAGE_WIDTH} ${height / scale}`} pointerEvents="none">
      <Path
        d={strokePath(live.p)}
        stroke={live.c < 0 ? ink.highlighter : ink.pens[live.c]}
        strokeOpacity={live.c < 0 ? ink.highlighterOpacity : 1}
        strokeWidth={live.w}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const Lines = memo(function Lines({ from, to, colour }: { from: number; to: number; colour: string }) {
  const lines = [];
  for (let y = LINE_GAP * 2; y < to; y += LINE_GAP) if (y >= from) lines.push(<Line key={y} x1={0} x2={PAGE_WIDTH} y1={y} y2={y} stroke={colour} strokeWidth={1} />);
  return <>{lines}</>;
});

/**
 * Pages are drawn in tiles this tall (in units), each a picture of its own, and only the
 * tiles on or near the screen are drawn: Android gives every picture a bitmap of its full
 * size, so one for a long page (or a page pinched larger) would take more memory than the
 * phone allows; a tile is redrawn only when a stroke on it changes.
 */
const TILE = 450;
/** A lined page's margin line, in units from the left, and its colour: a faint red, as on ruled paper. */
const MARGIN_X = 44;
const MARGIN = { light: '#EFD3CA', dark: '#4A3530' };

const Tile = memo(
  function Tile({ top, height, strokes, dark, width, scale, lines }: { top: number; height: number; strokes: Stroke[]; dark: boolean; width: number; scale: number; lines: string | null }) {
    return (
      <Svg style={[StyleSheet.absoluteFill, { top: top * scale, height: height * scale }]} width={width} height={height * scale} viewBox={`0 ${top} ${PAGE_WIDTH} ${height}`}>
        {lines ? <Lines from={top} to={top + height} colour={lines} /> : null}
        {lines ? <Line x1={MARGIN_X} x2={MARGIN_X} y1={top} y2={top + height} stroke={dark ? MARGIN.dark : MARGIN.light} strokeWidth={1} /> : null}
        <Strokes strokes={strokes} dark={dark} />
      </Svg>
    );
  },
  (a, b) => a.top === b.top && a.height === b.height && a.width === b.width && a.scale === b.scale && a.lines === b.lines && sameStrokes(a, b),
);

/** The finished strokes, in tiles down the page; a stroke across two tiles is in both. */
function InkTiles({ strokes, dark, width, scale, height, lines, shown }: { strokes: Stroke[]; dark: boolean; width: number; scale: number; height: number; lines: string | null; shown: { from: number; to: number } | null }) {
  const tiles = [];
  for (let top = 0; top < height; top += TILE) {
    const h = Math.min(TILE, height - top);
    // Off the screen: not drawn until the page is moved to it.
    if (shown && (top + h < shown.from || top > shown.to)) continue;
    const here = strokes.filter((st) => {
      const [, t, , b] = boundsOf(st);
      return b + st.w >= top && t - st.w <= top + h;
    });
    tiles.push(<Tile key={top} top={top} height={h} strokes={here} dark={dark} width={width} scale={scale} lines={lines} />);
  }
  return <>{tiles}</>;
}

/**
 * A handwritten notebook page: a title typed at the top and a page to write on with a
 * pen or a finger, in three pen colours and two widths, with a yellow highlighter and an
 * eraser that takes away the strokes it passes over. One finger writes and two move the
 * page; once a pen has touched the page, a finger moves it too, so a resting hand does
 * not write. The page grows as the writing nears its foot. Strokes are kept as they are
 * written, in an entry of the page's own.
 */
export function InkPageScreen({ id, onBack }: Props) {
  const theme = useTheme();
  const t = useT();
  const edition = useEdition();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { settings } = useSettings();
  const { pages, edit, commit, remove } = useNotebook();
  const page = pages.find((p) => p.id === id);
  const uiScript = languageScript(settings.language);
  const colours = theme.dark ? INK.dark : INK.light;

  const key = inkKey(edition.id, id);
  const [loaded] = useState(() => loadEntry(key, parseInk, emptyInk()));
  const [ink, setInk] = useState<Ink>(loaded.value);
  const languageRef = useRef(settings.language);
  languageRef.current = settings.language;
  useEffect(() => tellLoadProblem(languageRef.current, loaded.source), [loaded]);
  const stored = useMemo(() => encodeInk(ink), [ink]);
  // Written once the pen rests a moment (a long page takes a little while to write out),
  // and at once when the app or the page is left.
  useAutosave(key, stored, loaded.writable, 1500, () => tellSaveFailed(languageRef.current));

  // Undo and redo: the strokes as they were before each change.
  const past = useRef<Stroke[][]>([]);
  const future = useRef<Stroke[][]>([]);
  const [, setSteps] = useState(0);
  const change = useCallback((next: Stroke[]) => {
    setInk((prev) => {
      past.current = [...past.current.slice(-(UNDO_STEPS - 1)), prev.strokes];
      future.current = [];
      return { strokes: next };
    });
    setSteps((n) => n + 1);
  }, []);
  const undo = () => {
    const before = past.current.pop();
    if (!before) return;
    future.current.push(ink.strokes);
    setInk({ strokes: before });
    setSteps((n) => n + 1);
  };
  const redo = () => {
    const after = future.current.pop();
    if (!after) return;
    past.current.push(ink.strokes);
    setInk({ strokes: after });
    setSteps((n) => n + 1);
  };

  const [tool, setTool] = useState<Tool>('pen');
  const [colour, setColour] = useState(0);
  const [size, setSize] = useState<PenSize>('thin');
  const paper = page?.ink?.paper ?? 'plain';

  // The title and the stroke count go to the notebook at once when the app or the page is
  // left. While writing, only a new title, or the page's first stroke (a page with writing
  // on it is kept), goes there a moment later: the notebook is shared by every screen, and
  // telling it of every stroke would redraw the reader underneath.
  const [title, setTitle] = useState(page?.title ?? '');
  // Any change of strokes since the notebook was last told (an erased stroke and a new one
  // leave the count as it was) is sent too, so the page's edited time is right and a
  // restore elsewhere takes the newer copy.
  const latest = useRef({ page, title, count: ink.strokes.length, strokes: ink.strokes });
  latest.current = { page, title, count: ink.strokes.length, strokes: ink.strokes };
  const told = useRef(ink.strokes);
  const patch = useCallback(() => {
    const { page: p, title: tt, count, strokes } = latest.current;
    if (!p) return null;
    if (p.title === tt && p.ink?.strokes === count && strokes === told.current) return null;
    told.current = strokes;
    return { title: tt, ink: { paper: p.ink?.paper ?? 'plain', strokes: count } };
  }, []);
  const hasWriting = ink.strokes.length > 0;
  useEffect(() => {
    const timer = setTimeout(() => {
      const { page: p, title: tt } = latest.current;
      if (p && (p.title !== tt || (p.ink?.strokes ?? 0) > 0 !== hasWriting)) {
        const next = patch();
        if (next) edit(id, next);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [title, hasWriting, edit, id, patch]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      const next = patch();
      if (next) commit(id, next);
    });
    return () => sub.remove();
  }, [commit, id, patch]);
  useEffect(
    () => () => {
      const next = patch();
      if (next) commit(id, next);
      const { page: p, title: tt, count } = latest.current;
      // A page left with nothing on it is not kept.
      if (p && !tt.trim() && count === 0) remove(p.id);
    },
    [commit, id, patch, remove],
  );

  // The page's size on screen: the reading width at most, PAGE_WIDTH units across.
  const [box, setBox] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
  // The page fills a tablet's width (it is drawn in PAGE_WIDTH units, so wider is only
  // larger), with a little room at the sides; on a phone it is the screen's width.
  const pageWidth = Math.min(box.width > MAX_CONTENT_WIDTH ? box.width - 24 : box.width, 1200);
  // Pinched larger, the page is drawn wider than the screen and moved under it; the part
  // on screen stays pageWidth across.
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const zoomRef = useRef(1);
  const offsetXRef = useRef(0);
  // While two fingers pinch, the page is only scaled on screen; the new size is drawn on release.
  const [pinch, setPinch] = useState<{ factor: number; x: number; y: number } | null>(null);
  const scale = (pageWidth > 0 ? pageWidth / PAGE_WIDTH : 1) * zoom;
  const inkWidth = pageWidth * zoom;
  const setOffset = (x: number) => {
    const max = Math.max(0, inkWidth - pageWidth);
    offsetXRef.current = Math.max(0, Math.min(max, x));
    setOffsetX(offsetXRef.current);
  };
  const fitPage = () => {
    zoomRef.current = 1;
    setZoom(1);
    offsetXRef.current = 0;
    setOffsetX(0);
  };
  const [sharing, setSharing] = useState(false);
  // For a shared picture the page ends a little below the writing.
  const heightUnits = useMemo(
    () => (sharing ? Math.max(LINE_GAP * 4, lowestPoint(ink) + LINE_GAP * 2) : pageHeight(ink, box.height / scale)),
    [sharing, ink, box.height, scale],
  );

  // The stroke being written, drawn on its own over the finished ones (LiveStroke).
  const liveSetter = useRef<((s: Stroke | null) => void) | null>(null);
  const setLive = (s: Stroke | null) => liveSetter.current?.(s);
  // Whether a stroke is being written, for the hint; changes twice a stroke, not on each move.
  const [writing, setWriting] = useState(false);
  const liveRef = useRef<{ stroke: Stroke; touch: number; started: number; pen: boolean } | null>(null);
  // When the page was last touched, for Android's Back gesture (below).
  const lastTouch = useRef(0);
  const erased = useRef<Set<Stroke> | null>(null);
  const mode = useRef<'none' | 'draw' | 'erase' | 'move'>('none');
  // kind: what two fingers are doing, decided once they have moved enough to tell.
  const move = useRef({ startY: 0, fromY: 0, startX: 0, fromX: 0, touches: 0, dist: 0, zoom: 1, mid: { x: 0, y: 0 }, kind: 'undecided' as 'undecided' | 'pan' | 'pinch' });
  const scrollY = useRef(0);
  const scroller = useRef<ScrollView>(null);
  const pinchRef = useRef<{ factor: number; x: number; y: number } | null>(null);
  const [penMode, setPenMode] = useState(false);
  const penModeRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    AccessibilityInfo.announceForAccessibility(notice);
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const contentHeight = useRef(0);
  const viewHeight = useRef(0);
  // The part of the page whose tiles are drawn, in units: the screen and a little either
  // side (less when the page is pinched larger, where each tile is a bigger picture).
  const [shown, setShown] = useState({ from: 0, to: TILE * 4 });
  const showAround = () => {
    const s = settingsRef.current.scale || 1;
    const spare = zoomRef.current > 1 ? TILE / 2 : TILE;
    const from = Math.max(0, Math.floor((scrollY.current / s - spare) / TILE) * TILE);
    const to = Math.ceil(((scrollY.current + (viewHeight.current || 900)) / s + spare) / TILE) * TILE;
    setShown((now) => (now.from === from && now.to === to ? now : { from, to }));
  };
  const scrollTo = (y: number) => {
    const max = Math.max(0, contentHeight.current - viewHeight.current);
    scrollY.current = Math.max(0, Math.min(max, y));
    scroller.current?.scrollTo({ y: scrollY.current, animated: false });
    showAround();
  };

  const inkRef = useRef(ink);
  inkRef.current = ink;
  const settingsRef = useRef({ tool, colour, size, scale });
  settingsRef.current = { tool, colour, size, scale };

  const averageY = (e: GestureTouchEvent) => e.allTouches.reduce((sum, p) => sum + p.absoluteY, 0) / Math.max(1, e.allTouches.length);
  const averageX = (e: GestureTouchEvent) => e.allTouches.reduce((sum, p) => sum + p.absoluteX, 0) / Math.max(1, e.allTouches.length);
  // The distance between two fingers, for pinching.
  const spread = (e: GestureTouchEvent) => {
    if (e.allTouches.length < 2) return 0;
    const [a, b] = e.allTouches;
    return Math.hypot(a.absoluteX - b.absoluteX, a.absoluteY - b.absoluteY);
  };
  const startMove = (e: GestureTouchEvent) => {
    mode.current = 'move';
    const n = Math.max(1, e.allTouches.length);
    move.current = {
      startY: averageY(e),
      fromY: scrollY.current,
      startX: averageX(e),
      fromX: offsetXRef.current,
      touches: e.allTouches.length,
      dist: spread(e),
      zoom: zoomRef.current,
      kind: 'undecided',
      // The point between the fingers, in the page's own points (where the gesture is measured).
      mid: { x: e.allTouches.reduce((sum, p) => sum + p.x, 0) / n, y: e.allTouches.reduce((sum, p) => sum + p.y, 0) / n },
    };
  };
  // Pinching done: the page takes its new size, with the point between the fingers kept in place.
  const finishPinch = (factor: number) => {
    const from = move.current;
    const next = Math.max(1, Math.min(3, from.zoom * factor));
    setPinch(null);
    if (next === from.zoom) return;
    const { scale: s } = settingsRef.current;
    const nextScale = (s / from.zoom) * next;
    const ux = from.mid.x / s;
    const uy = from.mid.y / s;
    const screenX = from.mid.x - from.fromX;
    const pageTop = from.fromY - titleHeight.current;
    const screenY = from.mid.y - pageTop;
    zoomRef.current = next;
    setZoom(next);
    const width = (pageWidthRef.current ?? 0) * next;
    offsetXRef.current = Math.max(0, Math.min(Math.max(0, width - (pageWidthRef.current ?? 0)), ux * nextScale - screenX));
    setOffsetX(offsetXRef.current);
    const y = uy * nextScale - screenY + titleHeight.current;
    requestAnimationFrame(() => scrollTo(y));
  };
  const pageWidthRef = useRef(pageWidth);
  pageWidthRef.current = pageWidth;
  // A new size (pinched, or the window's) changes which tiles are on the screen.
  useEffect(() => {
    showAround();
  }, [scale]); // eslint-disable-line react-hooks/exhaustive-deps
  const finishStroke = () => {
    const l = liveRef.current;
    liveRef.current = null;
    setLive(null);
    setWriting(false);
    if (!l) return;
    // A full page takes no more strokes (and says so), so nothing written is lost on reading.
    if (inkRef.current.strokes.length >= PAGE_STROKES) setNotice(t('inkPageFull'));
    else change([...inkRef.current.strokes, l.stroke]);
  };
  const eraseAt = (x: number, y: number) => {
    const { scale: s } = settingsRef.current;
    const ux = x / s;
    const uy = y / s;
    const gone = erased.current ?? new Set<Stroke>();
    const before = gone.size;
    for (const stroke of inkRef.current.strokes) if (!gone.has(stroke) && touchesStroke(stroke, ux, uy, ERASER_RADIUS)) gone.add(stroke);
    erased.current = gone;
    if (gone.size !== before) setInk({ strokes: inkRef.current.strokes.filter((st) => !gone.has(st)) });
  };

  // The touch handlers, made anew each render so they see the current state; the gesture
  // itself is made once, so a redraw while writing does not interrupt the stroke.
  type Manager = { activate: () => void; end: () => void; fail: () => void };
  const handlers = useRef<{ down: (e: GestureTouchEvent, m: Manager) => void; move: (e: GestureTouchEvent) => void; up: (e: GestureTouchEvent, m: Manager) => void; cancel: (m: Manager) => void } | null>(null);
  handlers.current = {
    down: (e, manager) => {
      manager.activate();
      lastTouch.current = Date.now();
      const pen = e.pointerType === PointerType.STYLUS;
      // A hand resting on the page while the pen writes is not a second finger: it is left out.
      if (e.allTouches.length >= 2 && mode.current === 'draw' && liveRef.current?.pen && !pen) return;
      // The pen coming down beside a resting hand writes; it does not join the hand in moving the page.
      const penBesideHand = e.allTouches.length >= 2 && pen && penModeRef.current && mode.current !== 'draw';
      if (e.allTouches.length >= 2 && !penBesideHand) {
        // A second finger: the page is being moved. A stroke just begun was the first finger of it.
        const l = liveRef.current;
        if (mode.current === 'draw' && l) {
          if (Date.now() - l.started < SCROLL_START_MS || l.stroke.p.length < 12) {
            liveRef.current = null;
            setLive(null);
            setWriting(false);
          } else finishStroke();
        }
        if (mode.current === 'erase') finishErase();
        startMove(e);
        return;
      }
      const touch = e.changedTouches[0];
      if (!touch) return;
      if (pen && !penModeRef.current) {
        penModeRef.current = true;
        setPenMode(true);
        setNotice(t('inkPenFound'));
      }
      if (penModeRef.current && !pen) {
        startMove(e);
        return;
      }
      const { tool: tl, colour: c, size: sz, scale: s } = settingsRef.current;
      if (tl === 'eraser') {
        mode.current = 'erase';
        erased.current = new Set();
        eraseAt(touch.x, touch.y);
        return;
      }
      mode.current = 'draw';
      const stroke: Stroke = tl === 'highlighter' ? { c: -1, w: HIGHLIGHTER_WIDTH, p: [] } : { c, w: PEN_WIDTHS[sz], p: [] };
      addPoint(stroke.p, touch.x / s, touch.y / s);
      liveRef.current = { stroke, touch: touch.id, started: Date.now(), pen };
      setLive({ ...stroke, p: [...stroke.p] });
      setWriting(true);
    },
    move: (e) => {
      lastTouch.current = Date.now();
      if (mode.current === 'move') {
        if (e.allTouches.length !== move.current.touches) {
          if (pinchRef.current) finishPinch(pinchRef.current.factor);
          pinchRef.current = null;
          startMove(e);
        }
        scrollTo(move.current.fromY - (averageY(e) - move.current.startY));
        if (zoomRef.current > 1) setOffset(move.current.fromX - (averageX(e) - move.current.startX));
        if (e.allTouches.length >= 2 && move.current.dist > 0) {
          const now = spread(e);
          const factor = now / move.current.dist;
          // Two fingers moving a page never keep their distance exactly, so the page is
          // made larger or smaller only when they clearly part or close (PINCH_START); once
          // they have travelled together it is a move, and only a wide spread (PINCH_LATE)
          // turns it into a pinch.
          if (move.current.kind !== 'pinch') {
            const change = Math.abs(factor - 1);
            const apart = Math.abs(now - move.current.dist);
            const travelled = Math.hypot(averageX(e) - move.current.startX, averageY(e) - move.current.startY);
            if (change > (move.current.kind === 'pan' ? PINCH_LATE : PINCH_START) && apart > 28) move.current.kind = 'pinch';
            else if (move.current.kind === 'undecided' && travelled > 14) move.current.kind = 'pan';
          }
          if (move.current.kind === 'pinch') {
            const next = Math.max(1, Math.min(3, move.current.zoom * factor)) / move.current.zoom;
            pinchRef.current = { factor: next, x: move.current.mid.x, y: move.current.mid.y };
            setPinch(pinchRef.current);
          }
        }
        return;
      }
      const { scale: s } = settingsRef.current;
      if (mode.current === 'erase') {
        for (const touch of e.changedTouches) eraseAt(touch.x, touch.y);
        return;
      }
      const l = liveRef.current;
      if (mode.current !== 'draw' || !l) return;
      let added = false;
      for (const touch of e.changedTouches) if (touch.id === l.touch) added = addPoint(l.stroke.p, touch.x / s, touch.y / s) || added;
      if (added) setLive({ ...l.stroke, p: [...l.stroke.p] });
    },
    up: (e, manager) => {
      if (pinchRef.current && mode.current === 'move') {
        finishPinch(pinchRef.current.factor);
        pinchRef.current = null;
      }
      // The writing pen or finger has lifted while a resting hand is still down: the stroke is done.
      const writing = liveRef.current;
      if (mode.current === 'draw' && writing && e.allTouches.length > e.changedTouches.length && e.changedTouches.some((c) => c.id === writing.touch)) {
        finishStroke();
        mode.current = 'none';
        return;
      }
      if (e.allTouches.length > e.changedTouches.length) {
        if (mode.current === 'move') startMove({ ...e, allTouches: e.allTouches.filter((a) => !e.changedTouches.some((c) => c.id === a.id)) });
        return;
      }
      if (mode.current === 'draw') finishStroke();
      if (mode.current === 'erase') finishErase();
      mode.current = 'none';
      manager.end();
    },
    cancel: (manager) => {
      pinchRef.current = null;
      setPinch(null);
      liveRef.current = null;
      setLive(null);
      setWriting(false);
      if (mode.current === 'erase') finishErase();
      mode.current = 'none';
      manager.fail();
    },
  };
  const gesture = useMemo(
    () =>
      Gesture.Manual()
        .runOnJS(true)
        .onTouchesDown((e, m) => handlers.current?.down(e, m))
        .onTouchesMove((e) => handlers.current?.move(e))
        .onTouchesUp((e, m) => handlers.current?.up(e, m))
        .onTouchesCancelled((_e, m) => handlers.current?.cancel(m)),
    [],
  );

  // The strokes an eraser pass took away go into undo as one change: the page as it was
  // when the pass began.
  const strokesAtPass = useRef(ink.strokes);
  if (mode.current !== 'erase') strokesAtPass.current = ink.strokes;
  function finishErase() {
    const gone = erased.current;
    erased.current = null;
    if (!gone || gone.size === 0) return;
    past.current = [...past.current.slice(-(UNDO_STEPS - 1)), strokesAtPass.current];
    future.current = [];
    setSteps((n) => n + 1);
  }

  // On Android a stroke begun at the screen's edge is also the system's Back gesture; a
  // Back that comes while the page is being touched is that, not a wish to leave, and is
  // not followed. The page's own back arrow leaves at any time.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => Date.now() - lastTouch.current < 700);
    return () => sub.remove();
  }, []);

  const pageRef = useRef<View>(null);
  const [shareSheet, setShareSheet] = useState(false);
  const sharePagePdf = async () => {
    try {
      await sharePdf(inkPageHtml(title.trim(), ink, paper), title, t('sharePage'));
    } catch {
      Alert.alert(t('pdfFailed'));
    }
  };
  const share = async () => {
    if (sharing) return;
    fitPage();
    setSharing(true);
  };
  useEffect(() => {
    if (!sharing) return;
    let cancelled = false;
    // One frame for the page to take its shared height.
    const frame = requestAnimationFrame(async () => {
      try {
        if (!pageRef.current) throw new Error('no page');
        const widthPx = 1080;
        const totalUnits = heightUnits + (title.trim() ? SHARED_TITLE : 0) / scale;
        let w = widthPx;
        let h = Math.round((widthPx * totalUnits) / PAGE_WIDTH);
        // A very long page is shared smaller rather than not at all.
        if (h > 16000) {
          w = Math.round((w * 16000) / h);
          h = 16000;
        }
        const uri = await captureRef(pageRef.current, { format: 'png', result: 'tmpfile', width: captureSize(w), height: captureSize(h) });
        if (!cancelled) await Sharing.shareAsync(stageShared(uri, 'notebook-page.png'), { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('sharePage') });
      } catch {
        if (!cancelled) Alert.alert(t('inkShareFailed'));
      } finally {
        if (!cancelled) setSharing(false);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [sharing]); // eslint-disable-line react-hooks/exhaustive-deps
  const titleHeight = useRef(0);
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(false);
  // The part of the page on screen, in points from the page's top, for the stroke being written.
  const liveView = useCallback(() => {
    const pageTop = Math.max(0, scrollY.current - titleHeight.current);
    return { top: pageTop, height: Math.max(1, Math.min(viewHeight.current || 800, heightUnits * scale - pageTop)) };
  }, [heightUnits, scale]);

  if (!page) return <View style={[styles.screen, { backgroundColor: theme.bg }]}><Header title={t('notebook')} onBack={onBack} /></View>;

  const deletePage = () => {
    Alert.alert(t('deletePage'), t('deletePageConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          latest.current = { page: undefined, title: '', count: 0, strokes: [] };
          onBack();
          // Removed once the page has closed, after its last strokes are written out on
          // leaving, so they are not written back after the page is gone.
          const gone = page.id;
          setTimeout(() => remove(gone), 0);
        },
      },
    ]);
  };
  const setPaper = (next: 'plain' | 'lined') => edit(id, { ink: { paper: next, strokes: ink.strokes.length } });

  const toolButton = (key: string, label: string, selected: boolean, onPress: () => void, content: React.ReactNode, state?: object) => (
    <Pressable
      key={key}
      onPress={onPress}
      android_ripple={{ color: theme.accentSoft, borderless: true, radius: 24 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={state ?? { selected }}
      style={[styles.tool, { backgroundColor: selected ? theme.accentSoft : 'transparent', borderColor: selected ? theme.accent : 'transparent' }]}
    >
      {content}
    </Pressable>
  );
  const togglePenMode = () => {
    penModeRef.current = !penModeRef.current;
    setPenMode(penModeRef.current);
    setNotice(penModeRef.current ? t('inkPenOnlyOn') : t('inkPenOnlyOff'));
  };

  const empty = ink.strokes.length === 0 && !writing;
  // A hint only on an empty page, and what the page has just said (a pen found, a full page).
  const hint = notice ?? (empty ? (penMode ? t('inkMovePen') : t('inkHint')) : null);
  const closeMenus = () => {
    setPicker(false);
    setMenu(false);
  };
  const dockBottom = insets.bottom + 18;
  const titleFont = scriptureFont(scriptOf(title) ?? uiScript, settings.serif, true);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header
        onBack={onBack}
        center={
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('pageTitle')}
            placeholderTextColor={theme.muted}
            accessibilityLabel={t('pageTitle')}
            maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE}
            style={[styles.titleInput, { color: theme.text, fontFamily: titleFont, fontWeight: scriptOf(title) || uiScript ? 'normal' : '600' }]}
            returnKeyType="done"
            onFocus={closeMenus}
          />
        }
        right={
          <>
            <IconButton name="undo" onPress={undo} accessibilityLabel={t('undo')} disabled={past.current.length === 0} color={theme.text} />
            <IconButton name="redo" onPress={redo} accessibilityLabel={t('redo')} disabled={future.current.length === 0} color={theme.text} />
            <Pressable
              onPress={() => {
                setPicker(false);
                setMenu(!menu);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('inkMore')}
              accessibilityState={{ expanded: menu }}
              android_ripple={{ color: theme.accentSoft, borderless: true, radius: 24 }}
              style={[styles.more, menu && { backgroundColor: theme.accentSoft }]}
            >
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.moreDot, { backgroundColor: theme.text }]} />
              ))}
            </Pressable>
          </>
        }
      />
      <View style={styles.area} onLayout={onLayout}>
        {pageWidth > 0 ? (
          <ScrollView
            ref={scroller}
            scrollEnabled={false}
            onLayout={(e) => {
              viewHeight.current = e.nativeEvent.layout.height;
              showAround();
            }}
            onContentSizeChange={(_, h) => (contentHeight.current = h)}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: sharing ? 0 : dockBottom + DOCK_HEIGHT + 12 }}
            keyboardShouldPersistTaps="handled"
          >
            <View ref={pageRef} collapsable={false} style={{ width: pageWidth, backgroundColor: sharing ? SHARED_PAGE : theme.bg }}>
              {sharing && title.trim() ? (
                <View style={styles.sharedTitle}>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.sharedTitleText, { color: SHARED_TEXT, fontFamily: titleFont, fontWeight: scriptOf(title) || uiScript ? 'normal' : '600' }]}>
                    {title.trim()}
                  </Text>
                </View>
              ) : null}
              <View style={{ width: pageWidth, height: heightUnits * scale, overflow: 'hidden' }}>
              <GestureDetector gesture={gesture}>
                <View
                  collapsable={false}
                  style={[
                    { width: inkWidth, height: heightUnits * scale, transform: [{ translateX: -offsetX }, ...(pinch ? [{ scale: pinch.factor }] : [])] },
                    pinch ? { transformOrigin: `${pinch.x}px ${pinch.y}px` } : null,
                  ]}
                  accessible
                  accessibilityLabel={`${t('handwritten')}: ${ink.strokes.length}`}
                  accessibilityHint={penMode ? t('inkMovePen') : t('inkHint')}
                >
                  <InkTiles
                    strokes={ink.strokes}
                    dark={theme.dark && !sharing}
                    width={inkWidth}
                    scale={scale}
                    height={heightUnits}
                    lines={paper === 'lined' ? (sharing ? lineColour(null) : lineColour(theme)) : null}
                    shown={sharing ? null : shown}
                  />
                  <LiveStroke setter={liveSetter} dark={theme.dark && !sharing} width={inkWidth} scale={scale} view={liveView} />
                </View>
              </GestureDetector>
              </View>
            </View>
          </ScrollView>
        ) : null}
        {zoom > 1 && !notice ? (
          <Pressable onPress={fitPage} accessibilityRole="button" style={[styles.pill, styles.float, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.pillText, { color: theme.accent }]}>{t('inkZoom', { z: zoom.toFixed(1).replace(/\.0$/, '') })}</Text>
          </Pressable>
        ) : hint ? (
          <View pointerEvents="none" style={[styles.pill, styles.float, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.pillText, { color: theme.muted }]} accessibilityLiveRegion="polite">
              {hint}
            </Text>
          </View>
        ) : null}
        {picker || menu ? <Pressable onPress={closeMenus} accessibilityLabel={t('close')} style={StyleSheet.absoluteFill} /> : null}
        {picker ? (
          <View style={[styles.card, styles.float, styles.picker, { bottom: dockBottom + DOCK_HEIGHT + 10, backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.muted }]}>{t('inkColour')}</Text>
            <View style={styles.cardRow}>
              {PEN_COLOURS.map((_, i) =>
                toolButton(`pen${i}`, t(PEN_LABELS[i]), colour === i, () => setColour(i), <View style={[styles.dot, { backgroundColor: colours.pens[i], borderColor: theme.border }]} />),
              )}
            </View>
            <Text style={[styles.cardLabel, styles.cardLabelNext, { color: theme.muted }]}>{t('inkThickness')}</Text>
            <View style={styles.cardRow}>
              {(['thin', 'thick'] as const).map((sz) =>
                toolButton(sz, t(sz === 'thin' ? 'penThin' : 'penThick'), size === sz, () => setSize(sz), <View style={{ width: 26, height: sz === 'thin' ? 3 : 6, borderRadius: 3, backgroundColor: theme.text }} />),
              )}
            </View>
          </View>
        ) : null}
        {sharing ? null : (
          <View style={[styles.dock, styles.float, { bottom: dockBottom, backgroundColor: theme.card, borderColor: theme.border }]}>
            {toolButton(
              'pen',
              `${t(PEN_LABELS[colour])}, ${t(size === 'thin' ? 'penThin' : 'penThick')}`,
              tool === 'pen',
              () => {
                setMenu(false);
                if (tool === 'pen') setPicker(!picker);
                else setTool('pen');
              },
              <View style={[styles.dot, { backgroundColor: colours.pens[colour], borderColor: theme.border }]} />,
              { selected: tool === 'pen', expanded: picker },
            )}
            {toolButton('highlighter', t('highlighterYellow'), tool === 'highlighter', () => {
              closeMenus();
              setTool('highlighter');
            }, <Icon name="ink_highlighter" size={22} color={theme.dark ? '#E8C400' : '#806600'} />)}
            {toolButton('eraser', t('eraser'), tool === 'eraser', () => {
              closeMenus();
              setTool('eraser');
            }, <Icon name="ink_eraser" size={22} color={theme.text} />)}
          </View>
        )}
        {menu ? (
          <View style={[styles.card, styles.menu, { backgroundColor: theme.card, borderColor: theme.border }]} accessibilityRole="menu">
            {(
              [
                ['format_line_spacing', paper === 'lined' ? t('plainPaper') : t('linedPaper'), () => setPaper(paper === 'lined' ? 'plain' : 'lined'), false],
                [penMode ? 'touch_app' : 'stylus', penMode ? t('inkFingerWrites') : t('inkPenOnly'), togglePenMode, false],
                ['share', t('sharePage'), () => setShareSheet(true), false],
                ['delete', t('deletePage'), deletePage, true],
              ] as [IconName, string, () => void, boolean][]
            ).map(([icon, label, act, danger]) => (
              <Pressable
                key={icon}
                onPress={() => {
                  setMenu(false);
                  act();
                }}
                accessibilityRole="menuitem"
                android_ripple={{ color: theme.accentSoft }}
                style={styles.menuItem}
              >
                <Icon name={icon} size={20} color={danger ? DANGER : theme.muted} />
                <Text style={[styles.menuText, { color: danger ? DANGER : theme.text }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <SimpleSheet visible={shareSheet} title={t('sharePage')} onClose={() => setShareSheet(false)}>
        <SheetAction
          icon="image"
          label={t('shareAsPicture')}
          onPress={() => {
            setShareSheet(false);
            afterSheet(share);
          }}
        />
        <SheetAction
          icon="picture_as_pdf"
          label={t('shareAsPdf')}
          onPress={() => {
            setShareSheet(false);
            afterSheet(sharePagePdf);
          }}
        />
      </SimpleSheet>
    </View>
  );
}

const lineColour = (theme: Theme | null) => (theme?.dark ? '#352F28' : '#E7DFD0');
/** A shared picture is always light paper with dark writing, as the PDF is, whatever the theme. */
const SHARED_PAGE = '#FFFDF8';
/** The floating tools' height. */
const DOCK_HEIGHT = 60;
const SHARED_TEXT = '#1E1B16';
const DANGER = '#B3261E';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tool: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth },
  area: { flex: 1 },
  titleInput: { fontSize: 20, paddingVertical: 8, paddingRight: 4 },
  more: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 3.5 },
  moreDot: { width: 4.5, height: 4.5, borderRadius: 3 },
  sharedTitle: { height: SHARED_TITLE, justifyContent: 'center', paddingHorizontal: 18 },
  sharedTitleText: { fontSize: 22 },
  // Over the page: a soft shadow lifts the tools, the picker and the menu off the paper.
  float: { position: 'absolute', alignSelf: 'center', shadowColor: '#3C280A', shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  pill: { top: 10, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 7, maxWidth: '88%' },
  pillText: { fontSize: 13, textAlign: 'center' },
  dock: { height: DOCK_HEIGHT, borderRadius: DOCK_HEIGHT / 2, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  picker: { paddingHorizontal: 14, paddingVertical: 12 },
  cardLabel: { fontSize: 12, marginBottom: 6 },
  cardLabelNext: { marginTop: 10 },
  cardRow: { flexDirection: 'row', gap: 8 },
  menu: { position: 'absolute', top: 4, right: 8, minWidth: 220, paddingVertical: 6, shadowColor: '#3C280A', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 48 },
  menuText: { fontSize: 15 },
});
