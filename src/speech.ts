// The phone's own text-to-speech voice (expo-speech): a Hebrew or Greek word in the word
// sheet, and chapters read aloud in the reader. The phone's voices speak modern Hebrew and
// modern Greek; nothing is downloaded by the app.
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { stripCantillation } from './text';
import { voicesOrIndian } from './voiceLabels';
import type { VoiceOption } from './voiceLabels';

export type OriginalLanguage = 'hebrew' | 'greek';
export type SpokenLanguage = 'english' | 'malayalam' | 'tamil' | 'hindi';
export type VoiceLanguage = OriginalLanguage | SpokenLanguage;

export const LANGUAGE: Record<VoiceLanguage, string> = { hebrew: 'he-IL', greek: 'el-GR', english: 'en', malayalam: 'ml-IN', tamil: 'ta-IN', hindi: 'hi-IN' };
// Older Android engines name Hebrew "iw".
const CODES: Record<VoiceLanguage, string[]> = { hebrew: ['he', 'iw'], greek: ['el'], english: ['en'], malayalam: ['ml'], tamil: ['ta'], hindi: ['hi'] };

// The list is asked for each time, not kept: a voice downloaded while the app is open (an
// iPhone's Malayalam voice from Settings → Accessibility) then shows at once. A browser can
// wait for its list forever, so after a moment the answer is an empty list.
function phoneVoices(): Promise<Speech.Voice[]> {
  return Promise.race([
    Speech.getAvailableVoicesAsync().catch(() => []),
    new Promise<Speech.Voice[]>((resolve) => setTimeout(() => resolve([]), 1500)),
  ]);
}

// An iPhone speaks Malayalam, Tamil and Hindi with a voice shared by several Indian
// languages (Aman), which its list may give under another of them.
const INDIAN: VoiceLanguage[] = ['malayalam', 'tamil', 'hindi'];
const indianOnIphone = (language: VoiceLanguage) => Platform.OS === 'ios' && INDIAN.includes(language);

/**
 * Whether the phone has a voice for the language; null when it is not known (some engines
 * list none, and an iPhone with an Indian voice may list it under another language, so
 * reading is tried).
 */
export async function hasVoice(language: VoiceLanguage): Promise<boolean | null> {
  const list = await phoneVoices();
  if (list.length === 0) return null;
  if (list.some((v) => CODES[language].includes(v.language.toLowerCase().split(/[-_]/)[0]))) return true;
  return voicesOrIndian(list, CODES[language], indianOnIphone(language)).length > 0 ? null : false;
}

/** The phone's voices for a language, for the choice in Settings; empty when the engine lists none. */
export async function listVoices(language: VoiceLanguage): Promise<VoiceOption[]> {
  return voicesOrIndian(await phoneVoices(), CODES[language], indianOnIphone(language));
}

/** Reads a sample in a voice (the phone's default when none), for the choice in Settings. */
export function saySample(text: string, language: VoiceLanguage, voice: string | undefined, rate: number, onEnd: () => void): void {
  Speech.stop();
  Speech.speak(text, { language: LANGUAGE[language], voice, rate, onDone: onEnd, onStopped: onEnd, onError: onEnd });
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

/**
 * What the phone says about its voices, for telling us why a language is not read: how
 * many voices, how many per language tag, and each voice for India (or for the language)
 * in full. Shown in Settings, where it can be photographed or copied.
 */
export async function voiceReport(language: VoiceLanguage): Promise<string> {
  const list = await phoneVoices();
  const tags = new Map<string, number>();
  for (const v of list) tags.set(v.language, (tags.get(v.language) ?? 0) + 1);
  const near = list.filter((v) => /[-_]IN$/i.test(v.language) || CODES[language].includes(v.language.toLowerCase().split(/[-_]/)[0]));
  return [
    `${Platform.OS} ${Platform.Version} · ${LANGUAGE[language]} · ${list.length} voices`,
    [...tags.entries()].sort().map(([tag, n]) => (n > 1 ? `${tag}×${n}` : tag)).join(' '),
    ...near.map((v) => `${v.language} | ${v.name} | ${v.quality} | ${v.identifier}`),
  ].join('\n');
}
