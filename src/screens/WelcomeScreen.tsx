import React, { useEffect, useRef, useState } from 'react';
import { Image, PixelRatio, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '../components/Pressable';
import { useEdition } from '../edition';
import type { EditionId } from '../edition';
import { languageScript, scriptureFont } from '../fonts';
import { useT } from '../i18n';
import type { StringKey } from '../i18n';
import { useSettings } from '../settings';
import { useTheme } from '../theme';

// What a new install sees once, before the first chapter: four screens, each one thing the
// app does, with a picture of the app doing it (assets/welcome, made by
// scripts/welcome-shots.mjs from the app itself). Skip leaves at any point.

interface Page {
  picture: ImageSourcePropType;
  title: StringKey;
  text: StringKey;
  /** A ring on the picture, in fractions of its width and height: where to tap. */
  ring?: { left: number; top: number; width: number; height: number };
}

const READ_TEXT: Record<EditionId, StringKey> = { en: 'welcomeReadTextEn', ml: 'welcomeReadTextMl', ta: 'welcomeReadTextTa', all: 'welcomeReadTextAll' };

const pages = (edition: EditionId): Page[] => [
  { picture: require('../../assets/welcome/edition/read.png'), title: 'welcomeReadTitle', text: READ_TEXT[edition], ring: { left: 0.01, top: 0.012, width: 0.7, height: 0.07 } },
  { picture: require('../../assets/welcome/edition/word.png'), title: 'welcomeWordTitle', text: 'welcomeWordText' },
  { picture: require('../../assets/welcome/edition/verse.png'), title: 'welcomeVerseTitle', text: 'welcomeVerseText' },
  { picture: require('../../assets/welcome/edition/notebook.png'), title: 'welcomeNotebookTitle', text: 'welcomeNotebookText' },
];

/** The pictures' shape: 412 wide by 692 tall. */
const PICTURE_RATIO = 692 / 412;
/** A page's space below its words (styles.page paddingBottom). */
const PAGE_PADDING = 12;

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const t = useT();
  const edition = useEdition();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { width, height } = useWindowDimensions();
  const list = pages(edition.id);
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const titleFont = scriptureFont(languageScript(settings.language), true, true);
  // The picture takes the height the words leave: the pages are measured, and the
  // picture is as tall as the room above the longest page's words allows, the same on
  // every page, within the width of the screen (a phone's shape, never stretched). Until
  // the words are measured, a share of the screen as before; a short or narrow phone also
  // gets a smaller heading, so the words fit (Malayalam and Tamil run to more lines).
  const small = height < 720 || width < 380;
  const [pagerHeight, setPagerHeight] = useState(0);
  const [wordsHeight, setWordsHeight] = useState<number[]>([]);
  const tallestWords = wordsHeight.length === list.length ? Math.max(...wordsHeight) : 0;
  const share = PixelRatio.getFontScale() > 1.15 ? 0.3 : small ? 0.32 : 0.42;
  const room = pagerHeight && tallestWords ? pagerHeight - tallestWords - PAGE_PADDING - 12 : height * share;
  const pictureHeight = Math.max(140, Math.min(room, (Math.min(width, 520) - 64) * PICTURE_RATIO));
  const pictureWidth = pictureHeight / PICTURE_RATIO;
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
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
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
            <View style={[styles.phone, { width: pictureWidth + 12, height: pictureHeight + 12, borderColor: theme.dark ? '#4A4239' : '#2A241C' }]}>
              <Image source={page.picture} style={{ width: pictureWidth, height: pictureHeight }} resizeMode="cover" accessibilityIgnoresInvertColors />
              {page.ring ? (
                <View
                  pointerEvents="none"
                  style={[styles.ring, { borderColor: theme.accent, left: page.ring.left * pictureWidth, top: page.ring.top * pictureHeight, width: page.ring.width * pictureWidth, height: page.ring.height * pictureHeight }]}
                />
              ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { height: 48, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 22 },
  skip: { minHeight: 44, justifyContent: 'center' },
  skipText: { fontSize: 16 },
  pager: { flex: 1 },
  // Room left over (a tablet, where the width limits the picture) goes above and below.
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: PAGE_PADDING },
  words: { alignItems: 'center', alignSelf: 'stretch' },
  phone: { borderWidth: 6, borderRadius: 26, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  ring: { position: 'absolute', borderWidth: 3, borderRadius: 999 },
  title: { fontSize: 25, lineHeight: 34, textAlign: 'center', marginTop: 26, fontWeight: '600' },
  titleSmall: { fontSize: 20, lineHeight: 28, marginTop: 14 },
  text: { fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 12, maxWidth: 420 },
  textSmall: { fontSize: 14.5, lineHeight: 21, marginTop: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8, marginBottom: 18 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { width: 22 },
  next: { marginHorizontal: 32, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', maxWidth: 420, alignSelf: 'center', width: '84%' },
  nextText: { fontSize: 17, fontWeight: '600' },
});
