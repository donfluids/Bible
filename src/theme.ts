import { useColorScheme } from 'react-native';

export interface Theme {
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
}

const light: Theme = {
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

const dark: Theme = {
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

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
