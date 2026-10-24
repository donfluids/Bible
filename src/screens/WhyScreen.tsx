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
    'This Bible was made to bring the word of God within reach of all who need it. It was inspired by Bibles that others have given, and it rests on the work of many who went before us.',
  ],
  [
    'In this we follow the Lord Jesus. When He sent out the twelve disciples (',
    { text: 'Matthew 10:5–10', ref: { book: 40, chapter: 10, verse: 5 } },
    '), He told them to take nothing with them, for those who work for Him will be given what they need, and He said: “Freely ye have received, freely give” (',
    { text: 'Matthew 10:8', ref: { book: 40, chapter: 10, verse: 8 } },
    ').',
  ],
  [
    'Wherever you are on your journey, whether you are new to the faith or have walked with Him for many years, I pray that you come to know the Lord Jesus more and more. Having the word is not enough on its own; my hope is that you will spend time with Him, meditating on His word and drawing closer to Him.',
  ],
  [
    'The Hebrew and Greek words are here to help you understand the text. But more than understanding, it is the Holy Spirit who lights up a life. That is His ministry.',
  ],
  [
    'This is eternal life: to know the Father, the only true God, and Jesus Christ whom He has sent (',
    { text: 'John 17:3', ref: { book: 43, chapter: 17, verse: 3 } },
    '). May the Holy Spirit be with you on that journey and, like a fire, burn away your troubles, so that they no longer weigh on you, for it is He who carries them, not we. And may we give to that fire not only our burdens but our old life, on the altar of God, so that, as Paul says, our old self is crucified with Christ (',
    { text: 'Galatians 2:20', ref: { book: 48, chapter: 2, verse: 20 } },
    '), and we find new life wholly in the Lord Jesus, living in His glory every moment, for ever.',
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
