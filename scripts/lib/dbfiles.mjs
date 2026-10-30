// What the app is told about each built database (src/db.ts): its size, so a copy cut short
// on the phone is noticed and made again, and a hash of it, carried in the copy's name, so a
// rebuilt database reaches phones that have a copy even when its size is unchanged.
// data/db-builds.json keeps each database's build date and row hash, so a rebuild on
// another machine, or of a database that is not committed (bible-all.db), comes out the
// same file when nothing in it changed.
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const BUILDS = (root) => join(root, 'data', 'db-builds.json');

function readBuilds(root) {
  try {
    return JSON.parse(readFileSync(BUILDS(root), 'utf8'));
  } catch {
    return {};
  }
}

export function recordDatabase(root, edition, file) {
  const update = (name, value) => {
    const path = join(root, 'src', name);
    let table = {};
    try {
      table = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      // first build
    }
    table[edition] = value;
    writeFileSync(path, JSON.stringify(table, null, 1) + '\n');
  };
  update('dbSizes.json', statSync(file).size);
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  update('dbHashes.json', sha256.slice(0, 12));
  const db = new DatabaseSync(file, { readOnly: true });
  const built = db.prepare("SELECT value FROM meta WHERE key = 'built'").get()?.value ?? null;
  const content = contentHash(db);
  db.close();
  const builds = readBuilds(root);
  builds[edition] = { built, content, sha256 };
  writeFileSync(BUILDS(root), JSON.stringify(builds, null, 1) + '\n');
}

/**
 * A hash of a database's rows, all but its build date (meta 'built'), to tell whether a
 * rebuild changed anything.
 */
export function contentHash(db) {
  const hash = createHash('sha256');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name);
  for (const table of tables) {
    hash.update(`\u0000${table}\u0000`);
    for (const row of db.prepare(`SELECT * FROM "${table}"`).iterate()) {
      if (table === 'meta' && row.key === 'built') continue;
      for (const value of Object.values(row)) hash.update(value instanceof Uint8Array ? Buffer.from(value) : `${typeof value}:${value}\u0001`);
    }
  }
  return hash.digest('hex');
}

/**
 * The build date and row hash of a database already built, read before it is replaced:
 * from the file when there is one, else as recorded in data/db-builds.json; null if neither.
 */
export function previousBuild(file, root, edition) {
  const recorded = root ? readBuilds(root)[edition] : undefined;
  const fromRecord = recorded?.built && recorded?.content ? { built: recorded.built, content: recorded.content } : null;
  try {
    statSync(file);
  } catch {
    return fromRecord;
  }
  try {
    const db = new DatabaseSync(file, { readOnly: true });
    const built = db.prepare("SELECT value FROM meta WHERE key = 'built'").get()?.value ?? null;
    const content = contentHash(db);
    db.close();
    return built ? { built, content } : fromRecord;
  } catch {
    return fromRecord;
  }
}

/**
 * A rebuild that changed no rows keeps the earlier build date, so the file comes out the
 * same, its hash too, and phones with the earlier copy are not made to copy it again.
 */
export function keepBuildDate(db, previous) {
  if (previous && contentHash(db) === previous.content) db.prepare("UPDATE meta SET value = ? WHERE key = 'built'").run(previous.built);
}
