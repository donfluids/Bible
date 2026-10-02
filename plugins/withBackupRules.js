// Expo config plugin: keep the Bible database out of Android's backup.
//
// Android backs up an app's files to the user's Google account and restores them on a
// new phone, but only up to 25 MB; the bundled Bible database (about 45 MB) is over that,
// so with it included nothing at all was backed up, bookmarks and notes included. The
// database lives in files/SQLite/bible/ (src/db.ts) and is copied again from the app on
// a new phone anyway, so it is excluded; settings, bookmarks, highlights and notes
// (files/SQLite/ExpoSQLiteStorage) are backed up.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const EXCLUDE = '<exclude domain="file" path="SQLite/bible/" />';

// Android 11 and older.
const FULL_BACKUP = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    ${EXCLUDE}
</full-backup-content>
`;

// Android 12 and newer: cloud backup and phone-to-phone transfer.
const DATA_EXTRACTION = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        ${EXCLUDE}
    </cloud-backup>
    <device-transfer>
        ${EXCLUDE}
    </device-transfer>
</data-extraction-rules>
`;

function withBackupRules(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'bible_backup_rules.xml'), FULL_BACKUP);
      fs.writeFileSync(path.join(dir, 'bible_data_extraction_rules.xml'), DATA_EXTRACTION);
      return cfg;
    },
  ]);
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) throw new Error('withBackupRules: no <application> in AndroidManifest.xml');
    app.$['android:allowBackup'] = 'true';
    app.$['android:fullBackupContent'] = '@xml/bible_backup_rules';
    app.$['android:dataExtractionRules'] = '@xml/bible_data_extraction_rules';
    return cfg;
  });
}

module.exports = withBackupRules;
