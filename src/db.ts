import { defaultDatabaseDirectory } from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Name of the on-device copy of the bundled database. The bundled file is copied
 * on first launch and kept. Bump the suffix whenever assets/db/bible.db is
 * rebuilt so devices that already have a copy pick up the new one.
 */
export const DATABASE_NAME = 'bible-v8.db';

export const DATABASE_ASSET = require('../assets/db/bible.db');

// expo-sqlite gives its directory as a plain path; the file API wants a file:// URI.
const DATABASE_DIR = defaultDatabaseDirectory.startsWith('file:') ? defaultDatabaseDirectory : `file://${defaultDatabaseDirectory}`;

/**
 * Whether the on-device copy is already in place. When it is, the database is opened
 * without the bundled asset: passing the asset makes expo-asset hash the whole 40 MB
 * file on every launch before the database opens, and keep a second copy of it in the
 * cache. A missing or truncated copy is imported from the asset as before.
 */
export function databaseCopyExists(): boolean {
  try {
    const file = new File(DATABASE_DIR, DATABASE_NAME);
    return file.exists && (file.size ?? 0) > 1_000_000;
  } catch {
    return false;
  }
}

/**
 * Delete copies left behind by earlier database versions (bible-v1.db and so on,
 * with any journal files), and the cache copy of the bundled asset that the first
 * import leaves. Each one is about 40 MB.
 */
export function removeStaleDatabases(): void {
  try {
    const dir = new Directory(DATABASE_DIR);
    if (dir.exists) {
      for (const entry of dir.list()) {
        const name = entry.name;
        if (!/^bible-v\d+\.db/.test(name) || name.startsWith(DATABASE_NAME)) continue;
        try {
          entry.delete();
        } catch {
          // Best effort; a locked file is retried on the next launch.
        }
      }
    }
    for (const entry of Paths.cache.list()) {
      if (/^ExponentAsset-.*\.db$/.test(entry.name)) entry.delete();
    }
  } catch {
    // Storage access can fail in previews; the app works without the cleanup.
  }
}
