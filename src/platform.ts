import { Platform } from 'react-native';

/**
 * Whether to draw the iPhone look (centred titles, the iPhone back chevron). On iPhone,
 * always; in the web build, when the address has ?ios, so the App Store screenshots can be
 * made from it.
 */
export const IPHONE_LOOK =
  Platform.OS === 'ios' || (Platform.OS === 'web' && typeof window !== 'undefined' && /[?&]ios(?:[=&]|$)/.test(window.location.search));
