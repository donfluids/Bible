/**
 * Human-readable descriptions of the grammar codes that come with each word.
 * Hebrew codes follow the Open Scriptures Hebrew Morphology scheme as used by
 * STEPBible (e.g. "HVqp3ms", "HR/Ncfsa"). Greek codes follow the Robinson scheme
 * (e.g. "V-AAI-3S", "N-NSF", "T-ASM"). Unknown parts are returned as they are.
 */

const HEB_PERSON: Record<string, string> = { '1': 'first person', '2': 'second person', '3': 'third person' };
const HEB_GENDER: Record<string, string> = { m: 'masculine', f: 'feminine', b: 'both genders', c: 'common gender' };
const HEB_NUMBER: Record<string, string> = { s: 'singular', p: 'plural', d: 'dual' };
const HEB_STATE: Record<string, string> = { a: 'absolute', c: 'construct', d: 'determined' };

const HEB_STEM: Record<string, string> = {
  q: 'qal', N: 'niphal', p: 'piel', P: 'pual', h: 'hiphil', H: 'hophal', t: 'hithpael',
  o: 'polel', O: 'polal', r: 'hithpolel', m: 'poel', M: 'poal', k: 'palel', K: 'pulal', Q: 'qal passive',
  l: 'pilpel', L: 'polpal', f: 'hithpalpel', D: 'nithpael', j: 'pealal', i: 'pilel', u: 'hothpaal',
  c: 'tiphil', v: 'hishtaphel', w: 'nithpalel', y: 'nithpoel', z: 'hithpoel',
};
// Aramaic stems share letters with different names.
const ARAM_STEM: Record<string, string> = {
  q: 'peal', Q: 'peil', u: 'hithpeel', p: 'pael', P: 'ithpaal', M: 'hithpaal', a: 'aphel', h: 'haphel',
  s: 'saphel', e: 'shaphel', H: 'hophal', i: 'ithpeel', t: 'hishtaphel', v: 'ishtaphel', w: 'hithaphel',
  o: 'polel', z: 'ithpoel', r: 'hithpolel', f: 'hithpalpel', b: 'hephal', c: 'tiphel', m: 'poel', l: 'palpel', L: 'ithpalpel', O: 'ithpolel', G: 'ittaphal',
};
const HEB_VERB_TYPE: Record<string, string> = {
  p: 'perfect', q: 'sequential perfect', i: 'imperfect', w: 'sequential imperfect', h: 'cohortative', j: 'jussive',
  v: 'imperative', r: 'participle active', s: 'participle passive', a: 'infinitive absolute', c: 'infinitive construct',
};
const HEB_NOUN: Record<string, string> = { c: 'common noun', g: 'gentilic noun', p: 'proper noun' };
const HEB_ADJ: Record<string, string> = { a: 'adjective', c: 'cardinal number', g: 'gentilic adjective', o: 'ordinal number' };
const HEB_PARTICLE: Record<string, string> = {
  a: 'affirmation particle', d: 'definite article', e: 'exhortation particle', i: 'interrogative particle', j: 'interjection',
  m: 'demonstrative particle', n: 'negative particle', o: 'direct object marker', r: 'relative particle',
};
const HEB_PRONOUN: Record<string, string> = {
  d: 'demonstrative pronoun', f: 'indefinite pronoun', i: 'interrogative pronoun', p: 'personal pronoun', r: 'relative pronoun',
};
const HEB_SUFFIX: Record<string, string> = {
  d: 'directional suffix', h: 'paragogic he', n: 'paragogic nun', p: 'pronominal suffix',
};

function hebAgreement(s: string, withState: boolean): string {
  const parts: string[] = [];
  let i = 0;
  if (HEB_PERSON[s[i]]) parts.push(HEB_PERSON[s[i++]]);
  if (HEB_GENDER[s[i]]) parts.push(HEB_GENDER[s[i++]]);
  if (HEB_NUMBER[s[i]]) parts.push(HEB_NUMBER[s[i++]]);
  if (withState && HEB_STATE[s[i]]) parts.push(HEB_STATE[s[i++]]);
  return parts.join(' ');
}

function describeHebrewPart(code: string, aramaic: boolean): string {
  if (!code) return '';
  const pos = code[0];
  const rest = code.slice(1);
  switch (pos) {
    case 'N': {
      const kind = HEB_NOUN[rest[0]];
      return [kind ?? 'noun', hebAgreement(rest.slice(kind ? 1 : 0), true)].filter(Boolean).join(', ');
    }
    case 'V': {
      const stem = (aramaic ? ARAM_STEM : HEB_STEM)[rest[0]];
      const type = HEB_VERB_TYPE[rest[1]];
      return ['verb', stem, type, hebAgreement(rest.slice(2), true)].filter(Boolean).join(', ');
    }
    case 'A': {
      const kind = HEB_ADJ[rest[0]];
      return [kind ?? 'adjective', hebAgreement(rest.slice(kind ? 1 : 0), true)].filter(Boolean).join(', ');
    }
    case 'R':
      return rest[0] === 'd' ? 'preposition with definite article' : 'preposition';
    case 'C':
    case 'c':
      return 'conjunction';
    case 'D':
      return 'adverb';
    case 'T':
      return HEB_PARTICLE[rest[0]] ?? 'particle';
    case 'P': {
      const kind = HEB_PRONOUN[rest[0]];
      return [kind ?? 'pronoun', hebAgreement(rest.slice(kind ? 1 : 0), false)].filter(Boolean).join(', ');
    }
    case 'S': {
      const kind = HEB_SUFFIX[rest[0]];
      return [kind ?? 'suffix', hebAgreement(rest.slice(kind ? 1 : 0), false)].filter(Boolean).join(', ');
    }
    default:
      return code;
  }
}

export function describeHebrew(code: string): string {
  const lang = code[0];
  const aramaic = lang === 'A';
  const body = lang === 'H' || lang === 'A' ? code.slice(1) : code;
  const parts = body.split('/').map((p) => describeHebrewPart(p, aramaic)).filter(Boolean);
  return (aramaic ? 'Aramaic: ' : '') + parts.join(' + ');
}

const GRK_POS: Record<string, string> = {
  N: 'noun', V: 'verb', A: 'adjective', T: 'definite article', P: 'personal pronoun', R: 'relative pronoun',
  D: 'demonstrative pronoun', C: 'reciprocal pronoun', F: 'reflexive pronoun', S: 'possessive pronoun',
  I: 'interrogative pronoun', X: 'indefinite pronoun', K: 'correlative pronoun', Q: 'correlative or interrogative pronoun',
  ADV: 'adverb', CONJ: 'conjunction', COND: 'conditional particle', PRT: 'particle', PREP: 'preposition',
  INJ: 'interjection', ARAM: 'Aramaic word', HEB: 'Hebrew word',
};
const GRK_TENSE: Record<string, string> = {
  P: 'present', I: 'imperfect', F: 'future', A: 'aorist', X: 'perfect', Y: 'pluperfect', L: 'pluperfect', R: 'perfect',
  '2A': 'second aorist', '2F': 'second future', '2X': 'second perfect', '2Y': 'second pluperfect', '2L': 'second pluperfect', '2R': 'second perfect',
};
const GRK_VOICE: Record<string, string> = {
  A: 'active', M: 'middle', P: 'passive', E: 'middle or passive', D: 'middle deponent', O: 'passive deponent',
  N: 'middle or passive deponent', Q: 'impersonal active', X: 'no voice',
};
const GRK_MOOD: Record<string, string> = {
  I: 'indicative', S: 'subjunctive', O: 'optative', M: 'imperative', N: 'infinitive', P: 'participle', R: 'imperative participle',
};
const GRK_CASE: Record<string, string> = { N: 'nominative', G: 'genitive', D: 'dative', A: 'accusative', V: 'vocative' };
const GRK_NUMBER: Record<string, string> = { S: 'singular', P: 'plural' };
const GRK_GENDER: Record<string, string> = { M: 'masculine', F: 'feminine', N: 'neuter' };
const GRK_SUFFIX: Record<string, string> = {
  S: 'superlative', C: 'comparative', ABB: 'abbreviated', I: 'interrogative', N: 'negative', ATT: 'Attic form',
  P: 'particle attached', K: 'crasis', T: 'title', L: 'location', PG: 'person or group', LG: 'location or group',
  NUI: 'numeral, indeclinable', PRI: 'proper noun, indeclinable', LI: 'letter, indeclinable', OI: 'indeclinable',
  HEB: 'Hebrew word', ARAM: 'Aramaic word',
};

function grkCaseNumberGender(s: string): string {
  const parts: string[] = [];
  let i = 0;
  if (/\d/.test(s[i] ?? '')) parts.push(['first', 'second', 'third'][Number(s[i++]) - 1] + ' person');
  if (GRK_CASE[s[i]]) parts.push(GRK_CASE[s[i++]]);
  if (GRK_NUMBER[s[i]]) parts.push(GRK_NUMBER[s[i++]]);
  if (GRK_GENDER[s[i]]) parts.push(GRK_GENDER[s[i++]]);
  return parts.join(' ');
}

export function describeGreek(code: string): string {
  // Crasis such as κἀγώ is written "P-1NS + G2532": describe the first word, note the joined one.
  const joined = code.split(' + ');
  if (joined.length > 1) return `${describeGreek(joined[0])}, joined with ${joined.slice(1).join(' and ')}`;
  const segments = code.split('-');
  const pos = segments[0];
  if (pos === 'V') {
    const tvm = segments[1] ?? '';
    const tenseKey = tvm.startsWith('2') ? tvm.slice(0, 2) : tvm.slice(0, 1);
    const voice = tvm.slice(tenseKey.length, tenseKey.length + 1);
    const mood = tvm.slice(tenseKey.length + 1, tenseKey.length + 2);
    const rest = segments.slice(2);
    const suffixes = rest.filter((seg) => GRK_SUFFIX[seg]).map((seg) => GRK_SUFFIX[seg]);
    const tail = rest.filter((seg) => !GRK_SUFFIX[seg]).join(' ');
    const agreement = tail.replace(/(\d)([SP])/, (_, p, n) => ['first', 'second', 'third'][Number(p) - 1] + ' person ' + GRK_NUMBER[n]);
    const cng = /^[NGDAV][SP][MFN]?$/.test(tail) ? grkCaseNumberGender(tail) : agreement;
    return ['verb', GRK_TENSE[tenseKey], GRK_VOICE[voice], GRK_MOOD[mood], cng, ...suffixes].filter(Boolean).join(', ');
  }
  const name = GRK_POS[pos];
  if (!name) return code;
  const details: string[] = [];
  for (const seg of segments.slice(1)) {
    // Possessive pronouns carry the possessor's person and number first: "1SGSN".
    const poss = /^(\d)([SP])([NGDAV][SP][MFN])$/.exec(seg);
    if (poss) details.push(`${['first', 'second', 'third'][Number(poss[1]) - 1]} person ${GRK_NUMBER[poss[2]]} possessor, ${grkCaseNumberGender(poss[3])}`);
    else if (/^\d?[NGDAV][SP][MFN]?$/.test(seg) || /^\d[SP]$/.test(seg)) details.push(grkCaseNumberGender(seg));
    else if (GRK_SUFFIX[seg]) details.push(GRK_SUFFIX[seg]);
    else details.push(seg);
  }
  return [name, ...details].filter(Boolean).join(', ');
}

export function describeMorph(code: string, hebrew: boolean): string {
  if (!code) return '';
  try {
    return hebrew ? describeHebrew(code) : describeGreek(code);
  } catch {
    return code;
  }
}

type Plain = 'noun' | 'name' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'pronoun' | 'article' | 'particle' | 'interjection' | 'numeral';
type PlainNumber = 'singular' | 'plural' | 'dual';
/** The plain grammar words, for the word sheet in each interface language. */
const PLAIN_WORDS: Record<string, Record<Plain | PlainNumber, string>> = {
  en: {
    noun: 'noun', name: 'name', verb: 'verb', adjective: 'adjective', adverb: 'adverb', preposition: 'preposition', conjunction: 'conjunction',
    pronoun: 'pronoun', article: 'article (“the”)', particle: 'particle', interjection: 'interjection', numeral: 'number',
    singular: 'singular', plural: 'plural', dual: 'dual (two)',
  },
  ml: {
    noun: 'നാമം', name: 'പേര്', verb: 'ക്രിയ', adjective: 'വിശേഷണം', adverb: 'ക്രിയാവിശേഷണം', preposition: 'ഗതി', conjunction: 'സംയോജകം',
    pronoun: 'സർവ്വനാമം', article: 'ഉപപദം (“the”)', particle: 'നിപാതം', interjection: 'വ്യാക്ഷേപകം', numeral: 'സംഖ്യ',
    singular: 'ഏകവചനം', plural: 'ബഹുവചനം', dual: 'ദ്വിവചനം',
  },
  ta: {
    noun: 'பெயர்ச்சொல்', name: 'பெயர்', verb: 'வினைச்சொல்', adjective: 'பெயரடை', adverb: 'வினையடை', preposition: 'முன்னிடைச்சொல்', conjunction: 'இணைப்புச்சொல்',
    pronoun: 'பிரதிப்பெயர்', article: 'சுட்டு (“the”)', particle: 'இடைச்சொல்', interjection: 'வியப்பிடைச்சொல்', numeral: 'எண்',
    singular: 'ஒருமை', plural: 'பன்மை', dual: 'இருமை',
  },
  hi: {
    noun: 'संज्ञा', name: 'नाम', verb: 'क्रिया', adjective: 'विशेषण', adverb: 'क्रियाविशेषण', preposition: 'संबंधसूचक', conjunction: 'समुच्चयबोधक',
    pronoun: 'सर्वनाम', article: 'उपपद (“the”)', particle: 'निपात', interjection: 'विस्मयादिबोधक', numeral: 'संख्या',
    singular: 'एकवचन', plural: 'बहुवचन', dual: 'द्विवचन',
  },
};
const HEB_PLAIN: Record<string, Plain> = { N: 'noun', V: 'verb', A: 'adjective', R: 'preposition', C: 'conjunction', c: 'conjunction', D: 'adverb', T: 'particle', P: 'pronoun' };
const GRK_PLAIN: Record<string, Plain> = {
  N: 'noun', V: 'verb', A: 'adjective', T: 'article', P: 'pronoun', R: 'pronoun', D: 'pronoun', C: 'pronoun', F: 'pronoun', S: 'pronoun',
  I: 'pronoun', X: 'pronoun', K: 'pronoun', Q: 'pronoun', ADV: 'adverb', CONJ: 'conjunction', COND: 'conjunction', PRT: 'particle',
  PREP: 'preposition', INJ: 'interjection',
};
const NUMBER_LETTER: Record<string, PlainNumber> = { s: 'singular', p: 'plural', d: 'dual', S: 'singular', P: 'plural' };

/**
 * A word's grammar in plain words, in the interface language: its part of speech and
 * number ("noun, singular", "നാമം, ഏകവചനം"); a word with a prefix gives both parts
 * ("preposition + noun, singular"). The full description (describeMorph) is for those who
 * ask for it. Returns '' when the code says nothing plain.
 */
export function plainMorph(code: string, hebrew: boolean, language: string): string {
  if (!code) return '';
  const words = PLAIN_WORDS[language] ?? PLAIN_WORDS.en;
  const kinds: Plain[] = [];
  let number: PlainNumber | undefined;
  if (hebrew) {
    const body = code[0] === 'H' || code[0] === 'A' ? code.slice(1) : code;
    for (const part of body.split('/')) {
      const pos = part[0];
      let kind = HEB_PLAIN[pos];
      if (!kind) continue; // a suffix rides on the word before it
      if (pos === 'N' && part[1] === 'p') kind = 'name';
      if (pos === 'A' && (part[1] === 'c' || part[1] === 'o')) kind = 'numeral';
      if (pos === 'T' && part[1] === 'd') kind = 'article';
      kinds.push(kind);
      // Gender (or person and gender) then number: "Ncfsa", "Vqp3ms", "Pp3ms".
      const agreement = /[mfbc]([spd])/.exec(pos === 'V' ? part.slice(3) : part.slice(2));
      if (agreement && (kind === 'noun' || kind === 'name' || kind === 'verb' || kind === 'adjective' || kind === 'pronoun')) number = NUMBER_LETTER[agreement[1]];
    }
  } else {
    const first = code.split(' + ')[0];
    const segments = first.split('-');
    let kind = GRK_PLAIN[segments[0]];
    if (kind) {
      const rest = segments.slice(1);
      if (kind === 'noun' && rest.some((s) => ['PRI', 'PG', 'LG', 'L', 'T'].includes(s))) kind = 'name';
      if (kind === 'adjective' && rest.includes('NUI')) kind = 'numeral';
      kinds.push(kind);
      for (const seg of rest) {
        const m = /^\d?[NGDAV]([SP])[MFN]?$/.exec(seg) ?? /^\d([SP])$/.exec(seg);
        if (m) number = NUMBER_LETTER[m[1]];
      }
    }
  }
  if (!kinds.length) return '';
  return [kinds.map((k) => words[k]).join(' + '), number ? words[number] : ''].filter(Boolean).join(', ');
}
