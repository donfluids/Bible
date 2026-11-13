// Checks a built iPhone app against the promises the apps make: no internet, no tracking,
// nothing collected. An iPhone has no "internet permission" for the system to withhold, so
// the promise rests on what the app carries; this fails the build when that changes.
//   node scripts/check-ipa.mjs <path to the .app folder or the .ipa> <en|ml|ta|all>
// It reads: the app's settings (Info.plist), Expo's (Expo.plist), the privacy manifest,
// the programs inside for the names of tracking and reporting kits, and this repository's
// own code for calls to the network.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [target, edition] = process.argv.slice(2);
if (!target || !['en', 'ml', 'ta', 'all'].includes(edition)) {
  console.error('usage: node scripts/check-ipa.mjs <.app folder or .ipa> <en|ml|ta|all>');
  process.exit(2);
}

const problems = [];
const fail = (text) => problems.push(text);

/** The .app folder: the one given, or the one inside the .ipa. */
function appFolder() {
  if (statSync(target).isDirectory()) return target;
  const out = mkdtempSync(join(tmpdir(), 'check-ipa-'));
  execFileSync('unzip', ['-q', target, '-d', out]);
  const payload = join(out, 'Payload');
  return join(payload, readdirSync(payload).find((n) => n.endsWith('.app')));
}

/** A property list as an object: plutil on a Mac, Python elsewhere. */
function plist(path) {
  try {
    return JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    const code = 'import plistlib,json,sys;print(json.dumps(plistlib.load(open(sys.argv[1],"rb")),default=str))';
    return JSON.parse(execFileSync('python3', ['-I', '-c', code, path], { encoding: 'utf8' }));
  }
}

function everyFile(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) everyFile(path, out);
    else out.push(path);
  }
  return out;
}

const app = appFolder();

// 1. The app's settings.
const info = plist(join(app, 'Info.plist'));
if (info.CFBundleURLTypes) fail(`Info.plist registers a link scheme (CFBundleURLTypes): ${JSON.stringify(info.CFBundleURLTypes)}`);
const transport = info.NSAppTransportSecurity ?? {};
for (const [key, value] of Object.entries(transport)) {
  if (key === 'NSAllowsArbitraryLoads' && value === false) continue;
  fail(`Info.plist loosens transport security: ${key} = ${JSON.stringify(value)}`);
}
// The one thing the app asks the reader for: a photo for a card, through the photo picker.
const ASKS = new Set(['NSPhotoLibraryUsageDescription']);
for (const key of Object.keys(info)) if (/UsageDescription$/.test(key) && !ASKS.has(key)) fail(`Info.plist asks for something new: ${key}`);
for (const key of ['UIBackgroundModes', 'UIFileSharingEnabled', 'LSSupportsOpeningDocumentsInPlace', 'NSBonjourServices']) {
  if (info[key] && !(Array.isArray(info[key]) && info[key].length === 0)) fail(`Info.plist sets ${key}: ${JSON.stringify(info[key])}`);
}

// 2. No updates fetched over the air.
const expoPlist = join(app, 'Expo.plist');
if (existsSync(expoPlist) && plist(expoPlist).EXUpdatesEnabled !== false) fail('Expo.plist: over-the-air updates are not switched off');

// 3. The privacy manifest: no tracking, nothing collected.
const privacyPath = join(app, 'PrivacyInfo.xcprivacy');
if (!existsSync(privacyPath)) fail('the app has no privacy manifest (PrivacyInfo.xcprivacy)');
else {
  const privacy = plist(privacyPath);
  if (privacy.NSPrivacyTracking !== false) fail('privacy manifest: tracking is not declared off');
  if ((privacy.NSPrivacyCollectedDataTypes ?? []).length) fail(`privacy manifest: collects ${JSON.stringify(privacy.NSPrivacyCollectedDataTypes)}`);
  if ((privacy.NSPrivacyTrackingDomains ?? []).length) fail(`privacy manifest: tracking domains ${JSON.stringify(privacy.NSPrivacyTrackingDomains)}`);
}

// 4. No tracking, advertising or crash-reporting kit in the programs.
const KITS = ['FirebaseCore', 'FirebaseAnalytics', 'Crashlytics', 'GoogleAnalytics', 'GoogleMobileAds', 'FBSDKCore', 'Sentry', 'Bugsnag', 'Amplitude', 'Mixpanel', 'SEGAnalytics', 'AppCenter', 'Flurry', 'AppsFlyer', 'AdjustSdk', 'OneSignal', 'ASIdentifierManager', 'ATTrackingManager', 'SKAdNetwork'];
const files = everyFile(app);
const programs = files.filter((f) => {
  const fd = readFileSync(f).subarray(0, 4).toString('hex');
  return ['cffaedfe', 'cafebabe', 'cefaedfe', 'bebafeca'].includes(fd);
});
if (programs.length === 0) fail('no program found in the app (wrong folder?)');
for (const program of programs) {
  const body = readFileSync(program).toString('latin1');
  for (const kit of KITS) if (body.includes(kit)) fail(`${program.slice(app.length + 1)} carries ${kit}`);
}

// 5. The voice's model only where there is a voice.
const hasModel = files.some((f) => f.endsWith('ml-meera.onnx'));
if (hasModel !== (edition === 'ml' || edition === 'all')) fail(hasModel ? 'the voice model is in an app without the voice' : 'the voice model is missing');

// 6. This repository's own code never calls the network. The one fetch reads a file the
// reader picked, in the web preview only (src/notebookFiles.ts).
const NETWORK = /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|URLSession|NSURLConnection|CFNetwork|HttpURLConnection|okhttp|java\.net\./;
const ALLOWED = new Set(['src/notebookFiles.ts']);
const sources = [join(ROOT, 'App.tsx'), ...everyFile(join(ROOT, 'src')), ...everyFile(join(ROOT, 'modules')).filter((f) => !f.includes('/build/'))].filter((f) => /\.(ts|tsx|kt|swift|m|mm|java)$/.test(f));
for (const source of sources) {
  const name = source.slice(ROOT.length + 1);
  if (ALLOWED.has(name)) continue;
  readFileSync(source, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (NETWORK.test(line) && !/^\s*(\/\/|\*)/.test(line)) fail(`${name}:${i + 1} calls the network: ${line.trim().slice(0, 100)}`);
    });
}

console.log(`${info.CFBundleIdentifier} ${info.CFBundleShortVersionString}: ${programs.length} programs, ${sources.length} source files read`);
if (problems.length) {
  for (const p of problems) console.error(`  ${p}`);
  console.error('iPhone app check FAILED');
  process.exit(1);
}
console.log('iPhone app check passed');
