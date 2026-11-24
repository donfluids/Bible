import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable } from '../components/Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { AppSwitch } from '../components/AppSwitch';
import { BackupSheet } from '../components/BackupSheet';
import { Header } from '../components/Header';
import { Icon, IconButton } from '../components/Icon';
import { SectionLabel } from '../components/SectionLabel';
import { besideChoice, isMultilingual, nativeTranslation, useEdition } from '../edition';
import type { BesideSlot } from '../edition';
import type { Language } from '../edition';
import { bibleName, englishName, useT } from '../i18n';
import { getMeta } from '../queries';
import { FONT_SIZES, useSettings } from '../settings';
import type { HighlightStyle, Layout, ThemeChoice } from '../settings';
import { scriptureFont } from '../fonts';
import { translationInfo } from '../types';
import { useTheme } from '../theme';
import { useWriteToUs } from '../writeToUs';
import { Segmented } from '../components/Segmented';
import { SheetAction, SimpleSheet } from '../components/SimpleSheet';
import { listVoices, saySample, stopSaying, voiceReport } from '../speech';
import { BUILTIN_NAME, BUILTIN_VOICE, PHONE_VOICE, hasBuiltinVoice, sayVerse, stopBuiltinVoice } from '../builtinVoice';
import type { SpokenLanguage } from '../speech';
import { groupVoices } from '../voiceLabels';
import type { VoiceOption } from '../voiceLabels';
import { getVerses } from '../queries';
import type { TranslationId } from '../types';

/** The languages read aloud in this edition, each with the Bible whose verse is the sample. */
const SPOKEN: [SpokenLanguage, TranslationId][] = [['english', 'KJV'], ['malayalam', 'MAL'], ['tamil', 'TAM'], ['hindi', 'HIN']];
const VOICE_NAME = { english: 'voiceEnglish', malayalam: 'voiceMalayalam', tamil: 'voiceTamil', hindi: 'voiceHindi' } as const;
// Psalm 23:1, the sample read in a voice.
const SAMPLE_REF = { book: 19, chapter: 23, verse: 1 };

/** Each interface language in its own script. */
const LANGUAGE_NAMES: Record<Language, string> = { ml: 'മലയാളം', ta: 'தமிழ்', hi: 'हिन्दी', en: 'English' };

interface Props {
  onBack: () => void;
  onOpenLicences: () => void;
  onOpenWhy: () => void;
  onOpenPrivacy: () => void;
  onOpenHowTo: () => void;
}

export function SettingsScreen({ onBack, onOpenLicences, onOpenWhy, onOpenPrivacy, onOpenHowTo }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  // Lists run under the system navigation bar; the last row must clear it.
  const insets = useSafeAreaInsets();
  const t = useT();
  const EDITION = useEdition();
  const { settings, update } = useSettings();
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [showBuilt, setShowBuilt] = useState(false);
  const writeToUs = useWriteToUs();

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

  // The voice for each language read aloud: the phone's own list, with a sample of each.
  const spoken = SPOKEN.filter(([, id]) => EDITION.translations.includes(id));
  const [choosingVoice, setChoosingVoice] = useState<SpokenLanguage | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [choosingBible, setChoosingBible] = useState(false);
  // The second Bible on a wide screen: one row, opening the two choices (beside an English
  // Bible, beside an Indian one), each opening the list of Bibles.
  const [secondBible, setSecondBible] = useState<null | 'menu' | BesideSlot>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  // A Bible's name in its own script, and the line under it: an Indian Bible's English name,
  // an English one's code (ENG · KJV beside an Indian Bible).
  // The other slot's name: the app's own language, or (four languages) any Indian one.
  const besideIndianKey = isMultilingual(EDITION) ? 'besideIndian' : nativeTranslation(EDITION) === 'TAM' ? 'besideTamil' : 'besideMalayalam';
  // The Bibles here whose sources do not mark the words of Jesus.
  const bibleFont = (id: TranslationId) => {
    const family = scriptureFont(translationInfo(id).script ?? null, false);
    return family ? { fontFamily: family } : undefined;
  };
  const bibleDetail = (id: TranslationId) =>
    translationInfo(id).script ? `${englishName(id)} · ${id}` : nativeTranslation(EDITION) && id !== nativeTranslation(EDITION) ? `ENG · ${id}` : id;
  const [voiceList, setVoiceList] = useState<VoiceOption[] | null>(null);
  const [sampling, setSampling] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  useEffect(() => {
    if (!choosingVoice) return;
    let gone = false;
    setVoiceList(null);
    setReport(null);
    listVoices(choosingVoice).then((list) => !gone && setVoiceList(list));
    return () => {
      gone = true;
      stopSaying();
      stopBuiltinVoice();
      setSampling(null);
    };
  }, [choosingVoice]);
  const playSample = async (language: SpokenLanguage, voice: string | undefined) => {
    const key = voice ?? 'default';
    stopBuiltinVoice();
    if (sampling === key) {
      stopSaying();
      setSampling(null);
      return;
    }
    const translation = spoken.find(([l]) => l === language)?.[1] ?? 'KJV';
    const ended = () => setSampling((s) => (s === key ? null : s));
    if (voice === BUILTIN_VOICE) {
      stopSaying();
      setSampling(key);
      sayVerse(SAMPLE_REF, settings.readSpeed, { onDone: ended, onStopped: ended, onError: ended });
      return;
    }
    const [row] = await getVerses(db, translation, [SAMPLE_REF]).catch(() => []);
    const text = row ? row.text.replace(/<[^>]+>/g, '') : t('previewText');
    setSampling(key);
    saySample(text, language, voice, settings.readSpeed, ended);
  };
  const voiceGroups = useMemo(() => (voiceList ? groupVoices(voiceList) : []), [voiceList]);
  // A region's name in the interface language; an unlisted one by its code.
  const regionName = (region: string | null) =>
    region === 'IN' ? t('voiceRegionIN') : region === 'US' ? t('voiceRegionUS') : region === 'GB' ? t('voiceRegionGB') : region === 'AU' ? t('voiceRegionAU') : region ?? '';
  // "Voice 2" within its accent, or the phone's own name for the voice where it has one.
  const voiceTitle = (v: VoiceOption | null, n: number) => (v ? v.friendly ?? t('voiceNumber', { n: String(n) }) : t('voiceDefault'));
  // Whether the app carries a voice of its own for a language's Bible (Meera, for Malayalam).
  const builtinFor = (language: SpokenLanguage) => hasBuiltinVoice(spoken.find(([l]) => l === language)?.[1] ?? 'KJV');
  const builtin = !!choosingVoice && builtinFor(choosingVoice);
  // The choices in the voice sheet. `stored` is what Settings keeps (nothing for the first
  // choice, the default); `sample` is the voice the play button reads in.
  interface VoiceRow { key: string; stored: string | undefined; sample: string | undefined; title: string; detail: string | null; label: string }
  const choices: { key: string; heading: string | null; rows: VoiceRow[] }[] = [
    {
      key: 'default',
      heading: null,
      rows: builtin
        ? [
            { key: 'builtin', stored: undefined, sample: BUILTIN_VOICE, title: BUILTIN_NAME, detail: t('voiceInApp'), label: `${BUILTIN_NAME}, ${t('voiceInApp')}` },
            { key: 'phone', stored: PHONE_VOICE, sample: undefined, title: t('voiceDefault'), detail: null, label: t('voiceDefault') },
          ]
        : [{ key: 'phone', stored: undefined, sample: undefined, title: t('voiceDefault'), detail: null, label: t('voiceDefault') }],
    },
    ...voiceGroups.map((group) => ({
      key: group.region ?? 'other',
      heading: voiceGroups.length > 1 && group.region ? regionName(group.region) : null,
      rows: group.voices.map((v, i) => ({
        key: v.identifier,
        stored: v.identifier,
        sample: v.identifier,
        title: voiceTitle(v, i + 1),
        detail: [v.enhanced ? t('voiceEnhanced') : t('voiceStandard'), v.online ? t('voiceOnline') : t('voiceOffline'), ...(v.fallback ? [t('voiceIndian', { tag: v.tag })] : [])].join(' · '),
        label: `${regionName(v.region)} ${voiceTitle(v, i + 1)}`,
      })),
    })),
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={t('settings')} onBack={onBack} backLabel={t('back')} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* Reading: what people change most, first. */}
        <Label text={t('reading')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <IconButton name="text_decrease" onPress={() => setSize(-1)} disabled={sizeIndex <= 0} accessibilityLabel={t('smallerText')} color={theme.accent} />
            {/* At the size the reader shows, whatever the phone's text size (VerseText appSized). */}
            <Text allowFontScaling={false} style={[styles.preview, { color: theme.text, fontSize: settings.fontSize, fontFamily: theme.font }]}>{t('previewText')}</Text>
            <IconButton name="text_increase" onPress={() => setSize(1)} disabled={sizeIndex >= FONT_SIZES.length - 1} accessibilityLabel={t('largerText')} color={theme.accent} />
          </View>
          <Text style={[styles.rowSub, styles.sizeHint, { color: theme.muted }]}>{t('textSizeHint')}</Text>
          <View style={[styles.block, divider]}>
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
              tick={false}
            />
          </View>
          {/* The highlight style is the dark theme's only: shown where that theme can be in use. */}
          {settings.theme === 'dark' || settings.theme === 'system' ? (
            <View style={[styles.block, divider]}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('highlightStyle')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('highlightStyleDetail')}</Text>
              <Segmented
                options={[
                  ['soft', t('highlightSoft')],
                  ['fluorescent', t('highlightFluorescent')],
                ] as [HighlightStyle, string][]}
                value={settings.highlightStyle}
                onChange={(highlightStyle) => update({ highlightStyle })}
                tick={false}
              />
            </View>
          ) : null}
          <View style={[styles.block, divider]}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{t('layout')}</Text>
            <Segmented
              options={[
                ['verses', t('layoutVerses')],
                ['paragraphs', t('layoutParagraphs')],
              ] as [Layout, string][]}
              value={settings.layout}
              onChange={(layout) => update({ layout })}
              tick={false}
            />
          </View>
          <SwitchRow style={[styles.row, divider]} title={t('serif')} value={settings.serif} onChange={(v) => update({ serif: v })}>
            <Text style={[styles.rowSub, { color: theme.muted }]}>{t('serifDetail')}</Text>
          </SwitchRow>
          <SwitchRow style={[styles.row, divider]} title={t('keepAwake')} value={settings.keepAwake} onChange={(v) => update({ keepAwake: v })}>
            <Text style={[styles.rowSub, { color: theme.muted }]}>{t('keepAwakeDetail')}</Text>
          </SwitchRow>
          {/* Red letters: every Bible has them (scripts/lib/red-letters.mjs for those whose sources do not mark them). */}
          <SwitchRow style={[styles.row, divider]} title={t('redLetters')} value={settings.redLetters} onChange={(v) => update({ redLetters: v })} />
          {nativeTranslation(EDITION) || isMultilingual(EDITION) ? (
            <SwitchRow style={[styles.row, divider]} title={t('sideBySide')} value={settings.sideBySide} onChange={(v) => update({ sideBySide: v })}>
              <Text style={[styles.rowSub, { color: theme.muted }]}>
                {isMultilingual(EDITION) ? t('sideBySideDetailAll') : t('sideBySideDetail', { native: nativeTranslation(EDITION) === 'TAM' ? 'Tamil' : 'Malayalam' })}
              </Text>
            </SwitchRow>
          ) : null}
          {(nativeTranslation(EDITION) || isMultilingual(EDITION)) && settings.sideBySide ? (
            <Pressable
              onPress={() => setSecondBible('menu')}
              accessibilityRole="button"
              android_ripple={{ color: theme.accentSoft }}
              style={[styles.row, divider]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{t('secondBible')}</Text>
                <Text style={[styles.rowSub, { color: theme.muted }]}>{t('secondBibleDetail')}</Text>
              </View>
              <Icon name="chevron_right" color={theme.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* The Bible read: one row, opening the list the reader's chooser has. */}
        <Label text={t('translation')} />
        <Pressable
          onPress={() => setChoosingBible(true)}
          accessibilityRole="button"
          accessibilityHint={t('chooseBible')}
          android_ripple={{ color: theme.accentSoft }}
          style={[styles.card, styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.text }, bibleFont(settings.translation)]}>{bibleName(settings.language, settings.translation)}</Text>
            <Text style={[styles.rowSub, { color: theme.muted }]}>{bibleDetail(settings.translation)}</Text>
          </View>
          <Icon name="chevron_right" color={theme.muted} />
        </Pressable>

        {/* Study tools, and under them (while they are on) all that goes with the original words. */}
        <Label text={t('studyTools')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <SwitchRow style={styles.row} title={t('studyToolsShow')} value={settings.study} onChange={(v) => update({ study: v })}>
            <Text style={[styles.rowSub, { color: theme.muted }]}>{t('studyToolsShort')}</Text>
          </SwitchRow>
          {settings.study ? (
            <>
              <SwitchRow style={[styles.row, divider]} title={t('showInterlinear')} value={settings.interlinear} onChange={(v) => update({ interlinear: v })}>
                <Text style={[styles.rowSub, { color: theme.muted }]}>{t('showInterlinearDetail')}</Text>
              </SwitchRow>
              {settings.interlinear
                ? (
                    [
                      ['all', t('everyVerse'), t('everyVerseDetail')],
                      ['tap', t('tappedVerses'), t('tappedVersesDetail')],
                    ] as const
                  ).map(([mode, title, sub]) => (
                    <Pressable key={mode} onPress={() => update({ interlinearMode: mode })} android_ripple={{ color: theme.accentSoft }} accessibilityRole="radio" accessibilityState={{ checked: settings.interlinearMode === mode }} style={[styles.row, styles.indented, divider]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
                        <Text style={[styles.rowSub, { color: theme.muted }]}>{sub}</Text>
                      </View>
                      <View style={styles.check}>{settings.interlinearMode === mode ? <Icon name="check" color={theme.accent} /> : null}</View>
                    </Pressable>
                  ))
                : null}
              <SwitchRow style={[styles.row, divider]} title={t('transliteration')} value={settings.showTranslit} onChange={(v) => update({ showTranslit: v })}>
                <Text style={[styles.rowSub, { color: theme.muted }]}>{t('transliterationDetail')}</Text>
              </SwitchRow>
              <SwitchRow style={[styles.row, divider]} title={t('hideCantillation')} value={settings.hideCantillation} onChange={(v) => update({ hideCantillation: v })}>
                <Text style={[styles.rowSub, { color: theme.muted }]}>{t('hideCantillationDetail')}</Text>
              </SwitchRow>
              <SwitchRow style={[styles.row, divider]} title={t('underline')} value={settings.underlineWords} onChange={(v) => update({ underlineWords: v })}>
                <Text style={[styles.rowSub, { color: theme.muted }]}>{t('underlineDetail')}</Text>
              </SwitchRow>
            </>
          ) : null}
        </View>

        <Label text={t('readAloudSection')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {spoken.map(([language], i) => (
            <Pressable key={language} onPress={() => setChoosingVoice(language)} accessibilityRole="button" android_ripple={{ color: theme.accentSoft }} style={[styles.row, i > 0 && divider]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{t(VOICE_NAME[language])}</Text>
                <Text style={[styles.rowSub, { color: theme.muted }]}>{builtinFor(language) && (!settings.voices[language] || settings.voices[language] === BUILTIN_VOICE) ? `${BUILTIN_NAME} · ${t('voiceInApp')}` : settings.voices[language] && settings.voices[language] !== PHONE_VOICE ? t('voiceChosen') : t('voiceDefault')}</Text>
              </View>
              <Icon name="chevron_right" color={theme.muted} />
            </Pressable>
          ))}
        </View>

        {/* The app itself: its language and the backup. */}
        <Label text={t('appSection')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {EDITION.languages.length > 1 ? (
            <View style={styles.block}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('language')}</Text>
              <Segmented
                options={EDITION.languages.map((id) => [id, LANGUAGE_NAMES[id]]) as [Language, string][]}
                value={settings.language}
                onChange={(language) => update({ language })}
                tick={false}
              />
            </View>
          ) : null}
          <Pressable
            onPress={() => setBackupOpen(true)}
            accessibilityRole="button"
            android_ripple={{ color: theme.accentSoft }}
            style={[styles.row, EDITION.languages.length > 1 && divider]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('backupRestore')}</Text>
              <Text style={[styles.rowSub, { color: theme.muted }]}>{t('backupShort')}</Text>
            </View>
            <Icon name="chevron_right" color={theme.muted} />
          </Pressable>
        </View>

        {/* Help and about, the version last. */}
        <Label text={t('aboutApp')} />
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {(
            [
              [t('howTo'), onOpenHowTo, null],
              [t('whyThisBible'), onOpenWhy, null],
              [t('feedback'), writeToUs, t('feedbackDetail')],
              [t('privacy'), onOpenPrivacy, null],
              [t('sourcesLicences'), onOpenLicences, null],
              // The welcome and the reader's hints, as a new install sees them.
              [t('welcomeAgain'), () => update({ welcomeSeen: false, hintTitleSeen: false, hintVerseSeen: false }), null],
            ] as [string, () => void, string | null][]
          ).map(([title, onPress, sub], i) => (
            <Pressable key={title} onPress={onPress} accessibilityRole="button" accessibilityHint={sub ?? undefined} android_ripple={{ color: theme.accentSoft }} style={[styles.row, i > 0 && divider]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
                {sub ? <Text style={[styles.rowSub, { color: theme.muted }]}>{sub}</Text> : null}
              </View>
              <Icon name="chevron_right" color={theme.muted} />
            </Pressable>
          ))}
        </View>
        {/* About the texts, two lines until opened; the app's version and build number below,
            for a report of a problem (docs/testing); a tap on it shows the database's date. */}
        <View style={styles.aboutBlock}>
          <Text style={[styles.rowSub, { color: theme.muted }]} numberOfLines={aboutOpen ? undefined : 2}>
            {t(EDITION.id === 'ml' ? 'aboutMalayalam' : EDITION.id === 'ta' ? 'aboutTamil' : EDITION.id === 'all' ? 'aboutAll' : 'aboutEnglish')}
          </Text>
          <Text onPress={() => setAboutOpen((v) => !v)} accessibilityRole="button" style={[styles.rowSub, { color: theme.accent }]}>
            {aboutOpen ? t('readLess') : t('readMore')}
          </Text>
          <Text style={[styles.rowSub, { color: theme.muted, marginTop: 10 }]} selectable onPress={() => setShowBuilt((v) => !v)}>
            {t('appVersion', { version: `${Constants.expoConfig?.version ?? '?'} (${Constants.expoConfig?.android?.versionCode ?? Constants.expoConfig?.ios?.buildNumber ?? '?'})` })}
          </Text>
          {showBuilt && meta.built ? <Text style={[styles.rowSub, { color: theme.muted, marginTop: 4 }]}>{t('databaseBuilt', { date: meta.built })}</Text> : null}
        </View>
      </ScrollView>
      <SimpleSheet visible={choosingBible} title={t('chooseBible')} onClose={() => setChoosingBible(false)}>
        {EDITION.translations.map((id) => (
          <SheetAction
            key={id}
            icon="menu_book"
            label={bibleName(settings.language, id)}
            detail={bibleDetail(id)}
            labelFont={bibleFont(id)?.fontFamily}
            selected={settings.translation === id}
            onPress={() => {
              update({ translation: id });
              setChoosingBible(false);
            }}
          />
        ))}
      </SimpleSheet>
      <SimpleSheet
        visible={!!secondBible}
        title={secondBible === 'menu' || !secondBible ? t('secondBible') : t(secondBible === 'english' ? 'besideEnglish' : besideIndianKey)}
        onClose={() => setSecondBible(null)}
      >
        {secondBible === 'menu'
          ? (['indian', 'english'] as BesideSlot[]).map((slot) => {
              const id = besideChoice(EDITION, slot, settings);
              return (
                <SheetAction
                  key={slot}
                  icon="view_column"
                  label={t(slot === 'english' ? 'besideEnglish' : besideIndianKey)}
                  detail={bibleName(settings.language, id)}
                  onPress={() => setSecondBible(slot)}
                />
              );
            })
          : secondBible
            ? EDITION.translations.map((id) => (
                <SheetAction
                  key={id}
                  icon={besideChoice(EDITION, secondBible, settings) === id ? 'check' : 'menu_book'}
                  label={bibleName(settings.language, id)}
                  detail={bibleDetail(id)}
                  labelFont={bibleFont(id)?.fontFamily}
                  selected={besideChoice(EDITION, secondBible, settings) === id}
                  onPress={() => {
                    update(secondBible === 'english' ? { besideEnglish: id } : { besideIndian: id });
                    setSecondBible('menu');
                  }}
                />
              ))
            : null}
      </SimpleSheet>
      <BackupSheet visible={backupOpen} onClose={() => setBackupOpen(false)} />

      <SimpleSheet visible={!!choosingVoice} title={t('voiceChoose')} onClose={() => setChoosingVoice(null)}>
        {choosingVoice ? (
          <>
            {choices.map((group, gi) => (
              <View key={group.key}>
                {group.heading ? (
                  <Text style={[styles.voiceGroup, { color: theme.accent }]} accessibilityRole="header">
                    {group.heading}
                  </Text>
                ) : null}
                {group.rows.map((row, i) => {
                  const chosen = row.stored === (settings.voices[choosingVoice] ?? undefined) || (row.stored === undefined && settings.voices[choosingVoice] === BUILTIN_VOICE && builtin);
                  return (
                    <View key={row.key} style={[styles.row, (gi > 0 || i > 0) && divider]}>
                      <Pressable
                        onPress={() => {
                          const voices = { ...settings.voices };
                          if (row.stored) voices[choosingVoice] = row.stored;
                          else delete voices[choosingVoice];
                          update({ voices });
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: chosen }}
                        accessibilityLabel={row.label}
                        style={styles.voiceChoice}
                      >
                        <View style={styles.check}>{chosen ? <Icon name="check" color={theme.accent} /> : null}</View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.rowTitle, { color: theme.text }]}>{row.title}</Text>
                          {row.detail ? <Text style={[styles.rowSub, { color: theme.muted }]}>{row.detail}</Text> : null}
                        </View>
                      </Pressable>
                      <IconButton
                        name={sampling === (row.sample ?? 'default') ? 'pause' : 'play_arrow'}
                        onPress={() => playSample(choosingVoice, row.sample)}
                        accessibilityLabel={t('voiceSample')}
                        color={theme.accent}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
            {voiceList && voiceList.length === 0 ? <Text style={[styles.rowSub, styles.hint, { color: theme.muted }]}>{t('voiceNone')}</Text> : null}
            {/* Where more voices come from, beside the list it adds to. */}
            <Text style={[styles.rowSub, styles.voiceMore, { color: theme.muted }]}>{t(Platform.OS === 'ios' ? 'voiceMoreIos' : 'voiceMore')}</Text>
            {/* What the phone reports about its voices, to send us when a language is not read. */}
            <Text
              onPress={() => choosingVoice && voiceReport(choosingVoice).then(setReport)}
              accessibilityRole="button"
              style={[styles.rowSub, styles.voiceDetails, { color: theme.accent }]}
            >
              {t('voiceDetails')}
            </Text>
            {report ? (
              <Text selectable style={[styles.voiceReport, { color: theme.muted }]}>
                {report}
              </Text>
            ) : null}
          </>
        ) : null}
      </SimpleSheet>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <SectionLabel text={text} style={styles.label} />;
}

const styles = StyleSheet.create({
  hint: { marginTop: 6, marginHorizontal: 4 },
  voiceDetails: { paddingHorizontal: 20, paddingVertical: 14 },
  voiceReport: { paddingHorizontal: 20, paddingBottom: 16, fontSize: 11, lineHeight: 15 },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, alignSelf: 'center', width: '100%', maxWidth: 720 },
  label: { marginTop: 22, marginBottom: 8, marginHorizontal: 4 },
  block: { paddingHorizontal: 14, paddingVertical: 12 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowTitle: { fontSize: 16, lineHeight: 24 },
  rowSub: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  check: { width: 24, alignItems: 'flex-end' },
  voiceChoice: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  voiceGroup: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 2 },
  preview: { flex: 1, textAlign: 'center' },
  sizeHint: { paddingHorizontal: 14, paddingBottom: 12, marginTop: -6, textAlign: 'center' },
  indented: { paddingLeft: 28 },
  aboutBlock: { marginTop: 14, marginHorizontal: 4 },
  voiceMore: { paddingHorizontal: 20, paddingTop: 10 },
});

/**
 * A row that is one switch: a tap anywhere on it turns it on or off, and a screen reader
 * hears its title, its state and its explanation as one control.
 */
function SwitchRow({ title, value, onChange, style, children }: { title: string; value: boolean; onChange: (v: boolean) => void; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      android_ripple={{ color: theme.accentSoft }}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: value }}
      style={style}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
        {children}
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AppSwitch value={value} onValueChange={onChange} />
      </View>
    </Pressable>
  );
}
