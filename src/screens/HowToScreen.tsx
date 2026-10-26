import React, { useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { Icon } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { languageScript, scriptureFont } from '../fonts';
import { useT } from '../i18n';
import type { StringKey } from '../i18n';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH } from '../text';
import { useTheme } from '../theme';

/** How many topics src/i18n.ts holds (howTopic1 … howTopicN, howText1 … howTextN). */
const TOPICS = 13;

/**
 * How to use the app: short topics, each a few plain sentences, opened one at a time. In
 * the interface language, at the reader's text size. Reached from Settings and from the
 * reader's first-time tip.
 */
export function HowToScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const font = scriptureFont(languageScript(settings.language), settings.serif) ?? theme.font;
  const boldFont = scriptureFont(languageScript(settings.language), settings.serif, true);
  const size = Math.max(15, Math.min(settings.fontSize, 24));
  const [open, setOpen] = useState<number | null>(null);
  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open === i ? null : i);
  };
  return (
    <>
      <Header title={t('howTo')} onBack={onBack} />
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={[styles.intro, { color: theme.muted, fontFamily: font }]}>{t('howToIntro')}</Text>
        {Array.from({ length: TOPICS }, (_, i) => i + 1).map((i) => {
          const shown = open === i;
          return (
            <View key={i} style={[styles.topic, { borderColor: theme.border, backgroundColor: shown ? theme.card : 'transparent' }]}>
              <Pressable
                onPress={() => toggle(i)}
                android_ripple={{ color: theme.accentSoft }}
                accessibilityRole="button"
                accessibilityState={{ expanded: shown }}
                style={styles.head}
              >
                <Text style={[styles.title, { color: theme.text, fontSize: size, fontFamily: boldFont ?? font, fontWeight: boldFont ? 'normal' : '700' }]}>{t(`howTopic${i}` as StringKey)}</Text>
                <Icon name={shown ? 'expand_less' : 'expand_more'} color={theme.muted} />
              </Pressable>
              {shown ? (
                <Text selectable style={[styles.body, { color: theme.text, fontFamily: font, fontSize: size, lineHeight: Math.round(size * 1.55) }]}>
                  {t(`howText${i}` as StringKey)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: 16, paddingTop: 8 },
  intro: { fontSize: 14, marginBottom: 10, marginHorizontal: 4 },
  topic: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, paddingVertical: 10 },
  title: { flex: 1 },
  body: { paddingHorizontal: 14, paddingBottom: 14 },
});
