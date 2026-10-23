import { useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { useEdition } from './edition';
import type { EditionId } from './edition';
import { useDisplaySettings } from './settings';
import type { HighlightColor } from './types';

export type ThemeName = 'light' | 'sepia' | 'dark';

export interface Theme {
  name: ThemeName;
  dark: boolean;
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  /** Text on an accent-coloured fill (buttons, selected pills). */
  onAccent: string;
  /** Destructive actions and errors. */
  error: string;
  accentSoft: string;
  linked: string;
  highlight: string;
  /** Font family for scripture text; undefined means the system sans-serif. */
  font: string | undefined;
  /** Verse highlight colours, tuned to the palette. */
  marks: Record<HighlightColor, string>;
  /** Text, faint text and accent (verse numbers, note letters) on a highlight colour. */
  markText: string;
  markMuted: string;
  markAccent: string;
}

type Palette = Omit<Theme, 'font' | 'markText' | 'markMuted' | 'markAccent'>;

const LIGHT_MARKS: Record<HighlightColor, string> = { yellow: '#FFF0A6', green: '#D7F0C3', blue: '#D2E6FF', pink: '#FFD9E6' };
const SEPIA_MARKS: Record<HighlightColor, string> = { yellow: '#F3DE8E', green: '#CFE1AE', blue: '#C6DAEF', pink: '#F0C9D5' };
const DARK_MARKS: Record<HighlightColor, string> = { yellow: '#4A4210', green: '#21391C', blue: '#1B2F4A', pink: '#47212F' };
// The Fluorescent setting (dark theme only): highlighter-pen colours. The text on them
// turns dark (7.9:1 or better; faint text 5.4:1).
const FLUORESCENT_MARKS: Record<HighlightColor, string> = { yellow: '#F2FF3D', green: '#7DFF6E', blue: '#5CE6FF', pink: '#FF7AD1' };
const ON_FLUORESCENT = '#14140F';
const ON_FLUORESCENT_MUTED = '#33332A';

const light: Palette = {
  marks: LIGHT_MARKS,
  name: 'light',
  dark: false,
  bg: '#FBF8F1',
  card: '#FFFFFF',
  text: '#1F1B16',
  muted: '#6F675C',
  border: '#E6DFD2',
  accent: '#7A4E1D',
  onAccent: '#FFFFFF',
  error: '#B3261E',
  accentSoft: '#F1E6D4',
  // Faint, so a chapter of linked words still reads as text; Android draws only solid underlines.
  linked: '#D3C2A6',
  highlight: '#FFF1C2',
};

const sepia: Palette = {
  marks: SEPIA_MARKS,
  name: 'sepia',
  dark: false,
  bg: '#F0E4CC',
  card: '#F7EEDC',
  text: '#3B2A14',
  // Darker than the page's own brown-grey so small text passes 4.5:1.
  muted: '#6A5A3F',
  border: '#D9C7A3',
  accent: '#7A4E1D',
  onAccent: '#FFFFFF',
  error: '#A1281E',
  accentSoft: '#E6D5B3',
  linked: '#C6B087',
  highlight: '#F5DC9C',
};

const dark: Palette = {
  marks: DARK_MARKS,
  name: 'dark',
  dark: true,
  bg: '#15130F',
  card: '#1F1C17',
  text: '#EDE6DA',
  muted: '#A1988A',
  border: '#332E27',
  accent: '#D9A86C',
  // White on this light tan is 2.2:1; the background colour is 8.6:1.
  onAccent: '#15130F',
  error: '#F2B8B5',
  accentSoft: '#2C251B',
  linked: '#2C2721',
  highlight: '#3A3220',
};

/** The Tamil app is deep blue; its pairs are checked for 4.5:1 or better too. */
const blueLight: Palette = {
  ...light,
  bg: '#F4F7FB',
  text: '#151B26',
  muted: '#566173',
  border: '#D6DEEA',
  accent: '#1F4E8C',
  accentSoft: '#DDE7F4',
  linked: '#B3C4DB',
};

const blueSepia: Palette = {
  ...sepia,
  accent: '#2E4C78',
  accentSoft: '#DCD8C5',
};

const blueDark: Palette = {
  ...dark,
  bg: '#0F1319',
  card: '#171D26',
  text: '#E2E8F1',
  muted: '#97A3B5',
  border: '#2A3341',
  accent: '#8DB4E8',
  onAccent: '#0F1319',
  accentSoft: '#1C2736',
  linked: '#1F2733',
};

const PALETTES: Record<EditionId, Record<ThemeName, Palette>> = {
  en: { light, sepia, dark },
  // The Malayalam app has the English app's paper and brown.
  ml: { light, sepia, dark },
  ta: { light: blueLight, sepia: blueSepia, dark: blueDark },
};

/** A serif face available on every phone without bundling a font file. */
export const SERIF_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export function useTheme(): Theme {
  const settings = useDisplaySettings();
  // Outside the settings provider (the loading screen) the phone's mode is read directly.
  const phoneDark = useColorScheme() === 'dark';
  const system = (settings ? settings.systemDark : phoneDark) ? 'dark' : 'light';
  const palette = PALETTES[useEdition().id];
  const choice = settings?.theme ?? 'system';
  const base = choice === 'system' ? (system === 'dark' ? palette.dark : palette.light) : palette[choice === 'sepia' ? 'sepia' : choice === 'dark' ? 'dark' : 'light'];
  const serif = settings?.serif ?? false;
  // Fluorescent colours are for dark pages only; light and sepia keep their soft tints.
  const fluorescent = settings?.highlightStyle === 'fluorescent' && base.dark;
  // The same object while nothing changes, so memoised lists do not redraw on unrelated settings.
  return useMemo(() => {
    // On a bright colour the text, and the verse numbers and note letters (the accent is
    // too light on it), turn dark.
    const onMark = fluorescent
      ? { markText: ON_FLUORESCENT, markMuted: ON_FLUORESCENT_MUTED, markAccent: ON_FLUORESCENT }
      : { markText: base.text, markMuted: base.muted, markAccent: base.accent };
    return { ...base, ...onMark, marks: fluorescent ? FLUORESCENT_MARKS : base.marks, font: serif ? SERIF_FONT : undefined };
  }, [base, serif, fluorescent]);
}
