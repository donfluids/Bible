import React, { useEffect, useRef, useState } from 'react';
import { Image, PixelRatio, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { useEdition } from '../edition';
import type { EditionId, Language } from '../edition';
import { languageScript, scriptOf, scriptureFont } from '../fonts';
import { bibleLabel, useT } from '../i18n';
import type { StringKey } from '../i18n';
import { useSettings } from '../settings';
import { shortBookName } from '../shortNames';
import { useTheme } from '../theme';
import { translationInfo } from '../types';
import { WELCOME_PICTURES, WELCOME_SHAPES } from '../welcomePictures';
import type { WelcomePictureName } from '../welcomePictures';

// What a new install sees once, before the first chapter: seven pages, each one part of
// what the app does. The first shows the four gestures that find the way; the others a
// picture of the app doing it (assets/welcome, made by scripts/welcome-shots.mjs from the
// app itself), with a ring on the part the page is about. Skip leaves at any point; the
// last page also opens How to use.

interface Page {
  /** A picture, or (the first page) the gestures. */
  picture?: WelcomePictureName;
  title: StringKey;
  text: StringKey;
}

const READ_TEXT: Record<EditionId, StringKey> = { en: 'welcomeReadTextEn', ml: 'welcomeReadTextMl', ta: 'welcomeReadTextTa', all: 'welcomeReadTextAll' };

/** The picture set for an app in an interface language (metro.config.js keeps each app's own). */
export function welcomeSet(edition: EditionId, language: Language): string {
  if (language === 'en') return edition === 'all' ? 'en-en' : `${edition}-en`;
  return `${edition}-${language}`;
}

const pages = (edition: EditionId, set: string): Page[] => [
  { title: 'welcomeReadTitle', text: READ_TEXT[edition] },
  { picture: 'word', title: 'welcomeWordTitle', text: edition === 'all' ? 'welcomeWordTextAll' : 'welcomeWordText' },
  // The Malayalam Bible's words carry their Malayalam meaning too.
  { picture: 'original', title: 'welcomeOriginalTitle', text: set.startsWith('ml-') || set === 'all-ml' ? 'welcomeOriginalTextMl' : 'welcomeOriginalText' },
  { picture: 'study', title: 'welcomeStudyTitle', text: 'welcomeStudyText' },
  { picture: 'saved', title: 'welcomeSavedTitle', text: 'welcomeSavedText' },
  { picture: 'notebook', title: 'welcomeNotebookTitle', text: 'welcomeNotebookText' },
  { picture: 'share', title: 'welcomeShareTitle', text: 'welcomeShareText' },
];

/** A page's space below its words (styles.page paddingBottom). */
const PAGE_PADDING = 12;
/** The stage's room around its card. */
const STAGE_PADDING = 18;

export function WelcomeScreen({ onDone, onHowTo }: { onDone: () => void; onHowTo: () => void }) {
  const theme = useTheme();
  const t = useT();
  const edition = useEdition();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { width, height } = useWindowDimensions();
  const set = welcomeSet(edition.id, settings.language);
  const list = pages(edition.id, set);
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const titleFont = scriptureFont(languageScript(settings.language), true, true);
  // The stage takes the height the words leave: the pages are measured, and the stage is as
  // tall as the room above the longest page's words allows, the same on every page. Until
  // the words are measured, a share of the screen; a short or narrow phone also gets a
  // smaller heading, so the words fit (Malayalam and Tamil run to more lines).
  const small = height < 720 || width < 380;
  const [pagerHeight, setPagerHeight] = useState(0);
  const [wordsHeight, setWordsHeight] = useState<number[]>([]);
  const tallestWords = wordsHeight.length === list.length ? Math.max(...wordsHeight) : 0;
  const share = PixelRatio.getFontScale() > 1.15 ? 0.36 : small ? 0.4 : 0.5;
  const room = pagerHeight && tallestWords ? pagerHeight - tallestWords - PAGE_PADDING - 12 : height * share;
  const stageWidth = Math.min(width, 520) - 40;
  const stageHeight = Math.max(200, Math.min(room, stageWidth * 1.45));
  const last = index === list.length - 1;
  const go = (i: number) => {
    setIndex(i);
    scroller.current?.scrollTo({ x: i * width, animated: true });
  };
  // Turning the phone changes each page's width: the page being shown is kept in place.
  useEffect(() => {
    scroller.current?.scrollTo({ x: index * width, animated: false });
  }, [width]); // eslint-disable-line react-hooks/exhaustive-deps
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.max(0, Math.min(list.length - 1, Math.round(e.nativeEvent.contentOffset.x / width))));

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.top}>
        {last ? null : (
          <Pressable onPress={onDone} accessibilityRole="button" hitSlop={12} style={styles.skip}>
            <Text style={[styles.skipText, { color: theme.muted }]}>{t('welcomeSkip')}</Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
      >
        {list.map((page, i) => (
          // Each page scrolls on its own, so long words in a large size are never cut off.
          <ScrollView
            key={page.title}
            style={{ width }}
            contentContainerStyle={styles.page}
            showsVerticalScrollIndicator={false}
            accessibilityElementsHidden={i !== index}
            importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}
          >
            <View style={[styles.stage, { width: stageWidth, height: stageHeight, backgroundColor: theme.accentSoft }]} accessible={false} importantForAccessibility="no-hide-descendants">
              {page.picture ? <Picture set={set} name={page.picture} room={{ width: stageWidth - 2 * STAGE_PADDING, height: stageHeight - 2 * STAGE_PADDING }} /> : <Gestures width={Math.min(stageWidth - 24, 380)} />}
            </View>
            <View
              style={styles.words}
              onLayout={(e) => {
                const h = Math.ceil(e.nativeEvent.layout.height);
                setWordsHeight((all) => (all[i] === h ? all : Object.assign([...all], { [i]: h })));
              }}
            >
              <Text style={[styles.title, small && styles.titleSmall, { color: theme.text, fontFamily: titleFont }]} accessibilityRole="header">
                {t(page.title)}
              </Text>
              <Text style={[styles.text, small && styles.textSmall, { color: theme.muted }]}>{t(page.text)}</Text>
            </View>
          </ScrollView>
        ))}
      </ScrollView>
      <View style={styles.dots} accessibilityLabel={`${index + 1} / ${list.length}`}>
        {list.map((page, i) => (
          <View key={page.title} style={[styles.dot, { backgroundColor: i === index ? theme.accent : theme.border }, i === index && styles.dotOn]} />
        ))}
      </View>
      <Pressable
        onPress={() => (last ? onDone() : go(index + 1))}
        accessibilityRole="button"
        android_ripple={{ color: '#00000022' }}
        style={({ pressed }) => [styles.next, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={[styles.nextText, { color: theme.dark ? theme.bg : '#FFFFFF' }]}>{last ? t('welcomeStart') : t('welcomeNext')}</Text>
      </Pressable>
      {/* The last page leads on to the full guide; the others keep its room, so the button stays put. */}
      <Pressable onPress={onHowTo} disabled={!last} accessibilityRole="link" accessibilityElementsHidden={!last} importantForAccessibility={last ? 'auto' : 'no-hide-descendants'} hitSlop={8} style={[styles.link, !last && styles.hidden]}>
        <Text style={[styles.linkText, { color: theme.accent }]}>{t('howTo')}</Text>
      </Pressable>
    </View>
  );
}

/** A page's picture: a card on the stage, as large as the room allows, with its ring. */
function Picture({ set, name, room }: { set: string; name: WelcomePictureName; room: { width: number; height: number } }) {
  const theme = useTheme();
  const source = WELCOME_PICTURES[set]?.[name];
  const info = WELCOME_SHAPES[set]?.[name];
  if (!source || !info) return null;
  const cardWidth = Math.min(room.width, 340, room.height * info.shape);
  const cardHeight = cardWidth / info.shape;
  const ring = info.ring;
  return (
    <View style={[styles.card, { width: cardWidth, height: cardHeight, backgroundColor: theme.card }]}>
      {/* The pictures are of the light theme: a little dimmer on a dark page. */}
      <Image source={source} style={{ width: cardWidth, height: cardHeight, opacity: theme.dark ? 0.85 : 1 }} resizeMode="cover" accessibilityIgnoresInvertColors />
      {ring ? (
        <View
          pointerEvents="none"
          style={[styles.ring, { borderColor: theme.accent, left: ring.left * cardWidth, top: ring.top * cardHeight, width: ring.width * cardWidth, height: ring.height * cardHeight }]}
        />
      ) : null}
    </View>
  );
}

/** The first page: the four gestures that find the way, each drawn beside its words. */
function Gestures({ width }: { width: number }) {
  const theme = useTheme();
  const t = useT();
  const edition = useEdition();
  const { settings } = useSettings();
  const translation = settings.translation;
  // The reader's own title and Bible name, as the app opens.
  const script = translationInfo(translation).script ?? null;
  const sameScript = edition.translations.filter((id) => (translationInfo(id).script ?? null) === script).length;
  const book = `${shortBookName(43, translation) || 'John'} 1`;
  const bible = bibleLabel(translation, sameScript);
  const art = [styles.art, { backgroundColor: theme.accentSoft }];
  const hand = (style: object) => (
    <View style={[styles.hand, style]}>
      <Icon name="touch_app" size={26} color={theme.accent} />
    </View>
  );
  const rows: [React.ReactNode, StringKey][] = [
    [
      <View style={art}>
        <Icon name="chevron_left" size={24} color={theme.accent} />
        <Icon name="touch_app" size={28} color={theme.accent} />
        <Icon name="chevron_right" size={24} color={theme.accent} />
      </View>,
      'welcomeSwipe',
    ],
    [
      <View style={[art, styles.artStart]}>
        <Text style={[styles.mini, { color: theme.text, fontFamily: scriptureFont(scriptOf(book), false, true) }]} numberOfLines={1} maxFontSizeMultiplier={1}>
          {book}
        </Text>
        <Icon name="arrow_drop_down" size={18} color={theme.accent} />
        {hand({ right: 2, bottom: -4 })}
      </View>,
      'welcomeTapTitle',
    ],
    [
      <View style={art}>
        <View style={[styles.pill, { borderColor: theme.accent }]}>
          <Text style={[styles.pillText, { color: theme.muted, fontFamily: scriptureFont(scriptOf(bible), false, true) }]} numberOfLines={1} maxFontSizeMultiplier={1}>
            {bible}
          </Text>
          <Icon name="arrow_drop_down" size={16} color={theme.accent} />
        </View>
        {hand({ right: 4, bottom: -6 })}
      </View>,
      'welcomeTapName',
    ],
    [
      // A verse: its number in the accent colour, on its soft block, with the hand on it.
      <View style={art}>
        <View style={[styles.verseNumber, { backgroundColor: theme.card }]}>
          <Text style={[styles.verseNumberText, { color: theme.accent }]} maxFontSizeMultiplier={1}>
            3
          </Text>
        </View>
        <View style={styles.bars}>
          <View style={[styles.bar, { backgroundColor: theme.border }]} />
          <View style={[styles.bar, styles.barShort, { backgroundColor: theme.border }]} />
        </View>
        {hand({ left: 14, bottom: -6 })}
      </View>,
      'welcomeHold',
    ],
  ];
  return (
    <View style={{ width, gap: 10 }}>
      {rows.map(([drawing, label]) => (
        <View key={label} style={[styles.tile, { backgroundColor: theme.card }]}>
          {drawing}
          <Text style={[styles.tileText, { color: theme.text }]} maxFontSizeMultiplier={1.3}>
            {t(label)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { height: 48, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 22 },
  skip: { minHeight: 44, justifyContent: 'center' },
  skipText: { fontSize: 16 },
  pager: { flex: 1 },
  // Room left over (a tablet, where the width limits the stage) goes above and below.
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: PAGE_PADDING },
  stage: { borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#46300F',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ring: { position: 'absolute', borderWidth: 2.5, borderRadius: 12 },
  words: { alignItems: 'center', alignSelf: 'stretch' },
  title: { fontSize: 24, lineHeight: 32, textAlign: 'center', marginTop: 22, fontWeight: '600' },
  titleSmall: { fontSize: 20, lineHeight: 28, marginTop: 14 },
  text: { fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 10, maxWidth: 420, paddingHorizontal: 6 },
  textSmall: { fontSize: 14.5, lineHeight: 21, marginTop: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 8, marginBottom: 16 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { width: 20 },
  next: { marginHorizontal: 32, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', maxWidth: 420, alignSelf: 'center', width: '84%' },
  nextText: { fontSize: 17, fontWeight: '600' },
  link: { alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, marginTop: 4 },
  hidden: { opacity: 0 },
  linkText: { fontSize: 15, textDecorationLine: 'underline' },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#46300F',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  tileText: { flex: 1, fontSize: 15, lineHeight: 21 },
  art: { width: 92, height: 62, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  artStart: { justifyContent: 'flex-start', paddingLeft: 10 },
  hand: { position: 'absolute' },
  mini: { fontSize: 14, fontWeight: '600' },
  pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingLeft: 7, paddingRight: 2, paddingVertical: 2, maxWidth: 80 },
  pillText: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  bars: { width: 44, gap: 7, marginLeft: 6 },
  verseNumber: { borderRadius: 7, paddingHorizontal: 6, paddingVertical: 1, marginTop: -14 },
  verseNumberText: { fontSize: 13, fontWeight: '700' },
  bar: { height: 6, borderRadius: 3 },
  barShort: { width: '70%' },
});
