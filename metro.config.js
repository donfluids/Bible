// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Malayalam database is kept compressed in the repository; unpacked here if needed.
require('./scripts/lib/unpack-db.cjs').unpackDatabases();

// Ship the prebuilt SQLite database as an app asset.
config.resolver.assetExts.push('db');
// The voice an app carries (assets/speech): its model and the verses' speech sounds.
config.resolver.assetExts.push('onnx', 'bin');

// Two editions are built from this code (see src/edition.ts). Each bundles only its
// own database: a require of assets/db/bible.db resolves to bible-<edition>.db.
const edition = process.env.BIBLE_EDITION || editionFromGradleProperties() || 'en';

// The generated Android project records its edition (plugins/withAndroidRelease.js).
function editionFromGradleProperties() {
  try {
    const text = require('fs').readFileSync(require('path').join(__dirname, 'android', 'gradle.properties'), 'utf8');
    const m = /^bible\.edition=(\w+)/m.exec(text);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
config.cacheVersion = `edition-${edition}`;
// Each app's interface languages, as src/edition.ts gives them.
const HOWTO_LANGUAGES = { en: ['en'], ml: ['en', 'ml'], ta: ['en', 'ta'], all: ['en', 'ml', 'ta', 'hi'] };
// Each app's welcome picture sets: the app and the interface language they show.
const WELCOME_SETS = { en: ['en-en'], ml: ['ml-en', 'ml-ml'], ta: ['ta-en', 'ta-ta'], all: ['en-en', 'all-ml', 'all-ta', 'all-hi'] };
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  let target = moduleName.endsWith('/assets/db/bible.db') ? moduleName.replace(/bible\.db$/, `bible-${edition}.db`) : moduleName;
  // Only the apps with the Malayalam Bible carry the Malayalam voice (about 50 MB); the others
  // get a one-byte file in its place. Each pair has two different names: Android cannot hold
  // two resources that differ only in their ending (hence ml-tiny.onnx and ml-letters.bin).
  const voice = (edition === 'ml' || edition === 'all') && process.env.BIBLE_NO_VOICE !== '1';
  // The welcome's pictures: an app carries the sets of its own interface languages
  // (src/screens/WelcomeScreen.tsx names them), and a blank in place of the others'.
  const welcome = /\/assets\/welcome\/([\w-]+)\/\w+\.jpg$/.exec(target);
  if (welcome && !WELCOME_SETS[edition].includes(welcome[1])) target = target.replace(/\/assets\/welcome\/.*$/, '/assets/howto/blank.png');
  // How to use's pictures: an app carries those of its own interface languages (src/edition.ts),
  // and a blank in place of the others'.
  const howto = /\/assets\/howto\/(\w+)\/\d+\.jpg$/.exec(target);
  if (howto && !HOWTO_LANGUAGES[edition].includes(howto[1])) target = target.replace(/\/assets\/howto\/.*$/, '/assets/howto/blank.png');
  if (target.endsWith('/assets/speech/voice.onnx')) target = target.replace(/voice\.onnx$/, voice ? 'ml-tiny.onnx' : 'no-model.onnx');
  if (target.endsWith('/assets/speech/voice.bin')) target = target.replace(/voice\.bin$/, voice ? 'ml-letters.bin' : 'no-sounds.bin');
  return defaultResolve ? defaultResolve(context, target, platform) : context.resolveRequest(context, target, platform);
};

module.exports = config;
