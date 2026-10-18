import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { SectionLabel } from '../components/SectionLabel';
import { useEdition } from '../edition';
import { sectionsFor } from '../licences';
import type { Link, Source } from '../licences';
import { APACHE_TEXT } from '../apacheText';
import { MIT_TEXT } from '../mitText';
import { OFL_TEXT } from '../oflText';
import notices from '../notices.json';
import { MAX_CONTENT_WIDTH } from '../text';
import { useTheme } from '../theme';

interface Notice {
  name: string;
  version: string;
  licence: string;
  copyright: string[];
  text?: string;
}
const PACKAGES = notices.packages as Notice[];
const ANDROID = notices.android as Notice[];
const APACHE_LIBRARIES = ANDROID.filter((n) => n.licence === 'Apache-2.0');
const NOTICED_LIBRARIES = ANDROID.filter((n) => n.licence !== 'Apache-2.0');

/** A licence file's hard-wrapped lines joined into paragraphs, for a narrow screen; list items keep their lines. */
const reflow = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !/^[=-]{3,}$/.test(l))
        .reduce<string[]>((lines, l) => (lines.length && !/^([*•-]|\d+[.)])\s/.test(l) ? [...lines.slice(0, -1), `${lines[lines.length - 1]} ${l}`] : [...lines, l]), [])
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n\n');

/**
 * Sources and licences, in English: the copyright and licence notice of every text, data
 * set, font, picture and piece of software in the app, then the licence texts.
 */
export function LicencesScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  // Lists run under the system navigation bar; the last row must clear it.
  const insets = useSafeAreaInsets();
  const edition = useEdition();
  const sections = sectionsFor(edition.id);
  const link = (l: Link) => (
    <Text key={l.url} style={[styles.link, { color: theme.accent }]} accessibilityRole="link" onPress={() => Linking.openURL(l.url).catch(() => undefined)}>
      {l.label}
    </Text>
  );
  const line = (label: string, value: React.ReactNode) => (
    <Text style={[styles.body, { color: theme.text }]}>
      <Text style={{ color: theme.muted }}>{label}: </Text>
      {value}
    </Text>
  );
  const entry = (s: Source) => (
    <View key={s.title} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        {s.title}
      </Text>
      <Text style={[styles.body, { color: theme.text }]}>{s.notice}</Text>
      {s.licence ? line('Licence', link(s.licence)) : null}
      {s.source?.length ? line('Source', s.source.map((l, i) => [i > 0 ? ' · ' : '', link(l)])) : null}
      {s.modifications ? line('Modifications', s.modifications) : null}
    </View>
  );
  const notice = (n: Notice) => (
    <View key={n.name} style={styles.notice}>
      <Text style={[styles.body, { color: theme.text }]}>
        {n.name} {n.version} <Text style={{ color: theme.muted }}>· {n.licence}</Text>
      </Text>
      {n.text ? (
        <Text style={[styles.licenceText, { color: theme.muted }]}>{reflow(n.text)}</Text>
      ) : (
        n.copyright.map((c) => (
          <Text key={c} style={[styles.small, { color: theme.muted }]}>
            {c}
          </Text>
        ))
      )}
    </View>
  );
  const licenceText = (title: string, text: string) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[styles.licenceText, { color: theme.muted }]}>{text}</Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title="Sources and licences" onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <SectionLabel text={section.heading} style={styles.heading} />
            {section.sources.map(entry)}
          </View>
        ))}

        <View style={styles.section}>
          <SectionLabel text="Third-party software" style={styles.heading} />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.body, { color: theme.text }]}>
              The app includes the following open-source software. The MIT and Apache License texts are below; other licences are given in full.
            </Text>
            <Text style={[styles.subhead, { color: theme.text }]}>JavaScript packages</Text>
            {PACKAGES.map(notice)}
            <Text style={[styles.subhead, { color: theme.text }]}>Android libraries</Text>
            {NOTICED_LIBRARIES.map(notice)}
            <Text style={[styles.body, { color: theme.text, marginTop: 6 }]}>
              <Text style={{ color: theme.muted }}>Apache License 2.0: </Text>
              {APACHE_LIBRARIES.map((n) => `${n.name} ${n.version}`).join(', ')}.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel text="Licence texts" style={styles.heading} />
          {licenceText('MIT License', reflow(MIT_TEXT))}
          {licenceText('Apache License 2.0', APACHE_TEXT)}
          {licenceText('SIL Open Font License 1.1', OFL_TEXT)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 18, alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  section: { gap: 10 },
  heading: { marginHorizontal: 4 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
  title: { fontSize: 16, fontWeight: '600' },
  subhead: { fontSize: 15, fontWeight: '600', marginTop: 10 },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  notice: { marginTop: 4 },
  link: { textDecorationLine: 'underline' },
  licenceText: { fontSize: 12, lineHeight: 17 },
});
