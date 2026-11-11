// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  let target = moduleName.endsWith('/assets/db/bible.db') ? moduleName.replace(/bible\.db$/, `bible-${edition}.db`) : moduleName;
  // Only the apps with the Malayalam Bible carry the Malayalam voice (63 MB); the others
  // get a one-byte file in its place.
  const voice = edition === 'ml' || edition === 'all';
  if (target.endsWith('/assets/speech/voice.onnx')) target = target.replace(/voice\.onnx$/, voice ? 'ml-meera.onnx' : 'none.onnx');
  if (target.endsWith('/assets/speech/voice.bin')) target = target.replace(/voice\.bin$/, voice ? 'ml.bin' : 'none.bin');
  return defaultResolve ? defaultResolve(context, target, platform) : context.resolveRequest(context, target, platform);
};

module.exports = config;
