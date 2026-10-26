import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

/**
 * Safe loading and saving of the reader's own data (settings with bookmarks, highlights,
 * marks and notes; notebook pages), each kept as one JSON entry in the kv store.
 *
 * Nothing the reader made may be lost to a bad read:
 * - An entry that cannot be read at all (a storage error) gives the defaults, but the
 *   session does not write, so the stored data survives to the next launch.
 * - An entry that reads but cannot be parsed is kept under "<key>.corrupt.<time>", and
 *   the last good copy ("<key>.bak", refreshed at most daily) is used instead if there is one.
 * - A save that fails is reported, so the caller can try again and tell the reader.
 */

export interface Loaded<T> {
  value: T;
  /** False when the stored entry could not be read; then the session must not write. */
  writable: boolean;
  /** Where the value came from, for a one-time message to the reader. */
  source: 'stored' | 'new' | 'backup' | 'unreadable';
}

const DAY = 24 * 60 * 60 * 1000;

export function loadEntry<T>(key: string, parse: (raw: string) => T, fallback: T): Loaded<T> {
  let raw: string | null;
  try {
    raw = Storage.getItemSync(key);
  } catch {
    return { value: fallback, writable: false, source: 'unreadable' };
  }
  if (!raw) return { value: fallback, writable: true, source: 'new' };
  try {
    const value = parse(raw);
    keepBackup(key, raw);
    return { value, writable: true, source: 'stored' };
  } catch {
    // Keep the unreadable text, then fall back to the last good copy.
    try {
      Storage.setItemSync(`${key}.corrupt.${Date.now()}`, raw);
    } catch {
      return { value: fallback, writable: false, source: 'unreadable' };
    }
    try {
      const backup = Storage.getItemSync(`${key}.bak`);
      if (backup) return { value: parse(backup), writable: true, source: 'backup' };
    } catch {
      // No usable backup either.
    }
    return { value: fallback, writable: true, source: 'new' };
  }
}

/**
 * Refresh "<key>.bak" from a good entry, at most once a day. Written in the background so
 * it does not hold up the first page; the time is recorded only once the copy is in.
 */
/**
 * Entries larger than this (long handwritten pages) get no daily copy: Android backs up an
 * app's data only while it is under 25 MB, and copies of big pages would push it over,
 * leaving bookmarks and notes without a backup. The notebook's own backup file keeps them.
 */
const MAX_DAILY_COPY = 256 * 1024;

function keepBackup(key: string, raw: string): void {
  if (raw.length > MAX_DAILY_COPY) {
    Storage.removeItem(`${key}.bak`).catch(() => undefined);
    return;
  }
  try {
    const at = Number(Storage.getItemSync(`${key}.bak.time`) ?? 0);
    if (Date.now() - at < DAY) return;
  } catch {
    return;
  }
  Storage.setItem(`${key}.bak`, raw)
    .then(() => Storage.setItem(`${key}.bak.time`, String(Date.now())))
    .catch(() => undefined); // A missed backup is not worth stopping for.
}

/** Write an entry now. Returns false when the write failed. */
export function saveEntrySync(key: string, value: unknown): boolean {
  try {
    Storage.setItemSync(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Write an entry in the background. Resolves to false when the write failed. */
export function saveEntry(key: string, value: unknown): Promise<boolean> {
  let json: string;
  try {
    json = JSON.stringify(value);
  } catch {
    return Promise.resolve(false);
  }
  return Storage.setItem(key, json).then(
    () => true,
    () => false,
  );
}

/**
 * Keeps a value saved under `key`: a moment after each change, at once when the app
 * leaves the foreground (JavaScript timers stop in the background on Android), and again
 * after a failed write. `onFail` is called when a write fails.
 *
 * Returns `saveValue`, which writes a newer value at once, before it reaches state: for
 * typed text that has to be on disk when the app is left, whichever listener runs first.
 */
export function useAutosave<T>(key: string, value: T, writable: boolean, delay: number, onFail: () => void): (next: T) => void {
  const latest = useRef(value);
  latest.current = value;
  // Each change gets a number; `saved` is the newest one known to be on disk.
  const version = useRef(0);
  const saved = useRef(0);
  const syncedAt = useRef(0);
  const first = useRef(true);
  const failRef = useRef(onFail);
  failRef.current = onFail;

  const saveNow = useCallback(() => {
    if (!writable || saved.current === version.current) return;
    const v = version.current;
    if (saveEntrySync(key, latest.current)) {
      saved.current = v;
      syncedAt.current = v;
    } else failRef.current();
  }, [key, writable]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    version.current += 1;
    if (!writable) return;
    let timer: ReturnType<typeof setTimeout>;
    let wait = delay;
    const write = () => {
      const v = version.current;
      saveEntry(key, latest.current).then((ok) => {
        if (!ok) {
          failRef.current();
          // Try again, less often each time, until the next change takes over.
          if (v === version.current) {
            wait = Math.min(Math.max(wait * 2, 5000), 60000);
            timer = setTimeout(write, wait);
          }
          return;
        }
        saved.current = Math.max(saved.current, v);
        // An older background write that landed after a newer immediate one: write again.
        if (v < syncedAt.current) saveEntry(key, latest.current).catch(() => undefined);
      });
    };
    timer = setTimeout(write, delay);
    return () => clearTimeout(timer);
  }, [value, key, writable, delay]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') saveNow();
    });
    return () => sub.remove();
  }, [saveNow]);

  // A change still waiting when the provider goes (the error screen's "Try again"
  // remounts everything) is written before it is lost.
  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;
  useEffect(() => () => saveNowRef.current(), []);

  const saveValue = useCallback(
    (next: T) => {
      latest.current = next;
      version.current += 1;
      saveNow();
    },
    [saveNow],
  );

  return saveValue;
}
