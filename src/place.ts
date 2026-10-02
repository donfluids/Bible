import { useCallback, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import type { Edition } from './edition';

/** Where the main reader is. */
export interface Position {
  book: number;
  chapter: number;
  /** The first verse on screen when the reader left, to reopen there. */
  verse?: number;
}

export interface Place {
  position: Position;
  /** Chapters read most recently, newest first. */
  recent: { book: number; chapter: number }[];
  /** Last chapter visited in each book, keyed by book id, for the chapter picker. */
  lastChapters: Record<string, number>;
}

const DEFAULT: Place = { position: { book: 43, chapter: 1 }, recent: [], lastChapters: {} };

/**
 * The reading place changes on every page turn and whenever scrolling stops on a new
 * verse, so it is kept apart from the settings: a change here redraws only what reads
 * the part that changed, and is written to storage in the background, once, a moment
 * later (or when the app goes to the background).
 */
let key = '';
let place: Place = DEFAULT;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): Partial<Place> | null {
  try {
    return raw ? (JSON.parse(raw) as Partial<Place>) : null;
  } catch {
    return null;
  }
}

/** Load the place for this edition; the first time, take it from the older settings record. */
export function initPlace(edition: Edition): void {
  if (key === `place.v1.${edition.id}`) return;
  key = `place.v1.${edition.id}`;
  let stored: Partial<Place> | null = null;
  try {
    stored = parse(Storage.getItemSync(key)) ?? parse(Storage.getItemSync(`settings.v1.${edition.id}`));
  } catch {
    stored = null;
  }
  const position = stored?.position;
  place = {
    position: position && Number.isInteger(position.book) && Number.isInteger(position.chapter) ? position : DEFAULT.position,
    recent: Array.isArray(stored?.recent) ? stored!.recent : [],
    lastChapters: stored?.lastChapters && typeof stored.lastChapters === 'object' ? stored.lastChapters : {},
  };
}

function write(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!key) return;
  Storage.setItem(key, JSON.stringify(place)).catch(() => undefined);
}

AppState.addEventListener('change', (state) => {
  if (state !== 'active' && timer) write();
});

export function getPlace(): Place {
  return place;
}

export function updatePlace(patch: Partial<Place>): void {
  place = { ...place, ...patch };
  for (const l of listeners) l();
  if (timer) clearTimeout(timer);
  timer = setTimeout(write, 500);
}

/** Move the main reader to a chapter, remembering it as the last one read in its book. */
export function moveMainReader(position: Position): void {
  updatePlace({ position, lastChapters: { ...place.lastChapters, [position.book]: position.chapter } });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Part of the place; the component redraws only when that part changes. */
export function usePlace<T>(select: (p: Place) => T): T {
  const get = useCallback(() => select(place), [select]);
  return useSyncExternalStore(subscribe, get, get);
}

export const selectBook = (p: Place) => p.position.book;
export const selectChapter = (p: Place) => p.position.chapter;
export const selectPosition = (p: Place) => p.position;
export const selectRecent = (p: Place) => p.recent;
export const selectLastChapters = (p: Place) => p.lastChapters;
