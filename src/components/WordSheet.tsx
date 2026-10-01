import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { describeMorph } from '../morph';
import { getConcordanceCount, getStrongs } from '../queries';
import { formatCount, isHebrew } from '../text';
import { useTheme } from '../theme';
import { FLAG_LXX, FLAG_NOT_IN_NA, FLAG_RESTORED } from '../types';
import type { StrongsEntry, TranslationId, WordPick } from '../types';

interface Props {
  pick: WordPick | null;
  translation: TranslationId;
  onClose: () => void;
  /** Return to the previous entry after following a link. */
  onBack?: () => void;
  /** Follow a Strong's number mentioned in the derivation. */
  onPick: (pick: WordPick) => void;
  onShowOccurrences: (strongs: string) => void;
}

interface Loaded {
  entry: StrongsEntry | null;
  count: number;
}

/** Bottom sheet with the Strong's entry for a tapped word. */
export function WordSheet({ pick, translation, onClose, onBack, onPick, onShowOccurrences }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Loaded | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    if (!pick) return;
    let cancelled = false;
    setData(null);
    if (!pick.strongs) {
      setData({ entry: null, count: 0 });
      return;
    }
    Promise.all([getStrongs(db, pick.strongs), getConcordanceCount(db, pick.strongs, translation)]).then(([entry, count]) => {
      if (!cancelled) setData({ entry, count });
    });
    return () => {
      cancelled = true;
    };
  }, [db, pick, translation]);

  if (!pick) return null;
  const original = pick.original;
  const hebrew = pick.strongs ? isHebrew(pick.strongs) : !!original && /[\u0590-\u05FF]/.test(original.text);
  const entry = data?.entry;
  const grammar = original?.morph ? describeMorph(original.morph, hebrew) : '';
  const note = original
    ? original.flags & FLAG_NOT_IN_NA
      ? 'In the Textus Receptus and Byzantine text, which the KJV and WEB translate, but not in the Nestle-Aland editions used by most modern translations.'
      : original.flags & FLAG_LXX
        ? 'Not in the Hebrew Leningrad Codex. Supplied from the Septuagint, as some translations do.'
        : original.flags & FLAG_RESTORED
          ? 'Missing from the Leningrad Codex and restored from a parallel passage.'
          : ''
    : '';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onBack ?? onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.grip, { backgroundColor: theme.border }]} />
        <View style={styles.headRow}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Previous entry">
              <Text style={[styles.back, { color: theme.accent }]}>‹</Text>
            </Pressable>
          ) : null}
          <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.badgeText, { color: theme.accent }]}>{pick.strongs || '—'}</Text>
          </View>
          <Text style={[styles.lang, { color: theme.muted }]}>{hebrew ? 'Hebrew' : 'Greek'}</Text>
          {pick.word ? (
            <Text numberOfLines={1} style={[styles.tapped, { color: theme.muted }]}>
              “{pick.word}”
            </Text>
          ) : null}
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={[styles.close, { color: theme.muted }]}>✕</Text>
          </Pressable>
        </View>

        {!data ? (
          <ActivityIndicator style={styles.spinner} color={theme.accent} />
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {original ? (
              <View style={[styles.inText, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.inTextWord, { color: theme.text, writingDirection: hebrew ? 'rtl' : 'ltr' }]}>{original.text}</Text>
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
                {pick.strongs ? `No dictionary entry for ${pick.strongs}.` : 'This word has no Strong\'s number.'}
              </Text>
            ) : (
              <>
            <Text style={[styles.lemma, { color: theme.text, writingDirection: hebrew ? 'rtl' : 'ltr' }]}>{entry.lemma}</Text>
            <Text style={[styles.translit, { color: theme.text }]}>
              {entry.translit}
              {entry.pron ? <Text style={{ color: theme.muted }}>  ·  {entry.pron}</Text> : null}
            </Text>

            {entry.derivation ? (
              <Section label="Derivation" theme={theme}>
                <LinkedText text={entry.derivation} color={theme.text} accent={theme.accent} onPick={onPick} />
              </Section>
            ) : null}
            {entry.definition ? (
              <Section label="Definition" theme={theme}>
                <Text style={[styles.body, { color: theme.text }]}>{entry.definition}</Text>
              </Section>
            ) : null}
            {entry.kjv_usage ? (
              <Section label="Translated in the KJV as" theme={theme}>
                <Text style={[styles.body, { color: theme.text }]}>{entry.kjv_usage}</Text>
              </Section>
            ) : null}

            <Pressable onPress={() => setShowLegend((v) => !v)} hitSlop={6} accessibilityRole="button" style={styles.legendToggle}>
              <Text style={[styles.legendToggleText, { color: theme.accent }]}>{showLegend ? 'Hide the key to the marks' : 'What do the marks mean?'}</Text>
            </Pressable>
            {showLegend ? (
              <View style={[styles.legend, { borderColor: theme.border }]}>
                <Text style={[styles.legendText, { color: theme.muted }]}>
                  In the KJV renderings, × or [idiom] marks an idiomatic rendering, + marks a phrase made with other words, and (-ly) or
                  (-ness) shows another ending of the same rendering. Numbers such as H433 in the derivation are other entries; tap one to open it.
                </Text>
                {original ? (
                  <Text style={[styles.legendText, { color: theme.muted, marginTop: 6 }]}>
                    In the gloss, {'<a word>'} in angle brackets is in the original but best left untranslated, and [a word] in square brackets is
                    implied but not in the original.
                    {hebrew ? ' In the transliteration, dots separate syllables and the capital letter marks the stressed syllable.' : ''}
                  </Text>
                ) : null}
                {original && original.flags ? (
                  <Text style={[styles.legendText, { color: theme.muted, marginTop: 6 }]}>
                    A line under a word in the interlinear marks text that differs between editions; the note above explains this one.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Pressable
              onPress={() => onShowOccurrences(pick.strongs)}
              disabled={data.count === 0}
              style={({ pressed }) => [styles.cta, { backgroundColor: theme.accent, opacity: pressed || data.count === 0 ? 0.6 : 1 }]}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>
                {data.count === 0
                  ? `Not tagged in the ${translation}`
                  : `Show ${formatCount(data.count)} ${data.count === 1 ? 'verse' : 'verses'} in the ${translation}`}
              </Text>
            </Pressable>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function Section({ label, theme, children }: { label: string; theme: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: theme.muted }]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

/** Renders text where Strong's numbers such as "H433" become links. */
function LinkedText({ text, color, accent, onPick }: { text: string; color: string; accent: string; onPick: (p: WordPick) => void }) {
  const parts = text.split(/([HG]\d{1,4})(?![\d\w])/);
  return (
    <Text style={[styles.body, { color }]}>
      {parts.map((part, i) =>
        /^[HG]\d{1,4}$/.test(part) ? (
          <Text key={i} onPress={() => onPick({ strongs: part })} style={{ color: accent, fontWeight: '600' }}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    maxHeight: '80%',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontWeight: '700', fontSize: 15, fontVariant: ['tabular-nums'] },
  lang: { fontSize: 13 },
  tapped: { flex: 1, fontSize: 13, fontStyle: 'italic' },
  close: { fontSize: 18, paddingHorizontal: 4 },
  back: { fontSize: 30, lineHeight: 32, marginTop: -4, paddingHorizontal: 2 },
  spinner: { marginVertical: 40 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 8 },
  inText: { borderRadius: 12, padding: 12, marginTop: 4, marginBottom: 6 },
  inTextWord: { fontSize: 30, lineHeight: 42 },
  inTextLine: { fontSize: 15, lineHeight: 21, marginTop: 2 },
  note: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  lemma: { fontSize: 38, lineHeight: 50, marginTop: 4 },
  translit: { fontSize: 18, marginBottom: 6 },
  section: { marginTop: 14 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  body: { fontSize: 16, lineHeight: 23 },
  legendToggle: { marginTop: 14, alignSelf: 'flex-start' },
  legendToggleText: { fontSize: 14, fontWeight: '600' },
  legend: { marginTop: 8, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  legendText: { fontSize: 13, lineHeight: 19 },
  cta: { marginTop: 18, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
