// Expo config plugin: record the edition in the generated iOS project.
//
// The edition is chosen with BIBLE_EDITION when the project is generated
// (`BIBLE_EDITION=ml npx expo prebuild --platform ios`). Xcode later bundles the
// JavaScript and reads the app config again in build phases that do not see the shell
// that ran prebuild. Without the edition there, metro.config.js would bundle the English
// database into the Malayalam app. Those build phases source ios/.xcode.env, so the
// edition is exported from it. Android records it in gradle.properties instead
// (plugins/withAndroidRelease.js).
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const LINE = /^export BIBLE_EDITION=.*$/m;

function withIosEdition(config, { edition }) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, '.xcode.env');
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      const line = `export BIBLE_EDITION=${edition}`;
      const next = LINE.test(current)
        ? current.replace(LINE, line)
        : `${current}${current && !current.endsWith('\n') ? '\n' : ''}\n# Bible edition this project was generated for (plugins/withIosEdition.js).\n${line}\n`;
      fs.writeFileSync(file, next);
      return cfg;
    },
  ]);
}

module.exports = withIosEdition;
