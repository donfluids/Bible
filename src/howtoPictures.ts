// Written by scripts/howto-shots.mjs: the How to use pictures and where each one's ring
// goes, per interface language. An app carries the pictures of its own languages only
// (metro.config.js puts a blank in place of the others).
import type { ImageSourcePropType } from 'react-native';
import RINGS from '../assets/howto/rings.json';

export type Ring = { left: number; top: number; width: number; height: number };
// Each picture's width over its height (the browser version cannot measure an image).
export const HOWTO_SHAPES: Partial<Record<string, Partial<Record<number, number>>>> = {
  en: {
    1: 1.0842,
    2: 1.0842,
    3: 0.7357,
    4: 0.8957,
    5: 1.2485,
    6: 0.9364,
    7: 0.9364,
    8: 0.7923,
    9: 0.7357,
    10: 0.9364,
    11: 0.8583,
    12: 1.0842,
    13: 0.7357,
  },
  ta: {
    1: 1.0842,
    2: 1.0842,
    3: 0.7357,
    4: 0.8957,
    5: 1.2485,
    6: 0.9364,
    7: 0.9364,
    8: 0.7923,
    9: 0.7357,
    10: 0.9364,
    11: 0.8583,
    12: 1.0842,
    13: 0.7357,
  },
};
export const HOWTO_PICTURES: Partial<Record<string, Partial<Record<number, ImageSourcePropType>>>> = {
  en: {
    1: require('../assets/howto/en/1.jpg'),
    2: require('../assets/howto/en/2.jpg'),
    3: require('../assets/howto/en/3.jpg'),
    4: require('../assets/howto/en/4.jpg'),
    5: require('../assets/howto/en/5.jpg'),
    6: require('../assets/howto/en/6.jpg'),
    7: require('../assets/howto/en/7.jpg'),
    8: require('../assets/howto/en/8.jpg'),
    9: require('../assets/howto/en/9.jpg'),
    10: require('../assets/howto/en/10.jpg'),
    11: require('../assets/howto/en/11.jpg'),
    12: require('../assets/howto/en/12.jpg'),
    13: require('../assets/howto/en/13.jpg'),
  },
  ta: {
    1: require('../assets/howto/ta/1.jpg'),
    2: require('../assets/howto/ta/2.jpg'),
    3: require('../assets/howto/ta/3.jpg'),
    4: require('../assets/howto/ta/4.jpg'),
    5: require('../assets/howto/ta/5.jpg'),
    6: require('../assets/howto/ta/6.jpg'),
    7: require('../assets/howto/ta/7.jpg'),
    8: require('../assets/howto/ta/8.jpg'),
    9: require('../assets/howto/ta/9.jpg'),
    10: require('../assets/howto/ta/10.jpg'),
    11: require('../assets/howto/ta/11.jpg'),
    12: require('../assets/howto/ta/12.jpg'),
    13: require('../assets/howto/ta/13.jpg'),
  },
};
export const HOWTO_RINGS: Partial<Record<string, Partial<Record<number, Ring>>>> = RINGS;
