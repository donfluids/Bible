import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Edition } from './edition';
import { loadEntry, useAutosave } from './persist';
import { tellLoadProblem, tellSaveFailed, useOptionalSettings } from './settings';

/**
 * The notebook (കുറിപ്പുകൾ): pages the reader writes, each with a title and free text in
 * which references such as "യോഹന്നാൻ 3:16" link to the verse. Pages are kept on the
 * phone in their own entry beside the settings, so typing on a long page does not rewrite
 * the bookmarks and highlights, and Android's backup takes them along with the rest.
 */
export interface NotePage {
  id: string;
  title: string;
  body: string;
  created: number;
  updated: number;
}

interface NotebookContextValue {
  /** Newest edited first. */
  pages: NotePage[];
  page: (id: string) => NotePage | undefined;
  /** Starts an empty page and returns its id. */
  create: (body?: string) => string;
  edit: (id: string, patch: Partial<Pick<NotePage, 'title' | 'body'>>) => void;
  remove: (id: string) => void;
  /** Adds a line to the end of a page. */
  append: (id: string, line: string) => void;
  /** Like edit, and written to the phone at once: for typed text when the app is left. */
  commit: (id: string, patch: Partial<Pick<NotePage, 'title' | 'body'>>) => void;
}

const NotebookContext = createContext<NotebookContextValue | null>(null);

const isBlank = (p: NotePage) => !p.title.trim() && !p.body.trim();

/** Stored pages, checked; a page left with nothing on it (the app closed on a new page) is dropped. */
function parse(raw: string): NotePage[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('notebook is not a list');
  return parsed
    .filter((p): p is NotePage => !!p && typeof p.id === 'string')
    .map((p) => ({ ...p, title: typeof p.title === 'string' ? p.title : '', body: typeof p.body === 'string' ? p.body : '' }))
    .filter((p) => !isBlank(p));
}

function applyEdit(pages: NotePage[], id: string, patch: Partial<Pick<NotePage, 'title' | 'body'>>): NotePage[] {
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
  const language = useOptionalSettings()?.language ?? edition.languages[0];
  const languageRef = useRef(language);
  languageRef.current = language;
  useEffect(() => tellLoadProblem(languageRef.current, loaded.source), [loaded]);
  // Written a moment after a change, and at once when the app is left (as the settings are).
  const saveValue = useAutosave(key, pages, loaded.writable, 500, () => tellSaveFailed(languageRef.current));

  const create = useCallback((body = '') => {
    const now = Date.now();
    const id = newId();
    setPages((prev) => [{ id, title: '', body, created: now, updated: now }, ...prev]);
    return id;
  }, []);
  const edit = useCallback((id: string, patch: Partial<Pick<NotePage, 'title' | 'body'>>) => setPages((prev) => applyEdit(prev, id, patch)), []);
  const commit = useCallback(
    (id: string, patch: Partial<Pick<NotePage, 'title' | 'body'>>) => {
      const next = applyEdit(latest.current, id, patch);
      if (next === latest.current) return;
      latest.current = next;
      saveValue(next);
      setPages((prev) => applyEdit(prev, id, patch));
    },
    [saveValue],
  );
  const remove = useCallback((id: string) => setPages((prev) => prev.filter((p) => p.id !== id)), []);
  const append = useCallback((id: string, line: string) => {
    setPages((prev) => {
      const found = prev.find((p) => p.id === id);
      if (!found) return prev;
      const body = found.body.trim() ? `${found.body.replace(/\s+$/, '')}\n${line}` : line;
      return [{ ...found, body, updated: Date.now() }, ...prev.filter((p) => p.id !== id)];
    });
  }, []);
  const page = useCallback((id: string) => latest.current.find((p) => p.id === id), []);

  const value = useMemo(() => ({ pages, page, create, edit, remove, append, commit }), [pages, page, create, edit, remove, append, commit]);
  return <NotebookContext.Provider value={value}>{children}</NotebookContext.Provider>;
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
  const line = p.body.split('\n').find((l) => l.trim());
  return line ? line.trim().slice(0, 60) : untitled;
}
