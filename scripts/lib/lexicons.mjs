// Fuller dictionary entries for the word sheet, keyed by Strong's number:
//   Abbott-Smith, A Manual Greek Lexicon of the New Testament (1922; TEI by the
//     translatable-exegetical-tools project, public domain): the Greek words.
//   BDB Glosses, the sense outline of Brown-Driver-Briggs (CrossWire module
//     BDBGlosses_Strongs, from Open Scriptures' Hebrew Lexicon, public domain): the Hebrew.
//
// Each entry is stored as lines of text with light markup the app renders:
//   ⟦book:chapter:verse|label⟧  a verse reference (tappable)
//   ⟪…⟫                         Greek or Hebrew words (original-language font)
//   ‹…›                         a gloss or English meaning (emphasised)
// A line may start with a sense label and a tab ("1.\t…", "Qal\t…").
import { readFileSync, existsSync } from 'node:fs';
import { readZLD } from './sword.mjs';

const OSIS = ('Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal ' +
  'Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev').split(' ');
const BOOK_ID = new Map(OSIS.map((b, i) => [b, i + 1]));

const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
// The markup characters themselves never appear in the sources; strip them to be sure.
const clean = (s) => s.replace(/[⟦⟧⟪⟫‹›\t]/g, '');

/** "Matt.8.10" or "Matt.8.10-Matt.8.12" as "40:8:10", or null. */
function refKey(osisRef) {
  const m = /^([1-3]?[A-Za-z]+)\.(\d+)(?:\.(\d+))?/.exec(osisRef);
  const id = m && BOOK_ID.get(m[1]);
  return id ? `${id}:${m[2]}:${m[3] ?? 1}` : null;
}

/** Inline TEI or OSIS markup as our light markup. */
function inline(xml) {
  return unescape(
    xml
      .replace(/<ref\b[^>]*osisRef="([^"]+)"[^>]*>([\s\S]*?)<\/ref>/g, (_, osis, label) => {
        const key = refKey(osis);
        const text = clean(unescape(label.replace(/<[^>]*>/g, '')).trim());
        return key ? `⟦${key}|${text}⟧` : text;
      })
      .replace(/<foreign\b[^>]*>([\s\S]*?)<\/foreign>/g, (_, w) => `⟪${clean(unescape(w.replace(/<[^>]*>/g, '')))}⟫`)
      .replace(/<(gloss|emph)\b[^>]*>([\s\S]*?)<\/\1>/g, (_, __, w) => `‹${clean(unescape(w.replace(/<[^>]*>/g, '')))}›`)
      .replace(/<hi\b[^>]*rend="italic"[^>]*>([\s\S]*?)<\/hi>/g, (_, w) => `‹${clean(unescape(w.replace(/<[^>]*>/g, '')))}›`)
      .replace(/<lb\b[^>]*\/>/g, ' ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .replace(/ ([,.;:)\]])/g, '$1')
    .trim();
}

// The forms of σύ ("you": σέ, σοί, σοῦ, ὑμᾶς, ὑμεῖς, ὑμῖν) are listed in the source
// under αὐτός; they belong to σύ.
const FILED_UNDER = { σύ: ['G4571', 'G4671', 'G4675', 'G5209', 'G5210', 'G5213'] };
const MISFILED = Object.fromEntries(Object.entries(FILED_UNDER).flatMap(([head, ids]) => ids.map((id) => [id, head])));

/** Abbott-Smith entries by Greek Strong's number ("G4102"). */
export function abbottSmith(path) {
  const out = new Map();
  if (!existsSync(path)) return out;
  const src = readFileSync(path, 'utf8');
  for (const [, n, body] of src.matchAll(/<entry\b[^>]*\bn="([^"]*)"[^>]*>([\s\S]*?)<\/entry>/g)) {
    // n is the headword then every number it covers: "εἰμί|G1488|G1510|…".
    const head = n.split('|')[0];
    const ids = [...n.split('|').slice(1).flatMap((x) => x.split(/[,\s]+/)), ...(FILED_UNDER[head] ?? [])]
      .filter((x) => /^G\d+$/.test(x) && (!MISFILED[x] || MISFILED[x] === head));
    if (!ids.length) continue;
    const lines = [];
    const form = /<form\b[^>]*>([\s\S]*?)<\/form>/.exec(body);
    if (form) lines.push(`⟪${clean(unescape(form[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim())}⟫`);
    const etym = /<etym\b[^>]*>([\s\S]*?)<\/etym>/.exec(body);
    if (etym) lines.push(inline(etym[1]));
    // The text after the form and etymology: top-level senses each on a line.
    let rest = body.replace(/<note\b[^>]*type="occurrences[^"]*"[^>]*>[\s\S]*?<\/note>/g, '').replace(/<form\b[\s\S]*?<\/form>/, '').replace(/<etym\b[\s\S]*?<\/etym>/, '');
    let depth = 0;
    let line = '';
    let label = '';
    const flush = () => {
      const text = inline(line);
      if (text) lines.push(label ? `${label}\t${text}` : text);
      line = '';
      label = '';
    };
    for (const part of rest.split(/(<sense\b[^>]*>|<\/sense>)/)) {
      if (part.startsWith('<sense')) {
        if (depth === 0) {
          flush();
          label = (/\bn="([^"]*)"/.exec(part)?.[1] ?? '').trim();
        } else {
          const n = /\bn="([^"]*)"/.exec(part)?.[1];
          if (n) line += /^\(/.test(n) ? ` ${n} ` : ` (${n.replace(/\.$/, '')}) `;
        }
        depth++;
      } else if (part === '</sense>') {
        depth--;
        if (depth === 0) flush();
      } else {
        line += part;
      }
    }
    flush();
    const entry = lines.filter(Boolean).join('\n');
    for (const id of ids) out.set(id, out.has(id) ? `${out.get(id)}\n${entry}` : entry);
  }
  return out;
}

/** BDB Glosses entries by Hebrew Strong's number ("H539"). */
export function bdbGlosses(base) {
  const out = new Map();
  if (!existsSync(base + '.idx')) return out;
  for (const [key, xml] of readZLD(base)) {
    const m = /^H0*(\d+)$/.exec(key);
    if (!m) continue;
    // Homonyms share an entry ("H2617a … H2617b …"); each starts a new line.
    let body = xml.replace(/<title>[\s\S]*?<\/title>/g, '\n');
    // Stems (Qal, Niph, Hiph …) start lines; numbered senses stay in the line.
    const lines = [];
    let depth = 0;
    let line = '';
    let label = '';
    const flush = () => {
      const text = inline(line).replace(/^\.\s*/, '').replace(/\s*\.\s*\./g, '.').trim();
      if (text) lines.push(label ? `${label}\t${text}` : text);
      line = '';
      label = '';
    };
    for (const part of body.split(/(<sense\b[^>]*>|<\/sense>|\n)/)) {
      if (part === '\n') { if (depth === 0) flush(); continue; }
      if (part.startsWith('<sense')) {
        const n = /\bn="([^"]*)"/.exec(part)?.[1] ?? '';
        if (depth === 0 && !/^\d+$/.test(n)) { flush(); label = n; }
        else line += ` ${n}. `;
        depth++;
      } else if (part === '</sense>') {
        depth--;
        if (depth === 0) flush();
      } else {
        line += part.replace(/^\s*\.\s*/, ' ');
      }
    }
    flush();
    // When the number has one BDB entry, its headword (⟪…⟫), which the sheet already shows,
    // is dropped. When it has several (H7462: a place name, then three verbs), each keeps
    // its headword so the lines say which word they describe.
    const homonyms = (xml.match(/<title>/g) ?? []).length > 1;
    const entry = lines.map((l, i) => (i === 0 && !homonyms ? l.replace(/^⟪[^⟫]*⟫\s*/, '') : l)).filter(Boolean).join('\n');
    if (entry) out.set(`H${m[1]}`, entry);
  }
  return out;
}
