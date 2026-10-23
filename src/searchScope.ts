// The order and the filters of search results, kept apart so they can be tested without
// a phone (scripts/test-logic.mts). Types only are imported.
import type { Ref } from './types';

/** Which matches are listed: all, one Testament or one book. */
export type Scope = 'all' | 'OT' | 'NT' | number;

/** The matches with the New Testament's first, each part in book order. */
export function newTestamentFirst(refs: Ref[], testament: Map<number, 'OT' | 'NT'>): Ref[] {
  return [...refs.filter((r) => testament.get(r.book) === 'NT'), ...refs.filter((r) => testament.get(r.book) !== 'NT')];
}

export function refInScope(r: Ref, scope: Scope, testament: Map<number, 'OT' | 'NT'>): boolean {
  return scope === 'all' || (typeof scope === 'number' ? r.book === scope : testament.get(r.book) === scope);
}

/**
 * The filter buttons above the results, with their counts: all; each Testament, when the
 * matches are in both; and the books with most matches (at most `books`), when in more
 * than one. None for fewer than two matches.
 */
export function scopeCounts(matches: Ref[], testament: Map<number, 'OT' | 'NT'>, books = 8): { scope: Scope; n: number }[] {
  if (matches.length < 2) return [];
  const perBook = new Map<number, number>();
  for (const r of matches) perBook.set(r.book, (perBook.get(r.book) ?? 0) + 1);
  const nt = matches.filter((r) => testament.get(r.book) === 'NT').length;
  const list: { scope: Scope; n: number }[] = [{ scope: 'all', n: matches.length }];
  if (nt > 0 && nt < matches.length) list.push({ scope: 'NT', n: nt }, { scope: 'OT', n: matches.length - nt });
  if (perBook.size > 1) for (const [book, n] of [...perBook].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, books)) list.push({ scope: book, n });
  return list;
}
