import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { Icon, IconButton } from '../components/Icon';
import { SectionLabel } from '../components/SectionLabel';
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
            <View style={styles.block}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('language')}</Text>
              <Segmented
                options={[
                  ['ml', 'മലയാളം'],
                  ['en', 'English'],
                ] as [Language, string][]}
                value={settings.language}
                onChange={(language) => update({ language })}
              />
            </View>
          ) : null}
          <View style={[styles.block, EDITION.languages.length > 1 && divider]}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{t('theme')}</Text>
            <Segmented
              options={[
                ['system', t('themeAuto')],
                ['light', t('themeLight')],
                ['sepia', t('themeSepia')],
                ['dark', t('themeDark')],
              ] as [ThemeChoice, string][]}
              value={settings.theme}
              onChange={(value) => update({ theme: value })}
            />
          </View>
          <View style={[styles.block, divider]}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{t('layout')}</Text>
            <Segmented
              options={[
                ['verses', t('layoutVerses')],
                ['paragraphs', t('layoutParagraphs')],
              ] as [Layout, string][]}
              value={settings.layout}
              onChange={(layout) => update({ layout })}
            />
          </View>
          <View style={[styles.row, divider]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('serif')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('serifDetail')}</Text>
            </View>
            <AppSwitch value={settings.serif} onValueChange={(v) => update({ serif: v })} />
          </View>
          <View style={[styles.row, divider]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('keepAwake')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('keepAwakeDetail')}</Text>
            </View>
            <AppSwitch value={settings.keepAwake} onValueChange={(v) => update({ keepAwake: v })} />
          </View>
        </View>

        <Label text={t('translation')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {EDITION.translations.map((id, i) => {
            const active = settings.translation === id;
            return (
              <Pressable key={id} onPress={() => update({ translation: id })} android_ripple={{ color: theme.accentSoft }} accessibilityRole="radio" accessibilityState={{ checked: active }} style={[styles.row, i > 0 && divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>{translationName(settings.language, id)}</Text>
                  <Text style={[styles.rowSub, { color: theme.muted }]}>{id}</Text>
                </View>
                <View style={styles.check}>{active ? <Icon name="check" color={theme.accent} /> : null}</View>
              </Pressable>
            );
          })}
        </View>

        <Label text={t('textSize')} />
        <View style={[styles.card, styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <IconButton name="text_decrease" onPress={() => setSize(-1)} disabled={sizeIndex <= 0} accessibilityLabel={t('smallerText')} color={theme.accent} />
          <Text style={[styles.preview, { color: theme.text, fontSize: settings.fontSize, fontFamily: theme.font }]}>{t('previewText')}</Text>
          <IconButton name="text_increase" onPress={() => setSize(1)} disabled={sizeIndex >= FONT_SIZES.length - 1} accessibilityLabel={t('largerText')} color={theme.accent} />
        </View>
        <Text style={[styles.rowSub, styles.hint, { color: theme.muted }]}>{t('textSizeHint')}</Text>

        <Label text={t('interlinear')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('showInterlinear')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('showInterlinearDetail')}</Text>
            </View>
            <AppSwitch value={settings.interlinear} onValueChange={(v) => update({ interlinear: v })} />
          </View>
          {(
            [
              ['all', t('everyVerse'), t('everyVerseDetail')],
              ['tap', t('tappedVerses'), t('tappedVersesDetail')],
            ] as const
          ).map(([mode, title, sub]) => (
            <Pressable key={mode} onPress={() => update({ interlinearMode: mode })} android_ripple={{ color: theme.accentSoft }} accessibilityRole="radio" accessibilityState={{ checked: settings.interlinearMode === mode }} style={[styles.row, divider]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.rowSub, { color: theme.muted }]}>{sub}</Text>
              </View>
              <View style={styles.check}>{settings.interlinearMode === mode ? <Icon name="check" color={theme.accent} /> : null}</View>
            </Pressable>
          ))}
          <View style={[styles.row, divider]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('transliteration')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('transliterationDetail')}</Text>
            </View>
            <AppSwitch value={settings.showTranslit} onValueChange={(v) => update({ showTranslit: v })} />
          </View>
          <View style={[styles.row, divider]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('hideCantillation')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('hideCantillationDetail')}</Text>
            </View>
            <AppSwitch value={settings.hideCantillation} onValueChange={(v) => update({ hideCantillation: v })} />
          </View>
        </View>

        <Label text={t('reading')} />
        <View style={[styles.card, styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{t('underline')}</Text>
            <Text style={[styles.rowSub, { color: theme.muted }]}>{t('underlineDetail')}</Text>
          </View>
          <AppSwitch value={settings.underlineWords} onValueChange={(v) => update({ underlineWords: v })} />
        </View>

        <Label text={t('aboutTexts')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 14 }]}>
          <Text style={[styles.about, { color: theme.text }]}>{EDITION.id === 'ml' ? t('aboutMalayalam') : t('aboutEnglish')}</Text>
          <Text style={[styles.about, { color: theme.text, marginTop: 10 }]}>{t('aboutStrongs')}</Text>
          <Text style={[styles.about, { color: theme.text, marginTop: 10 }]}>{t('aboutInterlinear')}</Text>
          {EDITION.translations.includes('WEB') ? <Text style={[styles.about, { color: theme.muted, marginTop: 10 }]}>{t('aboutWeb')}</Text> : null}
          {meta.built ? <Text style={[styles.rowSub, { color: theme.muted, marginTop: 10 }]}>{t('databaseBuilt', { date: meta.built })}</Text> : null}
          <Pressable onPress={onOpenLicences} accessibilityRole="button" android_ripple={{ color: theme.accentSoft }} style={styles.licencesRow}>
            <Text style={[styles.rowTitle, { color: theme.accent, flex: 1 }]}>{t('sourcesLicences')}</Text>
            <Icon name="chevron_right" color={theme.accent} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Connected buttons for picking one of a few options. The selected one is filled, and
 * ticked when there is room (three options or fewer; four Malayalam words leave none).
 */
function Segmented<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (value: T) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { borderColor: theme.muted }]} accessibilityRole="radiogroup">
      {options.map(([option, label], i) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            android_ripple={{ color: theme.accentSoft }}
            style={[styles.segment, i > 0 && { borderLeftWidth: 1, borderLeftColor: theme.muted }, active && { backgroundColor: theme.accentSoft }]}
          >
            {active && options.length <= 3 ? <Icon name="check" size={18} color={theme.accent} /> : null}
            <Text numberOfLines={1} style={[styles.segmentText, { color: active ? theme.accent : theme.text }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A switch whose track shows when off as well as on. */
function AppSwitch({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) {
  const theme = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: theme.dark ? '#4A4238' : '#CFC6B8', true: theme.accent }}
      thumbColor={value ? theme.onAccent : theme.dark ? theme.muted : '#FFFFFF'}
      ios_backgroundColor={theme.dark ? '#4A4238' : '#CFC6B8'}
    />
  );
}

function Label({ text }: { text: string }) {
  return <SectionLabel text={text} style={styles.label} />;
}

const styles = StyleSheet.create({
  hint: { marginTop: 6, marginHorizontal: 4 },
  licencesRow: { marginTop: 12, minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, alignSelf: 'center', width: '100%', maxWidth: 720 },
  label: { marginTop: 22, marginBottom: 8, marginHorizontal: 4 },
  block: { paddingHorizontal: 14, paddingVertical: 12 },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  segment: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6 },
  segmentText: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  rowTitle: { fontSize: 16, lineHeight: 24 },
  rowSub: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  check: { width: 24, alignItems: 'flex-end' },
  preview: { flex: 1, textAlign: 'center' },
  about: { fontSize: 14, lineHeight: 21 },
});
