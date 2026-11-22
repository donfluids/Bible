// The Malayalam app's database is over GitHub's 100 MB limit for a file, so it is kept in
// the repository compressed (assets/db/bible-ml.db.gz) and unpacked beside it here: after
// npm install (package.json "postinstall"), and by metro.config.js before a build. A copy
// already unpacked is used as it is unless the compressed file is newer.
//
//   node scripts/lib/unpack-db.cjs          # every assets/db/*.db.gz
//
// scripts/build-db.mjs writes the .gz with the .db, and gives the .db the same time.
const { existsSync, readFileSync, readdirSync, renameSync, statSync, utimesSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { gunzipSync } = require('node:zlib');

const DB_DIR = join(__dirname, '..', '..', 'assets', 'db');

function unpackDatabases() {
  let names = [];
  try {
    names = readdirSync(DB_DIR).filter((n) => n.endsWith('.db.gz'));
  } catch {
    return [];
  }
  const unpacked = [];
  for (const name of names) {
    const gz = join(DB_DIR, name);
    const db = gz.slice(0, -3);
    const packed = statSync(gz);
    if (existsSync(db) && statSync(db).mtimeMs >= packed.mtimeMs - 1000) continue;
    // Written beside it first, so a build never reads half a file.
    const part = `${db}.part`;
    writeFileSync(part, gunzipSync(readFileSync(gz)));
    renameSync(part, db);
    utimesSync(db, packed.atime, packed.mtime);
    unpacked.push(name.slice(0, -3));
  }
  return unpacked;
}

module.exports = { unpackDatabases };

if (require.main === module) {
  const done = unpackDatabases();
  if (done.length) console.log(`unpacked ${done.join(', ')}`);
}
