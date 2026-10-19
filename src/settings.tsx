import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { translate } from './i18n';
import { loadEntry, useAutosave } from './persist';
import type { Loaded } from './persist';
import type { Edition, Language } from './edition';
import type { Bookmark, HighlightColor, TextMark, TranslationId } from './types';

export type ThemeChoice = 'system' | 'light' | 'sepia' | 'dark';
export type Layout = 'verses' | 'paragraphs';
export type HighlightStyle = 'soft' | 'fluorescent';

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
  /** Highlight colours: soft tints of the page, or bright highlighter-pen colours. */
  highlightStyle: HighlightStyle;
  keepAwake: boolean;
  /** Speaking rate of chapters read aloud: 0.75, 1 or 1.25. */
  readSpeed: number;
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
  /** Parts of verses marked in a colour (marker mode in the reader). */
  marks: TextMark[];
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
  highlightStyle: 'soft',
  keepAwake: false,
  readSpeed: 1,
  underlineWords: true,
  interlinear: false,
  interlinearMode: 'all',
  showTranslit: true,
  hideCantillation: false,
  bookmarks: [],
  highlights: {},
  marks: [],
  notes: {},
  tipSeen: false,
};

// The Aa buttons in Settings and pinching the reader step through these.
export const FONT_SIZES = [15, 17, 19, 21, 24, 28, 32, 36];

function defaultsFor(edition: Edition): Settings {
  return { ...BASE_DEFAULTS, translation: edition.defaultTranslation, language: edition.languages[0] };
}

function load(edition: Edition): Loaded<Settings> {
  const defaults = defaultsFor(edition);
  return loadEntry(
    `settings.v1.${edition.id}`,
    (raw) => {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not settings');
      const merged = { ...defaults, ...parsed };
      // Fields of older versions that moved to src/place.ts.
      for (const old of ['position', 'recent', 'lastChapters']) delete (merged as Record<string, unknown>)[old];
      if (!edition.translations.includes(merged.translation)) merged.translation = edition.defaultTranslation;
      if (!edition.languages.includes(merged.language)) merged.language = edition.languages[0];
      return merged;
    },
    defaults,
  );
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  /** Like update, and written to the phone at once: for typed text when the app is left. */
  commit: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// A failed save or an unreadable store is told once per session, not on every change.
let toldSaveFailed = false;
export function tellSaveFailed(language: Language): void {
  if (toldSaveFailed) return;
  toldSaveFailed = true;
  Alert.alert(translate(language, 'saveFailedTitle'), translate(language, 'saveFailed'));
}
const toldLoad = new Set<string>();
/** Tells the reader, once per session, that saved data could not be read or came from a backup. */
export function tellLoadProblem(language: Language, source: Loaded<unknown>['source']): void {
  if ((source !== 'unreadable' && source !== 'backup') || toldLoad.has(source)) return;
  toldLoad.add(source);
  if (source === 'unreadable') Alert.alert(translate(language, 'readFailedTitle'), translate(language, 'readFailed'));
  else Alert.alert(translate(language, 'restoredBackupTitle'), translate(language, 'restoredBackup'));
}

export function SettingsProvider({ edition, children }: { edition: Edition; children: React.ReactNode }) {
  const [loaded] = useState(() => load(edition));
  const [settings, setSettings] = useState<Settings>(loaded.value);
  const update = useCallback((patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch })), []);
  useEffect(() => tellLoadProblem(loaded.value.language, loaded.source), [loaded]);
  const language = useRef(settings.language);
  language.current = settings.language;
  // Saved a moment after a change, and at once when the app is left.
  const saveValue = useAutosave(`settings.v1.${edition.id}`, settings, loaded.writable, 300, () => tellSaveFailed(language.current));
  const latest = useRef(settings);
  latest.current = settings;
  const commit = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      saveValue(next);
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    [saveValue],
  );
  const value = useMemo(() => ({ settings, update, commit }), [settings, update, commit]);
  const display = useMemo(
    () => ({ theme: settings.theme, serif: settings.serif, language: settings.language, highlightStyle: settings.highlightStyle }),
    [settings.theme, settings.serif, settings.language, settings.highlightStyle],
  );
  return (
    <SettingsContext.Provider value={value}>
      <DisplayContext.Provider value={display}>{children}</DisplayContext.Provider>
    </SettingsContext.Provider>
  );
}

/** Settings when inside the provider, null otherwise (used by the loading screen). */
export function useOptionalSettings(): Settings | null {
  return useContext(SettingsContext)?.settings ?? null;
}

/**
 * The few settings that decide how text looks. Verses, the theme and the interface
 * strings read these instead of the whole settings, so a bookmark, a highlight or a
 * marker stroke does not redraw every verse on screen. Null outside the provider.
 */
export interface DisplaySettings {
  theme: Settings['theme'];
  serif: boolean;
  language: Language;
  highlightStyle: HighlightStyle;
}
const DisplayContext = createContext<DisplaySettings | null>(null);

export function useDisplaySettings(): DisplaySettings | null {
  return useContext(DisplayContext);
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
