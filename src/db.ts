import { defaultDatabaseDirectory } from 'expo-sqlite';
import { Directory } from 'expo-file-system';

/**
 * Name of the on-device copy of the bundled database. The bundled file is copied
 * on first launch and kept. Bump the suffix whenever assets/db/bible.db is
 * rebuilt so devices that already have a copy pick up the new one.
 */
export const DATABASE_NAME = 'bible-v7.db';

export const DATABASE_ASSET = require('../assets/db/bible.db');

/**
 * Delete copies left behind by earlier database versions (bible-v1.db and so on,
 * with any journal files). Each one is about 40 MB, so an app that has been
 * updated a few times would otherwise waste a lot of storage.
 */
export function removeStaleDatabases(): void {
  try {
    const dir = new Directory(defaultDatabaseDirectory);
    if (!dir.exists) return;
    for (const entry of dir.list()) {
      const name = entry.name;
      if (!/^bible-v\d+\.db/.test(name)) continue;
      if (name.startsWith(DATABASE_NAME)) continue;
      try {
        entry.delete();
      } catch {
        // Best effort; a locked file is retried on the next launch.
      }
    }
  } catch {
    // Storage access can fail in previews; the app works without the cleanup.
  }
}
