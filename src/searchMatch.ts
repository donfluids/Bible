// Where a search matched in a verse. No runtime imports beyond the search patterns, so
// scripts/test-logic.mts can check it.
import { hindiPattern } from './hindiSearch';
import { malayalamPattern } from './malayalamSearch';

/**
 * Character ranges of `query` inside `text`, for marking search results: ignoring case and
 * apostrophe style, and Malayalam and Hindi spelling variants as their searches do.
 */
export function matchRanges(text: string, query: string): [number, number][] {
  const pattern = malayalamPattern(query) ?? hindiPattern(query);
  if (pattern) {
    const re = new RegExp(pattern.source, 'g');
    return [...text.matchAll(re)].filter((m) => m[0]).map((m) => [m.index, m.index + m[0].length]);
  }
  const q = query.trim().replace(/\s+/g, ' ').toLowerCase().replace(/[’‘]/g, "'");
  if (!q) return [];
  const t = text.toLowerCase().replace(/[’‘]/g, "'");
  if (t.length !== text.length) return []; // case folding changed lengths; skip rather than mis-highlight
  const out: [number, number][] = [];
  let i = t.indexOf(q);
  while (i >= 0) {
    out.push([i, i + q.length]);
    i = t.indexOf(q, i + q.length);
  }
  return out;
}
