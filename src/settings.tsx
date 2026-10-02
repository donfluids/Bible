import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import type { Edition, Language } from './edition';
import type { Bookmark, HighlightColor, TranslationId } from './types';

export interface Position {
  book: number;
  chapter: number;
  /** Verse to scroll to when the chapter opens: the first verse on screen when the reader left. */
  verse?: number;
}

export type ThemeChoice = 'system' | 'light' | 'sepia' | 'dark';
export type Layout = 'verses' | 'paragraphs';

export interface Settings {
  translation: TranslationId;
  /** Interface language. */
  language: Language;
  fontSize: number;
  theme: ThemeChoice;
  /** Scripture text in a serif face. */
  serif: boolean;
  /** One verse per line, or verses run together in paragraphs. */
  layout: Layout;
  keepAwake: boolean;
  underlineWords: boolean;
  /** Show the Hebrew or Greek words under each verse. */
  interlinear: boolean;
  /** Interlinear for every verse, or only for verses whose number is tapped. */
  interlinearMode: 'all' | 'tap';
  showTranslit: boolean;
  hideCantillation: boolean;
  bookmarks: Bookmark[];
  /** Verse key "book:chapter:verse" to highlight colour. */
  highlights: Record<string, HighlightColor>;
  /** Verse key "book:chapter:verse" to note text. */
  notes: Record<string, string>;
  position: Position;
  /** The first-launch tip about tapping words has been dismissed. */
  tipSeen: boolean;
  /** Last chapter visited in each book, keyed by book id. */
  lastChapters: Record<string, number>;
  /** Chapters read most recently, newest first. */
  recent: { book: number; chapter: number }[];
}

const BASE_DEFAULTS: Omit<Settings, 'translation' | 'language'> = {
  fontSize: 19,
  theme: 'system',
  serif: false,
  layout: 'verses',
  keepAwake: false,
  underlineWords: true,
  interlinear: false,
  interlinearMode: 'all',
  showTranslit: true,
  hideCantillation: false,
  bookmarks: [],
  highlights: {},
  notes: {},
  position: { book: 43, chapter: 1 },
  tipSeen: false,
  lastChapters: {},
  recent: [],
};

export const FONT_SIZES = [15, 17, 19, 21, 24, 28];

function defaultsFor(edition: Edition): Settings {
  return { ...BASE_DEFAULTS, translation: edition.defaultTranslation, language: edition.languages[0] };
}

function load(edition: Edition): Settings {
  const defaults = defaultsFor(edition);
  try {
    const raw = Storage.getItemSync(`settings.v1.${edition.id}`);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged = { ...defaults, ...parsed, position: { ...defaults.position, ...parsed.position } };
    if (!edition.translations.includes(merged.translation)) merged.translation = edition.defaultTranslation;
    if (!edition.languages.includes(merged.language)) merged.language = edition.languages[0];
    return merged;
  } catch {
    return defaults;
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ edition, children }: { edition: Edition; children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => load(edition));
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        Storage.setItemSync(`settings.v1.${edition.id}`, JSON.stringify(next));
      } catch {
        // Persistence is best effort; the in-memory value still applies.
      }
      return next;
    });
  }, [edition.id]);
  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Settings when inside the provider, null otherwise (used by the loading screen). */
export function useOptionalSettings(): Settings | null {
  return useContext(SettingsContext)?.settings ?? null;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
