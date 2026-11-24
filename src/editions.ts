// The editions and the rules pairing their Bibles, with nothing of the app shell, so the
// logic tests can load them (src/edition.ts adds the configured edition and its context).
import { isEnglish, isIndian, translationInfo } from './types';
import type { TranslationId } from './types';

export type EditionId = 'en' | 'ml' | 'ta' | 'all';
export type Language = 'en' | 'ml' | 'ta' | 'hi';

export interface Edition {
  id: EditionId;
  /** Translations bundled in this edition's database, in display order. */
  translations: TranslationId[];
  defaultTranslation: TranslationId;
  /** Interface languages offered; the first, English in every app, is the default. */
  languages: Language[];
}

export const EDITIONS: Record<EditionId, Edition> = {
  en: { id: 'en', translations: ['KJV', 'BSB', 'WEB', 'LSV', 'ASV'], defaultTranslation: 'KJV', languages: ['en'] },
  ml: { id: 'ml', translations: ['MAL', 'IRV', 'OMCV', 'KJV', 'BSB', 'LSV', 'ASV'], defaultTranslation: 'MAL', languages: ['en', 'ml'] },
  ta: { id: 'ta', translations: ['TAM', 'KJV', 'BSB', 'LSV', 'ASV'], defaultTranslation: 'TAM', languages: ['en', 'ta'] },
  // The four-language app: every Bible the others carry, and the Hindi. Its interface is
  // English, Malayalam, Tamil or Hindi; the first opening asks which.
  all: { id: 'all', translations: ['KJV', 'BSB', 'WEB', 'LSV', 'ASV', 'MAL', 'TAM', 'HIN'], defaultTranslation: 'KJV', languages: ['en', 'ml', 'ta', 'hi'] },
};

/** The edition's own-language Bible (MAL, TAM), if it has exactly one besides the English. */
export function nativeTranslation(edition: Edition): TranslationId | null {
  const first = edition.translations[0];
  return isEnglish(first) ? null : first;
}

/** True for an edition with Bibles in more than one Indian language (the four-language app). */
export const isMultilingual = (edition: Edition) => new Set(edition.translations.filter(isIndian).map((id) => translationInfo(id).script)).size > 1;

/** The Indian Bible of an interface language, in an edition that has it. */
export function bibleOfLanguage(edition: Edition, language: string): TranslationId | null {
  const id: TranslationId | null = language === 'ml' ? 'MAL' : language === 'ta' ? 'TAM' : language === 'hi' ? 'HIN' : null;
  return id && edition.translations.includes(id) ? id : null;
}

/**
 * The Indian Bible that goes with what is being read: beside the KJV on a wide screen, the
 * other side of the Bible switch, and the language of the word sheet's headline. In a
 * one-language app it is that app's Bible. In the four-language app it is the Indian Bible
 * open now, else the one read last, else the one of the interface language.
 */
export function pairedBible(edition: Edition, translation: TranslationId, lastIndian: string, language: string): TranslationId | null {
  // The Malayalam app has three Malayalam Bibles: the one open, else the one read last.
  if (isIndian(translation)) return translation;
  const last = edition.translations.find((id) => id === lastIndian);
  if (!isMultilingual(edition)) return last ?? nativeTranslation(edition);
  return last ?? bibleOfLanguage(edition, language);
}

/** Which column a second Bible is kept for: beside an English Bible, or beside an Indian one. */
export type BesideSlot = 'english' | 'indian';
export const besideSlot = (translation: TranslationId): BesideSlot => (isEnglish(translation) ? 'english' : 'indian');

/**
 * The Bible chosen for a slot (Settings or the sideways heading), else its default: beside an
 * Indian Bible the KJV, beside an English one the Indian Bible read last (or the app's own).
 */
export function besideChoice(
  edition: Edition,
  slot: BesideSlot,
  saved: { besideEnglish: string; besideIndian: string; lastIndian: string; language: string },
): TranslationId {
  const stored = slot === 'english' ? saved.besideEnglish : saved.besideIndian;
  const chosen = edition.translations.find((id) => id === stored);
  if (chosen) return chosen;
  return slot === 'indian' ? 'KJV' : pairedBible(edition, 'KJV', saved.lastIndian, saved.language) ?? 'KJV';
}

/**
 * The Bible beside the open one on a wide screen: its slot's choice, any Bible but the open
 * one (two Malayalam or two English Bibles may stand together). Should the choice be the open
 * Bible itself, the slot's default stands in, and failing that the first other Bible.
 */
export function besideBible(
  edition: Edition,
  translation: TranslationId,
  saved: { besideEnglish: string; besideIndian: string; lastIndian: string; language: string },
): TranslationId {
  const slot = besideSlot(translation);
  const choice = besideChoice(edition, slot, saved);
  if (choice !== translation) return choice;
  const fallback = besideChoice(edition, slot, { ...saved, besideEnglish: '', besideIndian: '' });
  if (fallback !== translation) return fallback;
  return edition.translations.find((id) => id !== translation) ?? translation;
}

export function isEditionId(value: unknown): value is EditionId {
  return value === 'en' || value === 'ml' || value === 'ta' || value === 'all';
}
