import { SERIF_FONT } from './theme';

/**
 * Typefaces built into the app (SIL Open Font License), so Hebrew points and Malayalam
 * letters look the same on every phone instead of depending on the fonts the phone ships.
 * The expo-font config plugin (app.config.js) puts the font files in the Android app,
 * where they are found by file name, so nothing loads at startup. Expo Go does not have
 * them and shows the phone's own fonts. Android does not reliably embolden a bundled
 * face, so bold Malayalam has its own family.
 */
export const HEBREW_FONT = 'NotoSerifHebrew_500Medium';

const MALAYALAM = {
  sans: 'NotoSansMalayalam_400Regular',
  sansBold: 'NotoSansMalayalam_700Bold',
  serif: 'NotoSerifMalayalam_400Regular',
  serifBold: 'NotoSerifMalayalam_700Bold',
};

export const isMalayalam = (text: string) => /[ഀ-ൿ]/.test(text);

/**
 * Font family for scripture text: the bundled Malayalam face for Malayalam, otherwise
 * the system face (serif when chosen). `bold` picks the bold Malayalam family; for other
 * scripts fontWeight does the work.
 */
export function scriptureFont(malayalam: boolean, serif: boolean, bold = false): string | undefined {
  if (malayalam) return serif ? (bold ? MALAYALAM.serifBold : MALAYALAM.serif) : bold ? MALAYALAM.sansBold : MALAYALAM.sans;
  return serif ? SERIF_FONT : undefined;
}
