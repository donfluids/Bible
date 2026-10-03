// Writes data/align/mal/hand-checked.json: the Malayalam word links of well-known
// verses as checked by hand. It starts from the links the database has now and applies
// the corrections below; scripts/build-db.mjs prefers these (newest) and leaves them out
// of its automatic relinking. Run after npm run build-db ml, then build again.
//
//   node scripts/hand-check-links.mjs
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { textHash } from './lib/tokens.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Verse -> { 'word': number to link (null to unlink) }. 'word#2' is the second time the
// word appears in the verse. Verses with no corrections were checked and found right.
const CHECKED = {
  '1:1:1': {},
  '19:23:1': {},
  '19:23:2': { 'പച്ചയായ': 'H1877', 'പുല്പുറങ്ങളിൽ': 'H4999' },
  '19:23:3': { 'തിരുനാമംനിമിത്തം': 'H8034' },
  '19:23:4': {},
  '19:23:5': { 'ശത്രുക്കൾ': 'H6887', 'കാൺകെ': 'H5048', 'കവിയുന്നു': 'H7310' },
  '19:23:6': { 'ആയുഷ്കാലമൊക്കെയും': 'H2416' },
  '20:3:5': {},
  '20:3:6': {},
  '23:40:31': { 'അടിച്ചു': null, 'കയറും': 'H5927' },
  '23:53:5': { 'അതിക്രമങ്ങൾനിമിത്തം': 'H6588' },
  '24:29:11': { 'ഞാൻ': 'H595', 'ഞാൻ#2': 'H595', 'പ്രത്യാശിക്കുന്ന': 'H8615', 'ശുഭഭാവി': 'H319', 'നിങ്ങളെക്കുറിച്ചു': 'H5921', 'നന്മെക്കത്രേയുള്ള': 'H7965' },
  '40:6:9': {},
  '40:6:10': { 'ആകേണമേ': 'G1096' },
  '40:6:11': {},
  '40:6:12': { 'ക്ഷമിച്ചിരിക്കുന്നതുപോലെ': 'G863' },
  '40:6:13': { 'നിനക്കുള്ളതല്ലോ': 'G4771' },
  '40:11:28': { 'അടുക്കൽ': 'G4314' },
  '40:28:19': { 'കഴിപ്പിച്ചും': 'G907' },
  // The Malayalam has "make disciples of all nations" in verse 20; the Greek words are
  // in verse 19.
  '40:28:20': { 'പ്രമാണിപ്പാൻ': 'G5083', 'സകലജാതികളെയും': 'G1484', 'ശിഷ്യരാക്കിക്കൊൾവിൻ': 'G3100' },
  '43:1:1': { 'ആദിയിൽ': 'G746', 'ആയിരുന്നു': 'G1510', 'ആയിരുന്നു#2': 'G1510' },
  '43:3:16': {},
  '43:14:6': { 'മുഖാന്തരമല്ലാതെ': 'G1223' },
  '45:3:23': {},
  '45:5:8': { 'നാം': 'G3165', 'ആയിരിക്കുമ്പോൾ': 'G1510', 'തന്നേ': 'G2089', 'തനിക്കു': 'G1438', 'നമ്മോടുള്ള': 'G3165' },
  '45:6:23': {},
  '45:8:28': { 'നിർണ്ണയപ്രകാരം': 'G4286' },
  '46:13:4': { 'ദീർഘമായി': 'G3114', 'കാണിക്കയും': 'G5541' },
  // Malayalam verse 22 ends with meekness, which the Greek has in verse 23.
  '48:5:22': { 'പരോപകാരം': 'G19', 'സൗമ്യത': 'G4240' },
  '49:2:8': { 'അതിന്നും': 'G3778', 'നിങ്ങൾ#2': 'G4771' },
  '49:2:9': { 'ആരും': 'G5100' },
  '50:4:13': { 'എന്നെ': 'G3165' },
  '58:11:1': { 'കാണാത്ത': 'G991', 'ആകുന്നു': 'G1510' },
};

const db = new DatabaseSync(join(ROOT, 'assets', 'db', 'bible-ml.db'), { readOnly: true });
const verses = [];
for (const [ref, fixes] of Object.entries(CHECKED)) {
  const [book, chapter, v] = ref.split(':').map(Number);
  const row = db.prepare("SELECT text, tags FROM verses WHERE translation = 'MAL' AND book = ? AND chapter = ? AND verse = ?").get(book, chapter, v);
  if (!row) throw new Error(`no verse ${ref}`);
  const prefix = book <= 39 ? 'H' : 'G';
  const links = new Map(); // start offset -> { e, n }
  let pos = 0;
  for (const t of row.tags.split(' ').filter(Boolean)) {
    const [gap, len, num] = t.split(',').map(Number);
    pos += gap;
    links.set(pos, { e: pos + len, n: prefix + num });
    pos += len;
  }
  for (const [key, n] of Object.entries(fixes)) {
    const [word, nth] = key.split('#');
    let at = -1;
    for (let i = 0; i < Number(nth ?? 1); i++) {
      do at = row.text.indexOf(word, at + 1);
      while (at > 0 && /[ഀ-ൿ]/.test(row.text[at - 1]));
      if (at < 0) throw new Error(`${ref}: "${key}" not found`);
    }
    if (n === null) links.delete(at);
    else links.set(at, { e: at + word.length, n });
  }
  const spans = [...links.entries()].sort((a, b) => a[0] - b[0]).map(([s, { e, n }]) => ({ s, e, n, c: 2 }));
  verses.push({ book, chapter, v, hash: textHash(row.text), hand: true, spans });
}
const out = join(ROOT, 'data', 'align', 'mal', 'hand-checked.json');
writeFileSync(out, JSON.stringify({ model: 'hand', created: new Date().toISOString(), verses }, null, 1) + '\n');
console.log(`${verses.length} verses written to ${out}`);
