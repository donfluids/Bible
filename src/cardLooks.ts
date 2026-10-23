// The sender's own card looks ("Save as my design") and the photos they use. A photo is
// picked with the phone's own picker, so the app sees only that one picture and asks for
// no permission to the gallery. While a card is being made the picker's copy is used; a
// saved look keeps its own copy in the app's files (card-photos/), which Android's backup
// leaves out (plugins/withBackupRules.js), so a look restored on a new phone may come back
// without its photo and is then drawn with its design's colours.
import { useCallback, useRef, useState } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { DESIGNS } from './cards';
import type { CardLook, CardSize } from './cards';
import { loadEntry, useAutosave } from './persist';

export interface SavedLook {
  id: string;
  look: CardLook;
}

/** At most this many saved looks; a new one beyond it replaces the oldest. */
const MAX_LOOKS = 12;

const photoDir = () => new Directory(Paths.document, 'card-photos');
/** The app's own copy of a photo: a plain name straight inside card-photos/, nothing else. */
const isSavedCopy = (uri: string) => uri.startsWith(photoDir().uri) && /^[a-z0-9]{1,24}\.jpg$/.test(uri.slice(photoDir().uri.length).replace(/^\//, ''));
/** A photo a look may use: the app's copy, or the picker's copy in the app's cache (no "..", no other place). */
const isOwnPhoto = (uri: string) => !uri.includes('..') && (isSavedCopy(uri) || uri.startsWith(Paths.cache.uri) || !uri.startsWith('file:'));

/** The photo still there (a restored look may have lost it). */
export function photoExists(uri: string | undefined): boolean {
  if (!uri) return false;
  // Only a file on the phone can go missing; the web preview's picker gives a blob: address.
  if (!uri.startsWith('file:')) return true;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/** Opens the phone's photo picker; the chosen photo's address, or null if none was chosen. */
export async function pickPhoto(size: CardSize): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    // The crop frame matches the card; on iPhone the picker crops square only.
    aspect: size === 'tall' ? [9, 16] : [1, 1],
    quality: 0.85,
    exif: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

/** A saved look as stored, each field checked, so a damaged or altered file cannot point the app elsewhere. */
function cleanLook(raw: Partial<CardLook>): CardLook | null {
  if (!DESIGNS.some((d) => d.id === raw.design)) return null;
  return {
    design: raw.design!,
    // Only the app's own copies (card-photos/<id>.jpg) or, failing a copy, the picker's.
    photo: typeof raw.photo === 'string' && isOwnPhoto(raw.photo) ? raw.photo : undefined,
    veil: raw.veil === 'dark' ? 'dark' : 'light',
    strength: raw.strength === 1 || raw.strength === 3 ? raw.strength : 2,
    blur: raw.blur === true,
    colour: typeof raw.colour === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw.colour) ? raw.colour : undefined,
    place: raw.place === 'top' || raw.place === 'bottom' ? raw.place : 'middle',
    plainFace: raw.plainFace === true,
    extras: raw.extras !== false,
  };
}

function parse(raw: string): SavedLook[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('card looks are not a list');
  const out: SavedLook[] = [];
  for (const s of parsed.slice(0, MAX_LOOKS)) {
    if (!s || typeof s.id !== 'string' || !/^[a-z0-9]{1,24}$/.test(s.id) || !s.look || typeof s.look !== 'object') continue;
    const look = cleanLook(s.look);
    if (look) out.push({ id: s.id, look });
  }
  return out;
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The saved looks of this app, with save and remove. */
export function useSavedLooks(editionId: string, onFail: () => void) {
  const key = `cardLooks.v1.${editionId}`;
  const [loaded] = useState(() => loadEntry(key, parse, [] as SavedLook[]));
  const [looks, setLooks] = useState<SavedLook[]>(loaded.value);
  const latest = useRef(looks);
  latest.current = looks;
  const saveValue = useAutosave(key, looks, loaded.writable, 300, onFail);

  const commit = useCallback(
    (next: SavedLook[]) => {
      latest.current = next;
      saveValue(next);
      setLooks(next);
    },
    [saveValue],
  );

  /** Keeps a look, with its own copy of the photo; returns the saved look. */
  const save = useCallback(
    (look: CardLook): SavedLook => {
      const id = newId();
      let photo = look.photo;
      if (photo && photo.startsWith('file:') && !photo.startsWith(photoDir().uri)) {
        try {
          const dir = photoDir();
          if (!dir.exists) dir.create({ intermediates: true });
          const copy = new File(dir, `${id}.jpg`);
          new File(photo).copy(copy);
          photo = copy.uri;
        } catch {
          // Saved with the picker's copy; it lasts until the phone clears the app's cache.
        }
      }
      const saved = { id, look: { ...look, photo } };
      const kept = [saved, ...latest.current];
      for (const old of kept.slice(MAX_LOOKS)) deletePhoto(old.look.photo, kept.slice(0, MAX_LOOKS));
      commit(kept.slice(0, MAX_LOOKS));
      return saved;
    },
    [commit],
  );

  const remove = useCallback(
    (id: string) => {
      const gone = latest.current.find((s) => s.id === id);
      const rest = latest.current.filter((s) => s.id !== id);
      deletePhoto(gone?.look.photo, rest);
      commit(rest);
    },
    [commit],
  );

  return { looks, save, remove };
}

/** Deletes a saved photo copy that no other look still uses. */
function deletePhoto(uri: string | undefined, others: SavedLook[]): void {
  if (!uri || !isSavedCopy(uri) || others.some((s) => s.look.photo === uri)) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // A file that cannot be removed is left; it does no harm.
  }
}
