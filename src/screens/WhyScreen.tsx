import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { languageScript, scriptureFont } from '../fonts';
import { useT } from '../i18n';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH } from '../text';
import { useTheme } from '../theme';
import type { Language } from '../edition';
import type { Ref } from '../types';

interface Props {
  onBack: () => void;
  onOpenRef: (ref: Ref) => void;
}

// A piece of a paragraph: plain text, or a reference that opens its verse.
type Piece = string | { text: string; ref: Ref };

const MATTHEW_10_8 = { book: 40, chapter: 10, verse: 8 };
const JOHN_17_3 = { book: 43, chapter: 17, verse: 3 };

/**
 * Why this Bible was made, in the author's words, in the interface language. The verses
 * quoted are those of the edition's own Bible (KJV, സത്യവേദപുസ്തകം, IRV Tamil).
 */
const PARAGRAPHS: Record<Language, Piece[][]> = {
  en: [
    [
      'This Bible was made to bring God\'s word within reach of everyone who needs it. It is given freely, as the Lord Jesus said: “Freely ye have received, freely give” (',
      { text: 'Matthew 10:8', ref: MATTHEW_10_8 },
      ').',
    ],
    [
      'Our prayer is that, wherever you are on your journey, you come to know the Lord Jesus more and more: not only reading His word, but spending time with Him and drawing closer to Him. The Hebrew and Greek words are here to help you understand; it is the Holy Spirit who brings the word to life.',
    ],
    [
      '“And this is life eternal, that they might know thee the only true God, and Jesus Christ, whom thou hast sent” (',
      { text: 'John 17:3', ref: JOHN_17_3 },
      ').',
    ],
    ['Amen.'],
  ],
  ml: [
    [
      'ദൈവവചനം ആവശ്യമുള്ള എല്ലാവർക്കും എത്തിച്ചുകൊടുക്കുന്നതിനാണ് ഈ വേദപുസ്തകം ഒരുക്കിയിരിക്കുന്നത്. കർത്താവായ യേശു അരുളിച്ചെയ്തതുപോലെ ഇതു സൗജന്യമായി നൽകുന്നു: “സൗജന്യമായി നിങ്ങൾക്കു ലഭിച്ചു സൗജന്യമായി കൊടുപ്പിൻ” (',
      { text: 'മത്തായി 10:8', ref: MATTHEW_10_8 },
      ').',
    ],
    [
      'നിങ്ങളുടെ യാത്രയിൽ എവിടെ ആയിരുന്നാലും, കർത്താവായ യേശുവിനെ നിങ്ങൾ കൂടുതൽ കൂടുതൽ അറിയുവാൻ ഞങ്ങൾ പ്രാർത്ഥിക്കുന്നു: അവിടുത്തെ വചനം വായിക്കുക മാത്രമല്ല, അവിടുത്തോടുകൂടെ സമയം ചെലവഴിച്ച് അവിടുത്തോടു കൂടുതൽ അടുത്തുചെല്ലുവാൻ. വചനം മനസ്സിലാക്കുവാൻ എബ്രായ, ഗ്രീക്ക് വാക്കുകൾ ഇവിടെ നൽകിയിരിക്കുന്നു; എന്നാൽ വചനത്തെ ജീവനുള്ളതാക്കുന്നത് പരിശുദ്ധാത്മാവാണ്.',
    ],
    [
      '“ഏകസത്യദൈവമായ നിന്നെയും നീ അയച്ചിരിക്കുന്ന യേശുക്രിസ്തുവിനെയും അറിയുന്നതു തന്നേ നിത്യജീവൻ ആകുന്നു” (',
      { text: 'യോഹന്നാൻ 17:3', ref: JOHN_17_3 },
      ').',
    ],
    ['ആമേൻ.'],
  ],
  ta: [
    [
      'தேவனுடைய வார்த்தை தேவைப்படுகிற அனைவருக்கும் அது எட்டும்படி இந்த வேதாகமம் உருவாக்கப்பட்டது. கர்த்தராகிய இயேசு சொன்னபடியே இது இலவசமாக அளிக்கப்படுகிறது: “இலவசமாகப் பெற்றீர்கள், இலவசமாகக் கொடுங்கள்” (',
      { text: 'மத்தேயு 10:8', ref: MATTHEW_10_8 },
      ').',
    ],
    [
      'உங்கள் பயணத்தில் எங்கே இருந்தாலும், கர்த்தராகிய இயேசுவை நீங்கள் மேலும் மேலும் அறிந்துகொள்ள வேண்டுமென்று ஜெபிக்கிறோம்: அவருடைய வார்த்தையை வாசிப்பது மட்டுமல்ல, அவரோடு நேரம் செலவழித்து அவரிடம் இன்னும் நெருங்கி வருவதற்கு. வசனத்தைப் புரிந்துகொள்ள எபிரெய, கிரேக்க வார்த்தைகள் இங்கே தரப்பட்டுள்ளன; ஆனால் வார்த்தைக்கு உயிரூட்டுகிறவர் பரிசுத்த ஆவியானவரே.',
    ],
    [
      '“ஒன்றான உண்மை தேவனாகிய உம்மையும் நீர் அனுப்பினவராகிய இயேசுகிறிஸ்துவையும் அறிவதே நித்தியஜீவன்” (',
      { text: 'யோவான் 17:3', ref: JOHN_17_3 },
      ').',
    ],
    ['ஆமென்.'],
  ],
  hi: [
    [
      'यह बाइबल इसलिए बनाई गई कि परमेश्वर का वचन उन सबकी पहुँच में आए जिन्हें उसकी ज़रूरत है। यह मुफ़्त दी जाती है, जैसा प्रभु यीशु ने कहा: “तुम ने सेंत-मेंत पाया है, सेंत-मेंत दो” (',
      { text: 'मत्ती 10:8', ref: MATTHEW_10_8 },
      ')।',
    ],
    [
      'आप अपनी यात्रा में जहाँ भी हों, हमारी प्रार्थना है कि आप प्रभु यीशु को अधिक से अधिक जानें: केवल उनका वचन पढ़कर नहीं, बल्कि उनके साथ समय बिताकर और उनके और निकट आकर। पाठ को समझने के लिए इब्रानी और यूनानी शब्द यहाँ दिए गए हैं; परन्तु वचन में जीवन डालनेवाले पवित्र आत्मा हैं।',
    ],
    [
      '“अनन्त जीवन यह है, कि वे तुझ एकमात्र सच्चे परमेश्वर को और यीशु मसीह को, जिसे तूने भेजा है, जानें” (',
      { text: 'यूहन्ना 17:3', ref: JOHN_17_3 },
      ')।',
    ],
    ['आमीन।'],
  ],
};

export function WhyScreen({ onBack, onOpenRef }: Props) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const language = settings.language;
  const font = scriptureFont(languageScript(language), settings.serif) ?? theme.font;
  const size = settings.fontSize;
  return (
    <>
      <Header title={t('whyThisBible')} onBack={onBack} />
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {PARAGRAPHS[language].map((pieces, i) => (
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
