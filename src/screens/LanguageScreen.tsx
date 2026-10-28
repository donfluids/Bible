import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { scriptureFont } from '../fonts';
import type { Script } from '../fonts';
import { useTheme } from '../theme';
import type { Language } from '../edition';
import type { TranslationId } from '../types';

/** A first choice: the interface language and the Bible it opens with. */
export interface LanguageChoice {
  language: Language;
  translation: TranslationId;
}

/**
 * Each choice in its own script, with the Bible it opens and the word "Continue" in that
 * language for the one the phone speaks. Hindi has no interface yet, so it opens the Hindi
 * Bible with the English menus, and says so in Hindi.
 */
const CHOICES: { code: string; name: string; bible: string; go: string; note?: string; script: Script | null; choice: LanguageChoice }[] = [
  { code: 'en', name: 'English', bible: 'King James Version', go: 'Continue', script: null, choice: { language: 'en', translation: 'KJV' } },
  { code: 'ml', name: 'മലയാളം', bible: 'സത്യവേദപുസ്തകം', go: 'തുടരുക', script: 'ml', choice: { language: 'ml', translation: 'MAL' } },
  { code: 'ta', name: 'தமிழ்', bible: 'இண்டியன் ரிவைஸ்டு வெர்ஸன்', go: 'தொடரவும்', script: 'ta', choice: { language: 'ta', translation: 'TAM' } },
  { code: 'hi', name: 'हिन्दी', bible: 'इंडियन रिवाइज्ड वर्जन', go: 'जारी रखें', note: 'बाइबल हिन्दी में; मेनू अभी अंग्रेज़ी में', script: 'hi', choice: { language: 'en', translation: 'HIN' } },
];

/** The language the phone is set to, when it is one of the four; English otherwise. */
export function phoneLanguage(): string {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    const code = tag.toLowerCase().split(/[-_]/)[0];
    return CHOICES.some((c) => c.code === code) ? code : 'en';
  } catch {
    return 'en';
  }
}

/**
 * The four-language app's first screen: which language to read in. The phone's own
 * language stands first and ticked, so most people confirm with one tap. It is asked once;
 * Settings changes the language and the Bible afterwards. Shown before any interface
 * language is known, so its words are in all four languages.
 */
export function LanguageScreen({ onChoose }: { onChoose: (choice: LanguageChoice) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const phone = useMemo(phoneLanguage, []);
  const choices = useMemo(() => [...CHOICES].sort((a, b) => Number(b.code === phone) - Number(a.code === phone)), [phone]);
  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
    >
      <Image source={require('../../assets/icons/all/splash-icon.png')} style={styles.icon} accessibilityIgnoresInvertColors />
      <Text style={[styles.welcome, { color: theme.muted }]}>Read the Bible in your language</Text>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        Choose your language
      </Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>
        <Text style={{ fontFamily: scriptureFont('ml', false) }}>ഭാഷ തിരഞ്ഞെടുക്കുക</Text>
        {'  ·  '}
        <Text style={{ fontFamily: scriptureFont('ta', false) }}>மொழியைத் தேர்ந்தெடுக்கவும்</Text>
        {'  ·  '}
        <Text style={{ fontFamily: scriptureFont('hi', false) }}>भाषा चुनें</Text>
      </Text>
      <View style={styles.list}>
        {choices.map((c) => {
          const first = c.code === phone;
          const font = c.script ? { fontFamily: scriptureFont(c.script, false) } : null;
          return (
            <Pressable
              key={c.code}
              onPress={() => onChoose(c.choice)}
              android_ripple={{ color: theme.accentSoft }}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, ${c.bible}`}
              accessibilityState={{ selected: first }}
              style={({ pressed }) => [
                styles.choice,
                { borderColor: first ? theme.accent : theme.border, backgroundColor: pressed ? theme.accentSoft : first ? theme.accentSoft : theme.card },
                first && styles.choiceFirst,
              ]}
            >
              <View style={styles.choiceTexts}>
                <Text style={[styles.name, { color: theme.text }, c.script ? { fontFamily: scriptureFont(c.script, false, true), fontWeight: 'normal' } : null]}>{c.name}</Text>
                <Text style={[styles.bible, { color: theme.muted }, font]}>{c.bible}</Text>
                {c.note ? <Text style={[styles.note, { color: theme.muted }, font]}>{c.note}</Text> : null}
                {first ? <Text style={[styles.go, { color: theme.accent }, font]}>{c.go}</Text> : null}
              </View>
              {first ? <Icon name="check" color={theme.accent} /> : <Icon name="chevron_right" color={theme.muted} />}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, alignSelf: 'center', width: '100%', maxWidth: 560 },
  icon: { width: 64, height: 64, alignSelf: 'center', borderRadius: 16 },
  welcome: { fontSize: 14, textAlign: 'center', marginTop: 10 },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  subtitle: { fontSize: 13, lineHeight: 22, textAlign: 'center', marginTop: 6 },
  list: { marginTop: 18, gap: 8 },
  choice: { minHeight: 64, borderWidth: 1, borderRadius: 16, paddingLeft: 18, paddingRight: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceFirst: { borderWidth: 2 },
  choiceTexts: { flex: 1 },
  name: { fontSize: 21, lineHeight: 32, fontWeight: '600' },
  bible: { fontSize: 14, lineHeight: 22 },
  note: { fontSize: 13, lineHeight: 20, marginTop: 2 },
  go: { fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 4 },
});
