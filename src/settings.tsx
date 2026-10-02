import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import type { Edition, Language } from './edition';
import type { Bookmark, HighlightColor, TranslationId } from './types';

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
  /** The first-launch tip about tapping words has been dismissed. */
  tipSeen: boolean;
  // The reading place (position, recent and last chapters) is kept in src/place.ts.
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
  tipSeen: false,
};

// The Aa buttons in Settings and pinching the reader step through these.
export const FONT_SIZES = [15, 17, 19, 21, 24, 28, 32, 36];

function defaultsFor(edition: Edition): Settings {
  return { ...BASE_DEFAULTS, translation: edition.defaultTranslation, language: edition.languages[0] };
}

function load(edition: Edition): Settings {
  const defaults = defaultsFor(edition);
  try {
    const raw = Storage.getItemSync(`settings.v1.${edition.id}`);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged = { ...defaults, ...parsed };
    // Fields of older versions that moved to src/place.ts.
    for (const old of ['position', 'recent', 'lastChapters']) delete (merged as Record<string, unknown>)[old];
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
  const update = useCallback((patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch })), []);
  // Written in the background a moment after a change, and at once when the app is left.
  const key = `settings.v1.${edition.id}`;
  const latest = useRef(settings);
  latest.current = settings;
  const pending = useRef(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = true;
    const timer = setTimeout(() => {
      pending.current = false;
      Storage.setItem(key, JSON.stringify(settings)).catch(() => undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [settings, key]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' || !pending.current) return;
      pending.current = false;
      try {
        Storage.setItemSync(key, JSON.stringify(latest.current));
      } catch {
        // Best effort; the in-memory value still applies.
      }
    });
    return () => sub.remove();
  }, [key]);
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
