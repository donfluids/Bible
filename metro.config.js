// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ship the prebuilt SQLite database (assets/db/bible.db) as an app asset.
config.resolver.assetExts.push('db');

module.exports = config;
