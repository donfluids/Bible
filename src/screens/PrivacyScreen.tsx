import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { languageScript, scriptureFont } from '../fonts';
import { useT } from '../i18n';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH } from '../text';
import { useTheme } from '../theme';

/**
 * The privacy policy in short, in the interface language, with the address of the full
 * policy (docs/play/privacy-policy.html). The stores ask for it inside the app; the app has
 * no internet access, so it is text here rather than a link.
 */
export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const font = scriptureFont(languageScript(settings.language), settings.serif) ?? theme.font;
  const size = Math.max(15, settings.fontSize - 2);
  return (
    <>
      <Header title={t('privacy')} onBack={onBack} />
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {t('privacyText')
          .split('\n\n')
          .map((p, i) => (
            <Text key={i} selectable style={[styles.paragraph, { color: theme.text, fontFamily: font, fontSize: size, lineHeight: Math.round(size * 1.55) }]}>
              {p}
            </Text>
          ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: 20, paddingTop: 8 },
  paragraph: { marginBottom: 14 },
});
