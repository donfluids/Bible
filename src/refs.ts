import type { Book, Ref, TranslationId } from './types';

/**
 * Short book names for the reader's top bar, used when the full name and the chapter
 * number do not fit beside the buttons ("2. തിമൊഥെയൊസ്" becomes "2 തിമൊ"). Indexed by
 * book id - 1. The Malayalam follow the 1910 spellings of the names; the English are the
 * usual abbreviations.
 */
export const MALAYALAM_SHORT_NAMES = [
  'ഉല്പ', 'പുറ', 'ലേവ്യ', 'സംഖ്യ', 'ആവ', 'യോശു', 'ന്യായ', 'രൂത്ത്', '1 ശമൂ', '2 ശമൂ',
  '1 രാജ', '2 രാജ', '1 ദിന', '2 ദിന', 'എസ്രാ', 'നെഹെ', 'എസ്ഥേ', 'ഇയ്യോ', 'സങ്കീ', 'സദൃ',
  'സഭാ', 'ഉത്ത', 'യെശ', 'യിരെ', 'വിലാ', 'യെഹെ', 'ദാനീ', 'ഹോശേ', 'യോവേ', 'ആമോ',
  'ഓബ', 'യോനാ', 'മീഖാ', 'നഹൂം', 'ഹബ', 'സെഫ', 'ഹഗ്ഗാ', 'സെഖ', 'മലാ', 'മത്താ',
  'മർക്കൊ', 'ലൂക്കൊ', 'യോഹ', 'പ്രവൃ', 'റോമ', '1 കൊരി', '2 കൊരി', 'ഗലാ', 'എഫെ', 'ഫിലി',
  'കൊലൊ', '1 തെസ്സ', '2 തെസ്സ', '1 തിമൊ', '2 തിമൊ', 'തീത്തൊ', 'ഫിലേ', 'എബ്രാ', 'യാക്കോ', '1 പത്രൊ',
  '2 പത്രൊ', '1 യോഹ', '2 യോഹ', '3 യോഹ', 'യൂദാ', 'വെളി',
];

/** The Tamil, from the IRV's own abbreviations (\toc3), with a space after the number. */
export const TAMIL_SHORT_NAMES = [
  'ஆதி', 'யாத்', 'லேவி', 'எண்', 'உபா', 'யோசு', 'நியா', 'ரூத்', '1 சாமு', '2 சாமு',
  '1 இராஜா', '2 இராஜா', '1 நாளா', '2 நாளா', 'எஸ்றா', 'நெகே', 'எஸ்தர்', 'யோபு', 'சங்', 'நீதி',
  'பிரச', 'உன்னத', 'ஏசா', 'எரே', 'புலம்', 'எசேக்', 'தானி', 'ஓசியா', 'யோவே', 'ஆமோ',
  'ஒபதி', 'யோனா', 'மீகா', 'நாகூ', 'ஆப', 'செப்ப', 'ஆகாய்', 'சகரி', 'மல்கி', 'மத்',
  'மாற்கு', 'லூக்', 'யோவா', 'அப்', 'ரோமர்', '1 கொரி', '2 கொரி', 'கலா', 'எபே', 'பிலி',
  'கொலோ', '1 தெச', '2 தெச', '1 தீமோ', '2 தீமோ', 'தீத்', 'பிலே', 'எபி', 'யாக்', '1 பேது',
  '2 பேது', '1 யோவா', '2 யோவா', '3 யோவா', 'யூதா', 'வெளி',
];

/** The Hindi, from the IRV's own abbreviations (\toc3) without their dots, with a space after the number. */
export const HINDI_SHORT_NAMES = [
  'उत्प', 'निर्ग', 'लैव्य', 'गिन', 'व्यव', 'यहो', 'न्याय', 'रूत', '1 शमू', '2 शमू',
  '1 राजा', '2 राजा', '1 इति', '2 इति', 'एज्रा', 'नहे', 'एस्ते', 'अय्यू', 'भज', 'नीति',
  'सभो', 'श्रेष्ठ', 'यशा', 'यिर्म', 'विला', 'यहे', 'दानि', 'होशे', 'योए', 'आमो',
  'ओब', 'योना', 'मीका', 'नहू', 'हब', 'सप', 'हाग्गै', 'जक', 'मला', 'मत्ती',
  'मर', 'लूका', 'यूह', 'प्रेरि', 'रोम', '1 कुरि', '2 कुरि', 'गला', 'इफि', 'फिलि',
  'कुलु', '1 थिस्स', '2 थिस्स', '1 तीमु', '2 तीमु', 'तीतु', 'फिले', 'इब्रा', 'याकू', '1 पत',
  '2 पत', '1 यूह', '2 यूह', '3 यूह', 'यहू', 'प्रका',
];

export const ENGLISH_SHORT_NAMES = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1 Sam', '2 Sam',
  '1 Kgs', '2 Kgs', '1 Chr', '2 Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov',
  'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos',
  'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal', 'Matt',
  'Mark', 'Luke', 'John', 'Acts', 'Rom', '1 Cor', '2 Cor', 'Gal', 'Eph', 'Phil',
  'Col', '1 Thess', '2 Thess', '1 Tim', '2 Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1 Pet',
  '2 Pet', '1 John', '2 John', '3 John', 'Jude', 'Rev',
];

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

/**
 * Other Malayalam names for books, beside the names in the Malayalam text: modern
 * spellings and the names used in the Catholic (POC) Bible. A number in front of a name
 * (1 ശമൂവേൽ) comes from the book, so names here have none.
 */
const MALAYALAM_NAMES: Record<number, string[]> = {
  3: ['ലേവ്യർ'], 5: ['നിയമാവർത്തനം', 'ആവർത്തനം'], 6: ['ജോഷ്വ'], 8: ['റൂത്ത്'],
  9: ['സാമുവൽ', 'സാമുവേൽ'], 10: ['സാമുവൽ', 'സാമുവേൽ'], 16: ['നെഹെമിയാ'], 17: ['എസ്തേർ'], 18: ['ജോബ്'],
  19: ['സങ്കീർത്തനം'], 20: ['സുഭാഷിതങ്ങൾ'], 21: ['സഭാപ്രസംഗകൻ'], 23: ['ഏശയ്യാ'], 24: ['ജറെമിയാ'],
  26: ['എസെക്കിയേൽ'], 27: ['ദാനിയേൽ'], 28: ['ഹോസിയാ'], 29: ['ജോയേൽ'], 31: ['ഒബാദിയാ'], 33: ['മിക്കാ'],
  34: ['നാഹും'], 35: ['ഹബക്കുക്ക്'], 36: ['സെഫാനിയാ'], 38: ['സഖറിയാ'], 39: ['മലാക്കി'], 42: ['ലൂക്കാ'],
  44: ['അപ്പൊസ്തലപ്രവൃത്തികൾ', 'പ്രവൃത്തികൾ', 'അപ്പസ്തോലന്മാരുടെ നടപടികൾ', 'നടപടികൾ'], 45: ['റോമാ'],
  46: ['കോറിന്തോസ്'], 47: ['കോറിന്തോസ്'], 48: ['ഗലാത്തിയാ'], 49: ['എഫേസോസ്'], 50: ['ഫിലിപ്പി'],
  51: ['കൊളോസോസ്', 'കൊളോസ്യർ'], 52: ['തെസലോനിക്കാ'], 53: ['തെസലോനിക്കാ'], 54: ['തിമോത്തേയോസ്', 'തിമോത്തിയോസ്'],
  55: ['തിമോത്തേയോസ്', 'തിമോത്തിയോസ്'], 58: ['ഹെബ്രായർ'], 65: ['യൂദാസ്'], 66: ['വെളിപാട്'],
};

/** Spellings people often write that the reduction below does not already meet. */
const MALAYALAM_VARIANTS: Record<number, string[]> = {
  3: ['ലേവ്യാ'], 20: ['സദൃശ്യവാക്യങ്ങൾ'], 24: ['യിരമ്യാവ്'], 26: ['യെഹസ്കേൽ'], 41: ['മാർക്കോസ്'], 50: ['ഫിലിപ്പ്യർ'],
};

/**
 * A Malayalam book name reduced so that spellings people type meet the 1910 ones:
 * no spaces, dots or joiners; chillus as consonant + ്; long and short vowels alike
 * (മർക്കോസ്, മർക്കൊസ്); a doubled consonant as one (വെളിപാട്, വെളിപ്പാടു); and no
 * final ്, ു or ം (പുറപ്പാട്, പുറപ്പാടു; സങ്കീർത്തനം).
 */
const CHILLUS: Record<string, string> = { 'ൺ': 'ണ്', 'ൻ': 'ന്', 'ർ': 'ര്', 'ൽ': 'ല്', 'ൾ': 'ള്', 'ൿ': 'ക്' };
const LONG_SHORT: Record<string, string> = { 'ീ': 'ി', 'ൂ': 'ു', 'േ': 'െ', 'ോ': 'ൊ', 'ഈ': 'ഇ', 'ഊ': 'ഉ', 'ഏ': 'എ', 'ഓ': 'ഒ' };
function malayalamKey(name: string): string {
  return name
    .replace(/[\s.\u200c\u200d]/g, '')
    .replace(/[ൺൻർൽൾൿ]/g, (c) => CHILLUS[c])
    .replace(/[ീൂേോഈഊഏഓ]/g, (c) => LONG_SHORT[c])
    .replace(/([\u0d15-\u0d39])\u0d4d\1/g, '$1')
    .replace(/[\u0d4d\u0d41\u0d02]+$/, '');
}

/**
 * Other Tamil names for books, beside the names in the IRV: the singular and short forms
 * people write, and the names of the Catholic Bible (திருவிவிலியம்). To be checked by a
 * Tamil reader.
 */
const TAMIL_NAMES: Record<number, string[]> = {
  1: ['தொடக்கநூல்'], 2: ['விடுதலைப்பயணம்'], 3: ['லேவியர்'], 4: ['எண்ணிக்கை'], 5: ['இணைச்சட்டம்'],
  7: ['நீதித்தலைவர்கள்', 'நியாயாதிபதி'], 8: ['ரூத்து'], 11: ['அரசர்கள்'], 12: ['அரசர்கள்'], 13: ['குறிப்பேடு'], 14: ['குறிப்பேடு'],
  15: ['எஸ்ரா'], 19: ['சங்கீதம்', 'திருப்பாடல்கள்'], 21: ['சபைஉரையாளர்'], 22: ['இனிமைமிகுபாடல்', 'உன்னதப்பாட்டு'],
  23: ['எசாயா'], 25: ['புலம்பல்'], 28: ['ஓசேயா'], 33: ['மீக்கா'], 35: ['அபக்கூக்கு', 'ஆபகூக்'], 38: ['செக்கரியா'], 39: ['மலாக்கி'],
  43: ['யோ'], 44: ['அப்போஸ்தலர்', 'அப்போஸ்தலர்நடபடிகள்', 'நடபடிகள்', 'திருத்தூதர்பணிகள்'], 45: ['உரோமையர்'], 51: ['கொலோசையர்'],
  52: ['தெசலோனிக்கர்'], 53: ['தெசலோனிக்கர்'], 54: ['திமொத்தேயு'], 55: ['திமொத்தேயு'], 57: ['பிலமோன்'], 58: ['எபிரேயர்'],
  66: ['வெளிப்படுத்தல்', 'திருவெளிப்பாடு'],
};

/**
 * A Tamil book name reduced so that spellings people type meet the IRV's: no spaces, dots
 * or joiners; long and short vowels alike (யோவான், யொவான்); the Grantha letters as the
 * Tamil ones nearest them (இராஜா, இராசா); a doubled consonant as one; no இ before a
 * leading ர (ராஜாக்கள்); and no final ் or ு (ரூத், ரூத்து).
 */
const TA_LONG_SHORT: Record<string, string> = { 'ீ': 'ி', 'ூ': 'ு', 'ே': 'ெ', 'ோ': 'ொ', 'ஈ': 'இ', 'ஊ': 'உ', 'ஏ': 'எ', 'ஓ': 'ஒ' };
const GRANTHA: Record<string, string> = { 'ஜ': 'ச', 'ஸ': 'ச', 'ஷ': 'ச', 'ஹ': 'க' };
function tamilKey(name: string): string {
  return name
    .replace(/[\s.\u200c\u200d]/g, '')
    .replace(/[ீூேோஈஊஏஓ]/g, (c) => TA_LONG_SHORT[c])
    .replace(/[ஜஸஷஹ]/g, (c) => GRANTHA[c])
    .replace(/^இர/, 'ர')
    .replace(/([\u0b95-\u0bb9])\u0bcd\1/g, '$1')
    .replace(/[\u0bcd\u0bc1]+$/, '');
}

/**
 * Other Hindi names for books, beside the names in the IRV: short forms people write and
 * the names of the Catholic Hindi Bible. To be checked by a Hindi reader.
 */
const HINDI_NAMES: Record<number, string[]> = {
  3: ['लैव्यवस्था'], 5: ['विधि-विवरण'], 7: ['न्यायकर्ता'], 19: ['भजन', 'स्तोत्र'], 20: ['सूक्ति'], 21: ['उपदेशक'],
  22: ['गीतों का गीत', 'सर्वश्रेष्ठ गीत'], 25: ['विलाप'], 44: ['प्रेरितों', 'प्रेरित-चरित'], 66: ['प्रकाशना', 'प्रकाशन'],
};

/**
 * A Hindi book name reduced so that spellings people type meet the IRV's: no spaces,
 * dots, hyphens, joiners or nukta; chandrabindu as anusvara (मुँह, मुंह); long and short
 * vowels alike (यूहन्ना, युहन्ना); a doubled consonant as one; and no final virama.
 */
const HI_LONG_SHORT: Record<string, string> = { 'ी': 'ि', 'ू': 'ु', 'ई': 'इ', 'ऊ': 'उ', 'ँ': 'ं' };
function hindiKey(name: string): string {
  return name
    .replace(/[\s.\-\u200c\u200d\u093c]/g, '')
    .replace(/[ीूईऊँ]/g, (c) => HI_LONG_SHORT[c])
    .replace(/([\u0915-\u0939])\u094d\1/g, '$1')
    .replace(/\u094d+$/, '');
}

/** The scripts book names are typed in besides English, with how each is matched. */
type NameScript = 'ml' | 'ta' | 'hi';
const SCRIPTS: Record<NameScript, { letters: RegExp; key: (name: string) => string; other: (id: number) => string[] }> = {
  ml: { letters: /[\u0d00-\u0d7f]/, key: malayalamKey, other: (id) => [...(MALAYALAM_NAMES[id] ?? []), ...(MALAYALAM_VARIANTS[id] ?? [])] },
  ta: { letters: /[\u0b80-\u0bff]/, key: tamilKey, other: (id) => TAMIL_NAMES[id] ?? [] },
  hi: { letters: /[\u0900-\u097f]/, key: hindiKey, other: (id) => HINDI_NAMES[id] ?? [] },
};
const nameScript = (text: string): NameScript | null =>
  SCRIPTS.ml.letters.test(text) ? 'ml' : SCRIPTS.ta.letters.test(text) ? 'ta' : SCRIPTS.hi.letters.test(text) ? 'hi' : null;

/** Each book's names in a script, reduced, with the number in front of the name (or 0). */
const nameIndex: Partial<Record<NameScript, { books: Book[]; names: { id: number; number: number; key: string }[] }>> = {};
function scriptNames(script: NameScript, books: Book[]) {
  const cached = nameIndex[script];
  if (cached?.books === books) return cached.names;
  const { letters, key, other } = SCRIPTS[script];
  const names: { id: number; number: number; key: string }[] = [];
  for (const b of books) {
    const number = Number(/^([1-3])/.exec(b.name)?.[1] ?? 0);
    const all = [...Object.values(b.names), ...other(b.id)].filter((n) => letters.test(n));
    for (const n of all) names.push({ id: b.id, number, key: key(n.replace(/^[1-3]\.?\s*/, '')) });
  }
  nameIndex[script] = { books, names };
  return names;
}

/** The book a name typed in Malayalam, Tamil or Hindi points to: the start of one book's name, or a whole one. */
function scriptBook(script: NameScript, typed: string, books: Book[]): number | undefined {
  const m = /^([1-3])?\.?\s*(.*)$/.exec(typed.trim());
  const number = Number(m?.[1] ?? 0);
  const key = SCRIPTS[script].key(m?.[2] ?? '');
  if (!key) return undefined;
  // The app's own short name for a book (அப், நீதி) is that book, even where it begins
  // other books' names too (அபக்கூக்கு, நீதித்தலைவர்கள்).
  const short = SHORT_NAMES[script].findIndex((s) => Number(/^([1-3])/.exec(s)?.[1] ?? 0) === number && SCRIPTS[script].key(s.replace(/^[1-3]\s*/, '')) === key);
  if (short >= 0) return short + 1;
  const found = scriptNames(script, books).filter((n) => n.number === number && n.key.startsWith(key));
  const ids = new Set(found.map((n) => n.id));
  if (ids.size === 1) return found[0].id;
  const whole = new Set(found.filter((n) => n.key === key).map((n) => n.id));
  return whole.size === 1 ? [...whole][0] : undefined;
}

export interface ParsedRef extends Ref {
  /** True when the input had no verse; `verse` is then 1. */
  chapterOnly: boolean;
}

/**
 * Parse references such as "John 3:16", "jn 3.16", "1 Cor 13", "Psalm 23",
 * "Song of Songs 2:1", "Rev 22 21" or "Ps 23:1-6" (a range opens at its first verse).
 * Returns null when nothing matches or the chapter is out of range for the book.
 */
export function parseReference(input: string, books: Book[], translation?: TranslationId): ParsedRef | null {
  // முதலாம் கொரிந்தியர், 1-ஆம் யோவான், ഒന്നാം കൊരിന്ത്യർ: the number as a figure.
  let typed = input.replace(/\s+/g, ' ').trim();
  for (const [re, n] of ORDINALS) typed = typed.replace(re, n);
  const m = /^\s*([1-3]?\.?\s*[^\d:,]+?)\s*(\d{1,3})(?:\s*[:.,\s]\s*(\d{1,3}))?(?:\s*[-–]\s*\d{1,3}(?:\s*[:.]\s*\d{1,3})?)?\s*$/i.exec(typed);
  if (!m) return null;
  const id = bookFromName(m[1], books, translation);
  return id ? withChapter(books, id, Number(m[2]), m[3] ? Number(m[3]) : undefined) : null;
}

/** The book a typed name stands for: Malayalam, Tamil, Hindi or English, a full name, a usual abbreviation or a clear prefix. */
export function bookFromName(name: string, books: Book[], translation?: TranslationId): number | undefined {
  const typed = name.trim();
  // Malayalam or Tamil names, from any translation, e.g. "യോഹന്നാൻ", "1 ശമൂവേൽ", "யோவான்".
  const script = nameScript(typed);
  if (script) return scriptBook(script, typed, books);
  const rawName = typed.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!rawName) return undefined;
  const id = ABBREVIATIONS[rawName];
  if (id) return id;
  if (translation) {
    // Book names in the translation's own language.
    const local = books.filter((b) => (b.names[translation] ?? '').replace(/\s+/g, '').startsWith(typed.replace(/\s+/g, '')));
    if (local.length === 1) return local[0].id;
  }
  const matches = books.filter((b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(rawName));
  if (matches.length === 1) return matches[0].id;
  // "Jo" could be Job, Joel, John, Jonah, Joshua: prefer the exact-ish Gospel of John.
  return matches.find((b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, '') === rawName)?.id;
}

/**
 * A chapter and verse in a book, or null when the chapter is out of range. In a book of
 * one chapter a lone number is the verse ("Jude 3", "യൂദാ 24"), as people write them.
 */
function withChapter(books: Book[], id: number, chapter: number, verse?: number): ParsedRef | null {
  const book = books.find((b) => b.id === id);
  if (!book) return null;
  if (verse === undefined && book.chapters === 1 && chapter >= 1) return { book: id, chapter: 1, verse: chapter, chapterOnly: false };
  if (chapter < 1 || chapter > book.chapters) return null;
  return { book: id, chapter, verse: verse ?? 1, chapterOnly: verse === undefined };
}

/**
 * A reference found in written text: the verse it points to and, for "13:4-7" or
 * "5:1-7:29", where it ends.
 */
export interface FoundRef extends ParsedRef {
  toChapter: number;
  toVerse: number;
}

/** A run of written text, with the reference it spells if it is one. */
export interface TextPiece {
  text: string;
  ref?: FoundRef;
}

/** The number of verses in a chapter of the Bible being read, when known. */
export type VerseCount = (book: number, chapter: number) => number | undefined;

// Ordinal book numbers written before a Malayalam or Tamil name: ഒന്നാം കൊരിന്ത്യർ, 1-ാം കൊരി, முதலாம் கொரிந்தியர்.
const ORDINALS: [RegExp, string][] = [
  [/^(ഒന്നാം|1-ാം|முதலாம்|1-ஆம்|पहला|पहली)\s*/, '1 '],
  [/^(രണ്ടാം|2-ാം|இரண்டாம்|2-ஆம்|दूसरा|दूसरी)\s*/, '2 '],
  [/^(മൂന്നാം|3-ാം|மூன்றாம்|3-ஆம்|तीसरा|तीसरी)\s*/, '3 '],
];

// Words that are also a book's short name; a chapter alone after them is a number, not a
// reference. Malayalam: സംഖ്യ (number). Tamil: எண் (number), ஆதி (beginning), நீதி
// (justice), புலம் (field), வெளி (outside). Hindi: न्याय (justice), नीति (policy), रोम (Rome).
const SHORT_WORDS = new Set(['സംഖ്യ', 'எண்', 'ஆதி', 'நீதி', 'புலம்', 'வெளி', 'न्याय', 'नीति', 'रोम']);
const SHORT_NAMES: Record<NameScript, string[]> = { ml: MALAYALAM_SHORT_NAMES, ta: TAMIL_SHORT_NAMES, hi: HINDI_SHORT_NAMES };

// Book abbreviations that are also English words: written in lower case, they are words ("is 5", "he 1:3").
const EN_WORDS = new Set(['is', 'he', 'am', 'so', 'ex', 'ac', 'co', 'la', 'ho', 'ne', 'mi', 'ru', 'de', 'ge', 'ob', 'jo', 'na', 're', 'ti', 'ep', 'es', 'le', 'nu', 'job', 'mark', 'acts']);

/** True when a name may stand before a chapter number alone, so "Romans 8" links but "യേശു 12" does not. */
function nameForChapter(name: string, id: number, books: Book[], translation?: TranslationId): boolean {
  const bare = name.replace(/^[1-3]\.?\s*/, '');
  const script = nameScript(name);
  if (script) {
    if (/\.$/.test(name)) return true; // an abbreviation with its dot: സങ്കീ. 23, சங். 23
    const plain = bare.replace(/[\s.]/g, '');
    if (SHORT_NAMES[script][id - 1]?.replace(/^[1-3]\s*/, '') === plain) return !SHORT_WORDS.has(plain);
    const { key, other } = SCRIPTS[script];
    const typed = key(bare);
    const book = books.find((b) => b.id === id);
    const names = [...Object.values(book?.names ?? {}), ...other(id)];
    return names.some((n) => key(n.replace(/^[1-3]\.?\s*/, '')) === typed);
  }
  // English: a capital letter, and a whole name or a usual abbreviation (Ps, Gen, Rom).
  if (!/^[A-Z]/.test(bare)) return false;
  const raw = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (ABBREVIATIONS[raw]) return true;
  const book = books.find((b) => b.id === id);
  const whole = [book?.name, translation ? book?.names[translation] : undefined].filter((n): n is string => !!n);
  return whole.some((n) => n.toLowerCase().replace(/[^a-z0-9]/g, '') === raw);
}

/**
 * Splits written text into plain runs and references, for the notebook: "യോഹന്നാൻ 3:16",
 * "1 കൊരി 13:4-7", "Ps 23:1", "Romans 8", "Jude 3", "മത്താ. 5:1-7:29", and lists that
 * carry the book on ("റോമ. 8:28, 29", "യോഹ. 3:16; 4:24").
 * - The book name is the one to four words before the numbers, longest first, so
 *   "1. ദിനവൃത്താന്തം 7:14" and "Song of Songs 2:1" are whole. The first name that names
 *   a book decides it: "3 John 4" is never read as John 4.
 * - A chapter without a verse needs a whole name or a usual abbreviation (see
 *   nameForChapter), so ordinary words with a number ("യേശു 12", "is 5") stay plain.
 * - With `verseCount`, a verse past the end of its chapter is not a reference, which keeps
 *   "is 7:30" and "Daniel 1260" plain.
 */
export function findReferences(text: string, books: Book[], translation?: TranslationId, verseCount?: VerseCount): TextPiece[] {
  const pieces: TextPiece[] = [];
  const numbers = /(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3}))?)?)?(?![\d:])/g;
  const exists = (ref: ParsedRef) => {
    if (ref.verse < 1 || !verseCount) return true;
    const n = verseCount(ref.book, ref.chapter);
    return n === undefined || ref.verse <= n;
  };
  // The end of a range: "4-7" (same chapter) or "1-7:29" (another chapter).
  const rangeEnd = (ref: ParsedRef, a?: string, b?: string): [number, number] => {
    if (a && b && Number(a) > ref.chapter) return [Number(a), Number(b)];
    if (a && !b && Number(a) > ref.verse) {
      const n = verseCount?.(ref.book, ref.chapter);
      return [ref.chapter, n === undefined ? Number(a) : Math.min(Number(a), n)];
    }
    return [ref.chapter, ref.verse];
  };
  let done = 0;
  let m: RegExpExecArray | null;
  while ((m = numbers.exec(text))) {
    // Never start inside a longer number ("1260", "2024").
    if (m.index > 0 && /\d/.test(text[m.index - 1])) continue;
    // The words before the numbers, back to a line break or a mark that cannot be in a name.
    const before = text.slice(done, m.index);
    const cut = Math.max(before.lastIndexOf('\n'), ...[',', ';', '(', ')', '"', '“', '”', '‘', '’', '—', '–', '!', '?', '।'].map((c) => before.lastIndexOf(c)));
    const words = before.slice(cut + 1).split(' ');
    if (words.length && words[words.length - 1] === '') words.pop();
    // The name must end right before the numbers, with at most one space.
    if (!words.length || /\s\s$/.test(before)) continue;
    let found: { ref: FoundRef; start: number } | null = null;
    for (let k = Math.min(4, words.length); k >= 1; k--) {
      const name = words.slice(words.length - k).join(' ');
      if (name !== name.trimStart() || !/[A-Za-z\u0d00-\u0d7f\u0b80-\u0bff\u0900-\u097f]/.test(name)) continue;
      let typed = name;
      for (const [re, n] of ORDINALS) typed = typed.replace(re, n);
      const raw = typed.replace(/^[1-3]\.?\s*/, '').toLowerCase().replace(/[^a-z]/g, '');
      if (EN_WORDS.has(raw) && /^[a-z]/.test(typed.replace(/^[1-3]\.?\s*/, ''))) continue;
      const id = bookFromName(typed, books, translation);
      if (!id) continue;
      // This name names a book; shorter names are not tried.
      const ref = withChapter(books, id, Number(m[1]), m[2] ? Number(m[2]) : undefined);
      if (ref && exists(ref) && (!ref.chapterOnly || nameForChapter(typed, id, books, translation))) {
        const [toChapter, toVerse] = rangeEnd(ref, m[3], m[4]);
        found = { ref: { ...ref, toChapter, toVerse }, start: done + before.length - name.length - (before.endsWith(' ') ? 1 : 0) };
      }
      break;
    }
    if (!found) continue;
    if (found.start > done) pieces.push({ text: text.slice(done, found.start) });
    let end = m.index + m[0].length;
    // A psalm's title, as "Add to notebook" writes it: "സങ്കീർത്തനങ്ങൾ 3 (ശീർഷകം)".
    const title = found.ref.chapterOnly ? /^\s*\((?:title|ശീർഷകം|தலைப்பு|शीर्षक)\)/.exec(text.slice(end)) : null;
    if (title) {
      found.ref = { ...found.ref, verse: 0, toVerse: 0, chapterOnly: false };
      end += title[0].length;
    }
    pieces.push({ text: text.slice(found.start, end), ref: found.ref });
    // More verses or chapters of the same book: "8:28, 29", "3:16; 4:24".
    let last = found.ref;
    for (;;) {
      const more = /^(\s*[,;]\s*)(\d{1,3})(?:\s*[:.]\s*(\d{1,3}))?(?:\s*[-–]\s*(\d{1,3}))?(?![\d:])/.exec(text.slice(end));
      if (!more) break;
      let ref: ParsedRef | null;
      if (more[3]) ref = withChapter(books, last.book, Number(more[2]), Number(more[3]));
      else if (more[1].includes(',') && !last.chapterOnly) ref = { book: last.book, chapter: last.toChapter, verse: Number(more[2]), chapterOnly: false };
      else ref = withChapter(books, last.book, Number(more[2]));
      if (!ref || !exists(ref) || ref.verse === 0) break;
      const [toChapter, toVerse] = rangeEnd(ref, more[4]);
      const next: FoundRef = { ...ref, toChapter, toVerse };
      pieces.push({ text: more[1] });
      pieces.push({ text: more[0].slice(more[1].length), ref: next });
      end += more[0].length;
      last = next;
    }
    done = end;
    numbers.lastIndex = end;
  }
  if (done < text.length) pieces.push({ text: text.slice(done) });
  return pieces;
}
