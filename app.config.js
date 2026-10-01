// Extends app.json with per-edition and per-build values.
//
// BIBLE_EDITION: "en" (default) is the English app with the KJV and WEB; "ml" is the
// Malayalam app (വേദപുസ്തകം) with the Sathyavedapusthakam and the KJV. The edition
// picks the name, identifiers, icon, splash and, through metro.config.js, the database.
// BIBLE_VERSION_CODE: the Android version code; the release workflow passes its run
// number so every build can be installed over the previous one.
const EDITIONS = {
  en: {
    name: 'Bible',
    slug: 'bible',
    package: 'org.donfluids.bible',
    icons: './assets/icons/en',
    splashBackground: '#F4EFE4',
    splashBackgroundDark: '#15130F',
    adaptiveBackground: '#F4EFE4',
  },
  ml: {
    name: 'വേദപുസ്തകം',
    slug: 'bible-malayalam',
    package: 'org.donfluids.bible.malayalam',
    icons: './assets/icons/ml',
    splashBackground: '#EEF3E6',
    splashBackgroundDark: '#0F1A12',
    adaptiveBackground: '#EEF3E6',
  },
};

// Gradle evaluates this file again during a native build, without the shell
// environment, so fall back to the edition recorded by plugins/withAndroidRelease.js.
function editionFromGradleProperties() {
  try {
    const text = require('fs').readFileSync(require('path').join(__dirname, 'android', 'gradle.properties'), 'utf8');
    const m = /^bible\.edition=(\w+)/m.exec(text);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

module.exports = ({ config }) => {
  const edition = process.env.BIBLE_EDITION || editionFromGradleProperties() || 'en';
  const e = EDITIONS[edition];
  if (!e) throw new Error(`Unknown BIBLE_EDITION "${edition}"; expected ${Object.keys(EDITIONS).join(' or ')}`);
  const plugins = (config.plugins || []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') {
      return [
        'expo-splash-screen',
        {
          ...plugin[1],
          image: `${e.icons}/splash-icon.png`,
          backgroundColor: e.splashBackground,
          dark: { image: `${e.icons}/splash-icon-dark.png`, backgroundColor: e.splashBackgroundDark },
        },
      ];
    }
    return plugin;
  });
  return {
    ...config,
    name: e.name,
    slug: e.slug,
    icon: `${e.icons}/icon.png`,
    plugins,
    ios: { ...config.ios, bundleIdentifier: e.package },
    android: {
      ...config.android,
      package: e.package,
      versionCode: Number(process.env.BIBLE_VERSION_CODE) || 1,
      adaptiveIcon: {
        backgroundColor: e.adaptiveBackground,
        foregroundImage: `${e.icons}/android-icon-foreground.png`,
        backgroundImage: `${e.icons}/android-icon-background.png`,
        monochromeImage: `${e.icons}/android-icon-monochrome.png`,
      },
    },
    web: { ...config.web, favicon: `${e.icons}/favicon.png` },
    extra: { ...config.extra, edition },
  };
};
