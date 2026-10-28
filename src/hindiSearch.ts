import type { MalayalamPattern } from './malayalamSearch';

/**
 * Hindi search that matches everyday spelling. The IRV writes chandrabindu (मुँह) where
 * phone keyboards often give anusvara (मुंह), keeps the nukta as a separate sign (पड़), and
 * puts a zero-width joiner inside a few words (वेश्‍या). These count as the same:
 *
 * - ँ and ं;
 * - a letter that can take a nukta (क ख ग ज ड ढ फ) with or without it, and the
 *   precomposed letters some keyboards type (ड़ as one character);
 * - a virama with or without a zero-width joiner after it.
 *
 * As in English search, a word is matched as typed: यीशु does not find यीशु's other forms.
 * Returns null for a query without Devanagari. No runtime imports, so scripts can test it.
 */
export function hindiPattern(query: string): MalayalamPattern | null {
  // Precomposed nukta letters into letter + nukta; then the signs that vary are dropped.
  const q = query.normalize('NFD').replace(/[‌‍़]/g, '').trim().replace(/\s+/g, ' ');
  if (!/[ऀ-ॿ]/.test(q)) return null;
  let source = '';
  let like = '%';
  const loose = () => {
    if (!like.endsWith('%')) like += '%';
  };
  for (const c of q) {
    if (c === 'ँ' || c === 'ं') {
      source += '[ँं]';
      like += '_';
    } else if (/[कखगजडढफ]/.test(c)) {
      source += `${c}़?`;
      like += c;
      loose();
    } else if (c === '्') {
      source += '्‍?';
      like += c;
      loose();
    } else {
      source += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      like += c.replace(/[\\%_]/g, (m) => '\\' + m);
    }
  }
  loose();
  return { source, like, alternatives: [] };
}
