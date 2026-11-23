// Written by scripts/howto-shots.mjs: the How to use pictures and where each one's ring
// goes, per interface language. An app carries the pictures of its own languages only
// (metro.config.js puts a blank in place of the others).
import type { ImageSourcePropType } from 'react-native';

export type Ring = { left: number; top: number; width: number; height: number };
export const HOWTO_PICTURES: Partial<Record<string, Partial<Record<number, ImageSourcePropType>>>> = {};
export const HOWTO_RINGS: Partial<Record<string, Partial<Record<number, Ring>>>> = {};
