import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useEdition } from '../edition';
import { useT } from '../i18n';
import { sourcesFor } from '../licences';
import { APACHE_TEXT } from '../apacheText';
import { OFL_TEXT } from '../oflText';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH } from '../text';
import { useTheme } from '../theme';

/** Where the texts, data, fonts and code come from, their licences, and what was changed. */
export function LicencesScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  // Lists run under the system navigation bar; the last row must clear it.
  const insets = useSafeAreaInsets();
  const t = useT();
  const edition = useEdition();
  const { settings } = useSettings();
  const sources = sourcesFor(edition.id, settings.language);
  const link = (label: string, url: string) => (
    <Text key={url} style={[styles.link, { color: theme.accent }]} accessibilityRole="link" onPress={() => Linking.openURL(url).catch(() => undefined)}>
      {label}
    </Text>
  );
  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={t('sourcesLicences')} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {sources.map((s) => (
          <View key={s.title} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
              {s.title}
            </Text>
            <Text style={[styles.body, { color: theme.text }]}>{s.credit}</Text>
            {s.licence ? (
              <Text style={[styles.body, { color: theme.text }]}>
                {t('licence')}: {link(s.licence.name, s.licence.url)}
              </Text>
            ) : null}
            {s.links?.length ? <Text style={[styles.body, { color: theme.text }]}>{s.links.map((l, i) => [i > 0 ? ' · ' : '', link(l.label, l.url)])}</Text> : null}
            {s.changes ? (
              <>
                <Text style={[styles.subhead, { color: theme.muted }]}>{t('changesMade')}</Text>
                <Text style={[styles.body, { color: theme.text }]}>{s.changes}</Text>
              </>
            ) : null}
          </View>
        ))}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            SIL Open Font License 1.1
          </Text>
          <Text style={[styles.licenceText, { color: theme.muted }]}>{OFL_TEXT}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            Apache License 2.0
          </Text>
          <Text style={[styles.licenceText, { color: theme.muted }]}>{APACHE_TEXT}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12, alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
  title: { fontSize: 16, fontWeight: '600' },
  subhead: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  body: { fontSize: 15, lineHeight: 21 },
  link: { textDecorationLine: 'underline' },
  licenceText: { fontSize: 12, lineHeight: 17 },
});
