import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useEdition } from '../edition';
import { HEBREW_FONT, isMalayalam, scriptureFont } from '../fonts';
import { renderingsLabel, translationName, useT } from '../i18n';
import type { StringKey } from '../i18n';
import { describeMorph } from '../morph';
import { getConcordance, getConcordanceCount, getInterlinear, getOriginalCount, getRelated, getRenderings, getStrongs, getVerses } from '../queries';
import { useSettings } from '../settings';
import { formatCount, formatRef, isHebrew, plainKjvUsage } from '../text';
import { useTheme } from '../theme';
import type { Theme } from '../theme';
import { FLAG_LXX, FLAG_NOT_IN_BYZ, FLAG_NOT_IN_NA, FLAG_NOT_IN_TR, FLAG_REPLACES_NA, FLAG_RESTORED, taggedTranslation } from '../types';
import type { Book, OriginalWord, Ref, RelatedWord, Rendering, StrongsEntry, TranslationId, VerseRow, WordPick } from '../types';
import { VerseText } from './VerseText';

interface Props {
  pick: WordPick | null;
  translation: TranslationId;
  books: Book[];
  onClose: () => void;
  /** Return to the previous entry after following a link. */
  onBack?: () => void;
  /** Open another entry (a related word, or one named in the derivation). */
  onPick: (pick: WordPick) => void;
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
  /** For a tapped translation word, the Hebrew or Greek words of its verse with this number. */
  inVerse: OriginalWord[];
  /** Verses the KJV and the Malayalam tag with it, for hiding their chips when few are. */
  kjvCount: number;
  malayalamCount: number;
  renderings: Rendering[];
  /** Malayalam renderings for the headline in the Malayalam interface, else empty. */
  malayalam: Rendering[];
  /** The KJV's renderings, beside another translation's. */
  kjv: Rendering[];
  examples: VerseRow[];
  related: RelatedWord[];
  failed?: boolean;
}

const EMPTY: Omit<Loaded, 'entry'> = { count: 0, original: 0, inVerse: [], kjvCount: 0, malayalamCount: 0, renderings: [], malayalam: [], kjv: [], examples: [], related: [] };

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
 * The renderings worth a chip: the main ones, not one-off phrasings or the stray words a
 * machine-made link leaves (under 1% of the verses, and never fewer than two).
 */
function topRenderings(list: Rendering[], max: number, total?: number): Rendering[] {
  const floor = Math.max(2, (total ?? list[0]?.count ?? 0) * 0.01);
  return list.filter((r, i) => i === 0 || r.count >= floor).slice(0, max);
}

/**
 * The Malayalam headline: the commonest rendering, and a second one when it is a real
 * alternative: at least 4% of uses, and not another form of the first (ജനം beside
 * ജനത്തെ, ദൈവസ്നേഹം beside സ്നേഹം, മരിക്കും beside മരിച്ചു, by the same first two
 * letters). ദൈവം · ദേവന്മാർ, സമാധാനം · സുഖം, സ്നേഹം.
 */
function headlineWords(list: Rendering[]): string[] {
  if (list.length === 0) return [];
  const total = list.reduce((n, r) => n + r.count, 0);
  const first = list[0].word;
  const stem = (word: string) => word.slice(0, -1);
  const sameWord = (word: string) => word.slice(0, 2) === first.slice(0, 2) || word.includes(stem(first)) || first.includes(stem(word));
  const second = list.slice(1).find((r) => r.count >= total * 0.04 && !sameWord(r.word));
  return second ? [first, second.word] : [first];
}

/**
 * Bottom sheet for a tapped word. It opens at half height with the word, its meaning and
 * pronunciation and how this Bible translates it; dragging the top up (or the button
 * above "See all") shows examples, related words and Strong's dictionary entry.
 */
export function WordSheet({ pick, rootPick, translation, books, onClose, onBack, onPick, onShowOccurrences, onOpenRef }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const t = useT();
  const edition = useEdition();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  // Occurrence counts come from a tagged translation; an untagged one uses the KJV.
  const tagged = taggedTranslation(translation);
  const withKjv = tagged !== 'KJV' && edition.translations.includes('KJV');
  // In the Malayalam interface the headline is the Malayalam rendering, whichever
  // translation is open, and the English meaning goes under it.
  const malayalamFirst = settings.language === 'ml' && edition.translations.includes('MAL');
  const [data, setData] = useState<Loaded | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  // The sheet is laid out at full height and slid down to rest at half height (or off
  // screen to close), on the native driver so the drag stays smooth while JS is busy.
  // Offsets: 0 = full height, halfY = half height, fullH = closed.
  const fullH = Math.max(320, winH - insets.top - 24);
  const halfH = Math.min(fullH, Math.max(380, Math.round(winH * 0.56)));
  const halfY = fullH - halfH;
  const offset = useRef(new Animated.Value(halfY)).current;
  const restY = useRef(halfY);
  const [expanded, setExpanded] = useState(false);
  const [footerH, setFooterH] = useState(120);
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
  // A new word starts at half height; going back from a followed link keeps the height.
  // Before paint, so a sheet closed by dragging does not flash empty when next opened.
  useLayoutEffect(() => {
    if (!rootPick) return;
    offset.setValue(halfY);
    restY.current = halfY;
    setExpanded(false);
    setShowLegend(false);
  }, [rootPick, halfY, offset]);
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
    if (!pick.strongs) {
      setData({ entry: null, ...EMPTY });
      return;
    }
    const strongs = pick.strongs;
    (async () => {
      const otherMalayalam = malayalamFirst && tagged !== 'MAL';
      const [entry, count, original, renderings, malayalamOther, malayalamOtherCount, kjv, kjvCount, refs] = await Promise.all([
        getStrongs(db, strongs),
        getConcordanceCount(db, strongs, tagged),
        getOriginalCount(db, strongs),
        getRenderings(db, strongs, tagged),
        otherMalayalam ? getRenderings(db, strongs, 'MAL') : Promise.resolve([] as Rendering[]),
        otherMalayalam ? getConcordanceCount(db, strongs, 'MAL') : Promise.resolve(0),
        withKjv ? getRenderings(db, strongs, 'KJV') : Promise.resolve([] as Rendering[]),
        withKjv ? getConcordanceCount(db, strongs, 'KJV') : Promise.resolve(0),
        getConcordance(db, strongs, tagged),
      ]);
      const [examples, related] = await Promise.all([getVerses(db, tagged, refs.slice(0, 2)), entry ? getRelated(db, entry) : Promise.resolve([])]);
      const malayalam = !malayalamFirst ? [] : tagged === 'MAL' ? renderings : malayalamOther;
      const malayalamCount = tagged === 'MAL' ? count : malayalamOtherCount;
      // A word tapped in a translation: the form the Hebrew or Greek has in that verse.
      let inVerse: OriginalWord[] = [];
      const at = pick.at;
      if (!pick.original && at) {
        const words = (await getInterlinear(db, at.book, at.chapter, at.translation ?? tagged)).get(at.verse) ?? [];
        const seen = new Set<string>();
        inVerse = words.filter((w) => {
          const key = `${w.text}|${w.morph}`;
          if (w.strongs !== strongs || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      return { entry, count, original, inVerse, kjvCount, malayalamCount, renderings, malayalam, kjv, examples, related };
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
  }, [db, pick, tagged, withKjv, malayalamFirst]);

  if (!pick) return null;
  const original = pick.original;
  const hebrew = pick.strongs ? isHebrew(pick.strongs) : !!original && /[֐-׿]/.test(original.text);
  const originalFont = hebrew ? HEBREW_FONT : theme.font;
  const entry = data?.entry;
  // The Hebrew or Greek as it stands in the verse: the word tapped in the Hebrew or Greek
  // view, or for a translation word, every form with its number in that verse.
  const inVerse = original ? [original] : (data?.inVerse ?? []);
  const tappedFont = pick.word && isMalayalam(pick.word) ? scriptureFont(true, settings.serif, true) : undefined;
  const pron = syllables(entry?.pron ?? null);
  // A translation's renderings mislead when it tags the word in under half the verses
  // the word is in (the KJV gives ὁ, "the", as "which, that"), so they are left out then.
  const covers = (n: number) => !data || data.original === 0 || n >= data.original / 2;
  const headline = data && covers(data.malayalamCount) ? headlineWords(data.malayalam) : [];
  const kjvChips = withKjv && covers(data?.kjvCount ?? 0) ? <Renderings label={renderingsLabel(settings.language, 'KJV')} list={topRenderings(data?.kjv ?? [], 5)} theme={theme} /> : null;
  const listCount = data ? data.original || data.count : 0;
  const name = translationName(settings.language, tagged);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onBack ?? onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('close')} />
      <Animated.View
        style={[styles.sheet, { height: fullH, backgroundColor: theme.card, borderColor: theme.border, transform: [{ translateY: offset }] }]}
      >
        <View {...drag.panHandlers} style={styles.dragArea}>
          <Pressable
            onPress={() => snap(expanded ? 'half' : 'full')}
            accessibilityRole="button"
            accessibilityLabel={t('moreAboutWord')}
            style={styles.gripHit}
          >
            <View style={[styles.grip, { backgroundColor: theme.border }]} />
          </Pressable>
          <View style={styles.headRow}>
            {onBack ? (
              <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('previousEntry')} style={styles.iconButton}>
                <Text style={[styles.back, { color: theme.accent }]}>‹</Text>
              </Pressable>
            ) : null}
            <View style={[styles.langChip, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.langChipText, { color: theme.accent }]}>{hebrew ? t('hebrew') : t('greek')}</Text>
            </View>
            <View style={styles.spacer} />
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('close')} style={styles.iconButton}>
              <Text style={[styles.close, { color: theme.muted }]}>✕</Text>
            </Pressable>
          </View>
        </View>

        {!data ? (
          <ActivityIndicator style={styles.spinner} color={theme.accent} accessibilityLabel={t('loading')} />
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: (entry ? footerH : 0) + 16 }]}>
            {inVerse.length > 0 ? (
              <View style={[styles.inText, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.inTextLabel, { color: theme.muted }]}>{t('inThisVerse')}</Text>
                {inVerse.map((w, i) => (
                  <InVerseWord key={`${w.text}|${w.morph}`} word={w} hebrew={hebrew} font={originalFont} theme={theme} t={t} first={i === 0} />
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
                  {pick.word ? (
                    <>
                      <Text numberOfLines={1} style={[styles.tapped, { color: theme.muted, fontFamily: tappedFont, fontWeight: tappedFont ? undefined : '600' }]}>
                        {pick.word}
                      </Text>
                      <Text style={[styles.arrow, { color: theme.muted }]} accessibilityElementsHidden importantForAccessibility="no">
                        →
                      </Text>
                    </>
                  ) : null}
                  <Text style={[styles.lemma, { color: theme.text, fontFamily: originalFont }]}>{entry.lemma}</Text>
                </View>
                {headline.length > 0 ? (
                  <>
                    <Text style={[styles.meaning, styles.meaningMalayalam, { color: theme.text, fontFamily: scriptureFont(true, settings.serif, true) }]}>
                      {headline.join(' · ')}
                    </Text>
                    {entry.gloss ? <Text style={[styles.meaningSub, { color: theme.muted }]}>{entry.gloss}</Text> : null}
                  </>
                ) : entry.gloss ? (
                  <Text style={[styles.meaning, { color: theme.text }]}>{entry.gloss}</Text>
                ) : null}
                {pron.length > 0 || entry.translit ? (
                  <Text style={styles.pronRow}>
                    {pron.map((s, i) => (
                      <Text key={i} style={[styles.pron, { color: theme.text, fontWeight: s.stressed ? '700' : '500' }]}>
                        {i > 0 ? '-' : ''}
                        {s.text}
                      </Text>
                    ))}
                    {entry.translit ? <Text style={[styles.translit, { color: theme.muted }]}>{pron.length ? '   ' : ''}{entry.translit}</Text> : null}
                  </Text>
                ) : null}

                {entry.uses ? (
                  <Text style={[styles.uses, { color: theme.muted }]}>
                    {entry.uses === 1
                      ? t(hebrew ? 'usedOnceHebrew' : 'usedOnceGreek')
                      : t(hebrew ? 'usedHebrew' : 'usedGreek', { n: formatCount(entry.uses) })}
                  </Text>
                ) : null}

                {covers(data.count) ? (
                  <Renderings
                    label={renderingsLabel(settings.language, tagged)}
                    list={topRenderings(data.renderings, 6, data.count)}
                    theme={theme}
                    onPress={(word) => onShowOccurrences(entry.id, word)}
                  />
                ) : null}
                {malayalamFirst ? null : kjvChips}

                {data.examples.length > 0 ? (
                  <Section label={t('examples')} theme={theme}>
                    {data.examples.map((v) => (
                      <Pressable
                        key={`${v.book}:${v.chapter}:${v.verse}`}
                        onPress={() => onOpenRef(v)}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.example, { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
                      >
                        <Text style={[styles.exampleRef, { color: theme.accent }]}>{formatRef(books, v, tagged)}</Text>
                        <VerseText verse={v} fontSize={16} emphasize={entry.id} showNumber={false} underline={false} numberOfLines={3} />
                      </Pressable>
                    ))}
                  </Section>
                ) : null}

                {/* In the Malayalam interface the KJV chips wait in the full view. */}
                {malayalamFirst ? kjvChips : null}

                {data.related.length > 0 ? (
                  <Section label={t('relatedWords')} theme={theme}>
                    <View style={styles.chips}>
                      {data.related.map((r) => (
                        <Pressable
                          key={r.id}
                          onPress={() => onPick({ strongs: r.id })}
                          accessibilityRole="button"
                          style={({ pressed }) => [styles.relatedChip, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
                        >
                          <Text style={[styles.relatedLemma, { color: theme.text, fontFamily: isHebrew(r.id) ? HEBREW_FONT : theme.font }]}>{r.lemma}</Text>
                          {r.gloss ? <Text style={[styles.chipText, { color: theme.text }]}>{r.gloss}</Text> : null}
                        </Pressable>
                      ))}
                    </View>
                  </Section>
                ) : null}

                <Section label={t('strongsDictionary')} theme={theme}>
                  {entry.definition ? <Text style={[styles.body, { color: theme.text }]}>{entry.definition}</Text> : null}
                  {entry.kjv_usage ? (
                    <Text style={[styles.usage, { color: theme.text }]}>
                      {t('kjvUsage', { list: plainKjvUsage(entry.kjv_usage, { idiom: t('usageIdiom'), phrase: t('usagePhrase'), with: t('usageWith') }) })}
                    </Text>
                  ) : null}
                  {entry.derivation ? <LinkedText text={entry.derivation} color={theme.muted} accent={theme.accent} hebrewFont={HEBREW_FONT} onPick={onPick} /> : null}
                  <Text style={[styles.numberLine, { color: theme.muted }]}>{t('strongsNumberLine', { id: entry.id })}</Text>
                </Section>

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
            )}
          </ScrollView>
        )}

      </Animated.View>
        {entry ? (
          <Animated.View
            onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
            style={[
              styles.footer,
              { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: insets.bottom + 12, transform: [{ translateY: footerOffset }] },
            ]}
          >
            {!expanded ? (
              <Pressable onPress={() => snap('full')} accessibilityRole="button" style={styles.more}>
                <Text style={[styles.moreText, { color: theme.accent }]}>⌃  {t('moreAboutWord')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => onShowOccurrences(entry.id)}
              disabled={listCount === 0}
              style={({ pressed }) => [styles.cta, { backgroundColor: theme.accent, opacity: pressed || listCount === 0 ? 0.6 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.ctaText, { color: theme.onAccent }]}>
                {listCount === 0
                  ? t('notTagged', { translation: name })
                  : listCount === 1
                    ? t('seeOneVerse')
                    : t('seeAllVerses', { n: formatCount(listCount) })}
              </Text>
              {listCount > 0 ? <Text style={[styles.ctaSub, { color: theme.onAccent }]}>{t('inTranslationSub', { name })}</Text> : null}
            </Pressable>
          </Animated.View>
        ) : null}
    </Modal>
  );
}

/** One Hebrew or Greek word as it stands in the verse: form, transliteration, gloss, grammar. */
function InVerseWord({ word, hebrew, font, theme, t, first }: { word: OriginalWord; hebrew: boolean; font: string | undefined; theme: Theme; t: ReturnType<typeof useT>; first: boolean }) {
  const grammar = word.morph ? describeMorph(word.morph, hebrew) : '';
  const note = textNote(word, t);
  return (
    <View style={first ? null : styles.inTextMore}>
      <Text style={[styles.inTextWord, { color: theme.text, fontFamily: font, textAlign: hebrew ? 'right' : 'left' }]}>{word.text}</Text>
      <Text style={[styles.inTextLine, { color: theme.text }]}>
        {word.translit}
        {word.gloss ? <Text style={{ color: theme.muted }}>  ·  {word.gloss}</Text> : null}
      </Text>
      {grammar ? (
        <Text style={[styles.inTextLine, { color: theme.muted }]}>
          {grammar}
          {grammar !== word.morph ? <Text style={{ fontVariant: ['tabular-nums'] }}>  ({word.morph})</Text> : null}
        </Text>
      ) : null}
      {note ? <Text style={[styles.note, { color: theme.accent }]}>{note}</Text> : null}
    </View>
  );
}

function Section({ label, theme, children }: { label: string; theme: Theme; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
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
          const font = isMalayalam(r.word) ? scriptureFont(true, false) : undefined;
          const content = (
            <Text style={[styles.chipText, { color: theme.text, fontFamily: font }]}>
              {r.word} <Text style={{ color: theme.muted, fontFamily: undefined }}>{formatCount(r.count)}</Text>
            </Text>
          );
          return onPress ? (
            <Pressable
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
function LinkedText({ text, color, accent, hebrewFont, onPick }: { text: string; color: string; accent: string; hebrewFont: string; onPick: (p: WordPick) => void }) {
  const parts = text.split(/([HG]\d{1,4}(?:\s*\([^)]*\))?)(?![\d\w])/);
  return (
    <Text style={[styles.derivation, { color }]}>
      {parts.map((part, i) => {
        const m = /^([HG]\d{1,4})(?:\s*\(([^)]*)\))?$/.exec(part);
        if (!m) return <Text key={i}>{part}</Text>;
        return (
          <Text
            key={i}
            onPress={() => onPick({ strongs: m[1] })}
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
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 30, lineHeight: 34 },
  close: { fontSize: 18 },
  langChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  langChipText: { fontSize: 13, fontWeight: '600' },
  spacer: { flex: 1 },
  spinner: { marginVertical: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  inText: { borderRadius: 14, padding: 14, marginBottom: 14 },
  inTextLabel: { fontSize: 13, marginBottom: 2 },
  inTextWord: { fontSize: 32, lineHeight: 46 },
  inTextLine: { fontSize: 15, lineHeight: 21, marginTop: 2 },
  note: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  inTextMore: { marginTop: 12 },
  dictionaryLabel: { marginTop: 4 },
  wordRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12 },
  tapped: { fontSize: 20, flexShrink: 1, maxWidth: '45%' },
  arrow: { fontSize: 20 },
  lemma: { fontSize: 42, lineHeight: 58 },
  meaning: { fontSize: 26, fontWeight: '700', marginTop: 2 },
  meaningMalayalam: { fontWeight: undefined, lineHeight: 40 },
  meaningSub: { fontSize: 17, marginTop: 2 },
  uses: { fontSize: 14, marginTop: 6 },
  usage: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  pronRow: { marginTop: 4 },
  pron: { fontSize: 17 },
  translit: { fontSize: 14 },
  section: { marginTop: 20 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontSize: 15 },
  relatedChip: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  relatedLemma: { fontSize: 20 },
  example: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  exampleRef: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  body: { fontSize: 15, lineHeight: 22 },
  derivation: { fontSize: 15, lineHeight: 22, marginTop: 6 },
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
  more: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 15, fontWeight: '600' },
  cta: { minHeight: 56, paddingVertical: 8, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaText: { fontSize: 16, fontWeight: '600' },
  ctaSub: { fontSize: 12, opacity: 0.85, marginTop: 1 },
});
