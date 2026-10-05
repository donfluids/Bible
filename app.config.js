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
    package: 'org.riversresearch.bible',
    icons: './assets/icons/en',
    // Splash colours are the app's own backgrounds, so opening does not flash.
    splashBackground: '#FBF8F1',
    splashBackgroundDark: '#15130F',
    adaptiveBackground: '#F4EFE4',
  },
  ml: {
    name: 'വേദപുസ്തകം',
    slug: 'bible-malayalam',
    package: 'org.riversresearch.bible.malayalam',
    icons: './assets/icons/ml',
    splashBackground: '#F7F9F2',
    splashBackgroundDark: '#111511',
    adaptiveBackground: '#EEF3E6',
  },
};

// Typefaces built into the app (src/fonts.ts uses them by file name): the icons
// (scripts/make-icon-font.py) and Hebrew in both editions, Malayalam only in the
// Malayalam one.
const FONT = (pkg, file) => `./node_modules/@expo-google-fonts/${pkg}/${file.split('_')[1].replace('.ttf', '')}/${file}`;
const ICONS = './assets/fonts/BibleIcons.ttf';
const FONTS = {
  en: [ICONS, FONT('noto-serif-hebrew', 'NotoSerifHebrew_500Medium.ttf')],
  ml: [
    ICONS,
    FONT('noto-serif-hebrew', 'NotoSerifHebrew_500Medium.ttf'),
    FONT('noto-sans-malayalam', 'NotoSansMalayalam_400Regular.ttf'),
    FONT('noto-sans-malayalam', 'NotoSansMalayalam_700Bold.ttf'),
    FONT('noto-serif-malayalam', 'NotoSerifMalayalam_400Regular.ttf'),
    FONT('noto-serif-malayalam', 'NotoSerifMalayalam_700Bold.ttf'),
  ],
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
  plugins.push(['expo-font', { fonts: FONTS[edition] }]);
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
