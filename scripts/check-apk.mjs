// What a built APK asks of the phone, checked against what the apps promise: the only
// permission is vibration, and nothing runs that was not put there on purpose. A library
// that brings a permission or a component of its own (as ONNX Runtime 1.29 did, with its
// telemetry) fails the build here instead of reaching a phone.
//   node scripts/check-apk.mjs <app.apk> [edition]
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [apk, edition] = process.argv.slice(2);
if (!apk || !existsSync(apk)) {
  console.error('usage: node scripts/check-apk.mjs <app.apk> [edition]');
  process.exit(2);
}
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const tools = sdk && existsSync(join(sdk, 'build-tools')) ? readdirSync(join(sdk, 'build-tools')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : [];
if (tools.length === 0) {
  console.error('no Android build-tools found (ANDROID_HOME)');
  process.exit(2);
}
const bin = (name) => join(sdk, 'build-tools', tools[tools.length - 1], name);
const run = (tool, args) => execFileSync(bin(tool), args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const permissions = run('aapt2', ['dump', 'permissions', apk]);
const pkg = /^package: (\S+)/m.exec(permissions)?.[1] ?? '';
const asked = [...permissions.matchAll(/^uses-permission: name='([^']+)'/gm)].map((m) => m[1]).sort();
// Vibration, and the permission Android's own library defines to keep the app's broadcasts to itself.
const allowed = ['android.permission.VIBRATE', `${pkg}.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`].sort();

// The providers, services and receivers the apps are known to carry (file sharing, the
// photo picker, start-up, Android's profile installer); anything else is new.
const COMPONENTS = [
  'androidx.profileinstaller.ProfileInstallReceiver',
  'androidx.startup.InitializationProvider',
  'com.canhub.cropper.CropFileProvider',
  'com.google.android.gms.metadata.ModuleDependencies',
  'expo.modules.clipboard.ClipboardFileProvider',
  'expo.modules.filesystem.FileSystemFileProvider',
  'expo.modules.imagepicker.fileprovider.ImagePickerFileProvider',
  'expo.modules.sharing.SharingFileProvider',
];
const tree = run('aapt2', ['dump', 'xmltree', '--file', 'AndroidManifest.xml', apk]).split('\n');
const components = [];
for (let i = 0; i < tree.length; i++) {
  if (!/E: (provider|service|receiver) /.test(tree[i])) continue;
  const depth = tree[i].search(/\S/);
  for (let j = i + 1; j < tree.length && tree[j].search(/\S/) > depth; j++) {
    const name = /A: .*android:name\([^)]*\)="([^"]+)"/.exec(tree[j]);
    if (name) {
      components.push(name[1]);
      break;
    }
  }
}

const problems = [];
const extra = asked.filter((p) => !allowed.includes(p));
if (extra.length) problems.push(`permissions the apps do not have: ${extra.join(', ')}`);
if (!asked.includes('android.permission.VIBRATE')) problems.push('the vibration permission is missing');
const unknown = [...new Set(components)].filter((c) => !COMPONENTS.includes(c));
if (unknown.length) problems.push(`components not on the list in scripts/check-apk.mjs: ${unknown.join(', ')}`);

// The library that runs the app's own voice belongs only in the apps that carry the voice.
if (edition) {
  const files = execFileSync('unzip', ['-Z1', apk], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const hasRuntime = /libonnxruntime\.so/.test(files);
  const wantsRuntime = edition === 'ml' || edition === 'all';
  if (hasRuntime !== wantsRuntime) problems.push(wantsRuntime ? 'the voice library is missing' : `the voice library is in the ${edition} app, which has no voice`);
}

console.log(`${pkg}: permissions ${asked.join(', ') || 'none'}; ${new Set(components).size} components`);
if (problems.length) {
  console.error(`APK check failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('APK check passed');
