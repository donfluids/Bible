import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, PointerType } from 'react-native-gesture-handler';
import type { GestureTouchEvent } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Line, Path } from 'react-native-svg';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Header, HeaderIconButton } from '../components/Header';
import { Icon } from '../components/Icon';
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
  addPoint,
  emptyInk,
  encodeInk,
  inkKey,
  lowestPoint,
  pageHeight,
  parseInk,
  strokePath,
  touchesStroke,
} from '../ink';
import type { Ink, PenSize, Stroke, Tool } from '../ink';
import { pageName, useNotebook } from '../notebook';
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

/** The finished strokes, drawn again only when they change, not while a stroke is written. */
const Strokes = memo(function Strokes({ strokes, dark }: { strokes: Stroke[]; dark: boolean }) {
  const ink = dark ? INK.dark : INK.light;
  // Highlighter under the pens, so it does not dull the writing.
  const highlights = strokes.filter((s) => s.c < 0);
  const pens = strokes.filter((s) => s.c >= 0);
  return (
    <>
      <G opacity={ink.highlighterOpacity}>
        {highlights.map((s, i) => (
          <Path key={`h${i}`} d={strokePath(s.p)} stroke={ink.highlighter} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ))}
      </G>
      {pens.map((s, i) => (
        <Path key={`p${i}`} d={strokePath(s.p)} stroke={ink.pens[s.c]} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
    </>
  );
});

const Lines = memo(function Lines({ height, colour }: { height: number; colour: string }) {
  const lines = [];
  for (let y = LINE_GAP * 2; y < height; y += LINE_GAP) lines.push(<Line key={y} x1={0} x2={PAGE_WIDTH} y1={y} y2={y} stroke={colour} strokeWidth={1} />);
  return <>{lines}</>;
});

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
  useAutosave(key, stored, loaded.writable, 600, () => tellSaveFailed(languageRef.current));

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

  // The title, and the stroke count the notebook list shows, go to the notebook a moment
  // after they change; at once when the app or the page is left.
  const [title, setTitle] = useState(page?.title ?? '');
  const latest = useRef({ page, title, count: ink.strokes.length });
  latest.current = { page, title, count: ink.strokes.length };
  const patch = useCallback(() => {
    const { page: p, title: tt, count } = latest.current;
    if (!p) return null;
    if (p.title === tt && p.ink?.strokes === count) return null;
    return { title: tt, ink: { paper: p.ink?.paper ?? 'plain', strokes: count } };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = patch();
      if (next) edit(id, next);
    }, 800);
    return () => clearTimeout(timer);
  }, [title, ink, edit, id, patch]);
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
  const pageWidth = Math.min(box.width, MAX_CONTENT_WIDTH);
  const scale = pageWidth > 0 ? pageWidth / PAGE_WIDTH : 1;
  const [sharing, setSharing] = useState(false);
  // For a shared picture the page ends a little below the writing.
  const heightUnits = sharing ? Math.max(LINE_GAP * 4, lowestPoint(ink) + LINE_GAP * 2) : pageHeight(ink, box.height / scale);

  // The stroke being written, drawn on its own over the finished ones.
  const [live, setLive] = useState<Stroke | null>(null);
  const liveRef = useRef<{ stroke: Stroke; touch: number; started: number } | null>(null);
  const erased = useRef<Set<Stroke> | null>(null);
  const mode = useRef<'none' | 'draw' | 'erase' | 'move'>('none');
  const move = useRef({ startY: 0, fromY: 0, touches: 0 });
  const scrollY = useRef(0);
  const scroller = useRef<ScrollView>(null);
  const [penMode, setPenMode] = useState(false);
  const penModeRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const contentHeight = useRef(0);
  const viewHeight = useRef(0);
  const scrollTo = (y: number) => {
    const max = Math.max(0, contentHeight.current - viewHeight.current);
    scrollY.current = Math.max(0, Math.min(max, y));
    scroller.current?.scrollTo({ y: scrollY.current, animated: false });
  };

  const inkRef = useRef(ink);
  inkRef.current = ink;
  const settingsRef = useRef({ tool, colour, size, scale });
  settingsRef.current = { tool, colour, size, scale };

  const averageY = (e: GestureTouchEvent) => e.allTouches.reduce((sum, p) => sum + p.absoluteY, 0) / Math.max(1, e.allTouches.length);
  const startMove = (e: GestureTouchEvent) => {
    mode.current = 'move';
    move.current = { startY: averageY(e), fromY: scrollY.current, touches: e.allTouches.length };
  };
  const finishStroke = () => {
    const l = liveRef.current;
    liveRef.current = null;
    setLive(null);
    if (l) change([...inkRef.current.strokes, l.stroke]);
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
      if (e.allTouches.length >= 2) {
        // A second finger: the page is being moved. A stroke just begun was the first finger of it.
        const l = liveRef.current;
        if (mode.current === 'draw' && l) {
          if (Date.now() - l.started < SCROLL_START_MS || l.stroke.p.length < 12) {
            liveRef.current = null;
            setLive(null);
          } else finishStroke();
        }
        if (mode.current === 'erase') finishErase();
        startMove(e);
        return;
      }
      const touch = e.changedTouches[0];
      if (!touch) return;
      const pen = e.pointerType === PointerType.STYLUS;
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
      liveRef.current = { stroke, touch: touch.id, started: Date.now() };
      setLive({ ...stroke, p: [...stroke.p] });
    },
    move: (e) => {
      if (mode.current === 'move') {
        if (e.allTouches.length !== move.current.touches) startMove(e);
        scrollTo(move.current.fromY - (averageY(e) - move.current.startY));
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
      liveRef.current = null;
      setLive(null);
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

  const pageRef = useRef<View>(null);
  const share = async () => {
    if (sharing) return;
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
        const totalUnits = heightUnits + (title.trim() ? titleHeight.current : 0) / scale;
        let w = widthPx;
        let h = Math.round((widthPx * totalUnits) / PAGE_WIDTH);
        // A very long page is shared smaller rather than not at all.
        if (h > 16000) {
          w = Math.round((w * 16000) / h);
          h = 16000;
        }
        const uri = await captureRef(pageRef.current, { format: 'png', result: 'tmpfile', width: w, height: h });
        if (!cancelled) await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('sharePage') });
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

  if (!page) return <View style={[styles.screen, { backgroundColor: theme.bg }]}><Header title={t('notebook')} onBack={onBack} /></View>;

  const deletePage = () => {
    Alert.alert(t('deletePage'), t('deletePageConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          latest.current = { page: undefined, title: '', count: 0 };
          remove(page.id);
          onBack();
        },
      },
    ]);
  };
  const setPaper = (next: 'plain' | 'lined') => edit(id, { ink: { paper: next, strokes: ink.strokes.length } });

  const toolButton = (key: string, label: string, selected: boolean, onPress: () => void, content: React.ReactNode, disabled = false) => (
    <Pressable
      key={key}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={[styles.tool, { backgroundColor: selected ? theme.accentSoft : 'transparent', borderColor: selected ? theme.accent : 'transparent', opacity: disabled ? 0.35 : 1 }]}
    >
      {content}
    </Pressable>
  );
  const iconTool = (key: string, label: string, icon: IconName, selected: boolean, onPress: () => void, color?: string, disabled = false) =>
    toolButton(key, label, selected, onPress, <Icon name={icon} size={22} color={color ?? theme.text} />, disabled);

  const empty = ink.strokes.length === 0 && !live;
  const hint = notice ?? (empty && !penMode ? t('inkHint') : null);
  const titleFont = scriptureFont(scriptOf(title) ?? uiScript, settings.serif, true);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header
        title={title.trim() || pageName(page, t('handwritten'))}
        onBack={onBack}
        right={
          <>
            <HeaderIconButton
              icon="format_line_spacing"
              onPress={() => setPaper(paper === 'lined' ? 'plain' : 'lined')}
              accessibilityLabel={paper === 'lined' ? t('plainPaper') : t('linedPaper')}
            />
            <HeaderIconButton icon="share" onPress={share} accessibilityLabel={t('sharePage')} />
            <HeaderIconButton icon="delete" onPress={deletePage} accessibilityLabel={t('deletePage')} />
          </>
        }
      />
      <View style={[styles.toolbar, { borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools}>
          {PEN_COLOURS.map((_, i) =>
            toolButton(`pen${i}`, t(PEN_LABELS[i]), tool === 'pen' && colour === i, () => {
              setTool('pen');
              setColour(i);
            }, <View style={[styles.dot, { backgroundColor: colours.pens[i], borderColor: theme.border }]} />),
          )}
          {iconTool('highlighter', t('highlighterYellow'), 'ink_highlighter', tool === 'highlighter', () => setTool('highlighter'), theme.dark ? '#E8C400' : '#C9A400')}
          {iconTool('eraser', t('eraser'), 'ink_eraser', tool === 'eraser', () => setTool('eraser'))}
          {iconTool('size', size === 'thin' ? t('penThin') : t('penThick'), 'line_weight', size === 'thick', () => setSize(size === 'thin' ? 'thick' : 'thin'))}
          {iconTool('undo', t('undo'), 'undo', false, undo, undefined, past.current.length === 0)}
          {iconTool('redo', t('redo'), 'redo', false, redo, undefined, future.current.length === 0)}
        </ScrollView>
        {hint ? <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text> : null}
      </View>
      <View style={styles.area} onLayout={onLayout}>
        {pageWidth > 0 ? (
          <ScrollView
            ref={scroller}
            scrollEnabled={false}
            onLayout={(e) => (viewHeight.current = e.nativeEvent.layout.height)}
            onContentSizeChange={(_, h) => (contentHeight.current = h)}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: insets.bottom }}
            keyboardShouldPersistTaps="handled"
          >
            <View ref={pageRef} collapsable={false} style={{ width: pageWidth, backgroundColor: theme.bg }}>
              <View onLayout={(e) => (titleHeight.current = e.nativeEvent.layout.height)} style={[styles.titleBox, sharing && !title.trim() && styles.hidden]}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('pageTitle')}
                  placeholderTextColor={theme.muted}
                  style={[styles.titleInput, { color: theme.text, borderBottomColor: sharing ? 'transparent' : theme.border, fontFamily: titleFont, fontWeight: scriptOf(title) || uiScript ? 'normal' : '600' }]}
                  returnKeyType="done"
                />
              </View>
              <GestureDetector gesture={gesture}>
                <View collapsable={false} style={{ width: pageWidth, height: heightUnits * scale }}>
                  <Svg width={pageWidth} height={heightUnits * scale} viewBox={`0 0 ${PAGE_WIDTH} ${heightUnits}`}>
                    {paper === 'lined' ? <Lines height={heightUnits} colour={lineColour(theme)} /> : null}
                    <Strokes strokes={ink.strokes} dark={theme.dark} />
                    {live ? (
                      <Path
                        d={strokePath(live.p)}
                        stroke={live.c < 0 ? colours.highlighter : colours.pens[live.c]}
                        strokeOpacity={live.c < 0 ? colours.highlighterOpacity : 1}
                        strokeWidth={live.w}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    ) : null}
                  </Svg>
                </View>
              </GestureDetector>
            </View>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const lineColour = (theme: Theme) => (theme.dark ? '#3A342C' : '#DCD3C3');

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 4 },
  tools: { alignItems: 'center', paddingHorizontal: 8, gap: 2, minWidth: '100%', justifyContent: 'center' },
  tool: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth },
  divider: { width: StyleSheet.hairlineWidth, height: 26, marginHorizontal: 6 },
  hint: { fontSize: 13, textAlign: 'center', paddingHorizontal: 16, paddingTop: 2 },
  area: { flex: 1 },
  titleBox: { paddingHorizontal: 18, paddingTop: 6 },
  hidden: { display: 'none' },
  titleInput: { fontSize: 22, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});

