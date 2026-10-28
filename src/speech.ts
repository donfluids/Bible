// The phone's own text-to-speech voice (expo-speech): a Hebrew or Greek word in the word
// sheet, and chapters read aloud in the reader. The phone's voices speak modern Hebrew and
// modern Greek; nothing is downloaded by the app.
import * as Speech from 'expo-speech';
import { stripCantillation } from './text';

export type OriginalLanguage = 'hebrew' | 'greek';
export type VoiceLanguage = OriginalLanguage | 'english' | 'malayalam' | 'tamil' | 'hindi';

export const LANGUAGE: Record<VoiceLanguage, string> = { hebrew: 'he-IL', greek: 'el-GR', english: 'en', malayalam: 'ml-IN', tamil: 'ta-IN', hindi: 'hi-IN' };
// Older Android engines name Hebrew "iw".
const CODES: Record<VoiceLanguage, string[]> = { hebrew: ['he', 'iw'], greek: ['el'], english: ['en'], malayalam: ['ml'], tamil: ['ta'], hindi: ['hi'] };

let voices: Promise<Speech.Voice[]> | null = null;

/** Whether the phone has a voice for the language; null when it does not say (some engines list none). */
export async function hasVoice(language: VoiceLanguage): Promise<boolean | null> {
  // A browser can wait for its voice list forever; after a moment the answer is "not known".
  voices ??= Promise.race([
    Speech.getAvailableVoicesAsync().catch(() => []),
    new Promise<Speech.Voice[]>((resolve) => setTimeout(() => resolve([]), 1500)),
  ]);
  const list = await voices;
  if (list.length === 0) {
    voices = null; // the engine may not have been ready; ask again next time
    return null;
  }
  return list.some((v) => CODES[language].includes(v.language.toLowerCase().split(/[-_]/)[0]));
}

/** Says the word slowly; `onEnd` runs when it finishes, is stopped or fails. */
export function sayWord(word: string, language: OriginalLanguage, onEnd: () => void): void {
  Speech.stop();
  // Accents (cantillation) are not read; the vowel points are kept.
  const text = language === 'hebrew' ? stripCantillation(word) : word;
  Speech.speak(text, { language: LANGUAGE[language], rate: 0.75, onDone: onEnd, onStopped: onEnd, onError: onEnd });
}

export function stopSaying(): void {
  Speech.stop();
}
