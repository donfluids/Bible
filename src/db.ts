/**
 * Name of the on-device copy of the bundled database. The bundled file is copied
 * on first launch and kept. Bump the suffix whenever assets/db/bible.db is
 * rebuilt so devices that already have a copy pick up the new one.
 */
export const DATABASE_NAME = 'bible-v5.db';

export const DATABASE_ASSET = require('../assets/db/bible.db');
