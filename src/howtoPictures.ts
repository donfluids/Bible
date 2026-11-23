// Written by scripts/howto-shots.mjs: the How to use pictures and where each one's ring
// goes, per interface language. An app carries the pictures of its own languages only
// (metro.config.js puts a blank in place of the others).
import type { ImageSourcePropType } from 'react-native';
import RINGS from '../assets/howto/rings.json';

export type Ring = { left: number; top: number; width: number; height: number };
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
};
export const HOWTO_RINGS: Partial<Record<string, Partial<Record<number, Ring>>>> = RINGS;
