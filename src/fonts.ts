import { useFonts } from 'expo-font';
import { NotoSerifHebrew_500Medium } from '@expo-google-fonts/noto-serif-hebrew/500Medium';
import { NotoSansMalayalam_400Regular } from '@expo-google-fonts/noto-sans-malayalam/400Regular';
import { NotoSansMalayalam_700Bold } from '@expo-google-fonts/noto-sans-malayalam/700Bold';
import { NotoSerifMalayalam_400Regular } from '@expo-google-fonts/noto-serif-malayalam/400Regular';
import { NotoSerifMalayalam_700Bold } from '@expo-google-fonts/noto-serif-malayalam/700Bold';
import { SERIF_FONT } from './theme';

/**
 * Bundled typefaces (SIL Open Font License), so Hebrew points and Malayalam letters
 * look the same on every phone instead of depending on the fonts the phone ships.
 * Android does not reliably embolden a bundled face, so bold Malayalam has its own family.
 */
export const HEBREW_FONT = 'NotoSerifHebrew_500Medium';

const MALAYALAM = {
  sans: 'NotoSansMalayalam_400Regular',
  sansBold: 'NotoSansMalayalam_700Bold',
  serif: 'NotoSerifMalayalam_400Regular',
  serifBold: 'NotoSerifMalayalam_700Bold',
};

/** Loads the bundled fonts; true once they are ready (or failed, so the app still starts). */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    NotoSerifHebrew_500Medium,
    NotoSansMalayalam_400Regular,
    NotoSansMalayalam_700Bold,
    NotoSerifMalayalam_400Regular,
    NotoSerifMalayalam_700Bold,
  });
  return loaded || !!error;
}

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
