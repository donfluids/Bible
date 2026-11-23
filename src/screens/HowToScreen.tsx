import React, { useState } from 'react';
import { Image, LayoutAnimation, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { isMultilingual, useEdition } from '../edition';
import { languageScript, scriptureFont } from '../fonts';
import { HOWTO_PICTURES, HOWTO_RINGS, HOWTO_SHAPES } from '../howtoPictures';
import { useT } from '../i18n';
import type { StringKey } from '../i18n';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH } from '../text';
import { useTheme } from '../theme';

/** Where a topic's Show me button goes: a tab, or a screen of its own. */
export type HowToTarget = 'Reader' | 'Books' | 'Bookmarks' | 'Notebook' | 'Search' | 'Settings';

interface Topic {
  /** Its number: howTopicN is its title, its picture is assets/howto/<language>/N.jpg. */
  n: number;
  icon: IconName;
  /** Each step: a small icon and its text; the four-language app's own text where it has one. */
  steps: [IconName, StringKey, StringKey?][];
  show: HowToTarget;
}

/** The topics in four groups, in the order a new reader meets them. */
const GROUPS: { title: StringKey; topics: Topic[] }[] = [
  {
    title: 'howGroupReading',
    topics: [
      { n: 1, icon: 'menu_book', show: 'Reader', steps: [['gesture', 'howS1a'], ['touch_app', 'howS1b'], ['format_list_bulleted', 'howS1c'], ['text_increase', 'howS1d']] },
      { n: 2, icon: 'swap_horiz', show: 'Reader', steps: [['swap_horiz', 'howS2a', 'howS2aAll'], ['view_column', 'howS2b']] },
      { n: 3, icon: 'touch_app', show: 'Reader', steps: [['touch_app', 'howS3a'], ['content_copy', 'howS3b'], ['ink_highlighter', 'howS3c'], ['image', 'howS3d']] },
      { n: 7, icon: 'search', show: 'Search', steps: [['search', 'howS7a'], ['format_list_bulleted', 'howS7b']] },
      { n: 11, icon: 'volume_up', show: 'Settings', steps: [['volume_up', 'howS11a'], ['play_arrow', 'howS11b'], ['settings', 'howS11c']] },
    ],
  },
  {
    title: 'howGroupStudying',
    topics: [
      { n: 4, icon: 'translate', show: 'Reader', steps: [['touch_app', 'howS4a'], ['translate', 'howS4b'], ['link', 'howS4c']] },
      { n: 12, icon: 'school', show: 'Settings', steps: [['info', 'howS12a'], ['school', 'howS12b']] },
    ],
  },
  {
    title: 'howGroupSaving',
    topics: [
      { n: 5, icon: 'ink_highlighter', show: 'Reader', steps: [['touch_app', 'howS5a'], ['gesture', 'howS5b'], ['ink_eraser', 'howS5c']] },
      { n: 6, icon: 'bookmarks', show: 'Bookmarks', steps: [['bookmarks', 'howS6a'], ['undo', 'howS6b']] },
      { n: 13, icon: 'image', show: 'Reader', steps: [['image', 'howS13a'], ['edit', 'howS13b'], ['bookmark_add', 'howS13c']] },
    ],
  },
  {
    title: 'howGroupNotebook',
    topics: [
      { n: 8, icon: 'note_stack', show: 'Notebook', steps: [['add', 'howS8a'], ['link', 'howS8b'], ['note_add', 'howS8c'], ['picture_as_pdf', 'howS8d']] },
      { n: 9, icon: 'draw', show: 'Notebook', steps: [['draw', 'howS9a'], ['ink_highlighter', 'howS9b'], ['gesture', 'howS9c'], ['stylus', 'howS9d']] },
      { n: 10, icon: 'backup', show: 'Notebook', steps: [['backup', 'howS10a'], ['bookmarks', 'howS10b'], ['settings_backup_restore', 'howS10c']] },
    ],
  },
];
/** The four-language app's search also chooses the Bible searched. */
const SEARCH_ALL_STEP: [IconName, StringKey] = ['menu_book', 'howS7c'];

/** A word on the quick start's third tile, in the menu language's own letters. */
const SAMPLE_WORD: Record<string, string> = { en: 'beginning', ml: 'ആദിയിൽ', ta: 'ஆதியிலே', hi: 'आदि में' };

/** Text with **marked** parts in bold: the buttons and gestures a step names. */
function Marked({ text, style, boldStyle }: { text: string; style: object; boldStyle: object }) {
  return (
    <Text style={style}>
      {text.split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 ? <Text key={i} style={boldStyle}>{part}</Text> : part))}
    </Text>
  );
}

/**
 * How to use the app: a quick start of the three gestures everyone needs, then the topics
 * in four groups, each opening to a picture of the app with a ring on the part it is
 * about, a few short steps, and a button that goes there. In the interface language, at
 * the reader's text size (within bounds). Reached from Settings and the reader's tip.
 */
export function HowToScreen({ onBack, onShowMe }: { onBack: () => void; onShowMe: (target: HowToTarget) => void }) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const multilingual = isMultilingual(useEdition());
  const script = languageScript(settings.language);
  const font = scriptureFont(script, settings.serif) ?? theme.font;
  const boldFont = scriptureFont(script, settings.serif, true);
  const bold = boldFont ? { fontFamily: boldFont } : { fontWeight: '700' as const };
  const size = Math.max(15, Math.min(settings.fontSize, 22));
  const lineHeight = Math.round(size * (script ? 1.6 : 1.45));
  const pictures: Partial<Record<number, ImageSourcePropType>> = HOWTO_PICTURES[settings.language] ?? {};
  const rings = HOWTO_RINGS[settings.language] ?? {};
  const shapes = HOWTO_SHAPES[settings.language] ?? {};
  const [open, setOpen] = useState<number | null>(null);
  const toggle = (n: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open === n ? null : n);
  };

  const tile = (n: number, caption: StringKey, art: React.ReactNode) => (
    <Pressable
      key={n}
      onPress={() => toggle(n)}
      accessibilityRole="button"
      accessibilityLabel={t(caption)}
      android_ripple={{ color: theme.accentSoft }}
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.tileArt, { backgroundColor: theme.accentSoft }]} accessible={false}>
        {art}
      </View>
      <Text style={[styles.tileCaption, { color: theme.text, fontFamily: font }]}>{t(caption)}</Text>
    </Pressable>
  );
  const finger = <Icon name="touch_app" size={34} color={theme.accent} />;

  return (
    <>
      <Header title={t('howTo')} onBack={onBack} />
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {/* The three gestures, each a tile that opens its topic below. */}
        <View style={[styles.quick, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.quickTitle, { color: theme.text, fontFamily: boldFont ?? font }, !boldFont && { fontWeight: '700' }]} accessibilityRole="header">
            {t('howQuick')}
          </Text>
          <View style={styles.tiles}>
            {tile(
              1,
              'howQuickSwipe',
              <View style={styles.swipeArt}>
                <Icon name="chevron_left" size={22} color={theme.muted} />
                {finger}
                <Icon name="chevron_right" size={22} color={theme.muted} />
              </View>,
            )}
            {tile(
              3,
              'howQuickHold',
              <>
                <View style={styles.lines}>
                  <View style={[styles.line, { backgroundColor: theme.border }]} />
                  <View style={[styles.line, { backgroundColor: theme.linked }]} />
                  <View style={[styles.line, styles.lineShort, { backgroundColor: theme.linked }]} />
                </View>
                <View style={styles.fingerLow}>{finger}</View>
              </>,
            )}
            {tile(
              4,
              'howQuickWord',
              <>
                <Text style={[styles.sampleWord, { color: theme.text, borderColor: theme.accent, backgroundColor: theme.card, fontFamily: font }]}>
                  {SAMPLE_WORD[settings.language] ?? SAMPLE_WORD.en}
                </Text>
                <View style={styles.fingerLow}>{finger}</View>
              </>,
            )}
          </View>
        </View>

        {GROUPS.map((group) => (
          <View key={group.title}>
            <Text style={[styles.group, { color: theme.accent, fontFamily: boldFont ?? font }, !boldFont && { fontWeight: '700' }]} accessibilityRole="header">
              {t(group.title)}
            </Text>
            {group.topics.map((topic) => {
              const shown = open === topic.n;
              const steps = topic.n === 7 && multilingual ? [...topic.steps, SEARCH_ALL_STEP] : topic.steps;
              const picture = pictures[topic.n];
              const ring = rings[topic.n];
              const shape = shapes[topic.n];
              return (
                <View key={topic.n} style={[styles.topic, shown && [styles.topicOpen, { backgroundColor: theme.card, borderColor: theme.border }], !shown && { borderBottomColor: theme.border }]}>
                  <Pressable
                    onPress={() => toggle(topic.n)}
                    android_ripple={{ color: theme.accentSoft }}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: shown }}
                    style={styles.head}
                  >
                    <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
                      <Icon name={topic.icon} size={22} color={theme.accent} />
                    </View>
                    <Text style={[styles.title, { color: theme.text, fontSize: size, lineHeight, fontFamily: font }]}>{t(`howTopic${topic.n}` as StringKey)}</Text>
                    <Icon name={shown ? 'expand_less' : 'expand_more'} color={theme.muted} />
                  </Pressable>
                  {shown ? (
                    <View style={styles.body}>
                      {/* The app itself, with a ring on the part the topic is about. */}
                      {picture && shape ? (
                        <View style={[styles.picture, { borderColor: theme.border, aspectRatio: shape }]} accessible={false} importantForAccessibility="no-hide-descendants">
                          <Image source={picture} style={StyleSheet.absoluteFill} resizeMode="cover" />
                          {ring ? (
                            <View
                              style={[
                                styles.ring,
                                { borderColor: theme.accent, left: `${ring.left * 100}%`, top: `${ring.top * 100}%`, width: `${ring.width * 100}%`, height: `${ring.height * 100}%` },
                              ]}
                            />
                          ) : null}
                        </View>
                      ) : null}
                      {steps.map(([icon, key, allKey]) => (
                        <View key={key} style={styles.step}>
                          <Icon name={icon} size={20} color={theme.accent} style={{ marginTop: Math.max(0, (lineHeight - 20) / 2) }} />
                          <Marked
                            text={t(multilingual && allKey ? allKey : key)}
                            style={[styles.stepText, { color: theme.text, fontFamily: font, fontSize: size - 1, lineHeight: lineHeight - 1 }]}
                            boldStyle={bold}
                          />
                        </View>
                      ))}
                      <Pressable
                        onPress={() => onShowMe(topic.show)}
                        accessibilityRole="button"
                        android_ripple={{ color: theme.accentSoft }}
                        style={({ pressed }) => [styles.showMe, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
                      >
                        <Text style={[styles.showMeText, { color: theme.onAccent, fontFamily: boldFont ?? font }, !boldFont && { fontWeight: '600' }]}>{t('howShowMe')}</Text>
                        <Icon name="chevron_right" size={20} color={theme.onAccent} />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  quick: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 6 },
  quickTitle: { fontSize: 15, marginBottom: 10, marginLeft: 4 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, alignItems: 'center' },
  tileArt: { alignSelf: 'stretch', height: 84, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 },
  tileCaption: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  swipeArt: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  lines: { position: 'absolute', left: 12, right: 12, top: 16, gap: 7 },
  line: { height: 6, borderRadius: 3 },
  lineShort: { width: '70%' },
  fingerLow: { marginTop: 22 },
  sampleWord: { position: 'absolute', top: 14, fontSize: 13, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1.5, overflow: 'hidden' },
  group: { fontSize: 13, letterSpacing: 0.3, marginTop: 18, marginBottom: 4, marginLeft: 4 },
  topic: { borderBottomWidth: StyleSheet.hairlineWidth },
  topicOpen: { borderWidth: 1, borderRadius: 16, marginVertical: 6, borderBottomWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingVertical: 8, paddingHorizontal: 6 },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
  body: { paddingHorizontal: 14, paddingBottom: 14 },
  picture: { width: '100%', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  ring: { position: 'absolute', borderWidth: 3, borderRadius: 16 },
  step: { flexDirection: 'row', gap: 12, paddingVertical: 5 },
  stepText: { flex: 1 },
  showMe: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, minHeight: 44, paddingLeft: 18, paddingRight: 12, borderRadius: 22, marginTop: 10 },
  showMeText: { fontSize: 15 },
});
