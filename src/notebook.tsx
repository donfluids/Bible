import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import type { Edition } from './edition';
import { inkKey } from './ink';
import type { Paper } from './ink';
import { loadEntry, useAutosave } from './persist';
import { tellLoadProblem, tellSaveFailed, useDisplaySettings } from './settings';

/**
 * The notebook (കുറിപ്പുകൾ): pages the reader writes, each with a title and free text in
 * which references such as "യോഹന്നാൻ 3:16" link to the verse. Pages are kept on the
 * phone in their own entry beside the settings, so typing on a long page does not rewrite
 * the bookmarks and highlights, and Android's backup takes them along with the rest.
 * A handwritten page (`ink`) keeps its strokes in an entry of its own (src/ink.ts); the
 * page here has its title, its paper and how many strokes it holds.
 */
export interface NotePage {
  id: string;
  title: string;
  body: string;
  created: number;
  updated: number;
  ink?: InkInfo;
}

export interface InkInfo {
  paper: Paper;
  strokes: number;
}

type PagePatch = Partial<Pick<NotePage, 'title' | 'body' | 'ink'>>;

interface NotebookContextValue {
  /** Newest edited first. */
  pages: NotePage[];
  page: (id: string) => NotePage | undefined;
  /** Starts an empty page, typed or (with a paper) handwritten, and returns its id. */
  create: (body?: string, paper?: Paper) => string;
  edit: (id: string, patch: PagePatch) => void;
  remove: (id: string) => void;
  /** Adds a line to the end of a page. */
  append: (id: string, line: string) => void;
  /** Like edit, and written to the phone at once: for typed text when the app is left. */
  commit: (id: string, patch: PagePatch) => void;
  /** The whole notebook replaced (by a restore that has merged a backup in), written at once. */
  replaceAll: (pages: NotePage[]) => void;
}

const NotebookContext = createContext<NotebookContextValue | null>(null);

const isBlank = (p: NotePage) => !p.title.trim() && !p.body.trim() && !(p.ink && p.ink.strokes > 0);

const cleanInkInfo = (ink: unknown): InkInfo | undefined => {
  if (!ink || typeof ink !== 'object') return undefined;
  const { paper, strokes } = ink as { paper?: unknown; strokes?: unknown };
  return { paper: paper === 'lined' ? 'lined' : 'plain', strokes: typeof strokes === 'number' && strokes >= 0 ? Math.floor(strokes) : 0 };
};

/** Stored pages, checked; a page left with nothing on it (the app closed on a new page) is dropped. */
function parse(raw: string): NotePage[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('notebook is not a list');
  return parsed
    .filter((p): p is NotePage => !!p && typeof p.id === 'string')
    .map((p) => {
      const page: NotePage = { ...p, title: typeof p.title === 'string' ? p.title : '', body: typeof p.body === 'string' ? p.body : '' };
      const ink = cleanInkInfo(p.ink);
      if (ink) page.ink = ink;
      else delete page.ink;
      return page;
    })
    .filter((p) => !isBlank(p));
}

function applyEdit(pages: NotePage[], id: string, patch: PagePatch): NotePage[] {
  const found = pages.find((p) => p.id === id);
  if (!found) return pages;
  const next = { ...found, ...patch, updated: Date.now() };
  return [next, ...pages.filter((p) => p.id !== id)];
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function NotebookProvider({ edition, children }: { edition: Edition; children: React.ReactNode }) {
  const key = `notebook.v1.${edition.id}`;
  const [loaded] = useState(() => loadEntry(key, parse, [] as NotePage[]));
  const [pages, setPages] = useState<NotePage[]>(loaded.value);
  const latest = useRef(pages);
  latest.current = pages;
  const language = useDisplaySettings()?.language ?? edition.languages[0];
  const languageRef = useRef(language);
  languageRef.current = language;
  useEffect(() => tellLoadProblem(languageRef.current, loaded.source), [loaded]);
  // Written a moment after a change, and at once when the app is left (as the settings are).
  const saveValue = useAutosave(key, pages, loaded.writable, 500, () => tellSaveFailed(languageRef.current));

  const create = useCallback((body = '', paper?: Paper) => {
    const now = Date.now();
    const id = newId();
    const page: NotePage = { id, title: '', body, created: now, updated: now };
    if (paper) page.ink = { paper, strokes: 0 };
    setPages((prev) => [page, ...prev]);
    return id;
  }, []);
  const edit = useCallback((id: string, patch: PagePatch) => setPages((prev) => applyEdit(prev, id, patch)), []);
  const commit = useCallback(
    (id: string, patch: PagePatch) => {
      const next = applyEdit(latest.current, id, patch);
      if (next === latest.current) return;
      latest.current = next;
      saveValue(next);
      setPages((prev) => applyEdit(prev, id, patch));
    },
    [saveValue],
  );
  const remove = useCallback(
    (id: string) => {
      setPages((prev) => prev.filter((p) => p.id !== id));
      removeInk(edition.id, id);
    },
    [edition.id],
  );
  const append = useCallback((id: string, line: string) => {
    setPages((prev) => {
      const found = prev.find((p) => p.id === id);
      if (!found) return prev;
      const body = found.body.trim() ? `${found.body.replace(/\s+$/, '')}\n${line}` : line;
      return [{ ...found, body, updated: Date.now() }, ...prev.filter((p) => p.id !== id)];
    });
  }, []);
  const page = useCallback((id: string) => latest.current.find((p) => p.id === id), []);
  const replaceAll = useCallback(
    (next: NotePage[]) => {
      latest.current = next;
      saveValue(next);
      setPages(next);
    },
    [saveValue],
  );

  const value = useMemo(() => ({ pages, page, create, edit, remove, append, commit, replaceAll }), [pages, page, create, edit, remove, append, commit, replaceAll]);
  return <NotebookContext.Provider value={value}>{children}</NotebookContext.Provider>;
}

/** A handwritten page's strokes and their backup copy, taken off the phone with the page. */
function removeInk(edition: string, pageId: string): void {
  const key = inkKey(edition, pageId);
  for (const k of [key, `${key}.bak`, `${key}.bak.time`]) Storage.removeItem(k).catch(() => undefined);
}

export function useNotebook(): NotebookContextValue {
  const ctx = useContext(NotebookContext);
  if (!ctx) throw new Error('useNotebook must be used inside NotebookProvider');
  return ctx;
}

/** A page's name in lists: its title, else its first line. */
export function pageName(p: NotePage, untitled: string): string {
  const title = p.title.trim();
  if (title) return title;
  if (p.ink) return untitled;
  const line = p.body.split('\n').find((l) => l.trim());
  return line ? line.trim().slice(0, 60) : untitled;
}
