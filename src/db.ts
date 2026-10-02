import { defaultDatabaseDirectory } from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';
import DATABASE_SIZES from './dbSizes.json';

/**
 * Name of the on-device copy of the bundled database. The bundled file is copied
 * on first launch and kept. Bump the suffix whenever assets/db/bible.db is
 * rebuilt so devices that already have a copy pick up the new one.
 */
export const DATABASE_NAME = 'bible-v10.db';

export const DATABASE_ASSET = require('../assets/db/bible.db');

/**
 * The copy lives in a folder of its own, files/SQLite/bible, which Android leaves out of
 * its backup (plugins/withBackupRules.js): at about 45 MB it would push the app over the
 * 25 MB backup limit, and then settings, bookmarks and notes would not be backed up
 * either. expo-sqlite takes the folder as a plain path; the file API wants a file:// URI.
 */
export const DATABASE_DIRECTORY = `${defaultDatabaseDirectory}/bible`;
const toUri = (path: string) => (path.startsWith('file:') ? path : `file://${path}`);
const BASE_DIR = toUri(defaultDatabaseDirectory);
const DATABASE_DIR = toUri(DATABASE_DIRECTORY);

function copyFile(): File {
  return new File(DATABASE_DIR, DATABASE_NAME);
}

/**
 * Whether the copy on the phone is complete: exactly the size of a bundled database
 * (scripts/build-db.mjs records the sizes in src/dbSizes.json). When it is, the database
 * is opened without the bundled asset, which otherwise makes expo-asset hash the whole
 * 40 MB file on every launch and keep a second copy of it in the cache.
 */
export function databaseCopyComplete(): boolean {
  try {
    const file = copyFile();
    return file.exists && Object.values(DATABASE_SIZES as Record<string, number>).includes(file.size ?? -1);
  } catch {
    return false;
  }
}

/**
 * Remove a copy that was cut short (the app closed during the first launch, or the phone
 * ran out of space), with its journal files, so it is copied again in full.
 */
export function removeIncompleteCopy(): void {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try {
      const f = new File(DATABASE_DIR, DATABASE_NAME + suffix);
      if (f.exists) f.delete();
    } catch {
      // Nothing to remove, or it is not accessible; the import overwrites it anyway.
    }
  }
}

/**
 * Delete copies left behind by earlier database versions (bible-v1.db and so on, with
 * any journal files, in the old folder or this one). Each one is about 40 MB. With
 * `assetCache`, also the cache copy of the bundled asset that the first import leaves;
 * that is skipped in the launch that made the copy, in case it has to be made again.
 */
export function removeStaleDatabases(assetCache: boolean): void {
  try {
    for (const dir of [new Directory(BASE_DIR), new Directory(DATABASE_DIR)]) {
      if (!dir.exists) continue;
      for (const entry of dir.list()) {
        const name = entry.name;
        if (!/^bible-v\d+\.db/.test(name) || (dir.uri.replace(/\/$/, '') === DATABASE_DIR.replace(/\/$/, '') && name.startsWith(DATABASE_NAME))) continue;
        try {
          entry.delete();
        } catch {
          // Best effort; a locked file is retried on the next launch.
        }
      }
    }
    if (assetCache) {
      for (const entry of Paths.cache.list()) {
        if (/^ExponentAsset-.*\.db$/.test(entry.name)) entry.delete();
      }
    }
  } catch {
    // Storage access can fail in previews; the app works without the cleanup.
  }
}
