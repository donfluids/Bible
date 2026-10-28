import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
 * Each choice in its own script, with the Bible it opens. Hindi has no interface yet, so
 * it opens the Hindi Bible with the English menus, and says so in Hindi.
 */
const CHOICES: { name: string; bible: string; note?: string; script: Script | null; choice: LanguageChoice }[] = [
  { name: 'English', bible: 'King James Version', script: null, choice: { language: 'en', translation: 'KJV' } },
  { name: 'മലയാളം', bible: 'സത്യവേദപുസ്തകം', script: 'ml', choice: { language: 'ml', translation: 'MAL' } },
  { name: 'தமிழ்', bible: 'இண்டியன் ரிவைஸ்டு வெர்ஸன்', script: 'ta', choice: { language: 'ta', translation: 'TAM' } },
  { name: 'हिन्दी', bible: 'इंडियन रिवाइज्ड वर्जन', note: 'मेनू अभी अंग्रेज़ी में हैं', script: 'hi', choice: { language: 'en', translation: 'HIN' } },
];

/**
 * The four-language app's first screen: which language to read in. It is asked once;
 * Settings changes the language and the Bible afterwards. Shown before any interface
 * language is known, so its words are in all four languages.
 */
export function LanguageScreen({ onChoose }: { onChoose: (choice: LanguageChoice) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
    >
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
        {CHOICES.map((c) => (
          <Pressable
            key={c.name}
            onPress={() => onChoose(c.choice)}
            android_ripple={{ color: theme.accentSoft }}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${c.bible}`}
            style={({ pressed }) => [styles.choice, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : theme.card }]}
          >
            <Text style={[styles.name, { color: theme.text }, c.script ? { fontFamily: scriptureFont(c.script, false, true), fontWeight: 'normal' } : null]}>{c.name}</Text>
            <Text style={[styles.bible, { color: theme.muted }, c.script ? { fontFamily: scriptureFont(c.script, false) } : null]}>{c.bible}</Text>
            {c.note ? <Text style={[styles.note, { color: theme.muted }, c.script ? { fontFamily: scriptureFont(c.script, false) } : null]}>{c.note}</Text> : null}
          </Pressable>
        ))}
      </View>
      <Text style={[styles.foot, { color: theme.muted }]}>
        You can change the language and the Bible at any time in Settings.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, alignSelf: 'center', width: '100%', maxWidth: 560 },
  title: { fontSize: 26, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 24, textAlign: 'center', marginTop: 8 },
  list: { marginTop: 28, gap: 12 },
  choice: { minHeight: 76, borderWidth: 1, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, justifyContent: 'center' },
  name: { fontSize: 22, lineHeight: 34, fontWeight: '600' },
  bible: { fontSize: 14, lineHeight: 22 },
  note: { fontSize: 13, lineHeight: 20, marginTop: 2 },
  foot: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 24 },
});
