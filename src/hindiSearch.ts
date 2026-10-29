import { collapseWildcards } from './malayalamSearch';
import type { MalayalamPattern } from './malayalamSearch';

/** At most this many alternative patterns; past it, the open pattern alone is used. */
const MAX_ALTERNATIVES = 12;
const VIRAMA = '्';
const ZWJ = '‍';

/** The nasal letter of each stop's group: the IRV writes मन्दिर where keyboards give मंदिर. */
const NASAL_OF: Record<string, string> = {};
for (const [nasal, stops] of [['ङ', 'कखगघ'], ['ञ', 'चछजझ'], ['ण', 'टठडढ'], ['न', 'तथदध'], ['म', 'पफबभ']] as const) {
  for (const s of stops) NASAL_OF[s] = nasal;
}

/**
 * Hindi search that matches everyday spelling. The IRV writes chandrabindu (मुँह) where
 * phone keyboards often give anusvara (मुंह), and a half nasal before a letter of its group
 * (मन्दिर, परन्तु, आनन्द, सम्बन्ध) where most people type the dot (मंदिर, परंतु, आनंद,
 * संबंध); it keeps the nukta as a separate sign (पड़), and puts a zero-width joiner inside a
 * few words (वेश्‍या). These count as the same:
 *
 * - ँ and ं;
 * - ं before a stop and the nasal of the stop's group with a virama (ंद and न्द), both ways;
 * - a letter that can take a nukta (क ख ग ज ड ढ फ) with or without it, and the
 *   precomposed letters some keyboards type (ड़ as one character);
 * - a virama with or without a zero-width joiner after it.
 *
 * As in English search, a word is matched as typed: यीशु does not find यीशु's other forms.
 * Returns null for a query without Devanagari. scripts/test-logic.mts checks it.
 */
export function hindiPattern(query: string): MalayalamPattern | null {
  // Precomposed nukta letters into letter + nukta; then the signs that vary are dropped.
  const q = query.normalize('NFD').replace(/[‌‍़]/g, '').trim().replace(/\s+/g, ' ');
  if (!/[ऀ-ॿ]/.test(q)) return null;
  const chars = [...q];
  let source = '';
  let like = '%';
  let alternatives: string[] | null = ['%'];
  // Each alternative goes on with each of the given continuations.
  const branch = (options: string[]) => {
    if (!alternatives) return;
    const next: string[] = [];
    for (const a of alternatives) for (const o of options) next.push(a + o);
    alternatives = next.length > MAX_ALTERNATIVES ? null : next;
  };
  const loose = () => {
    if (!like.endsWith('%')) like += '%';
  };
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const nasal = NASAL_OF[chars[i + 1]];
    if ((c === 'ँ' || c === 'ं') && nasal) {
      source += `(?:[ँं]|${nasal}${VIRAMA}${ZWJ}?)`;
      loose();
      branch(['ं', 'ँ', `${nasal}${VIRAMA}%`]);
    } else if (c === 'ँ' || c === 'ं') {
      source += '[ँं]';
      like += '_';
      branch(['_']);
    } else if (chars[i + 1] === VIRAMA && NASAL_OF[chars[i + 2]] === c) {
      source += `(?:${c}${VIRAMA}${ZWJ}?|[ँं])`;
      loose();
      branch([`${c}${VIRAMA}%`, 'ं', 'ँ']);
      i++;
    } else if (/[कखगजडढफ]/.test(c)) {
      source += `${c}़?`;
      like += c;
      loose();
      branch([c, `${c}़`]);
    } else if (c === VIRAMA) {
      source += `${VIRAMA}${ZWJ}?`;
      like += c;
      loose();
      branch([VIRAMA, `${VIRAMA}${ZWJ}`]);
    } else {
      source += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escaped = c.replace(/[\\%_]/g, (m) => '\\' + m);
      like += escaped;
      branch([escaped]);
    }
  }
  loose();
  const alts: string[] = alternatives ?? [];
  // One alternative is no tighter than the open pattern.
  return { source, like, alternatives: alts.length > 1 ? alts.map((a) => collapseWildcards(a + '%')) : [] };
}
