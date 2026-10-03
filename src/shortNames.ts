import type { TranslationId } from './types';

/**
 * Short book names for the reader's top bar, used when the full name and the chapter
 * number do not fit beside the buttons ("2. തിമൊഥെയൊസ്" becomes "2 തിമൊ"). Indexed by
 * book id - 1. The Malayalam follow the 1910 spellings of the names; the English are the
 * usual abbreviations.
 */
const MALAYALAM = [
  'ഉല്പ', 'പുറ', 'ലേവ്യ', 'സംഖ്യ', 'ആവ', 'യോശു', 'ന്യായ', 'രൂത്ത്', '1 ശമൂ', '2 ശമൂ',
  '1 രാജ', '2 രാജ', '1 ദിന', '2 ദിന', 'എസ്രാ', 'നെഹെ', 'എസ്ഥേ', 'ഇയ്യോ', 'സങ്കീ', 'സദൃ',
  'സഭാ', 'ഉത്ത', 'യെശ', 'യിരെ', 'വിലാ', 'യെഹെ', 'ദാനീ', 'ഹോശേ', 'യോവേ', 'ആമോ',
  'ഓബ', 'യോനാ', 'മീഖാ', 'നഹൂം', 'ഹബ', 'സെഫ', 'ഹഗ്ഗാ', 'സെഖ', 'മലാ', 'മത്താ',
  'മർക്കൊ', 'ലൂക്കൊ', 'യോഹ', 'പ്രവൃ', 'റോമ', '1 കൊരി', '2 കൊരി', 'ഗലാ', 'എഫെ', 'ഫിലി',
  'കൊലൊ', '1 തെസ്സ', '2 തെസ്സ', '1 തിമൊ', '2 തിമൊ', 'തീത്തൊ', 'ഫിലേ', 'എബ്രാ', 'യാക്കോ', '1 പത്രൊ',
  '2 പത്രൊ', '1 യോഹ', '2 യോഹ', '3 യോഹ', 'യൂദാ', 'വെളി',
];

const ENGLISH = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1 Sam', '2 Sam',
  '1 Kgs', '2 Kgs', '1 Chr', '2 Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov',
  'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos',
  'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal', 'Matt',
  'Mark', 'Luke', 'John', 'Acts', 'Rom', '1 Cor', '2 Cor', 'Gal', 'Eph', 'Phil',
  'Col', '1 Thess', '2 Thess', '1 Tim', '2 Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1 Pet',
  '2 Pet', '1 John', '2 John', '3 John', 'Jude', 'Rev',
];

export function shortBookName(book: number, translation: TranslationId): string {
  const list = translation === 'MAL' ? MALAYALAM : ENGLISH;
  return list[book - 1] ?? '';
}
