// Reading a saved card look back, kept apart so it can be tested without a phone
// (scripts/test-logic.mts). Types only are imported.
import type { CardLook, DesignId } from './cards';

/**
 * A saved look as stored, each field checked, so a damaged or altered file cannot point
 * the app at another file: `knownDesign` says whether a design exists, `ownPhoto` whether
 * an address is one of the app's own photo copies (src/cardLooks.ts).
 */
export function cleanLook(raw: Partial<CardLook>, knownDesign: (id: string) => boolean, ownPhoto: (uri: string) => boolean): CardLook | null {
  if (typeof raw.design !== 'string' || !knownDesign(raw.design)) return null;
  return {
    design: raw.design as DesignId,
    photo: typeof raw.photo === 'string' && ownPhoto(raw.photo) ? raw.photo : undefined,
    veil: raw.veil === 'dark' ? 'dark' : 'light',
    strength: raw.strength === 1 || raw.strength === 3 ? raw.strength : 2,
    blur: raw.blur === true,
    colour: typeof raw.colour === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw.colour) ? raw.colour : undefined,
    place: raw.place === 'top' || raw.place === 'bottom' ? raw.place : 'middle',
    plainFace: raw.plainFace === true,
    extras: raw.extras !== false,
  };
}

/** The app's own copy of a photo: a plain name straight inside the photo folder, nothing else. */
export function savedCopyIn(uri: string, photoDir: string): boolean {
  return uri.startsWith(photoDir) && /^[a-z0-9]{1,24}\.jpg$/.test(uri.slice(photoDir.length).replace(/^\//, ''));
}

/**
 * A photo a look may use: the app's own copy, or the picker's copy in the app's cache;
 * never a path with "..", a file anywhere else, nor a web or content address (a saved
 * look read back must not make the phone fetch anything). The web preview's picker gives a
 * blob: address, which is let through.
 */
export function ownPhotoIn(uri: string, photoDir: string, cacheDir: string): boolean {
  return !uri.includes('..') && (savedCopyIn(uri, photoDir) || uri.startsWith(cacheDir) || uri.startsWith('blob:'));
}
