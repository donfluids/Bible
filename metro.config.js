// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ship the prebuilt SQLite database as an app asset.
config.resolver.assetExts.push('db');

// Two editions are built from this code (see src/edition.ts). Each bundles only its
// own database: a require of assets/db/bible.db resolves to bible-<edition>.db.
const edition = process.env.BIBLE_EDITION || 'en';
config.cacheVersion = `edition-${edition}`;
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const target = moduleName.endsWith('/assets/db/bible.db') ? moduleName.replace(/bible\.db$/, `bible-${edition}.db`) : moduleName;
  return defaultResolve ? defaultResolve(context, target, platform) : context.resolveRequest(context, target, platform);
};

module.exports = config;
