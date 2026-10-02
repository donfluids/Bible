import { useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { useOptionalSettings } from './settings';
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
  accentSoft: string;
  linked: string;
  highlight: string;
  /** Font family for scripture text; undefined means the system sans-serif. */
  font: string | undefined;
  /** Verse highlight colours, tuned to the palette. */
  marks: Record<HighlightColor, string>;
}

const LIGHT_MARKS: Record<HighlightColor, string> = { yellow: '#FFF0A6', green: '#D7F0C3', blue: '#D2E6FF', pink: '#FFD9E6' };
const SEPIA_MARKS: Record<HighlightColor, string> = { yellow: '#F3DE8E', green: '#CFE1AE', blue: '#C6DAEF', pink: '#F0C9D5' };
const DARK_MARKS: Record<HighlightColor, string> = { yellow: '#4A4210', green: '#21391C', blue: '#1B2F4A', pink: '#47212F' };

const light: Omit<Theme, 'font'> = {
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
  accentSoft: '#F1E6D4',
  // Faint, so a chapter of linked words still reads as text; Android draws only solid underlines.
  linked: '#E3D8C6',
  highlight: '#FFF1C2',
};

const sepia: Omit<Theme, 'font'> = {
  marks: SEPIA_MARKS,
  name: 'sepia',
  dark: false,
  bg: '#F0E4CC',
  card: '#F7EEDC',
  text: '#3B2A14',
  muted: '#7D6A4C',
  border: '#D9C7A3',
  accent: '#7A4E1D',
  onAccent: '#FFFFFF',
  accentSoft: '#E6D5B3',
  linked: '#D6C5A2',
  highlight: '#F5DC9C',
};

const dark: Omit<Theme, 'font'> = {
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
  accentSoft: '#2C251B',
  linked: '#3B342A',
  highlight: '#3A3220',
};

/** A serif face available on every phone without bundling a font file. */
export const SERIF_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export function useTheme(): Theme {
  const system = useColorScheme();
  const settings = useOptionalSettings();
  const choice = settings?.theme ?? 'system';
  const base = choice === 'system' ? (system === 'dark' ? dark : light) : choice === 'sepia' ? sepia : choice === 'dark' ? dark : light;
  const serif = settings?.serif ?? false;
  // The same object while nothing changes, so memoised lists do not redraw on unrelated settings.
  return useMemo(() => ({ ...base, font: serif ? SERIF_FONT : undefined }), [base, serif]);
}
