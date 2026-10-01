import { Platform, useColorScheme } from 'react-native';
import { useOptionalSettings } from './settings';

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
  accentSoft: string;
  linked: string;
  highlight: string;
  /** Font family for scripture text; undefined means the system sans-serif. */
  font: string | undefined;
}

const light: Omit<Theme, 'font'> = {
  name: 'light',
  dark: false,
  bg: '#FBF8F1',
  card: '#FFFFFF',
  text: '#1F1B16',
  muted: '#6F675C',
  border: '#E6DFD2',
  accent: '#7A4E1D',
  accentSoft: '#F1E6D4',
  linked: '#D8C8B0',
  highlight: '#FFF1C2',
};

const sepia: Omit<Theme, 'font'> = {
  name: 'sepia',
  dark: false,
  bg: '#F0E4CC',
  card: '#F7EEDC',
  text: '#3B2A14',
  muted: '#7D6A4C',
  border: '#D9C7A3',
  accent: '#7A4E1D',
  accentSoft: '#E6D5B3',
  linked: '#C9B38A',
  highlight: '#F5DC9C',
};

const dark: Omit<Theme, 'font'> = {
  name: 'dark',
  dark: true,
  bg: '#15130F',
  card: '#1F1C17',
  text: '#EDE6DA',
  muted: '#A1988A',
  border: '#332E27',
  accent: '#D9A86C',
  accentSoft: '#2C251B',
  linked: '#4A4133',
  highlight: '#3A3220',
};

/** A serif face available on every phone without bundling a font file. */
export const SERIF_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export function useTheme(): Theme {
  const system = useColorScheme();
  const settings = useOptionalSettings();
  const choice = settings?.theme ?? 'system';
  const base = choice === 'system' ? (system === 'dark' ? dark : light) : choice === 'sepia' ? sepia : choice === 'dark' ? dark : light;
  return { ...base, font: settings?.serif ? SERIF_FONT : undefined };
}
