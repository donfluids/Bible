import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import type { TranslationId } from './types';

export interface Position {
  book: number;
  chapter: number;
  /** Verse to scroll to when the chapter opens. */
  verse?: number;
}

export interface Settings {
  translation: TranslationId;
  fontSize: number;
  underlineWords: boolean;
  /** Show the Hebrew or Greek words under each verse. */
  interlinear: boolean;
  position: Position;
}

const KEY = 'settings.v1';

const DEFAULTS: Settings = {
  translation: 'KJV',
  fontSize: 19,
  underlineWords: true,
  interlinear: false,
  position: { book: 43, chapter: 1 },
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

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
