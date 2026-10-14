import { Platform } from 'react-native';
import { SERIF_FONT } from './theme';

/**
 * Typefaces built into the app (SIL Open Font License), so Hebrew points and Malayalam
 * and Tamil letters look the same on every phone instead of depending on the fonts the phone ships.
 * The expo-font config plugin (app.config.js) puts the font files in the app, so nothing
 * loads at startup. Android finds them by file name, iOS by the name inside the font (its
 * PostScript name). Expo Go does not have them and shows the phone's own fonts. Android
 * does not reliably embolden a bundled face, so bold Malayalam has its own family.
 */
const ios = Platform.OS === 'ios';
export const HEBREW_FONT = ios ? 'NotoSerifHebrew-Medium' : 'NotoSerifHebrew_500Medium';

/** The Indian scripts the apps carry their own typefaces for. */
export type Script = 'ml' | 'ta';

type Faces = { sans: string; sansBold: string; serif: string; serifBold: string };
// File names on Android, the fonts' own (PostScript) names on iOS.
const face = (family: string, weight: '400Regular' | '700Bold') =>
  ios ? `${family}-${weight === '400Regular' ? 'Regular' : 'Bold'}` : `${family}_${weight}`;
const faces = (sans: string, serif: string): Faces => ({
  sans: face(sans, '400Regular'),
  sansBold: face(sans, '700Bold'),
  serif: face(serif, '400Regular'),
  serifBold: face(serif, '700Bold'),
});
const FACES: Record<Script, Faces> = {
  ml: faces('NotoSansMalayalam', 'NotoSerifMalayalam'),
  ta: faces('NotoSansTamil', 'NotoSerifTamil'),
};

/** The script of an interface language, when it has a bundled typeface. */
export const languageScript = (language: string): Script | null => (language === 'ml' || language === 'ta' ? language : null);

/** The Indian script a text is written in, if any. */
export function scriptOf(text: string): Script | null {
  if (/[\u0d00-\u0d7f]/.test(text)) return 'ml';
  if (/[\u0b80-\u0bff]/.test(text)) return 'ta';
  return null;
}

/**
 * Font family for scripture text: the bundled face for Malayalam or Tamil, otherwise
 * the system face (serif when chosen). `bold` picks the bold family of the bundled face
 * (Android does not reliably embolden one); for other scripts fontWeight does the work.
 */
export function scriptureFont(script: Script | null | undefined, serif: boolean, bold = false): string | undefined {
  if (script) {
    const f = FACES[script];
    return serif ? (bold ? f.serifBold : f.serif) : bold ? f.sansBold : f.sans;
  }
  return serif ? SERIF_FONT : undefined;
}
