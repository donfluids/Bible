// The forms of one Malayalam or Tamil word under one Strong's number, grouped and labelled
// for the word sheet's renderings and headline. Used by scripts/build-db.mjs; tested by
// scripts/test-logic.mts.

// Forms of one Malayalam word under one Strong's number, grouped by stem: the shortest
// form heads the group, and a later form joins it when it starts with the head's stem
// (three characters at least, or two when the head is a base form: ജനം, ജനത്തെ) or shares
// most of the head (സൃഷ്ടിച്ച, സൃഷ്ടിക്കും). The stem is the head less a final ം ു ്, or with
// a final chillu written as its consonant, since inflections continue from it (മകൻ: മകനെ,
// മകനായ). A group is labelled by its commonest base form (one ending in ം, ു, ് or a
// chillu, like ദൈവം or മകൻ) unless that form is rare in the group, and then by the group's
// commonest form. A label that ends in a case ending (യെരൂശലേമിൽ, ജനത്തെ, ആലയത്തിന്റെ)
// gives way to the plain form it is built on (its stem starts the label), when that has a
// tenth of its uses (യെരൂശലേം) or is the head in ു that the other forms continue
// (ക്രിസ്തു: ക്രിസ്തുവിൽ; not a dative or past in …ന്നു, …ക്കു).
const CHILLU = { 'ൻ': 'ന', 'ർ': 'ര', 'ൽ': 'ല', 'ൾ': 'ള', 'ൺ': 'ണ' };
export const mlStem = (w) => {
  const last = w.slice(-1);
  return CHILLU[last] ? w.slice(0, -1) + CHILLU[last] : w.replace(/[ംു്]+$/u, '');
};
// Not "…ും" (and, also) or a case ending such as "…ത്തു", "…ക്കു", "…ന്നു".
export const isBaseForm = (w) => /[്ൻർൽൾൺ]$|[^ു]ം$|[^ുത്കന്ട]ു$/u.test(w) && !/(ത്തു|ക്കു|ന്നു|ട്ടു)$/u.test(w);
// Malayalam case endings a noun's label should not carry: locative, genitive, instrumental,
// sociative, accusative (…ിൽ, …ിൽവെച്ചു, …ിലെ, …ിന്റെ, …ുടെ, …ാൽ, …ോടു, …ത്തെ, …നെ; not …വരെ).
const ML_CASE_ENDING = /(ിൽ|ിൽവെച്ചു|ിലെ|ിലും|ിലേക്കു|ിൽനിന്നു|ിങ്കൽ|ന്റെ|ുടെ|ാൽ|ോടു|ോട്|ത്തെ|[നളയ]െ|(?<!വ)രെ)$/u;
function sharedStart(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}
// Tamil forms: the stem is the head less a final ம் (ராஜ்யம்: ராஜ்யத்தை), ் (தேவன்: தேவனை)
// or ு; a base form is one without a case ending or the attached "and" (உம்).
export const taStem = (w) => w.replace(/ம்$/u, '').replace(/[்ு]$/u, '');
// Tamil nouns end in a consonant (தேவன், விசுவாசம், ஜீவன்) or ு (அன்பு); forms with a case
// ending, "and" (உம்), or an adjectival or adverbial ending (தேவனாகிய, …ஆக, …ஏ) are not base forms,
export const isTaBaseForm = (w) =>
  /[்ு]$/u.test(w) && !/(க்கு|த்தில்|யில்|ில்|ால்|ும்|ிடம்|ிடத்தில்|த்து|ற்கு)$/u.test(w) &&
  // nor one ending in the consonant a following word doubles (வார்த்தையைக் கேட்டு)
  !/[ைாிீெேொோ][கசதப]்$/u.test(w);
export function groupForms(entries, stemOf = mlStem, isBase = isBaseForm) {
  const groups = [];
  const sorted = [...entries].sort((a, b) => a.display.length - b.display.length || b.refs.length - a.refs.length);
  for (const e of sorted) {
    const g = groups.find((x) => {
      if ((x.stem.length >= 3 || (x.stem.length === 2 && isBase === isBaseForm && isBase(x.head))) && e.display.startsWith(x.stem)) return true;
      const n = sharedStart(x.head, e.display);
      return n >= 5 && n >= 0.6 * x.head.length;
    });
    if (g) g.members.push(e);
    else groups.push({ stem: stemOf(e.display), head: e.display, members: [e] });
  }
  return groups.map((g) => {
    const commonest = (list) => list.reduce((a, b) => (b.refs.length > a.refs.length ? b : a));
    const top = commonest(g.members);
    const bases = g.members.filter((m) => isBase(m.display));
    const base = bases.length ? commonest(bases) : null;
    // Else the shortest form that is still common in the group.
    const shortCommon = [...g.members].sort((a, b) => a.display.length - b.display.length).find((m) => m.refs.length >= top.refs.length * 0.3);
    g.display = base && base.refs.length >= top.refs.length * 0.3 ? base.display : (shortCommon ?? top).display;
    if (isBase === isBaseForm && ML_CASE_ENDING.test(g.display)) {
      const label = g.members.find((m) => m.display === g.display);
      const headInU = (m) => m.display === g.head && /ു$/u.test(m.display) && !/(ന്നു|ക്കു)$/u.test(m.display) && g.members.some((o) => o !== m && o.display.startsWith(g.head.slice(0, -1)));
      const plain = g.members.filter(
        (m) => !ML_CASE_ENDING.test(m.display) && g.display.startsWith(mlStem(m.display)) && (headInU(m) || (isBase(m.display) && m.refs.length >= label.refs.length * 0.1)),
      );
      if (plain.length) g.display = commonest(plain).display;
    }
    const seen = new Set();
    const refs = [];
    for (const m of g.members) {
      for (let i = 0; i < m.refs.length; i += 3) {
        const key = (m.refs[i] << 16) | (m.refs[i + 1] << 8) | m.refs[i + 2];
        if (!seen.has(key)) { seen.add(key); refs.push([m.refs[i], m.refs[i + 1], m.refs[i + 2]]); }
      }
    }
    refs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    return { display: g.display, refs: refs.flat() };
  });
}
