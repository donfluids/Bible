// Written by scripts/welcome-shots.mjs: the welcome's pictures and where each one's ring
// goes, per app and interface language. An app carries its own sets only (metro.config.js
// puts a blank in place of the others).
import type { ImageSourcePropType } from 'react-native';
import SHAPES from '../assets/welcome/pictures.json';

export type WelcomePictureName = 'word' | 'original' | 'study' | 'saved' | 'notebook' | 'share';
export type WelcomeRing = { left: number; top: number; width: number; height: number };
/** Each picture's width over its height, and its ring. */
export const WELCOME_SHAPES: Partial<Record<string, Partial<Record<WelcomePictureName, { shape: number; ring: WelcomeRing | null }>>>> = SHAPES;
export const WELCOME_PICTURES: Partial<Record<string, Partial<Record<WelcomePictureName, ImageSourcePropType>>>> = {
  'all-hi': {
    word: require('../assets/welcome/all-hi/word.jpg'),
    original: require('../assets/welcome/all-hi/original.jpg'),
    study: require('../assets/welcome/all-hi/study.jpg'),
    saved: require('../assets/welcome/all-hi/saved.jpg'),
    notebook: require('../assets/welcome/all-hi/notebook.jpg'),
    share: require('../assets/welcome/all-hi/share.jpg'),
  },
  'all-ml': {
    word: require('../assets/welcome/all-ml/word.jpg'),
    original: require('../assets/welcome/all-ml/original.jpg'),
    study: require('../assets/welcome/all-ml/study.jpg'),
    saved: require('../assets/welcome/all-ml/saved.jpg'),
    notebook: require('../assets/welcome/all-ml/notebook.jpg'),
    share: require('../assets/welcome/all-ml/share.jpg'),
  },
  'all-ta': {
    word: require('../assets/welcome/all-ta/word.jpg'),
    original: require('../assets/welcome/all-ta/original.jpg'),
    study: require('../assets/welcome/all-ta/study.jpg'),
    saved: require('../assets/welcome/all-ta/saved.jpg'),
    notebook: require('../assets/welcome/all-ta/notebook.jpg'),
    share: require('../assets/welcome/all-ta/share.jpg'),
  },
  'en-en': {
    word: require('../assets/welcome/en-en/word.jpg'),
    original: require('../assets/welcome/en-en/original.jpg'),
    study: require('../assets/welcome/en-en/study.jpg'),
    saved: require('../assets/welcome/en-en/saved.jpg'),
    notebook: require('../assets/welcome/en-en/notebook.jpg'),
    share: require('../assets/welcome/en-en/share.jpg'),
  },
  'ml-en': {
    word: require('../assets/welcome/ml-en/word.jpg'),
    original: require('../assets/welcome/ml-en/original.jpg'),
    study: require('../assets/welcome/ml-en/study.jpg'),
    saved: require('../assets/welcome/ml-en/saved.jpg'),
    notebook: require('../assets/welcome/ml-en/notebook.jpg'),
    share: require('../assets/welcome/ml-en/share.jpg'),
  },
  'ml-ml': {
    word: require('../assets/welcome/ml-ml/word.jpg'),
    original: require('../assets/welcome/ml-ml/original.jpg'),
    study: require('../assets/welcome/ml-ml/study.jpg'),
    saved: require('../assets/welcome/ml-ml/saved.jpg'),
    notebook: require('../assets/welcome/ml-ml/notebook.jpg'),
    share: require('../assets/welcome/ml-ml/share.jpg'),
  },
  'ta-en': {
    word: require('../assets/welcome/ta-en/word.jpg'),
    original: require('../assets/welcome/ta-en/original.jpg'),
    study: require('../assets/welcome/ta-en/study.jpg'),
    saved: require('../assets/welcome/ta-en/saved.jpg'),
    notebook: require('../assets/welcome/ta-en/notebook.jpg'),
    share: require('../assets/welcome/ta-en/share.jpg'),
  },
  'ta-ta': {
    word: require('../assets/welcome/ta-ta/word.jpg'),
    original: require('../assets/welcome/ta-ta/original.jpg'),
    study: require('../assets/welcome/ta-ta/study.jpg'),
    saved: require('../assets/welcome/ta-ta/saved.jpg'),
    notebook: require('../assets/welcome/ta-ta/notebook.jpg'),
    share: require('../assets/welcome/ta-ta/share.jpg'),
  },
};
