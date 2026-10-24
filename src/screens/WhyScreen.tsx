import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { scriptureFont } from '../fonts';
import { useT } from '../i18n';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH } from '../text';
import { useTheme } from '../theme';
import type { Ref } from '../types';

interface Props {
  onBack: () => void;
  onOpenRef: (ref: Ref) => void;
}

// A piece of a paragraph: plain text, or a reference that opens its verse.
type Piece = string | { text: string; ref: Ref };

/** Why this Bible was made, in the author's words (English in every edition). */
const PARAGRAPHS: Piece[][] = [
  [
    'This Bible was made to give the word of God freely. Many Bibles today come at a price, and we want God’s word to be within reach of everyone. It is possible only because of the many who worked before us and offered their work freely.',
  ],
  [
    'In this we follow what the Lord Jesus taught his disciples when he sent them out to carry nothing with them, trusting that those who work for the Lord will be given what they need: “Freely ye have received, freely give” (',
    { text: 'Matthew 10:8', ref: { book: 40, chapter: 10, verse: 8 } },
    '). In that same spirit, this Bible is given freely.',
  ],
  [
    'Wherever you are on your journey, whether you are new to the faith or have walked with the Lord for many years, I pray that you come to know the Lord Jesus more and more. Having the word is not enough on its own; I pray that you spend time with the Lord, meditate on his word, and draw closer to him.',
  ],
  [
    'The Hebrew and Greek words are here to help you understand what the words mean. But more than the meaning of words, I pray that the Holy Spirit lights up your life, and that whatever burdens you carry melt away as you meditate on the Lord. That is his ministry.',
  ],
  [
    'This is eternal life: to know the Father, the only true God, and Jesus Christ whom he has sent (',
    { text: 'John 17:3', ref: { book: 43, chapter: 17, verse: 3 } },
    '). The Holy Spirit is with you on that journey, a fire that burns away your troubles. May we burn not only our burdens but our old life on the altar of God. As Paul says, our old self is crucified with Christ (',
    { text: 'Galatians 2:20', ref: { book: 48, chapter: 2, verse: 20 } },
    '). May we find new life wholly in the Lord Jesus, and live in his glory every moment, for ever.',
  ],
  ['Amen.'],
];

export function WhyScreen({ onBack, onOpenRef }: Props) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const font = scriptureFont(null, settings.serif) ?? theme.font;
  const size = Math.min(settings.fontSize, 22);
  return (
    <>
      <Header title={t('whyThisBible')} onBack={onBack} />
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {PARAGRAPHS.map((pieces, i) => (
          <Text key={i} selectable style={[styles.paragraph, { color: theme.text, fontFamily: font, fontSize: size, lineHeight: Math.round(size * 1.6) }]}>
            {pieces.map((p, j) =>
              typeof p === 'string' ? (
                p
              ) : (
                <Text key={j} onPress={() => onOpenRef(p.ref)} accessibilityRole="link" style={{ color: theme.accent, textDecorationLine: 'underline' }}>
                  {p.text}
                </Text>
              ),
            )}
          </Text>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: 20, paddingTop: 8 },
  paragraph: { marginBottom: 16 },
});
