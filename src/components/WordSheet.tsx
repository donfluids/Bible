import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useEdition } from '../edition';
import { HEBREW_FONT, isMalayalam, scriptureFont } from '../fonts';
import { renderingsLabel, translationName, useT } from '../i18n';
import type { StringKey } from '../i18n';
import { describeMorph } from '../morph';
import { getConcordance, getConcordanceCount, getRelated, getRenderings, getStrongs, getVerses } from '../queries';
import { useSettings } from '../settings';
import { formatCount, formatRef, isHebrew } from '../text';
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
}

interface Loaded {
  entry: StrongsEntry | null;
  count: number;
  renderings: Rendering[];
  /** The KJV's renderings, beside another translation's. */
  kjv: Rendering[];
  examples: VerseRow[];
  related: RelatedWord[];
  failed?: boolean;
}

const EMPTY: Omit<Loaded, 'entry'> = { count: 0, renderings: [], kjv: [], examples: [], related: [] };

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

/** The renderings worth a chip: the main ones, not the one-off phrasings. */
function topRenderings(list: Rendering[], max: number): Rendering[] {
  const main = list.filter((r, i) => i === 0 || r.count >= 2);
  return main.slice(0, max);
}

/**
 * Bottom sheet for a tapped word. It opens at half height with the word, its meaning and
 * pronunciation and how this Bible translates it; dragging the top up (or the button
 * above "See all") shows examples, related words and Strong's dictionary entry.
 */
export function WordSheet({ pick, translation, books, onClose, onBack, onPick, onShowOccurrences, onOpenRef }: Props) {
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
  const [data, setData] = useState<Loaded | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  // Heights the sheet rests at, and the drag that moves between them.
  const fullH = Math.max(320, winH - insets.top - 24);
  const halfH = Math.min(fullH, Math.max(380, Math.round(winH * 0.56)));
  const height = useRef(new Animated.Value(halfH)).current;
  const currentH = useRef(halfH);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const id = height.addListener(({ value }) => (currentH.current = value));
    return () => height.removeListener(id);
  }, [height]);
  const snap = useCallback(
    (to: 'half' | 'full' | 'closed') => {
      const target = to === 'full' ? fullH : to === 'half' ? halfH : 0;
      setExpanded(to === 'full');
      Animated.spring(height, { toValue: target, useNativeDriver: false, bounciness: 0, speed: 18 }).start(({ finished }) => {
        if (finished && to === 'closed') onClose();
      });
    },
    [fullH, halfH, height, onClose],
  );
  // A new word (not a link followed from this one) starts at half height again.
  const isNewWord = !onBack;
  useEffect(() => {
    if (!pick || !isNewWord) return;
    height.setValue(halfH);
    setExpanded(false);
    setShowLegend(false);
  }, [pick, isNewWord, halfH, height]);
  const startH = useRef(0);
  const drag = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          startH.current = currentH.current;
        },
        onPanResponderMove: (_, g) => height.setValue(Math.max(60, Math.min(fullH, startH.current - g.dy))),
        onPanResponderRelease: (_, g) => {
          const h = startH.current - g.dy;
          if (g.vy > 1 || h < halfH * 0.6) snap('closed');
          else if (g.vy < -0.5 || h > (halfH + fullH) / 2) snap('full');
          else snap('half');
        },
      }),
    [fullH, halfH, height, snap],
  );

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
      const [entry, count, renderings, kjv, refs] = await Promise.all([
        getStrongs(db, strongs),
        getConcordanceCount(db, strongs, tagged),
        getRenderings(db, strongs, tagged),
        withKjv ? getRenderings(db, strongs, 'KJV') : Promise.resolve([] as Rendering[]),
        getConcordance(db, strongs, tagged),
      ]);
      const [examples, related] = await Promise.all([getVerses(db, tagged, refs.slice(0, 2)), entry ? getRelated(db, entry) : Promise.resolve([])]);
      return { entry, count, renderings, kjv, examples, related };
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
  }, [db, pick, tagged, withKjv]);

  if (!pick) return null;
  const original = pick.original;
  const hebrew = pick.strongs ? isHebrew(pick.strongs) : !!original && /[֐-׿]/.test(original.text);
  const originalFont = hebrew ? HEBREW_FONT : theme.font;
  const entry = data?.entry;
  const grammar = original?.morph ? describeMorph(original.morph, hebrew) : '';
  const note = original ? textNote(original, t) : '';
  const tappedFont = pick.word && isMalayalam(pick.word) ? scriptureFont(true, settings.serif, true) : undefined;
  const pron = syllables(entry?.pron ?? null);
  const name = translationName(settings.language, tagged);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onBack ?? onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('close')} />
      <Animated.View style={[styles.sheet, { height, backgroundColor: theme.card, paddingBottom: insets.bottom + 12, borderColor: theme.border }]}>
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
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {original ? (
              <View style={[styles.inText, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.inTextLabel, { color: theme.muted }]}>{t('inThisVerse')}</Text>
                <Text style={[styles.inTextWord, { color: theme.text, fontFamily: originalFont, textAlign: hebrew ? 'right' : 'left' }]}>{original.text}</Text>
                <Text style={[styles.inTextLine, { color: theme.text }]}>
                  {original.translit}
                  {original.gloss ? <Text style={{ color: theme.muted }}>  ·  {original.gloss}</Text> : null}
                </Text>
                {grammar ? (
                  <Text style={[styles.inTextLine, { color: theme.muted }]}>
                    {grammar}
                    {grammar !== original.morph ? <Text style={{ fontVariant: ['tabular-nums'] }}>  ({original.morph})</Text> : null}
                  </Text>
                ) : null}
                {note ? <Text style={[styles.note, { color: theme.accent }]}>{note}</Text> : null}
              </View>
            ) : null}

            {!entry ? (
              <Text style={[styles.body, { color: theme.text }]}>
                {data.failed ? t('loadFailed') : pick.strongs ? t('noEntry', { id: pick.strongs }) : t('noStrongs')}
              </Text>
            ) : (
              <>
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
                {entry.gloss ? <Text style={[styles.meaning, { color: theme.text }]}>{entry.gloss}</Text> : null}
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

                <Renderings
                  label={renderingsLabel(settings.language, tagged)}
                  list={topRenderings(data.renderings, 6)}
                  theme={theme}
                  onPress={(word) => onShowOccurrences(entry.id, word)}
                />
                {withKjv ? <Renderings label={renderingsLabel(settings.language, 'KJV')} list={topRenderings(data.kjv, 5)} theme={theme} /> : null}

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
                  {entry.derivation ? <LinkedText text={entry.derivation} color={theme.muted} accent={theme.accent} hebrewFont={HEBREW_FONT} onPick={onPick} /> : null}
                  <Text style={[styles.numberLine, { color: theme.muted }]}>{t('strongsNumberLine', { id: entry.id })}</Text>
                </Section>

                {original ? (
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
                        {original.flags ? <Text style={[styles.legendText, { color: theme.muted, marginTop: 6 }]}>{t('legendVariant')}</Text> : null}
                      </View>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </ScrollView>
        )}

        {entry ? (
          <View style={[styles.footer, { borderTopColor: expanded ? theme.border : 'transparent' }]}>
            {!expanded ? (
              <Pressable onPress={() => snap('full')} accessibilityRole="button" style={styles.more}>
                <Text style={[styles.moreText, { color: theme.accent }]}>⌃  {t('moreAboutWord')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => onShowOccurrences(entry.id)}
              disabled={data!.count === 0}
              style={({ pressed }) => [styles.cta, { backgroundColor: theme.accent, opacity: pressed || data!.count === 0 ? 0.6 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.ctaText, { color: theme.onAccent }]}>
                {data!.count === 0
                  ? t('notTagged', { translation: name })
                  : data!.count === 1
                    ? t('seeOneVerse')
                    : t('seeAllVerses', { n: formatCount(data!.count) })}
              </Text>
              {data!.count > 0 ? <Text style={[styles.ctaSub, { color: theme.onAccent }]}>{t('inTranslationSub', { name })}</Text> : null}
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
    </Modal>
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
  wordRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12 },
  tapped: { fontSize: 20, flexShrink: 1, maxWidth: '45%' },
  arrow: { fontSize: 20 },
  lemma: { fontSize: 42, lineHeight: 58 },
  meaning: { fontSize: 26, fontWeight: '700', marginTop: 2 },
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
  footer: { paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
  more: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 15, fontWeight: '600' },
  cta: { minHeight: 56, paddingVertical: 8, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaText: { fontSize: 16, fontWeight: '600' },
  ctaSub: { fontSize: 12, opacity: 0.85, marginTop: 1 },
});
