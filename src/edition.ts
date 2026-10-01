import Constants from 'expo-constants';
import type { TranslationId } from './types';

export type EditionId = 'en' | 'ml';
export type Language = 'en' | 'ml';

export interface Edition {
  id: EditionId;
  /** Translations bundled in this edition's database, in display order. */
  translations: TranslationId[];
  defaultTranslation: TranslationId;
  /** Interface languages offered; the first is the default. */
  languages: Language[];
}

const EDITIONS: Record<EditionId, Edition> = {
  en: { id: 'en', translations: ['KJV', 'WEB'], defaultTranslation: 'KJV', languages: ['en'] },
  ml: { id: 'ml', translations: ['MAL', 'KJV'], defaultTranslation: 'MAL', languages: ['ml', 'en'] },
};

const configured = (Constants.expoConfig?.extra as { edition?: string } | undefined)?.edition;

/** The edition this build was made for; set by app.config.js from BIBLE_EDITION. */
export const EDITION: Edition = EDITIONS[(configured === 'ml' ? 'ml' : 'en') as EditionId];
