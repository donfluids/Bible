// Checks that the downloaded source texts (data/raw, from scripts/fetch-data.sh) are the
// ones the committed databases were built from: a SHA-256 of each source, as the build
// reads it (the unpacked folders, not the zips, which eBible.org remakes now and then),
// against data/sources.json. A source that changed upstream fails the check, so a rebuild
// never takes in a new text unnoticed; after reviewing the change, --update records it.
//
//   node scripts/check-sources.mjs            check
//   node scripts/check-sources.mjs --update   record the sources now in data/raw
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'data', 'raw');
const RECORD = join(ROOT, 'data', 'sources.json');
const SOURCES = [
  'kjv', 'web', 'mal2015', 'tam2017', 'hin2017', 'bsb', 'bdbglosses', 'openbible', 'step', 'ubs',
  'strongs-hebrew.js', 'strongs-greek.js', 'abbott-smith.tei.xml',
];

const IGNORED = /\.(css|htm|html|asc)$/i;

/** A hash of a file, or of a folder's files with their paths, in sorted order. */
function hashOf(path) {
  const hash = createHash('sha256');
  const walk = (p, rel) => {
    if (statSync(p).isDirectory()) {
      // eBible's copyright page, style sheets and signature are not read by the build.
      for (const name of readdirSync(p).sort()) if (!IGNORED.test(name)) walk(join(p, name), rel ? `${rel}/${name}` : name);
    } else {
      hash.update(`\u0000${rel}\u0000`);
      hash.update(readFileSync(p));
    }
  };
  walk(path, '');
  return hash.digest('hex');
}

const now = {};
for (const name of SOURCES) {
  try {
    now[name] = hashOf(join(RAW, name));
  } catch {
    console.error(`missing data/raw/${name}; run npm run fetch-data`);
    process.exit(1);
  }
}
if (process.argv.includes('--update')) {
  writeFileSync(RECORD, JSON.stringify(now, null, 1) + '\n');
  console.log(`recorded ${SOURCES.length} sources in data/sources.json`);
} else {
  const recorded = JSON.parse(readFileSync(RECORD, 'utf8'));
  const changed = SOURCES.filter((name) => recorded[name] !== now[name]);
  if (changed.length) {
    console.error(`sources differ from data/sources.json: ${changed.join(', ')}`);
    console.error('The text upstream has changed. Look at the change, then record it with: node scripts/check-sources.mjs --update');
    process.exit(1);
  }
  console.log(`sources: all ${SOURCES.length} as recorded`);
}
