import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { getConcordanceCount, getStrongs } from '../queries';
import { formatCount, isHebrew } from '../text';
import { useTheme } from '../theme';
import type { StrongsEntry, TranslationId, WordPick } from '../types';

interface Props {
  pick: WordPick | null;
  translation: TranslationId;
  onClose: () => void;
  /** Follow a Strong's number mentioned in the derivation. */
  onPick: (pick: WordPick) => void;
  onShowOccurrences: (strongs: string) => void;
}

interface Loaded {
  entry: StrongsEntry | null;
  count: number;
}

/** Bottom sheet with the Strong's entry for a tapped word. */
export function WordSheet({ pick, translation, onClose, onPick, onShowOccurrences }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!pick) return;
    let cancelled = false;
    setData(null);
    Promise.all([getStrongs(db, pick.strongs), getConcordanceCount(db, pick.strongs, translation)]).then(([entry, count]) => {
      if (!cancelled) setData({ entry, count });
    });
    return () => {
      cancelled = true;
    };
  }, [db, pick, translation]);

  if (!pick) return null;
  const hebrew = isHebrew(pick.strongs);
  const entry = data?.entry;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.grip, { backgroundColor: theme.border }]} />
        <View style={styles.headRow}>
          <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.badgeText, { color: theme.accent }]}>{pick.strongs}</Text>
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
        ) : !entry ? (
          <Text style={[styles.body, { color: theme.text }]}>No dictionary entry for {pick.strongs}.</Text>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
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
  spinner: { marginVertical: 40 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 8 },
  lemma: { fontSize: 38, lineHeight: 50, marginTop: 4 },
  translit: { fontSize: 18, marginBottom: 6 },
  section: { marginTop: 14 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  body: { fontSize: 16, lineHeight: 23 },
  cta: { marginTop: 22, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
