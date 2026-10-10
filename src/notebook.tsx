import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import type { Edition } from './edition';

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
}

const NotebookContext = createContext<NotebookContextValue | null>(null);

function load(key: string): NotePage[] {
  try {
    const raw = Storage.getItemSync(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotePage[];
    return Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.id === 'string') : [];
  } catch {
    return [];
  }
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function NotebookProvider({ edition, children }: { edition: Edition; children: React.ReactNode }) {
  const key = `notebook.v1.${edition.id}`;
  const [pages, setPages] = useState<NotePage[]>(() => load(key));

  // Written a moment after a change, and at once when the app is left (as in settings.tsx).
  const latest = useRef(pages);
  latest.current = pages;
  const pending = useRef(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = true;
    const timer = setTimeout(() => {
      pending.current = false;
      Storage.setItem(key, JSON.stringify(pages)).catch(() => undefined);
    }, 500);
    return () => clearTimeout(timer);
  }, [pages, key]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' || !pending.current) return;
      pending.current = false;
      try {
        Storage.setItemSync(key, JSON.stringify(latest.current));
      } catch {
        // Best effort; the pages in memory still apply.
      }
    });
    return () => sub.remove();
  }, [key]);

  const create = useCallback((body = '') => {
    const now = Date.now();
    const id = newId();
    setPages((prev) => [{ id, title: '', body, created: now, updated: now }, ...prev]);
    return id;
  }, []);
  const edit = useCallback((id: string, patch: Partial<Pick<NotePage, 'title' | 'body'>>) => {
    setPages((prev) => {
      const found = prev.find((p) => p.id === id);
      if (!found) return prev;
      const next = { ...found, ...patch, updated: Date.now() };
      return [next, ...prev.filter((p) => p.id !== id)];
    });
  }, []);
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

  const value = useMemo(() => ({ pages, page, create, edit, remove, append }), [pages, page, create, edit, remove, append]);
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
