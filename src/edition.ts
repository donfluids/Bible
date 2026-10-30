import Constants from 'expo-constants';
import { createContext, useContext } from 'react';
import { isEnglish, isIndian } from './types';
import type { TranslationId } from './types';

export type EditionId = 'en' | 'ml' | 'ta' | 'all';
export type Language = 'en' | 'ml' | 'ta' | 'hi';

export interface Edition {
  id: EditionId;
  /** Translations bundled in this edition's database, in display order. */
  translations: TranslationId[];
  defaultTranslation: TranslationId;
  /** Interface languages offered; the first is the default. */
  languages: Language[];
}

export const EDITIONS: Record<EditionId, Edition> = {
  en: { id: 'en', translations: ['KJV', 'BSB', 'WEB'], defaultTranslation: 'KJV', languages: ['en'] },
  ml: { id: 'ml', translations: ['MAL', 'KJV', 'BSB'], defaultTranslation: 'MAL', languages: ['ml', 'en'] },
  ta: { id: 'ta', translations: ['TAM', 'KJV', 'BSB'], defaultTranslation: 'TAM', languages: ['ta', 'en'] },
  // The four-language app: every Bible the others carry, and the Hindi. Its interface is
  // English, Malayalam, Tamil or Hindi; the first opening asks which.
  all: { id: 'all', translations: ['KJV', 'BSB', 'WEB', 'MAL', 'TAM', 'HIN'], defaultTranslation: 'KJV', languages: ['en', 'ml', 'ta', 'hi'] },
};

/** The edition's own-language Bible (MAL, TAM), if it has exactly one besides the English. */
export function nativeTranslation(edition: Edition): TranslationId | null {
  const first = edition.translations[0];
  return isEnglish(first) ? null : first;
}

/** True for an edition with more than one Indian Bible (the four-language app). */
export const isMultilingual = (edition: Edition) => edition.translations.filter(isIndian).length > 1;

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
  if (!isMultilingual(edition)) return nativeTranslation(edition);
  if (isIndian(translation)) return translation;
  const last = edition.translations.find((id) => id === lastIndian);
  return last ?? bibleOfLanguage(edition, language);
}

export function isEditionId(value: unknown): value is EditionId {
  return value === 'en' || value === 'ml' || value === 'ta' || value === 'all';
}

const configured = (Constants.expoConfig?.extra as { edition?: string } | undefined)?.edition;

/**
 * The edition the build configuration claims. The database bundled with the app is
 * the final word (its meta table carries the edition it was built for), so the app
 * shell resolves the edition from the database and provides it through context.
 */
export const CONFIGURED_EDITION: Edition = EDITIONS[isEditionId(configured) ? configured : 'en'];

/** The edition named in the build configuration, if it names one. */
export const CONFIGURED_EDITION_ID: EditionId | undefined = isEditionId(configured) ? configured : undefined;

export const EditionContext = createContext<Edition>(CONFIGURED_EDITION);

export function useEdition(): Edition {
  return useContext(EditionContext);
}
