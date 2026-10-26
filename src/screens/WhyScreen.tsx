import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { languageScript, scriptureFont } from '../fonts';
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

const MATTHEW_10_5 = { book: 40, chapter: 10, verse: 5 };
const MATTHEW_10_8 = { book: 40, chapter: 10, verse: 8 };
const JOHN_17_3 = { book: 43, chapter: 17, verse: 3 };
const GALATIANS_2_20 = { book: 48, chapter: 2, verse: 20 };

/**
 * Why this Bible was made, in the author's words, in the interface language. The verses
 * quoted are those of the edition's own Bible (KJV, സത്യവേദപുസ്തകം, IRV Tamil).
 */
const PARAGRAPHS: Record<'en' | 'ml' | 'ta', Piece[][]> = {
  en: [
    [
      'This Bible was made to bring the word of God within reach of all who need it. It was inspired by Bibles that others have given, and it rests on the work of many who went before us.',
    ],
    [
      'In offering it, we follow the Lord Jesus. When He sent out the twelve disciples (',
      { text: 'Matthew 10:5–10', ref: MATTHEW_10_5 },
      '), He told them to take nothing with them, for those who work for Him will be given what they need, and He said: “Freely ye have received, freely give” (',
      { text: 'Matthew 10:8', ref: MATTHEW_10_8 },
      ').',
    ],
    [
      'But the word is given for a purpose. Wherever you are on your journey, whether you are new to the faith or have walked with Him for many years, we pray that you come to know the Lord Jesus more and more. Having the word is not enough on its own; our hope is that you will spend time with Him, meditating on His word and drawing closer to Him.',
    ],
    [
      'To help with that, the Hebrew and Greek words are here to help you understand the text. But more than understanding, it is the Holy Spirit who lights up a life. That is His ministry.',
    ],
    [
      'And to know Him is life itself: “And this is life eternal, that they might know thee the only true God, and Jesus Christ, whom thou hast sent” (',
      { text: 'John 17:3', ref: JOHN_17_3 },
      '). May the Holy Spirit be with you on that journey and, like a fire, burn away your troubles, so that they no longer weigh on you, for it is He who carries them, not we. And may we give to that fire not only our burdens but our old life, on the altar of God, so that, as Paul says, we are crucified with Christ, and it is no longer we who live but Christ who lives in us (',
      { text: 'Galatians 2:20', ref: GALATIANS_2_20 },
      '), and we find new life wholly in the Lord Jesus, living in His glory every moment, for ever.',
    ],
    ['Amen.'],
  ],
  ml: [
    [
      'ദൈവവചനം ആവശ്യമുള്ള എല്ലാവർക്കും എത്തിച്ചുകൊടുക്കുന്നതിനാണ് ഈ വേദപുസ്തകം ഒരുക്കിയിരിക്കുന്നത്. മറ്റുള്ളവർ നൽകിയ വേദപുസ്തകങ്ങളാണ് ഇതിനു പ്രചോദനമായത്; നമുക്കു മുമ്പേ പോയ അനേകരുടെ അധ്വാനത്തിന്മേലാണ് ഇതു പണിതിരിക്കുന്നത്.',
    ],
    [
      'ഇതു നൽകുന്നതിൽ ഞങ്ങൾ കർത്താവായ യേശുവിനെ പിന്തുടരുന്നു. പന്ത്രണ്ടു ശിഷ്യന്മാരെ അയച്ചപ്പോൾ (',
      { text: 'മത്തായി 10:5–10', ref: MATTHEW_10_5 },
      ') ഒന്നും കൂടെ കരുതരുതെന്ന് അവിടുന്ന് അവരോടു പറഞ്ഞു; അവിടുത്തേക്കുവേണ്ടി വേല ചെയ്യുന്നവർക്ക് ആവശ്യമുള്ളതു ലഭിക്കും. അവിടുന്ന് അരുളിച്ചെയ്തു: “സൗജന്യമായി നിങ്ങൾക്കു ലഭിച്ചു സൗജന്യമായി കൊടുപ്പിൻ” (',
      { text: 'മത്തായി 10:8', ref: MATTHEW_10_8 },
      ').',
    ],
    [
      'എന്നാൽ വചനം നൽകപ്പെടുന്നത് ഒരു ലക്ഷ്യത്തോടെയാണ്. വിശ്വാസത്തിൽ നിങ്ങൾ പുതിയ ആളായാലും വർഷങ്ങളായി അവിടുത്തോടുകൂടെ നടക്കുന്ന ആളായാലും, നിങ്ങളുടെ യാത്രയിൽ എവിടെ ആയിരുന്നാലും, കർത്താവായ യേശുവിനെ നിങ്ങൾ കൂടുതൽ കൂടുതൽ അറിയുവാൻ ഞങ്ങൾ പ്രാർത്ഥിക്കുന്നു. വചനം കൈവശമുണ്ടായതുകൊണ്ടു മാത്രം മതിയാകുന്നില്ല; നിങ്ങൾ അവിടുത്തോടുകൂടെ സമയം ചെലവഴിച്ച്, അവിടുത്തെ വചനം ധ്യാനിച്ച്, അവിടുത്തോടു കൂടുതൽ അടുത്തുചെല്ലും എന്നതാണ് ഞങ്ങളുടെ പ്രത്യാശ.',
    ],
    [
      'അതിനു സഹായമായി, വചനത്തിന്റെ അർത്ഥം മനസ്സിലാക്കുവാൻ എബ്രായ, ഗ്രീക്ക് വാക്കുകൾ ഇവിടെ നൽകിയിരിക്കുന്നു. എന്നാൽ അർത്ഥം മനസ്സിലാക്കുന്നതിലും ഉപരി, ഒരു ജീവിതത്തെ പ്രകാശിപ്പിക്കുന്നത് പരിശുദ്ധാത്മാവാണ്. അതാണ് അവിടുത്തെ ശുശ്രൂഷ.',
    ],
    [
      'അവിടുത്തെ അറിയുന്നതുതന്നെയാണ് ജീവൻ: “ഏകസത്യദൈവമായ നിന്നെയും നീ അയച്ചിരിക്കുന്ന യേശുക്രിസ്തുവിനെയും അറിയുന്നതു തന്നേ നിത്യജീവൻ ആകുന്നു” (',
      { text: 'യോഹന്നാൻ 17:3', ref: JOHN_17_3 },
      '). ആ യാത്രയിൽ പരിശുദ്ധാത്മാവ് നിങ്ങളോടുകൂടെ ഉണ്ടായിരിക്കട്ടെ; ഒരു അഗ്നിപോലെ അവിടുന്ന് നിങ്ങളുടെ ക്ലേശങ്ങളെ ദഹിപ്പിച്ചുകളയട്ടെ; അവ ഇനി നിങ്ങൾക്കു ഭാരമാകാതിരിക്കട്ടെ, കാരണം അവയെ വഹിക്കുന്നതു നാമല്ല, അവിടുന്നാണ്. നമ്മുടെ ഭാരങ്ങൾ മാത്രമല്ല, നമ്മുടെ പഴയ ജീവിതവും ദൈവത്തിന്റെ യാഗപീഠത്തിൽ ആ അഗ്നിക്കു സമർപ്പിക്കുവാൻ നമുക്കു കഴിയട്ടെ; അങ്ങനെ, പൗലൊസ് പറയുന്നതുപോലെ, നാം ക്രിസ്തുവിനോടുകൂടെ ക്രൂശിക്കപ്പെട്ടവരായി, ഇനി ജീവിക്കുന്നതു നാമല്ല, ക്രിസ്തുവത്രേ നമ്മിൽ ജീവിക്കുന്നത് എന്ന നിലയിലെത്തി (',
      { text: 'ഗലാത്യർ 2:20', ref: GALATIANS_2_20 },
      '), കർത്താവായ യേശുവിൽ നാം പൂർണ്ണമായി പുതുജീവൻ കണ്ടെത്തി, എന്നേക്കും ഓരോ നിമിഷവും അവിടുത്തെ മഹത്വത്തിൽ ജീവിക്കുമാറാകട്ടെ.',
    ],
    ['ആമേൻ.'],
  ],
  ta: [
    [
      'தேவனுடைய வார்த்தை தேவைப்படுகிற அனைவருக்கும் அது எட்டும்படி இந்த வேதாகமம் உருவாக்கப்பட்டது. மற்றவர்கள் அளித்த வேதாகமங்களே இதற்குத் தூண்டுதலாக இருந்தன; நமக்கு முன்சென்ற பலருடைய உழைப்பின்மேல் இது கட்டப்பட்டிருக்கிறது.',
    ],
    [
      'இதை அளிப்பதில் நாங்கள் கர்த்தராகிய இயேசுவைப் பின்பற்றுகிறோம். அவர் பன்னிரண்டு சீடர்களை அனுப்பியபோது (',
      { text: 'மத்தேயு 10:5–10', ref: MATTHEW_10_5 },
      '), எதையும் எடுத்துச்செல்ல வேண்டாம் என்று அவர்களிடம் சொன்னார்; அவருக்காக ஊழியம் செய்கிறவர்களுக்குத் தேவையானது கொடுக்கப்படும். அவர் சொன்னார்: “இலவசமாகப் பெற்றீர்கள், இலவசமாகக் கொடுங்கள்” (',
      { text: 'மத்தேயு 10:8', ref: MATTHEW_10_8 },
      ').',
    ],
    [
      'ஆனால் வார்த்தை ஒரு நோக்கத்திற்காகக் கொடுக்கப்படுகிறது. நீங்கள் விசுவாசத்தில் புதியவராக இருந்தாலும், பல ஆண்டுகளாக அவரோடு நடந்தவராக இருந்தாலும், உங்கள் பயணத்தில் எங்கே இருந்தாலும், கர்த்தராகிய இயேசுவை நீங்கள் மேலும் மேலும் அறிந்துகொள்ள வேண்டுமென்று ஜெபிக்கிறோம். வார்த்தை கையில் இருப்பது மட்டும் போதாது; நீங்கள் அவரோடு நேரம் செலவழித்து, அவருடைய வார்த்தையைத் தியானித்து, அவரிடம் இன்னும் நெருங்கி வருவீர்கள் என்பதே எங்கள் நம்பிக்கை.',
    ],
    [
      'அதற்கு உதவியாக, வசனத்தின் பொருளைப் புரிந்துகொள்ள எபிரெய, கிரேக்க வார்த்தைகள் இங்கே தரப்பட்டுள்ளன. ஆனால் புரிந்துகொள்வதைவிட மேலாக, ஒரு வாழ்க்கையை ஒளிரச்செய்கிறவர் பரிசுத்த ஆவியானவரே. அதுவே அவருடைய ஊழியம்.',
    ],
    [
      'அவரை அறிவதே ஜீவன்: “ஒன்றான உண்மை தேவனாகிய உம்மையும் நீர் அனுப்பினவராகிய இயேசுகிறிஸ்துவையும் அறிவதே நித்தியஜீவன்” (',
      { text: 'யோவான் 17:3', ref: JOHN_17_3 },
      '). அந்தப் பயணத்தில் பரிசுத்த ஆவியானவர் உங்களோடு இருப்பாராக; ஒரு அக்கினியைப்போல அவர் உங்கள் துன்பங்களைச் சுட்டெரிப்பாராக; அவற்றைச் சுமப்பவர் நாமல்ல, அவரே; ஆகவே அவை இனி உங்களுக்குப் பாரமாக இருக்காது. நம்முடைய பாரங்களை மட்டுமல்ல, நம்முடைய பழைய வாழ்க்கையையும் தேவனுடைய பலிபீடத்தில் அந்த அக்கினிக்கு ஒப்புக்கொடுப்போமாக; அப்பொழுது, பவுல் சொல்லுகிறபடி, நாம் கிறிஸ்துவோடு சிலுவையில் அறையப்பட்டு, இனி நாம் அல்ல, கிறிஸ்துவே நமக்குள் பிழைத்திருக்கிறார் என்ற நிலையை அடைந்து (',
      { text: 'கலாத்தியர் 2:20', ref: GALATIANS_2_20 },
      '), கர்த்தராகிய இயேசுவுக்குள் நாம் முழுமையாகப் புதிய ஜீவனைக் கண்டடைந்து, ஒவ்வொரு கணமும் என்றென்றும் அவருடைய மகிமையில் வாழ்வோமாக.',
    ],
    ['ஆமென்.'],
  ],
};

export function WhyScreen({ onBack, onOpenRef }: Props) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const language = settings.language === 'ml' || settings.language === 'ta' ? settings.language : 'en';
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
