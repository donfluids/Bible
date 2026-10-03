import type { EditionId, Language } from './edition';

/**
 * What the app is made from, under which licence, and what was changed, shown on the
 * Sources and licences screen. The CC BY and CC BY-SA licences ask for a link to the
 * licence and a note of changes; the Open Font License asks that its text ship with the
 * fonts. Kept in step with README.md ("Sources and licences").
 */
export interface Source {
  title: string;
  /** Who made it and the licence, in a line or two. */
  credit: string;
  licence?: { name: string; url: string };
  links?: { label: string; url: string }[];
  /** What this app changed, when anything was. */
  changes?: string;
}

type Text = Record<Language, string>;
const pick = (t: Text, lang: Language) => t[lang];

const CC_BY_SA = { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' };
const CC_BY = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' };
const OFL = { name: 'SIL Open Font License 1.1', url: 'https://openfontlicense.org' };
const MIT = { name: 'MIT', url: 'https://opensource.org/license/mit' };

const KJV = (lang: Language): Source => ({
  title: pick({ en: 'King James Version (1769)', ml: 'കിംഗ് ജെയിംസ് വേർഷൻ (1769)' }, lang),
  credit: pick(
    {
      en: "Text with Strong's numbers from eBible.org (eng-kjv2006). Public domain outside the United Kingdom, where the Crown's printing rights apply.",
      ml: 'സ്ട്രോങ്സ് നമ്പറുകളോടെയുള്ള പാഠം eBible.org-ൽ നിന്ന് (eng-kjv2006). യുണൈറ്റഡ് കിംഗ്ഡത്തിനു പുറത്ത് പൊതുസ്വത്ത്; അവിടെ രാജകീയ അച്ചടി അവകാശം നിലവിലുണ്ട്.',
    },
    lang,
  ),
  links: [{ label: 'eBible.org', url: 'https://ebible.org/find/details.php?id=eng-kjv2006' }],
});

const WEB = (lang: Language): Source => ({
  title: pick({ en: 'World English Bible', ml: 'വേൾഡ് ഇംഗ്ലീഷ് ബൈബിൾ' }, lang),
  credit: pick({ en: 'From eBible.org (engwebp). Public domain.', ml: 'eBible.org-ൽ നിന്ന് (engwebp). പൊതുസ്വത്ത്.' }, lang),
  links: [{ label: 'eBible.org', url: 'https://ebible.org/find/details.php?id=engwebp' }],
  changes: pick(
    {
      en: "The text is unchanged. The Strong's numbers in the source are not used, because too many are attached to the wrong words.",
      ml: 'പാഠത്തിൽ മാറ്റമില്ല. ഉറവിടത്തിലെ സ്ട്രോങ്സ് നമ്പറുകൾ പലതും തെറ്റായ വാക്കുകളിലായതിനാൽ ഉപയോഗിക്കുന്നില്ല.',
    },
    lang,
  ),
});

const MALAYALAM = (lang: Language): Source => ({
  title: pick({ en: 'Sathyavedapusthakam 1910 (Malayalam)', ml: 'സത്യവേദപുസ്തകം 1910' }, lang),
  credit: pick(
    {
      en: 'Revised edition in contemporary orthography, copyright © 2015 The Free Bible Foundation, from eBible.org (mal2015).',
      ml: 'സമകാലിക ലിപിയിലുള്ള പരിഷ്കരിച്ച പതിപ്പ്, പകർപ്പവകാശം © 2015 The Free Bible Foundation, eBible.org-ൽ നിന്ന് (mal2015).',
    },
    lang,
  ),
  licence: CC_BY_SA,
  links: [
    { label: 'eBible.org', url: 'https://ebible.org/find/details.php?id=mal2015' },
    { label: 'Malayalam Wikisource', url: 'https://ml.wikisource.org/wiki/സത്യവേദപുസ്തകം' },
  ],
  changes: pick(
    {
      en: 'Titus 2 and 3, which the source repeats from Titus 1, are the 1910 text from Malayalam Wikisource (public domain). Stray test words at Titus 1:1 and five illustration captions inside verses were removed, and 19 misspelt words were corrected (Matthew 6:12 among them). This adapted text is shared under CC BY-SA 4.0.',
      ml: 'ഉറവിടത്തിൽ തീത്തൊസ് 1 ആവർത്തിച്ചിരിക്കുന്ന തീത്തൊസ് 2, 3 അദ്ധ്യായങ്ങൾ മലയാളം വിക്കിഗ്രന്ഥശാലയിലെ 1910 പാഠമാണ് (പൊതുസ്വത്ത്). തീത്തൊസ് 1:1-ലെ അനാവശ്യ പരീക്ഷണവാക്കുകളും വാക്യങ്ങൾക്കുള്ളിലെ അഞ്ചു ചിത്രക്കുറിപ്പുകളും നീക്കി; 19 അക്ഷരത്തെറ്റുകൾ തിരുത്തി (മത്തായി 6:12 ഉൾപ്പെടെ). ഈ പരിഷ്കരിച്ച പാഠം CC BY-SA 4.0 പ്രകാരം പങ്കുവയ്ക്കുന്നു.',
    },
    lang,
  ),
});

const MALAYALAM_LINKS = (lang: Language): Source => ({
  title: pick({ en: 'Malayalam word links', ml: 'മലയാളം പദബന്ധങ്ങൾ' }, lang),
  credit: pick(
    {
      en: "The links from Malayalam words to Hebrew and Greek words were made by a language model (Claude) reading each verse beside the STEPBible data, then corrected by rule (pronouns, words slipped by one). Only 33 well-known verses were checked by hand, so some links are wrong. Built from CC BY-SA and CC BY material, they are shared under CC BY-SA 4.0.",
      ml: 'മലയാളം വാക്കുകളിൽനിന്ന് എബ്രായ, ഗ്രീക്ക് വാക്കുകളിലേക്കുള്ള ബന്ധങ്ങൾ ഒരു ഭാഷാമാതൃക (Claude) STEPBible വിവരങ്ങൾക്കൊപ്പം ഓരോ വാക്യവും വായിച്ച് ഉണ്ടാക്കിയതാണ്; പിന്നീട് നിയമങ്ങൾ വഴി തിരുത്തി (സർവ്വനാമങ്ങൾ, ഒരു വാക്കു തെറ്റി ചേർന്നവ). പ്രസിദ്ധമായ 33 വാക്യങ്ങൾ മാത്രമേ കൈകൊണ്ട് പരിശോധിച്ചിട്ടുള്ളൂ, അതിനാൽ ചിലതു തെറ്റാകാം. CC BY-SA, CC BY വിവരങ്ങളിൽനിന്ന് ഉണ്ടാക്കിയതിനാൽ CC BY-SA 4.0 പ്രകാരം പങ്കുവയ്ക്കുന്നു.',
    },
    lang,
  ),
  licence: CC_BY_SA,
});

const STRONGS = (lang: Language): Source => ({
  title: pick({ en: "Strong's Hebrew and Greek dictionaries (1890)", ml: 'സ്ട്രോങ്സ് എബ്രായ, ഗ്രീക്ക് നിഘണ്ടുക്കൾ (1890)' }, lang),
  credit: pick({ en: 'Digital edition by Open Scriptures.', ml: 'Open Scriptures-ന്റെ ഡിജിറ്റൽ പതിപ്പ്.' }, lang),
  licence: CC_BY_SA,
  links: [{ label: 'Open Scriptures', url: 'https://github.com/openscriptures/strongs' }],
  changes: pick(
    {
      en: 'Each entry has a short meaning added, the gloss STEPBible gives the word most often (a few set by hand), and search forms without accents.',
      ml: 'ഓരോ പദത്തിനും ഒരു ചെറിയ അർത്ഥം ചേർത്തിട്ടുണ്ട്: STEPBible ആ വാക്കിന് ഏറ്റവും കൂടുതൽ നൽകുന്ന അർത്ഥം (ചിലതു കൈകൊണ്ട്); കൂടാതെ ചിഹ്നങ്ങളില്ലാത്ത തിരയൽരൂപങ്ങളും.',
    },
    lang,
  ),
});

const STEPBIBLE = (lang: Language): Source => ({
  title: pick({ en: 'Hebrew and Greek text (STEPBible TAHOT and TAGNT)', ml: 'എബ്രായ, ഗ്രീക്ക് പാഠം (STEPBible TAHOT, TAGNT)' }, lang),
  credit: pick(
    {
      en: 'Translators Amalgamated Hebrew OT and Greek NT by STEPBible.org, Tyndale House Cambridge. The Hebrew is the Leningrad Codex (WLC 4.20, via Open Scriptures); the English glosses of the Greek are based on the Berean Study Bible, with permission.',
      ml: 'STEPBible.org (Tyndale House Cambridge) തയ്യാറാക്കിയ Translators Amalgamated Hebrew OT and Greek NT. എബ്രായ പാഠം ലെനിൻഗ്രാഡ് കോഡക്സ് (WLC 4.20, Open Scriptures വഴി); ഗ്രീക്കിന്റെ ഇംഗ്ലീഷ് അർത്ഥങ്ങൾ Berean Study Bible അടിസ്ഥാനമാക്കി, അനുമതിയോടെ.',
    },
    lang,
  ),
  licence: CC_BY,
  links: [{ label: 'STEPBible data', url: 'https://github.com/STEPBible/STEPBible-Data' }],
  changes: pick(
    {
      en: 'Greek words found only in the Nestle-Aland editions are left out, and where the Textus Receptus or the Byzantine text has a different word, that word is shown with the Nestle-Aland word noted. The Hebrew paragraph marks פ and ס are removed. Verse numbers follow the KJV, with a map for Malayalam verses numbered differently.',
      ml: 'നെസ്‌ലെ-ആലൻഡ് പതിപ്പുകളിൽ മാത്രമുള്ള ഗ്രീക്ക് വാക്കുകൾ ഒഴിവാക്കി; ടെക്സ്റ്റസ് റിസെപ്റ്റസിലോ ബൈസന്റൈൻ പാഠത്തിലോ വ്യത്യസ്തമായ വാക്കുള്ളിടത്ത് ആ വാക്കു കാണിക്കുന്നു, നെസ്‌ലെ-ആലൻഡ് വാക്കു കുറിപ്പായി. എബ്രായ ഖണ്ഡികാചിഹ്നങ്ങൾ (פ, ס) നീക്കി. വാക്യനമ്പറുകൾ KJV പ്രകാരം; വ്യത്യസ്ത നമ്പറുള്ള മലയാളം വാക്യങ്ങൾക്കു പട്ടികയുണ്ട്.',
    },
    lang,
  ),
});

const FONTS = (lang: Language, edition: EditionId): Source => ({
  title: pick({ en: 'Fonts', ml: 'അക്ഷരരൂപങ്ങൾ' }, lang),
  credit:
    (edition === 'ml' ? 'Noto Serif Hebrew, Noto Sans Malayalam, Noto Serif Malayalam' : 'Noto Serif Hebrew') +
    ' © 2022 The Noto Project Authors. ' +
    pick({ en: 'The licence text is below.', ml: 'അനുമതിപത്രം താഴെ.' }, lang),
  licence: OFL,
});

const APACHE = { name: 'Apache License 2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' };

const ICONS = (lang: Language): Source => ({
  title: pick({ en: 'Icons', ml: 'ചിഹ്നങ്ങൾ' }, lang),
  credit: pick(
    {
      en: 'Material Symbols Rounded © Google. The licence text is below.',
      ml: 'Material Symbols Rounded © Google. അനുമതിപത്രം താഴെ.',
    },
    lang,
  ),
  licence: APACHE,
  links: [{ label: 'fonts.google.com/icons', url: 'https://fonts.google.com/icons' }],
  changes: pick(
    {
      en: 'Only the 30 icons the app uses are kept, fixed at one weight and size (scripts/make-icon-font.py).',
      ml: 'ആപ്പ് ഉപയോഗിക്കുന്ന 30 ചിഹ്നങ്ങൾ മാത്രം, ഒരേ കനത്തിലും വലുപ്പത്തിലും (scripts/make-icon-font.py).',
    },
    lang,
  ),
});

const SOFTWARE = (lang: Language): Source => ({
  title: pick({ en: 'Software', ml: 'സോഫ്റ്റ്‌വെയർ' }, lang),
  credit: pick(
    {
      en: "This app's code is MIT licensed. It is built with React Native, Expo, React Navigation and fflate (MIT); SQLite (public domain); and Android libraries under the Apache License 2.0 and BSD licences.",
      ml: 'ഈ ആപ്പിന്റെ കോഡ് MIT അനുമതിപത്രത്തിലാണ്. React Native, Expo, React Navigation, fflate (MIT), SQLite (പൊതുസ്വത്ത്), Apache 2.0, BSD അനുമതിപത്രങ്ങളിലുള്ള Android ലൈബ്രറികൾ എന്നിവ ഉപയോഗിക്കുന്നു.',
    },
    lang,
  ),
  licence: MIT,
  links: [{ label: 'github.com/donfluids/Bible', url: 'https://github.com/donfluids/Bible' }],
});

export function sourcesFor(edition: EditionId, lang: Language): Source[] {
  const texts = edition === 'ml' ? [MALAYALAM(lang), MALAYALAM_LINKS(lang), KJV(lang)] : [KJV(lang), WEB(lang)];
  return [...texts, STRONGS(lang), STEPBIBLE(lang), FONTS(lang, edition), ICONS(lang), SOFTWARE(lang)];
}
