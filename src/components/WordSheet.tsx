import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Alert, Animated, BackHandler, PanResponder, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Pressable } from './Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { bibleOfLanguage, isMultilingual, pairedBible, useEdition } from '../edition';
import { HEBREW_FONT, languageScript, scriptOf, scriptureFont } from '../fonts';
import { renderingsLabel, translate, translationName, useT } from '../i18n';
import type { StringKey } from '../i18n';
import { describeMorph, plainMorph } from '../morph';
import { getConcordance, getConcordanceCount, getInterlinear, getLexicon, getOriginalCount, getRelated, getRenderingRefs, getRenderings, getStrongs, getVerses, usualWords } from '../queries';
import { useSettings } from '../settings';
import { hasVoice, sayWord, stopSaying } from '../speech';
import { formatCount, formatRef, isHebrew, plainKjvUsage } from '../text';
import { useBlockKeys } from '../keys';
import { useTheme } from '../theme';
import type { Theme } from '../theme';
import { FLAG_LXX, FLAG_NOT_IN_BYZ, FLAG_NOT_IN_NA, FLAG_NOT_IN_TR, FLAG_REPLACES_NA, FLAG_RESTORED, taggedTranslation, translationInfo } from '../types';
import type { Book, OriginalWord, Ref, RelatedWord, Rendering, StrongsEntry, TranslationId, VerseRow, WordPick } from '../types';
import { Icon, IconButton } from './Icon';
import { VerseText } from './VerseText';
import { headlineWords, topRenderings, wordsInVerse } from '../wordChoice';

/** A window at least this wide shows the word sheet as a panel beside the text. */
export const PANEL_MIN_WIDTH = 1000;
const PANEL_WIDTH = 420;

interface Props {
  /** Shown as a panel beside the text instead of a sheet over it (App decides by width). */
  panel?: boolean;
  pick: WordPick | null;
  translation: TranslationId;
  books: Book[];
  onClose: () => void;
  /** Return to the previous entry after following a link. */
  onBack?: () => void;
  /** Open another entry (a related word, or one named in the derivation). */
  onPick: (pick: WordPick) => void;
  /** Show another part of the same compound word in place of this entry. */
  onSwitch: (pick: WordPick) => void;
  /** Every verse with this word, optionally only those rendering it one way. */
  onShowOccurrences: (strongs: string, rendering?: string) => void;
  onOpenRef: (ref: Ref) => void;
  /** The first entry of this sheet's history; a new one starts the sheet at half height. */
  rootPick: WordPick | null;
}

interface Loaded {
  entry: StrongsEntry | null;
  count: number;
  /** Verses the word is in, in the Hebrew or Greek text. */
  original: number;
  /** For a compound word, each word it joins: the chooser at the top of the sheet. */
  parts: { id: string; lemma: string | null; gloss: string | null }[];
  /** For a tapped translation word, the Hebrew or Greek words of its verse with this number. */
  inVerse: OriginalWord[];
  /** Verses the KJV and the Malayalam or Tamil tag with it, for hiding their chips when few are. */
  kjvCount: number;
  nativeCount: number;
  renderings: Rendering[];
  /** Malayalam or Tamil renderings for the headline in that interface, else empty. */
  nativeWords: Rendering[];
  /** The KJV's renderings, beside another translation's. */
  kjv: Rendering[];
  examples: VerseRow[];
  related: RelatedWord[];
  /** In the Malayalam or Tamil interface, each related word's usual word in that Bible. */
  relatedNative: Map<string, string>;
  failed?: boolean;
}

const EMPTY: Omit<Loaded, 'entry'> = { count: 0, original: 0, parts: [], inVerse: [], kjvCount: 0, nativeCount: 0, renderings: [], nativeWords: [], kjv: [], examples: [], related: [], relatedNative: new Map() };

/**
 * Which printed texts have an original word, when that is worth saying: a Hebrew word
 * supplied from the Septuagint or restored, or a Greek word missing from one of the
 * Nestle-Aland editions, the Textus Receptus (which the KJV translates) and the
 * Byzantine text.
 */
function textNote(w: OriginalWord, t: (key: StringKey, params?: Record<string, string | number>) => string): string {
  if (w.flags & FLAG_LXX) return t('noteLxx');
  if (w.flags & FLAG_RESTORED) return t('noteRestored');
  const inNA = !(w.flags & FLAG_NOT_IN_NA);
  const inTR = !(w.flags & FLAG_NOT_IN_TR);
  const inByz = !(w.flags & FLAG_NOT_IN_BYZ);
  let note = '';
  if (!inNA) note = inTR && inByz ? t('noteTrByz') : inTR ? t('noteTrOnly') : t('noteByzOnly');
  else if (!inTR) note = t('noteNotInTr');
  else if (!inByz) note = t('noteNotInByz');
  if (w.flags & FLAG_REPLACES_NA && w.alt) note += ' ' + t('noteNaReads', { word: w.alt });
  return note;
}

/**
 * The same word in the same form: its letters alike once accents, vowel points and
 * punctuation are set aside (אֱלֹהִ֑ים and אֱלֹהִים, λόγος, and λόγος). The verse card then
 * leaves out its spelling, which the dictionary form's pronunciation below already gives.
 */
function sameLetters(a: string, b: string): boolean {
  const letters = (s: string) => s.normalize('NFD').replace(/[\p{M}\u05be\u05c3\u05c0]/gu, '').replace(/[^\p{L}]/gu, '').toLowerCase().replace(/ς/g, 'σ');
  return letters(a) === letters(b);
}

/** Strong's "el-o-heem'" as syllables, the stressed one (marked ') in capitals. */
function syllables(pron: string | null): { text: string; stressed: boolean }[] {
  if (!pron) return [];
  return pron
    .split(/[,;]/)[0]
    .trim()
    .split('-')
    .filter(Boolean)
    .map((p) => ({ text: p.includes("'") ? p.replace(/'/g, '').toUpperCase() : p, stressed: p.includes("'") }));
}




/**
 * Bottom sheet for a tapped word. It opens at half height with the word, its meaning and
 * pronunciation and how this Bible translates it; dragging the top up (or the button
 * above "See all") shows examples, related words and Strong's dictionary entry.
 */
export function WordSheet({ pick, rootPick, translation, books, onClose, onBack, onPick, onSwitch, onShowOccurrences, onOpenRef, panel = false }: Props) {
  const db = useSQLiteContext();
  useBlockKeys(!!pick);
  const theme = useTheme();
  const t = useT();
  const edition = useEdition();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  // Occurrence counts come from a tagged translation; an untagged one uses the KJV.
  const tagged = taggedTranslation(translation);
  const withKjv = tagged !== 'KJV' && edition.translations.includes('KJV');
  // In the Malayalam or Tamil interface the headline is the rendering in that language's
  // Bible, whichever translation is open, and the English meaning goes under it. A Bible
  // whose words are not linked yet has no renderings to show.
  // In the four-language app that is the interface language's Bible, not the Indian Bible
  // read last.
  const native = isMultilingual(edition) ? bibleOfLanguage(edition, settings.language) : pairedBible(edition, translation, settings.lastIndian, settings.language);
  const nativeFirst = !!native && languageScript(settings.language) === translationInfo(native).script && translationInfo(native).tagged ? native : null;
  const [data, setData] = useState<Loaded | null>(null);
  // The word being said aloud; a new word, or closing the sheet, stops it.
  const [speaking, setSpeaking] = useState(false);
  const sayToken = useRef(0);
  // Set while the sheet's own word is being said: only that is stopped here, so a chapter
  // being read aloud goes on when the sheet opens or closes.
  const saying = useRef(false);
  useEffect(() => {
    setSpeaking(false);
    return () => {
      sayToken.current++;
      if (saying.current) stopSaying();
      saying.current = false;
    };
  }, [pick?.strongs]);
  const [showLegend, setShowLegend] = useState(false);

  // The sheet is laid out at full height and slid down to rest at half height (or off
  // screen to close), on the native driver so the drag stays smooth while JS is busy.
  // Offsets: 0 = full height, halfY = half height, fullH = closed.
  // As a panel beside the text (a wide screen) it takes the whole height.
  const fullH = panel ? winH : Math.max(320, winH - insets.top - 24);
  // On a screen turned on its side (a tablet or phone in landscape) half a short screen
  // shows little more than the word, so the sheet opens at full height there.
  const landscape = panel || winW > winH * 1.2;
  // A short phone (an iPhone SE, a small Android) opens it taller, so the meaning shows too.
  const short = winH < 760;
  const [expanded, setExpanded] = useState(false);
  const [footerH, setFooterH] = useState(120);
  // Half height ends where the word's heading ends (the form in this verse, the dictionary
  // form, its meaning and count), measured once drawn, so the meaning is never cut in half;
  // until then, a share of the screen.
  const [dragH, setDragH] = useState(69);
  const [headEnd, setHeadEnd] = useState(0);
  const measuredH = headEnd > 0 ? Math.max(300, Math.min(Math.round(winH * 0.85), dragH + headEnd + footerH + 12)) : 0;
  const halfH = landscape ? fullH : Math.min(fullH, measuredH || Math.max(380, Math.round(winH * (short ? 0.8 : 0.56))));
  const halfY = fullH - halfH;
  const offset = useRef(new Animated.Value(halfY)).current;
  const restY = useRef(halfY);
  const halfYRef = useRef(halfY);
  halfYRef.current = halfY;
  const fullHRef = useRef(fullH);
  fullHRef.current = fullH;
  const snap = useCallback(
    (to: 'half' | 'full' | 'closed') => {
      const target = to === 'full' ? 0 : to === 'half' ? halfY : fullH;
      restY.current = target;
      setExpanded(to === 'full');
      Animated.spring(offset, { toValue: target, useNativeDriver: true, bounciness: 0, speed: 18 }).start(({ finished }) => {
        if (finished && to === 'closed') onClose();
      });
    },
    [fullH, halfY, offset, onClose],
  );
  // A new word starts at half height, sliding up from below; going back from a followed
  // link keeps the height. Before paint, so a sheet closed by dragging does not flash
  // empty when next opened.
  // A turned phone (a new half height, or the panel coming or going) only resets it.
  const shownRoot = useRef<WordPick | null>(null);
  useLayoutEffect(() => {
    if (!rootPick) {
      shownRoot.current = null;
      return;
    }
    const isNew = shownRoot.current !== rootPick;
    shownRoot.current = rootPick;
    const half = halfYRef.current;
    restY.current = half;
    setExpanded(false);
    setShowLegend(false);
    if (panel || !isNew) {
      offset.setValue(half);
      return;
    }
    offset.setValue(fullHRef.current);
    Animated.spring(offset, { toValue: half, useNativeDriver: true, bounciness: 0, speed: 18 }).start();
  }, [rootPick, panel, offset]);
  // The half height moved (the heading measured, a turned phone): a sheet resting at half
  // height follows it; one opened to full height stays.
  useEffect(() => {
    if (restY.current === 0 && !panel) return;
    if (restY.current >= fullH) return;
    restY.current = halfY;
    Animated.spring(offset, { toValue: halfY, useNativeDriver: true, bounciness: 0, speed: 18 }).start();
  }, [halfY, fullH, panel, offset]);
  const startY = useRef(0);
  const drag = useMemo(() => {
    const settle = (dy: number, vy: number) => {
      const y = startY.current + dy;
      if (vy > 1 || y > halfY + halfH * 0.4) snap('closed');
      else if (vy < -0.5 || y < halfY / 2) snap('full');
      else snap('half');
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        startY.current = restY.current;
        offset.stopAnimation((v) => {
          if (typeof v === 'number') startY.current = v;
        });
      },
      onPanResponderMove: (_, g) => offset.setValue(Math.max(0, Math.min(fullH, startY.current + g.dy))),
      onPanResponderRelease: (_, g) => settle(g.dy, g.vy),
      // The system took the touch (a notification shade, say): settle where it was left.
      onPanResponderTerminate: (_, g) => settle(g.dy, 0),
    });
  }, [fullH, halfH, halfY, offset, snap]);
  // The button row stays at the bottom of the screen while the sheet rests at half or
  // full height, and goes down with it when it closes.
  const footerOffset =
    halfY > 0
      ? offset.interpolate({ inputRange: [0, halfY, fullH], outputRange: [0, 0, fullH - halfY], extrapolate: 'clamp' })
      : offset;

  useEffect(() => {
    if (!pick) return;
    let cancelled = false;
    setData(null);
    setHeadEnd(0);
    if (!pick.strongs) {
      setData({ entry: null, ...EMPTY });
      return;
    }
    const strongs = pick.strongs;
    (async () => {
      const otherNative = !!nativeFirst && tagged !== nativeFirst;
      const at = pick.at;
      const choices = pick.choices && pick.choices.length > 1 ? pick.choices : [];
      // Everything that does not wait on another answer is asked for at once.
      const [[entry, count, original, renderings, nativeOther, nativeOtherCount, kjv, kjvCount, refs], verseWords, partEntries] = await Promise.all([
        Promise.all([
          getStrongs(db, strongs),
          getConcordanceCount(db, strongs, tagged),
          getOriginalCount(db, strongs),
          getRenderings(db, strongs, tagged),
          otherNative ? getRenderings(db, strongs, nativeFirst) : Promise.resolve([] as Rendering[]),
          otherNative ? getConcordanceCount(db, strongs, nativeFirst) : Promise.resolve(0),
          withKjv ? getRenderings(db, strongs, 'KJV') : Promise.resolve([] as Rendering[]),
          withKjv ? getConcordanceCount(db, strongs, 'KJV') : Promise.resolve(0),
          getConcordance(db, strongs, tagged),
        ]),
        // A word tapped in a translation: the Hebrew or Greek words of its verse.
        !pick.original && at
          ? getInterlinear(db, at.book, at.chapter, at.translation ?? tagged).then((words) => words.get(at.verse) ?? [])
          : Promise.resolve([] as OriginalWord[]),
        Promise.all(choices.map((id) => (id === strongs ? Promise.resolve(null) : getStrongs(db, id)))),
      ]);
      // The examples show the word's usual meaning: verses where the Bible gives it its
      // commonest rendering ("word" for λόγος, not "for the cause"), else the first verses.
      const usual = topRenderings(renderings, 1, count)[0]?.word;
      const usualRefs = usual ? await getRenderingRefs(db, strongs, tagged, usual) : [];
      const [examples, related] = await Promise.all([getVerses(db, tagged, (usualRefs.length > 0 ? usualRefs : refs).slice(0, 2)), entry ? getRelated(db, entry) : Promise.resolve([])]);
      // Related words in the reader's language where that Bible has a usual word for them.
      const relatedNative = nativeFirst && related.length > 0 ? await usualWords(db, nativeFirst, related.map((r) => r.id)) : new Map<string, string>();
      const nativeWords = !nativeFirst ? [] : tagged === nativeFirst ? renderings : nativeOther;
      const nativeCount = tagged === nativeFirst ? count : nativeOtherCount;
      // A word tapped in a translation: the form the Hebrew or Greek has in that verse.
      // When the verse has as many of them as the translation, the nth word goes with the nth;
      // otherwise each form once, punctuation aside.
      const inVerse = wordsInVerse(verseWords, strongs, pick.nth?.[strongs]);
      const parts = choices.map((id, i) => {
        const e = id === strongs ? entry : partEntries[i];
        return { id, lemma: e?.lemma ?? null, gloss: e?.gloss ?? null };
      });
      return { entry, count, original, parts, inVerse, kjvCount, nativeCount, renderings, nativeWords, kjv, examples, related, relatedNative };
    })()
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch(() => {
        if (!cancelled) setData({ entry: null, ...EMPTY, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [db, pick, tagged, withKjv, nativeFirst]);

  // The sheet is drawn in the app's own window (no system modal), so Back is caught here.
  useEffect(() => {
    if (!pick) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      (onBack ?? onClose)();
      return true;
    });
    return () => sub.remove();
  }, [pick, onBack, onClose]);
  if (!pick) return null;
  const original = pick.original;
  const hebrew = pick.strongs ? isHebrew(pick.strongs) : !!original && /[֐-׿]/.test(original.text);
  const originalFont = hebrew ? HEBREW_FONT : theme.font;
  const entry = data?.entry;
  // The Hebrew or Greek as it stands in the verse: the word tapped in the Hebrew or Greek
  // view, or for a translation word, every form with its number in that verse.
  const inVerse = original ? [original] : (data?.inVerse ?? []);
  const pron = syllables(entry?.pron ?? null);
  // A translation's renderings mislead when it tags the word in under half the verses
  // the word is in (the KJV gives ὁ, "the", as "which, that"), so they are left out then.
  const covers = (n: number) => !data || data.original === 0 || n >= data.original / 2;
  const headline = data && covers(data.nativeCount) ? headlineWords(data.nativeWords) : [];
  // The word's meaning in this verse, in the reader's language: the Malayalam (or Tamil)
  // word tapped, or for a Hebrew or Greek word tapped, its usual word in that Bible; else
  // the English gloss for this verse.
  const nativeScript = nativeFirst ? translationInfo(nativeFirst).script ?? null : null;
  const verseMeaning = (w: OriginalWord): string | undefined => {
    if (!nativeScript) return undefined;
    if (pick.word && scriptOf(pick.word) === nativeScript) return pick.word;
    if (w.local && scriptOf(w.local) === nativeScript) return w.local;
    return headline[0];
  };
  const kjvChips = withKjv && covers(data?.kjvCount ?? 0) ? <Renderings label={renderingsLabel(settings.language, 'KJV')} list={topRenderings(data?.kjv ?? [], 5)} theme={theme} /> : null;
  const listCount = data ? data.original || data.count : 0;
  const name = translationName(settings.language, tagged);

  const say = async () => {
    if (!entry?.lemma) return;
    if (speaking) {
      sayToken.current++;
      saying.current = false;
      stopSaying();
      setSpeaking(false);
      return;
    }
    const language = hebrew ? 'hebrew' : 'greek';
    if ((await hasVoice(language)) === false) {
      Alert.alert(t('noVoiceTitle'), t(hebrew ? 'noHebrewVoice' : 'noGreekVoice'));
      return;
    }
    const token = ++sayToken.current;
    setSpeaking(true);
    saying.current = true;
    sayWord(entry.lemma, language, () => {
      if (sayToken.current !== token) return;
      saying.current = false;
      setSpeaking(false);
    });
  };

  // On a wide screen the sheet is a panel at the right, and the text beside it stays in view.
  const Frame = panel ? PanelFrame : ModalFrame;
  return (
    <Frame onClose={onClose} onBack={onBack} closeLabel={t('close')} theme={theme} dim={backdropDim(offset, halfY, fullH)}>
      <Animated.View
        style={[styles.sheet, panel && styles.panelSheet, { height: fullH, backgroundColor: theme.card, borderColor: theme.border, transform: [{ translateY: offset }] }]}
      >
        <View {...drag.panHandlers} style={styles.dragArea} onLayout={(e) => setDragH(e.nativeEvent.layout.height)}>
          <Pressable
            onPress={() => snap(expanded ? 'half' : 'full')}
            accessibilityRole="button"
            accessibilityLabel={t('moreAboutWord')}
            style={styles.gripHit}
          >
            <View style={[styles.grip, { backgroundColor: theme.border }]} />
          </Pressable>
          <View style={styles.headRow}>
            {onBack ? <IconButton name="arrow_back" onPress={onBack} accessibilityLabel={t('previousEntry')} color={theme.text} style={styles.backButton} /> : null}
            <View style={[styles.langChip, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.langChipText, { color: theme.accent }]}>{hebrew ? t('hebrew') : t('greek')}</Text>
            </View>
            <View style={styles.spacer} />
            <IconButton name="close" onPress={onClose} accessibilityLabel={t('close')} style={styles.closeButton} />
          </View>
        </View>

        {!data ? (
          <ActivityIndicator style={styles.spinner} color={theme.accent} accessibilityLabel={t('loading')} />
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: (entry ? footerH : 0) + 16 }]}>
            {/* Everything down to the count is the heading the half-open sheet shows whole. */}
            <View onLayout={(e) => setHeadEnd(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
            {data.parts.length > 1 ? (
              <View style={styles.compound}>
                <Text style={[styles.inTextLabel, { color: theme.muted }]}>{t('compoundWord', { n: data.parts.length })}</Text>
                <View style={styles.compoundRow}>
                  {data.parts.map((part) => {
                    const active = part.id === pick.strongs;
                    return (
                      <Pressable
                        key={part.id}
                        onPress={() => (active ? undefined : onSwitch({ ...pick, strongs: part.id, original: undefined }))}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        android_ripple={{ color: theme.accentSoft }}
                        style={[styles.compoundChip, { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accentSoft : 'transparent' }]}
                      >
                        <Text style={[styles.compoundLemma, { color: theme.text, fontFamily: isHebrew(part.id) ? HEBREW_FONT : theme.font }]}>{part.lemma ?? part.id}</Text>
                        {part.gloss ? <Text style={[styles.compoundGloss, { color: active ? theme.accent : theme.muted }]} numberOfLines={1}>{part.gloss}</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {inVerse.length > 0 ? (
              <View style={[styles.inText, (short || landscape) && styles.inTextCompact, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.inTextLabel, { color: theme.muted }]}>{t('inThisVerse')}</Text>
                {inVerse.map((w, i) => (
                  <InVerseWord
                    key={`${w.text}|${w.morph}`}
                    word={w}
                    hebrew={hebrew}
                    font={originalFont}
                    theme={theme}
                    t={t}
                    language={settings.language}
                    first={i === 0}
                    compact={short || landscape}
                    // Its spelling only when it differs from the dictionary form's below.
                    showTranslit={!entry?.lemma || !sameLetters(w.text, entry.lemma)}
                    meaning={verseMeaning(w)}
                  />
                ))}
              </View>
            ) : null}

            {!entry ? (
              <Text style={[styles.body, { color: theme.text }]}>
                {data.failed ? t('loadFailed') : pick.strongs ? t('noEntry', { id: pick.strongs }) : t('noStrongs')}
              </Text>
            ) : (
              <>
                {inVerse.length > 0 ? <Text style={[styles.inTextLabel, styles.dictionaryLabel, { color: theme.muted }]}>{t('dictionaryForm')}</Text> : null}
                <View style={styles.wordRow}>
                  <Text style={[styles.lemma, { color: theme.text, fontFamily: originalFont }]}>{entry.lemma}</Text>
                  <IconButton
                    name={speaking ? 'stop_circle' : 'volume_up'}
                    onPress={say}
                    accessibilityLabel={speaking ? t('stopSaying') : t('sayWord')}
                    color={theme.accent}
                    size={28}
                  />
                </View>
                {/* One way to say it: Strong's syllables, else its spelling. */}
                {pron.length > 0 || entry.translit ? (
                  <Text style={styles.pronRow}>
                    {pron.length > 0
                      ? pron.map((p, i) => (
                          <Text key={i} style={[styles.pron, { color: theme.text, fontWeight: p.stressed ? '700' : '500' }]}>
                            {i > 0 ? '-' : ''}
                            {p.text}
                          </Text>
                        ))
                      : <Text style={[styles.pron, { color: theme.text }]}>{entry.translit}</Text>}
                  </Text>
                ) : null}
                {headline.length > 0 ? (
                  <>
                    <Text style={[styles.meaning, styles.meaningNative, { color: theme.text, fontFamily: scriptureFont(scriptOf(headline[0]), settings.serif, true) }]}>
                      {headline.join(' · ')}
                    </Text>
                    {entry.gloss ? <Text style={[styles.meaningSub, { color: theme.muted }]}>{entry.gloss}</Text> : null}
                  </>
                ) : entry.gloss ? (
                  <>
                    {/* Beside this verse's meaning above ("creature"), the word's usual one ("soul"). */}
                    {inVerse.length > 0 ? <Text style={[styles.inTextLabel, styles.usualLabel, { color: theme.muted }]}>{t('usualMeaning')}</Text> : null}
                    <Text style={[styles.meaning, { color: theme.text }]}>{entry.gloss}</Text>
                  </>
                ) : null}

                {/* One count, in verses, the same as the button's. */}
                {data.original > 0 ? (
                  <Text style={[styles.uses, { color: theme.muted }]}>
                    {data.original === 1 ? t(hebrew ? 'inOneVerseHebrew' : 'inOneVerseGreek') : t(hebrew ? 'inVersesHebrew' : 'inVersesGreek', { n: formatCount(data.original) })}
                  </Text>
                ) : entry.uses ? (
                  <Text style={[styles.uses, { color: theme.muted }]}>
                    {entry.uses === 1 ? t(hebrew ? 'usedOnceHebrew' : 'usedOnceGreek') : t(hebrew ? 'usedHebrew' : 'usedGreek', { n: formatCount(entry.uses) })}
                  </Text>
                ) : null}
              </>
            )}
            </View>

            {entry ? (
              <>

                {covers(data.count) ? (
                  <Renderings
                    label={renderingsLabel(settings.language, tagged)}
                    list={topRenderings(data.renderings, 6, data.count)}
                    theme={theme}
                    onPress={(word) => onShowOccurrences(entry.id, word)}
                  />
                ) : null}
                {nativeFirst ? null : kjvChips}

                {data.examples.length > 0 ? (
                  <Section label={t('examples')} theme={theme}>
                    {data.examples.map((v, i) => (
                      <Pressable
                        android_ripple={{ color: theme.accentSoft }}
                        key={`${v.book}:${v.chapter}:${v.verse}`}
                        onPress={() => onOpenRef(v)}
                        accessibilityRole="button"
                        // The last one leaves its line to the next section's.
                        style={({ pressed }) => [styles.example, i === data.examples.length - 1 && styles.exampleLast, { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
                      >
                        <Text style={[styles.exampleRef, { color: theme.accent }]}>{formatRef(books, v, tagged)}</Text>
                        <VerseText verse={v} fontSize={16} emphasize={entry.id} showNumber={false} underline={false} numberOfLines={3} />
                      </Pressable>
                    ))}
                  </Section>
                ) : null}

                {/* In the Malayalam or Tamil interface the KJV chips wait in the full view. */}
                {nativeFirst ? kjvChips : null}

                {data.related.length > 0 ? (
                  <Section label={t('relatedWords')} theme={theme}>
                    <RelatedWords list={data.related} native={data.relatedNative} theme={theme} t={t} onPick={onPick} />
                  </Section>
                ) : null}

                {/* Strong's short definition first, then the fuller dictionary; both open a few lines. */}
                <StrongsEntryView entry={entry} theme={theme} t={t} language={settings.language} onPick={onPick} />
                <LexiconEntry id={entry.id} theme={theme} t={t} onOpenRef={onOpenRef} />

                {inVerse.length > 0 ? (
                  <>
                    <Pressable onPress={() => setShowLegend((v) => !v)} hitSlop={6} accessibilityRole="button" style={styles.legendToggle}>
                      <Text style={[styles.legendToggleText, { color: theme.accent }]}>{showLegend ? t('marksHide') : t('marksQuestion')}</Text>
                    </Pressable>
                    {showLegend ? (
                      <View style={[styles.legend, { borderColor: theme.border }]}>
                        <Text style={[styles.legendText, { color: theme.muted }]}>
                          {t('legendGloss')}
                          {hebrew ? t('legendTranslit') : ''}
                        </Text>
                        {inVerse.some((w) => w.flags) ? <Text style={[styles.legendText, { color: theme.muted, marginTop: 6 }]}>{t('legendVariant')}</Text> : null}
                      </View>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
          </ScrollView>
        )}

      </Animated.View>
        {entry ? (
          <Animated.View
            onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
            style={[
              styles.footer,
              panel && styles.panelFooter,
              { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: insets.bottom + 12, transform: [{ translateY: footerOffset }] },
            ]}
          >
            {/* The words above fade into the footer, so a heading it covers reads as more to
                scroll to, not as cut in half. */}
            {!panel ? (
              <LinearGradient pointerEvents="none" colors={[`${theme.card}00`, theme.card]} style={styles.fade} />
            ) : null}
            {/* A panel already shows everything; the bar is for the half-open sheet. */}
            {!expanded && !panel ? (
              <Pressable onPress={() => snap('full')} accessibilityRole="button" accessibilityLabel={t('moreAboutWord')} android_ripple={{ color: theme.accentSoft }} style={styles.more}>
                <Icon name="expand_less" size={22} color={theme.accent} />
                <Text style={[styles.moreText, { color: theme.accent }]} numberOfLines={1}>{t('moreShort')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              android_ripple={{ color: theme.accentSoft }}
              onPress={() => onShowOccurrences(entry.id)}
              disabled={listCount === 0}
              style={({ pressed }) => [styles.cta, { backgroundColor: theme.accent, opacity: pressed || listCount === 0 ? 0.6 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.ctaText, { color: theme.onAccent }]}>
                {listCount === 0
                  ? t('notTagged', { translation: name, in: renderingsLabel(settings.language, tagged) })
                  : listCount === 1
                    ? t('seeOneVerse')
                    : t('seeAllVerses', { n: formatCount(listCount) })}
              </Text>
              {listCount > 0 ? <Text style={[styles.ctaSub, { color: theme.onAccent }]}>{t('inTranslationSub', { name })}</Text> : null}
            </Pressable>
          </Animated.View>
        ) : null}
    </Frame>
  );
}

interface FrameProps {
  onClose: () => void;
  onBack?: () => void;
  closeLabel: string;
  theme: Theme;
  /** How dark the backdrop is, 0 to 1, as the sheet rises and falls. */
  dim: Animated.AnimatedInterpolation<number>;
  children: React.ReactNode;
}

/** The backdrop darkens as the sheet comes up from closed to half height. */
function backdropDim(offset: Animated.Value, halfY: number, fullH: number): Animated.AnimatedInterpolation<number> {
  return offset.interpolate({ inputRange: [Math.min(halfY, fullH - 1), fullH], outputRange: [1, 0], extrapolate: 'clamp' });
}

/**
 * The sheet over the screen, on a dimmed backdrop that closes it. It is a layer over the
 * app's screens rather than a system modal: on the iPhone a modal asked for while a screen
 * slides, or while another sheet closes, can fail to appear yet still hold every touch,
 * which froze the app.
 */
function ModalFrame({ onClose, closeLabel, dim, children }: FrameProps) {
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: dim }]}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={closeLabel} />
      </Animated.View>
      {children}
    </View>
  );
}

/** The sheet as a column beside the text (App lays it out to the right of the screens). */
function PanelFrame({ theme, children }: FrameProps) {
  return <View style={[styles.panel, { backgroundColor: theme.card, borderLeftColor: theme.border }]}>{children}</View>;
}


/** One Hebrew or Greek word as it stands in the verse: form, transliteration, gloss, grammar. */
function InVerseWord({
  word,
  hebrew,
  font,
  theme,
  t,
  language,
  first,
  compact,
  showTranslit = true,
  meaning,
}: {
  word: OriginalWord;
  hebrew: boolean;
  font: string | undefined;
  theme: Theme;
  t: ReturnType<typeof useT>;
  language: string;
  first: boolean;
  compact: boolean;
  showTranslit?: boolean;
  /** The meaning in the reader's language (Malayalam, Tamil), in place of the English gloss. */
  meaning?: string;
}) {
  // Plain grammar in the reader's language ("noun, singular"); a tap shows the full
  // description and its code, for those who study it.
  const [full, setFull] = useState(false);
  const plain = word.morph ? plainMorph(word.morph, hebrew, language) : '';
  const detailed = word.morph ? describeMorph(word.morph, hebrew) : '';
  const grammar = full || !plain ? detailed : plain;
  // The gloss as the source gives it can carry the verse's punctuation ("Word,").
  const gloss = meaning ?? word.gloss?.replace(/[\s,.;:·]+$/, '');
  const glossFont = meaning ? scriptureFont(scriptOf(meaning), false) : undefined;
  const note = textNote(word, t);
  return (
    <View style={first ? null : styles.inTextMore}>
      <Text style={[styles.inTextWord, compact && styles.inTextWordCompact, { color: theme.text, fontFamily: font, textAlign: hebrew ? 'right' : 'left' }]}>{word.text}</Text>
      {(showTranslit && word.translit) || gloss ? (
        <Text style={[styles.inTextLine, { color: theme.text }]}>
          {showTranslit ? word.translit : ''}
          {gloss ? <Text style={{ color: showTranslit && word.translit ? theme.muted : theme.text, fontFamily: glossFont }}>{showTranslit && word.translit ? '  ·  ' : ''}{gloss}</Text> : null}
        </Text>
      ) : null}
      {grammar ? (
        <Text
          style={[styles.inTextLine, { color: theme.muted }]}
          onPress={plain && plain !== detailed ? () => setFull((f) => !f) : undefined}
          accessibilityRole={plain && plain !== detailed ? 'button' : undefined}
          accessibilityHint={plain && plain !== detailed && !full ? t('grammarMore') : undefined}
        >
          {grammar}
          {/* The full description keeps its code on one line (no-break hyphens). */}
          {full && grammar !== word.morph ? <Text style={{ fontVariant: ['tabular-nums'] }}>{`  (${word.morph.replace(/-/g, '\u2011')})`}</Text> : null}
          {plain && plain !== detailed && !full ? <Text style={{ color: theme.accent }}>{'  ›'}</Text> : null}
        </Text>
      ) : null}
      {note ? <Text style={[styles.note, { color: theme.accent }]}>{note}</Text> : null}
    </View>
  );
}

function Section({ label, theme, children }: { label: string; theme: Theme; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { borderTopColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.text }]} accessibilityRole="header">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** How a translation renders the word, most used first; tappable for the current translation. */
function Renderings({ label, list, theme, onPress }: { label: string; list: Rendering[]; theme: Theme; onPress?: (word: string) => void }) {
  if (list.length === 0) return null;
  return (
    <Section label={label} theme={theme}>
      <View style={styles.chips}>
        {list.map((r) => {
          const font = scriptureFont(scriptOf(r.word), false);
          const content = (
            <Text style={[styles.chipText, { color: theme.text, fontFamily: font }]}>
              {r.word} <Text style={{ color: theme.muted, fontFamily: undefined }}>{formatCount(r.count)}</Text>
            </Text>
          );
          return onPress ? (
            <Pressable
              android_ripple={{ color: theme.accentSoft }}
              key={r.word}
              onPress={() => onPress(r.word)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.chip, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
            >
              {content}
            </Pressable>
          ) : (
            <View key={r.word} style={[styles.chip, { borderColor: theme.border }]}>
              {content}
            </View>
          );
        })}
      </View>
    </Section>
  );
}

/**
 * Derivation text such as "plural of H433 (אֱלוֹהַּ);" with each named entry as a link.
 * The link shows the word itself rather than its number when the text gives it.
 */
/** How much of a long entry shows before "Show the whole entry": about four lines. */
const LEXICON_PREVIEW = 220;

/** Misspellings in the dictionaries' own text, put right where shown. */
const LEXICON_FIXES: [RegExp, string][] = [
  [/\basdivine\b/g, 'as divine'],
  [/\bbelongng\b/g, 'belonging'],
];

/**
 * The fuller dictionary entry: Abbott-Smith for a Greek word, the BDB outline for a
 * Hebrew one (see scripts/lib/lexicons.mjs for the markup). Verse references open the
 * verse; Greek and Hebrew words use the original-language font; glosses are bold.
 */
function LexiconEntry({ id, theme, t, onOpenRef }: { id: string; theme: Theme; t: ReturnType<typeof useT>; onOpenRef: (ref: Ref) => void }) {
  const db = useSQLiteContext();
  const [entry, setEntry] = useState<{ source: 'AS' | 'BDB'; body: string } | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setEntry(null);
    setAll(false);
    getLexicon(db, id).then((e) => {
      if (!cancelled) setEntry(e);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id]);
  if (!entry) return null;
  const lines = LEXICON_FIXES.reduce((body, [from, to]) => body.replace(from, to), entry.body).split('\n');
  // The preview: lines until about LEXICON_PREVIEW characters, the last one cut to four
  // lines, so it always reaches the first meaning.
  let shown = lines.length;
  if (!all) {
    let n = 0;
    shown = 0;
    while (shown < lines.length && n < LEXICON_PREVIEW) n += lines[shown++].length;
  }
  const cut = !all && (shown < lines.length || lines.slice(0, shown).join('').length > LEXICON_PREVIEW);
  const hebrew = entry.source === 'BDB';
  return (
    <Section label={t(hebrew ? 'lexiconHebrew' : 'lexiconGreek')} theme={theme}>
      {lines.slice(0, shown).map((line, i) => {
        const tab = line.indexOf('\t');
        const label = tab > 0 ? line.slice(0, tab) : '';
        const text = tab > 0 ? line.slice(tab + 1) : line;
        return (
          <Text key={i} numberOfLines={cut && i === shown - 1 ? 3 : undefined} style={[styles.lexLine, { color: theme.text }]}>
            {/* A left-to-right mark: a line that opens with a Hebrew word still reads left to right. */}
            {'\u200e'}
            {label ? <Text style={[styles.lexLabel, { color: theme.muted }]}>{label}  </Text> : null}
            {text.split(/(⟦[^⟧]*⟧|⟪[^⟫]*⟫|‹[^›]*›)/).map((part, j) => {
              if (part.startsWith('⟦')) {
                const [key, shownRef] = part.slice(1, -1).split('|');
                const [book, chapter, verse] = key.split(':').map(Number);
                return (
                  <Text key={j} accessibilityRole="link" onPress={() => onOpenRef({ book, chapter, verse })} style={{ color: theme.accent }}>
                    {shownRef}
                  </Text>
                );
              }
              if (part.startsWith('⟪')) {
                const word = part.slice(1, -1);
                return (
                  <Text key={j} style={{ fontFamily: /[\u0590-\u05ff]/.test(word) ? HEBREW_FONT : undefined }}>
                    {/* Each Hebrew word isolated, so the comma between two of them stays where it is written. */}
                    {/[\u0590-\u05ff]/.test(word) ? `\u2068${word}\u2069` : word}
                  </Text>
                );
              }
              if (part.startsWith('‹')) return <Text key={j} style={styles.lexGloss}>{part.slice(1, -1)}</Text>;
              return <Text key={j}>{part}</Text>;
            })}
          </Text>
        );
      })}
      {cut || all ? (
        <Pressable onPress={() => setAll((v) => !v)} hitSlop={8} accessibilityRole="button" style={styles.lexMore}>
          <Text style={[styles.legendToggleText, { color: theme.accent }]}>{all ? t('showLess') : t('showWholeEntry')}</Text>
        </Pressable>
      ) : null}
    </Section>
  );
}

/** Related words shown before "more": the closest ones, which getRelated lists first. */
const RELATED_SHOWN = 4;

/** Related words as small cards two to a line, each with its meaning in the reader's language where there is one. */
function RelatedWords({ list, native, theme, t, onPick }: { list: RelatedWord[]; native: Map<string, string>; theme: Theme; t: ReturnType<typeof useT>; onPick: (pick: WordPick) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, RELATED_SHOWN);
  return (
    <View style={styles.chips}>
      {shown.map((r) => {
        const meaning = native.get(r.id) || r.gloss;
        return (
          <Pressable
            android_ripple={{ color: theme.accentSoft }}
            key={r.id}
            onPress={() => onPick({ strongs: r.id })}
            accessibilityRole="button"
            accessibilityLabel={meaning ? `${r.lemma}, ${meaning}` : r.lemma ?? r.id}
            style={({ pressed }) => [styles.relatedChip, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
          >
            <Text numberOfLines={1} style={[styles.relatedLemma, { color: theme.text, fontFamily: isHebrew(r.id) ? HEBREW_FONT : theme.font }]}>{r.lemma}</Text>
            {meaning ? (
              <Text numberOfLines={2} style={[styles.relatedGloss, { color: theme.muted, fontFamily: scriptureFont(scriptOf(meaning), false) }]}>
                {meaning}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
      {list.length > RELATED_SHOWN ? (
        <Pressable onPress={() => setAll((v) => !v)} accessibilityRole="button" hitSlop={6} style={styles.relatedMore}>
          <Text style={[styles.legendToggleText, { color: theme.accent }]}>{all ? t('showLess') : t('moreRelated', { n: list.length - RELATED_SHOWN })}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Strong's notes on a word's origin, in forms common enough to say in the reader's language. */
const DERIVATIONS: [RegExp, StringKey][] = [
  [/^a primitive root$/i, 'derivRoot'],
  [/^(?:probably|perhaps) from §(?: and §)*$/i, 'derivMaybeFrom'],
  [/^from the same as §$/i, 'derivSameRoot'],
  [/^from a compound of §(?: and §)+$/i, 'derivCompound'],
  [/^from §(?: and §)*$/i, 'derivFrom'],
  [/^the same as §$/i, 'derivSameAs'],
  [/^feminine of §$/i, 'derivFeminine'],
  [/^plural of §$/i, 'derivPlural'],
  [/^\(Aramaic\) corresponding to §$/i, 'derivAramaic'],
  [/^of Hebrew origin \(§\)$/i, 'derivHebrewOrigin'],
  [/^a form of §$/i, 'derivFormOf'],
];
const LINK = /[HG]\d{1,4}(?:\s*\([^)]*\))?/g;

/**
 * Strong's origin note for a reader not reading English: "from λέγω;" becomes
 * "ഉത്ഭവം: λέγω". A note of another form stays as Strong's wrote it (in English, in the
 * English dictionary's section), so a label is never set inside an English sentence.
 */
function localDerivation(text: string, t: ReturnType<typeof useT>): { label: string; links: string[] } | null {
  const links = text.match(LINK) ?? [];
  const shape = text.replace(LINK, '§').replace(/[\s;.,]+$/, '').trim();
  const found = DERIVATIONS.find(([pattern]) => pattern.test(shape));
  return found ? { label: t(found[1]), links } : null;
}

/** Strong's entry: its definition a few lines long, the KJV's words and the origin when opened. */
const STRONGS_PREVIEW = 200;
function StrongsEntryView({ entry, theme, t, language, onPick }: { entry: StrongsEntry; theme: Theme; t: ReturnType<typeof useT>; language: string; onPick: (pick: WordPick) => void }) {
  const [all, setAll] = useState(false);
  useEffect(() => setAll(false), [entry.id]);
  const long = (entry.definition?.length ?? 0) > STRONGS_PREVIEW || !!entry.kjv_usage;
  const local = language !== 'en' && entry.derivation ? localDerivation(entry.derivation, t) : null;
  return (
    <Section label={t('strongsDictionary')} theme={theme}>
      {entry.definition ? (
        <Text numberOfLines={all ? undefined : 4} style={[styles.body, { color: theme.text }]}>
          {entry.definition}
        </Text>
      ) : null}
      {all && entry.kjv_usage ? (
        <Text style={[styles.usage, { color: theme.text }]}>
          {/* The list is English: its notes stay English too ("(idiom)"), whatever the menus. */}
          {t('kjvUsage', { list: plainKjvUsage(entry.kjv_usage, { idiom: translate('en', 'usageIdiom'), phrase: translate('en', 'usagePhrase'), with: translate('en', 'usageWith') }) })}
        </Text>
      ) : null}
      {local ? (
        <Text style={[styles.derivation, { color: theme.muted }]}>
          {local.label}
          {local.links.length > 0 ? ': ' : ''}
          {local.links.map((link, i) => (
            <React.Fragment key={i}>
              {i > 0 ? ', ' : ''}
              <LinkedText text={link} color={theme.muted} accent={theme.accent} hebrewFont={HEBREW_FONT} onPick={onPick} inline />
            </React.Fragment>
          ))}
        </Text>
      ) : entry.derivation ? (
        <LinkedText text={entry.derivation} color={theme.muted} accent={theme.accent} hebrewFont={HEBREW_FONT} onPick={onPick} />
      ) : null}
      {long ? (
        <Pressable onPress={() => setAll((v) => !v)} hitSlop={8} accessibilityRole="button" style={styles.lexMore}>
          <Text style={[styles.legendToggleText, { color: theme.accent }]}>{all ? t('showLess') : t('showWholeEntry')}</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.numberLine, { color: theme.muted }]}>{t('strongsNumberLine', { id: entry.id })}</Text>
    </Section>
  );
}

function LinkedText({ text, color, accent, hebrewFont, onPick, inline = false }: { text: string; color: string; accent: string; hebrewFont: string; onPick: (p: WordPick) => void; inline?: boolean }) {
  const parts = text.split(/([HG]\d{1,4}(?:\s*\([^)]*\))?)(?![\d\w])/);
  return (
    <Text style={inline ? null : [styles.derivation, { color }]}>
      {parts.map((part, i) => {
        const m = /^([HG]\d{1,4})(?:\s*\(([^)]*)\))?$/.exec(part);
        if (!m) return <Text key={i}>{part}</Text>;
        return (
          <Text
            key={i}
            onPress={() => onPick({ strongs: m[1].replace(/^([HG])0+(?=\d)/, '$1') })}
            accessibilityRole="link"
            style={{ color: accent, fontWeight: m[2] ? undefined : '600', fontFamily: m[2] && m[1].startsWith('H') ? hebrewFont : undefined }}
          >
            {m[2] ?? m[1]}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,17,13,0.32)' },
  panel: { width: PANEL_WIDTH, borderLeftWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  panelSheet: { top: 0, bottom: undefined, maxWidth: undefined, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0 },
  panelFooter: { maxWidth: undefined },
  sheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dragArea: { paddingTop: 4 },
  gripHit: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 24 },
  grip: { width: 40, height: 5, borderRadius: 3 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  backButton: { marginLeft: -12 },
  closeButton: { marginRight: -12 },
  langChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  langChipText: { fontSize: 13, fontWeight: '600' },
  spacer: { flex: 1 },
  spinner: { marginVertical: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  inText: { borderRadius: 14, padding: 14, marginBottom: 14 },
  inTextCompact: { paddingVertical: 8, marginBottom: 10 },
  inTextLabel: { fontSize: 13, marginBottom: 2 },
  inTextWord: { fontSize: 32, lineHeight: 46 },
  inTextWordCompact: { fontSize: 24, lineHeight: 34 },
  inTextLine: { fontSize: 15, lineHeight: 21, marginTop: 2 },
  note: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  inTextMore: { marginTop: 12 },
  compound: { marginBottom: 14 },
  compoundRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  compoundChip: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1, justifyContent: 'center', overflow: 'hidden', maxWidth: '100%' },
  compoundLemma: { fontSize: 20 },
  compoundGloss: { fontSize: 13, marginTop: 1 },
  dictionaryLabel: { marginTop: 4 },
  usualLabel: { marginTop: 4, marginBottom: 0 },
  wordRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12 },
  tapped: { fontSize: 20, flexShrink: 1, maxWidth: '45%' },
  lemma: { fontSize: 42, lineHeight: 58 },
  meaning: { fontSize: 26, fontWeight: '700', marginTop: 2 },
  meaningNative: { fontWeight: undefined, lineHeight: 40 },
  meaningSub: { fontSize: 17, marginTop: 2 },
  uses: { fontSize: 14, marginTop: 6 },
  usage: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  pronRow: { marginTop: 4 },
  pron: { fontSize: 17 },
  translit: { fontSize: 14 },
  // A thin line above each section, so the long sheet reads in parts.
  section: { marginTop: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontSize: 15 },
  relatedChip: { minHeight: 48, maxWidth: '48%', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, justifyContent: 'center' },
  relatedLemma: { fontSize: 18 },
  relatedGloss: { fontSize: 13, marginTop: 1 },
  relatedMore: { minHeight: 48, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center' },
  example: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  exampleLast: { borderBottomWidth: 0, paddingBottom: 0 },
  exampleRef: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  body: { fontSize: 15, lineHeight: 22 },
  derivation: { fontSize: 15, lineHeight: 22, marginTop: 6 },
  lexLine: { fontSize: 15, lineHeight: 23, marginBottom: 8 },
  lexLabel: { fontWeight: '700' },
  lexGloss: { fontWeight: '700' },
  lexMore: { alignSelf: 'flex-start', paddingVertical: 4 },
  numberLine: { fontSize: 13, lineHeight: 18, marginTop: 10 },
  legendToggle: { marginTop: 16, alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  legendToggleText: { fontSize: 14, fontWeight: '600' },
  legend: { marginTop: 8, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  legendText: { fontSize: 13, lineHeight: 19 },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fade: { position: 'absolute', left: 0, right: 0, top: -32, height: 32 },
  more: { minHeight: 48, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 15, fontWeight: '600' },
  cta: { minHeight: 56, paddingVertical: 8, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaText: { fontSize: 16, fontWeight: '600' },
  ctaSub: { fontSize: 12, opacity: 0.85, marginTop: 1 },
});
