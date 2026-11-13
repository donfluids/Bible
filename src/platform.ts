import { PixelRatio, Platform } from 'react-native';

/**
 * Whether to draw the iPhone look (centred titles, the iPhone back chevron). On iPhone,
 * always; in the web build, when the address has ?ios, so the App Store screenshots can be
 * made from it.
 */
/**
 * Runs something that opens one of the phone's own sheets (share, a file picker) once a
 * sheet of the app's has closed. On iPhone a system sheet opened in the same moment is
 * taken down with the closing one; a short wait lets the closing finish.
 */
export function afterSheet(open: () => void): void {
  if (Platform.OS === 'ios') setTimeout(open, 450);
  else open();
}

/**
 * The size to ask a picture of a view for, to get one `pixels` across: on iPhone the
 * capture counts in points and draws at the screen's scale, on Android in pixels.
 */
export function captureSize(pixels: number): number {
  return Platform.OS === 'ios' ? Math.round(pixels / PixelRatio.get()) : Math.round(pixels);
}

export const IPHONE_LOOK =
  Platform.OS === 'ios' || (Platform.OS === 'web' && typeof window !== 'undefined' && /[?&]ios(?:[=&]|$)/.test(window.location.search));
