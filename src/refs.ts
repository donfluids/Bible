import type { Book, Ref, TranslationId } from './types';

/**
 * Common ways people type book names, mapped to book ids. Full names and any
 * unambiguous prefix of a full name are also accepted by parseReference.
 */
const ABBREVIATIONS: Record<string, number> = {
  gen: 1, ge: 1, gn: 1, exo: 2, ex: 2, exod: 2, lev: 3, le: 3, lv: 3, num: 4, nu: 4, nm: 4, nb: 4, deu: 5, deut: 5, dt: 5, de: 5,
  jos: 6, josh: 6, jsh: 6, jdg: 7, judg: 7, jg: 7, jdgs: 7, rut: 8, ru: 8, rth: 8,
  '1sa': 9, '1sam': 9, '1sm': 9, '1s': 9, '2sa': 10, '2sam': 10, '2sm': 10, '2s': 10,
  '1ki': 11, '1kgs': 11, '1kg': 11, '1k': 11, '2ki': 12, '2kgs': 12, '2kg': 12, '2k': 12,
  '1ch': 13, '1chr': 13, '1chron': 13, '2ch': 14, '2chr': 14, '2chron': 14,
  ezr: 15, ezra: 15, neh: 16, ne: 16, est: 17, esth: 17, es: 17, job: 18, jb: 18,
  psa: 19, ps: 19, pss: 19, psalm: 19, psalms: 19, psm: 19, pro: 20, prov: 20, pr: 20, prv: 20,
  ecc: 21, eccl: 21, ec: 21, qoh: 21, sng: 22, song: 22, sos: 22, so: 22, ss: 22, canticles: 22, cant: 22,
  isa: 23, is: 23, jer: 24, je: 24, jr: 24, lam: 25, la: 25, ezk: 26, ezek: 26, eze: 26, dan: 27, da: 27, dn: 27,
  hos: 28, ho: 28, jol: 29, joel: 29, jl: 29, amo: 30, amos: 30, am: 30, oba: 31, obad: 31, ob: 31,
  jon: 32, jonah: 32, jnh: 32, mic: 33, mi: 33, nam: 34, nah: 34, na: 34, hab: 35, hb: 35, zep: 36, zeph: 36, zp: 36,
  hag: 37, hg: 37, zec: 38, zech: 38, zc: 38, mal: 39, ml: 39,
  mat: 40, matt: 40, mt: 40, mrk: 41, mark: 41, mk: 41, mr: 41, luk: 42, luke: 42, lk: 42, lu: 42,
  jhn: 43, john: 43, jn: 43, joh: 43, act: 44, acts: 44, ac: 44, rom: 45, ro: 45, rm: 45,
  '1co': 46, '1cor': 46, '1corinthians': 46, '2co': 47, '2cor': 47, '2corinthians': 47,
  gal: 48, ga: 48, eph: 49, ep: 49, php: 50, phil: 50, pp: 50, col: 51, co: 51,
  '1th': 52, '1thess': 52, '1thes': 52, '1ts': 52, '2th': 53, '2thess': 53, '2thes': 53, '2ts': 53,
  '1ti': 54, '1tim': 54, '1tm': 54, '2ti': 55, '2tim': 55, '2tm': 55, tit: 56, ti: 56,
  phm: 57, philem: 57, phlm: 57, heb: 58, he: 58, jas: 59, jam: 59, jm: 59,
  '1pe': 60, '1pet': 60, '1pt': 60, '1p': 60, '2pe': 61, '2pet': 61, '2pt': 61, '2p': 61,
  '1jn': 62, '1john': 62, '1jo': 62, '1j': 62, '2jn': 63, '2john': 63, '2jo': 63, '2j': 63, '3jn': 64, '3john': 64, '3jo': 64, '3j': 64,
  jud: 65, jude: 65, jd: 65, rev: 66, re: 66, rv: 66, apoc: 66,
};

export interface ParsedRef extends Ref {
  /** True when the input had no verse; `verse` is then 1. */
  chapterOnly: boolean;
}

/**
 * Parse references such as "John 3:16", "jn 3.16", "1 Cor 13", "Psalm 23",
 * "Song of Songs 2:1" or "Rev 22 21". Returns null when nothing matches or the
 * chapter is out of range for the book.
 */
export function parseReference(input: string, books: Book[], translation?: TranslationId): ParsedRef | null {
  const m = /^\s*([1-3]?\s*[^\d:.,]+?)\s*(\d{1,3})(?:\s*[:.,\s]\s*(\d{1,3}))?\s*$/i.exec(input.replace(/\s+/g, ' '));
  if (!m) return null;
  const typed = m[1].trim();
  const rawName = typed.toLowerCase().replace(/[^a-z0-9]/g, '');
  let id = rawName ? ABBREVIATIONS[rawName] : undefined;
  if (!id && translation) {
    // Book names in the translation's own language, e.g. Malayalam "യോഹന്നാൻ 3:16".
    const local = books.filter((b) => (b.names[translation] ?? '').replace(/\s+/g, '').startsWith(typed.replace(/\s+/g, '')));
    if (local.length === 1) id = local[0].id;
  }
  if (!id && !rawName) return null;
  if (!id) {
    const matches = books.filter((b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(rawName));
    if (matches.length === 1) id = matches[0].id;
    else if (matches.length > 1) {
      // "Jo" could be Job, Joel, John, Jonah, Joshua: prefer the exact-ish Gospel of John.
      const exact = matches.find((b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, '') === rawName);
      if (!exact) return null;
      id = exact.id;
    }
  }
  if (!id) return null;
  const book = books.find((b) => b.id === id);
  if (!book) return null;
  const chapter = Number(m[2]);
  if (chapter < 1 || chapter > book.chapters) return null;
  const verse = m[3] ? Number(m[3]) : 1;
  return { book: id, chapter, verse, chapterOnly: !m[3] };
}
