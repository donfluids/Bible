import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { useEdition } from '../edition';
import type { Language } from '../edition';
import { translationName, useT } from '../i18n';
import { getMeta } from '../queries';
import { FONT_SIZES, useSettings } from '../settings';
import type { Layout, ThemeChoice } from '../settings';
import { useTheme } from '../theme';

interface Props {
  onBack: () => void;
  onOpenLicences: () => void;
}

export function SettingsScreen({ onBack, onOpenLicences }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  // Lists run under the system navigation bar; the last row must clear it.
  const insets = useSafeAreaInsets();
  const t = useT();
  const EDITION = useEdition();
  const { settings, update } = useSettings();
  const [meta, setMeta] = useState<Record<string, string>>({});

  useEffect(() => {
    getMeta(db)
      .then(setMeta)
      .catch(() => undefined); // only the build date is lost
  }, [db]);

  const sizeIndex = FONT_SIZES.indexOf(settings.fontSize);
  const setSize = (delta: number) => {
    const i = Math.min(FONT_SIZES.length - 1, Math.max(0, (sizeIndex < 0 ? 2 : sizeIndex) + delta));
    update({ fontSize: FONT_SIZES[i] });
  };
  const divider = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={t('settings')} onBack={onBack} backLabel={t('back')} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Label text={t('appearance')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {EDITION.languages.length > 1 ? (
            <View style={styles.row}>
              <Text style={[styles.rowTitle, { color: theme.text, width: 90 }]}>{t('language')}</Text>
              <View style={styles.pills}>
                {(
                  [
                    ['ml', 'മലയാളം'],
                    ['en', 'English'],
                  ] as [Language, string][]
                ).map(([value, label]) => (
                  <Pill key={value} label={label} active={settings.language === value} onPress={() => update({ language: value })} />
                ))}
              </View>
            </View>
          ) : null}
          <View style={[styles.row, EDITION.languages.length > 1 && divider]}>
            <Text style={[styles.rowTitle, { color: theme.text, width: 90 }]}>{t('theme')}</Text>
            <View style={styles.pills}>
              {(
                [
                  ['system', t('themeAuto')],
                  ['light', t('themeLight')],
                  ['sepia', t('themeSepia')],
                  ['dark', t('themeDark')],
                ] as [ThemeChoice, string][]
              ).map(([value, label]) => (
                <Pill key={value} label={label} active={settings.theme === value} onPress={() => update({ theme: value })} />
              ))}
            </View>
          </View>
          <View style={[styles.row, divider]}>
            <Text style={[styles.rowTitle, { color: theme.text, width: 90 }]}>{t('layout')}</Text>
            <View style={styles.pills}>
              {(
                [
                  ['verses', t('layoutVerses')],
                  ['paragraphs', t('layoutParagraphs')],
                ] as [Layout, string][]
              ).map(([value, label]) => (
                <Pill key={value} label={label} active={settings.layout === value} onPress={() => update({ layout: value })} />
              ))}
            </View>
          </View>
          <View style={[styles.row, divider]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('serif')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('serifDetail')}</Text>
            </View>
            <Switch value={settings.serif} onValueChange={(v) => update({ serif: v })} trackColor={{ true: theme.accent }} />
          </View>
          <View style={[styles.row, divider]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('keepAwake')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('keepAwakeDetail')}</Text>
            </View>
            <Switch value={settings.keepAwake} onValueChange={(v) => update({ keepAwake: v })} trackColor={{ true: theme.accent }} />
          </View>
        </View>

        <Label text={t('translation')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {EDITION.translations.map((id, i) => {
            const active = settings.translation === id;
            return (
              <Pressable key={id} onPress={() => update({ translation: id })} style={[styles.row, i > 0 && divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>{translationName(settings.language, id)}</Text>
                  <Text style={[styles.rowSub, { color: theme.muted }]}>{id}</Text>
                </View>
                <Text style={[styles.check, { color: theme.accent }]}>{active ? '✓' : ''}</Text>
              </Pressable>
            );
          })}
        </View>

        <Label text={t('textSize')} />
        <View style={[styles.card, styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <SizeButton label="A" small onPress={() => setSize(-1)} disabled={sizeIndex <= 0} />
          <Text style={[styles.preview, { color: theme.text, fontSize: settings.fontSize, fontFamily: theme.font }]}>{t('previewText')}</Text>
          <SizeButton label="A" onPress={() => setSize(1)} disabled={sizeIndex >= FONT_SIZES.length - 1} />
        </View>

        <Label text={t('interlinear')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('showInterlinear')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('showInterlinearDetail')}</Text>
            </View>
            <Switch value={settings.interlinear} onValueChange={(v) => update({ interlinear: v })} trackColor={{ true: theme.accent }} />
          </View>
          {(
            [
              ['all', t('everyVerse'), t('everyVerseDetail')],
              ['tap', t('tappedVerses'), t('tappedVersesDetail')],
            ] as const
          ).map(([mode, title, sub]) => (
            <Pressable key={mode} onPress={() => update({ interlinearMode: mode })} style={[styles.row, divider]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.rowSub, { color: theme.muted }]}>{sub}</Text>
              </View>
              <Text style={[styles.check, { color: theme.accent }]}>{settings.interlinearMode === mode ? '✓' : ''}</Text>
            </Pressable>
          ))}
          <View style={[styles.row, divider]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('transliteration')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('transliterationDetail')}</Text>
            </View>
            <Switch value={settings.showTranslit} onValueChange={(v) => update({ showTranslit: v })} trackColor={{ true: theme.accent }} />
          </View>
          <View style={[styles.row, divider]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('hideCantillation')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('hideCantillationDetail')}</Text>
            </View>
            <Switch value={settings.hideCantillation} onValueChange={(v) => update({ hideCantillation: v })} trackColor={{ true: theme.accent }} />
          </View>
        </View>

        <Label text={t('reading')} />
        <View style={[styles.card, styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{t('underline')}</Text>
            <Text style={[styles.rowSub, { color: theme.muted }]}>{t('underlineDetail')}</Text>
          </View>
          <Switch value={settings.underlineWords} onValueChange={(v) => update({ underlineWords: v })} trackColor={{ true: theme.accent }} />
        </View>

        <Label text={t('aboutTexts')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 14 }]}>
          <Text style={[styles.about, { color: theme.text }]}>{EDITION.id === 'ml' ? t('aboutMalayalam') : t('aboutEnglish')}</Text>
          <Text style={[styles.about, { color: theme.text, marginTop: 10 }]}>{t('aboutStrongs')}</Text>
          <Text style={[styles.about, { color: theme.text, marginTop: 10 }]}>{t('aboutInterlinear')}</Text>
          {EDITION.translations.includes('WEB') ? <Text style={[styles.about, { color: theme.muted, marginTop: 10 }]}>{t('aboutWeb')}</Text> : null}
          {meta.built ? <Text style={[styles.rowSub, { color: theme.muted, marginTop: 10 }]}>{t('databaseBuilt', { date: meta.built })}</Text> : null}
          <Pressable onPress={onOpenLicences} accessibilityRole="button" hitSlop={6} style={styles.licencesRow}>
            <Text style={[styles.rowTitle, { color: theme.accent }]}>{t('sourcesLicences')} ›</Text>
          </Pressable>
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
      <Text style={[styles.pillText, { color: active ? theme.onAccent : theme.text }]}>{label}</Text>
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
  licencesRow: { marginTop: 12, minHeight: 44, justifyContent: 'center' },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, alignSelf: 'center', width: '100%', maxWidth: 720 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  rowTitle: { fontSize: 16, lineHeight: 24 },
  rowSub: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  check: { fontSize: 18, fontWeight: '700', width: 24, textAlign: 'right' },
  preview: { flex: 1, textAlign: 'center' },
  pills: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '600' },
  about: { fontSize: 14, lineHeight: 21 },
});
