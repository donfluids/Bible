import Constants from 'expo-constants';
import { createContext, useContext } from 'react';
import { isEnglish } from './types';
import type { TranslationId } from './types';

export type EditionId = 'en' | 'ml' | 'ta';
export type Language = 'en' | 'ml' | 'ta';

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
  ml: { id: 'ml', translations: ['MAL', 'KJV'], defaultTranslation: 'MAL', languages: ['ml', 'en'] },
  ta: { id: 'ta', translations: ['TAM', 'KJV'], defaultTranslation: 'TAM', languages: ['ta', 'en'] },
};

/** The edition's own-language Bible (MAL, TAM), if it has one besides the English. */
export function nativeTranslation(edition: Edition): TranslationId | null {
  const first = edition.translations[0];
  return isEnglish(first) ? null : first;
}

export function isEditionId(value: unknown): value is EditionId {
  return value === 'en' || value === 'ml' || value === 'ta';
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
