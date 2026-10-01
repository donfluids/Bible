// Extends app.json with values that change per build.
// BIBLE_VERSION_CODE: the Android version code. Every build that may be installed
// over a previous one needs a higher number; the release workflow passes its run number.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: Number(process.env.BIBLE_VERSION_CODE) || 1,
  },
});
