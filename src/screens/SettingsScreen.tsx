import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { getMeta } from '../queries';
import { FONT_SIZES, useSettings } from '../settings';
import type { Layout, ThemeChoice } from '../settings';
import { useTheme } from '../theme';
import { TRANSLATIONS } from '../types';

interface Props {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { settings, update } = useSettings();
  const [meta, setMeta] = useState<Record<string, string>>({});

  useEffect(() => {
    getMeta(db).then(setMeta);
  }, [db]);

  const sizeIndex = FONT_SIZES.indexOf(settings.fontSize);
  const setSize = (delta: number) => {
    const i = Math.min(FONT_SIZES.length - 1, Math.max(0, (sizeIndex < 0 ? 2 : sizeIndex) + delta));
    update({ fontSize: FONT_SIZES[i] });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title="Settings" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Label text="Appearance" />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowTitle, { color: theme.text, width: 70 }]}>Theme</Text>
            <View style={styles.pills}>
              {(
                [
                  ['system', 'Auto'],
                  ['light', 'Light'],
                  ['sepia', 'Sepia'],
                  ['dark', 'Dark'],
                ] as [ThemeChoice, string][]
              ).map(([value, label]) => (
                <Pill key={value} label={label} active={settings.theme === value} onPress={() => update({ theme: value })} />
              ))}
            </View>
          </View>
          <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
            <Text style={[styles.rowTitle, { color: theme.text, width: 70 }]}>Layout</Text>
            <View style={styles.pills}>
              {(
                [
                  ['verses', 'Verse per line'],
                  ['paragraphs', 'Paragraphs'],
                ] as [Layout, string][]
              ).map(([value, label]) => (
                <Pill key={value} label={label} active={settings.layout === value} onPress={() => update({ layout: value })} />
              ))}
            </View>
          </View>
          <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Serif typeface</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>Scripture in a book-style face</Text>
            </View>
            <Switch value={settings.serif} onValueChange={(v) => update({ serif: v })} trackColor={{ true: theme.accent }} />
          </View>
          <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Keep screen awake</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>While the app is open</Text>
            </View>
            <Switch value={settings.keepAwake} onValueChange={(v) => update({ keepAwake: v })} trackColor={{ true: theme.accent }} />
          </View>
        </View>

        <Label text="Translation" />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {TRANSLATIONS.map((t, i) => {
            const active = settings.translation === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => update({ translation: t.id })}
                style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>{t.name}</Text>
                  <Text style={[styles.rowSub, { color: theme.muted }]}>{t.id}</Text>
                </View>
                <Text style={[styles.check, { color: theme.accent }]}>{active ? '✓' : ''}</Text>
              </Pressable>
            );
          })}
        </View>

        <Label text="Text size" />
        <View style={[styles.card, styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <SizeButton label="A" small onPress={() => setSize(-1)} disabled={sizeIndex <= 0} />
          <Text style={[styles.preview, { color: theme.text, fontSize: settings.fontSize, fontFamily: theme.font }]}>In the beginning</Text>
          <SizeButton label="A" onPress={() => setSize(1)} disabled={sizeIndex >= FONT_SIZES.length - 1} />
        </View>

        <Label text="Interlinear" />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Show interlinear</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>Hebrew or Greek words with transliteration and gloss under each verse</Text>
            </View>
            <Switch value={settings.interlinear} onValueChange={(v) => update({ interlinear: v })} trackColor={{ true: theme.accent }} />
          </View>
          {(
            [
              ['all', 'Every verse', 'The whole chapter is shown word by word'],
              ['tap', 'Only verses I tap', 'Tap a verse number to show or hide its words. Keeps long chapters short.'],
            ] as const
          ).map(([mode, title, sub]) => (
            <Pressable
              key={mode}
              onPress={() => update({ interlinearMode: mode })}
              style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.rowSub, { color: theme.muted }]}>{sub}</Text>
              </View>
              <Text style={[styles.check, { color: theme.accent }]}>{settings.interlinearMode === mode ? '✓' : ''}</Text>
            </Pressable>
          ))}
          <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Transliteration</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>Show how each word is pronounced</Text>
            </View>
            <Switch value={settings.showTranslit} onValueChange={(v) => update({ showTranslit: v })} trackColor={{ true: theme.accent }} />
          </View>
          <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Hide cantillation marks</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>Hebrew with vowel points only, easier to read at small sizes</Text>
            </View>
            <Switch value={settings.hideCantillation} onValueChange={(v) => update({ hideCantillation: v })} trackColor={{ true: theme.accent }} />
          </View>
        </View>

        <View style={[styles.card, styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Underline linked words</Text>
            <Text style={[styles.rowSub, { color: theme.muted }]}>Marks words that open a Greek or Hebrew entry</Text>
          </View>
          <Switch value={settings.underlineWords} onValueChange={(v) => update({ underlineWords: v })} trackColor={{ true: theme.accent }} />
        </View>

        <Label text="Reading" />
        <Label text="About the texts" />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 14 }]}>
          <Text style={[styles.about, { color: theme.text }]}>
            King James Version, 1769 text with Strong's numbers, and the World English Bible, both from eBible.org. Both are in the public domain.
            Their translators' footnotes appear as small letters in the text; tap one to read it.
          </Text>
          <Text style={[styles.about, { color: theme.text, marginTop: 10 }]}>
            Hebrew and Greek entries are from Strong's Exhaustive Concordance (1890), in the digital edition by Open Scriptures, licensed CC BY-SA.
          </Text>
          <Text style={[styles.about, { color: theme.text, marginTop: 10 }]}>
            The interlinear Hebrew (Leningrad Codex) and Greek text, with transliteration, glosses and grammar, is from the Translators
            Amalgamated Hebrew OT and Greek NT by STEPBible.org, Tyndale House Cambridge, licensed CC BY 4.0. The Greek shows the words of
            the Textus Receptus and Byzantine text; words absent from the Nestle-Aland editions are marked with a line beneath.
          </Text>
          <Text style={[styles.about, { color: theme.muted, marginTop: 10 }]}>
            The Strong's tagging in the World English Bible is less precise than in the King James Version. A word may occasionally
            open a neighbouring word's entry.
          </Text>
          {meta.built ? <Text style={[styles.rowSub, { color: theme.muted, marginTop: 10 }]}>Database built {meta.built}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.pill, { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accent : 'transparent' }]}
    >
      <Text style={[styles.pillText, { color: active ? '#fff' : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function Label({ text }: { text: string }) {
  const theme = useTheme();
  return <Text style={[styles.label, { color: theme.muted }]}>{text.toUpperCase()}</Text>;
}

function SizeButton({ label, small, onPress, disabled }: { label: string; small?: boolean; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={10} style={({ pressed }) => ({ opacity: disabled ? 0.3 : pressed ? 0.6 : 1 })}>
      <Text style={{ color: theme.accent, fontSize: small ? 16 : 26, fontWeight: '700', width: 36, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 13, marginTop: 2 },
  check: { fontSize: 18, fontWeight: '700', width: 24, textAlign: 'right' },
  preview: { flex: 1, textAlign: 'center' },
  pills: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '600' },
  about: { fontSize: 14, lineHeight: 20 },
});
