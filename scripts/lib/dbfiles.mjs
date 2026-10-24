// What the app is told about each built database (src/db.ts): its size, so a copy cut short
// on the phone is noticed and made again, and a hash of it, carried in the copy's name, so a
// rebuilt database reaches phones that have a copy even when its size is unchanged.
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
  update('dbHashes.json', createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12));
}
