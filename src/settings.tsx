import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import type { Bookmark, HighlightColor, TranslationId } from './types';

export interface Position {
  book: number;
  chapter: number;
  /** Verse to scroll to when the chapter opens. */
  verse?: number;
}

export type ThemeChoice = 'system' | 'light' | 'sepia' | 'dark';
export type Layout = 'verses' | 'paragraphs';

export interface Settings {
  translation: TranslationId;
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
}

const KEY = 'settings.v1';

const DEFAULTS: Settings = {
  translation: 'KJV',
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
};

export const FONT_SIZES = [15, 17, 19, 21, 24, 28];

function load(): Settings {
  try {
    const raw = Storage.getItemSync(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed, position: { ...DEFAULTS.position, ...parsed.position } };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        Storage.setItemSync(KEY, JSON.stringify(next));
      } catch {
        // Persistence is best effort; the in-memory value still applies.
      }
      return next;
    });
  }, []);
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
