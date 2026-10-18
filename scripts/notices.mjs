// Builds src/notices.json: the third-party software in the Android app, with each
// package's licence and copyright lines, for the Sources and licences screen.
//
//   npx expo export --platform android --source-maps --output-dir /tmp/map
//   (cd android && ./gradlew :app:dependencies --configuration releaseRuntimeClasspath -q > /tmp/deps.txt)
//   node scripts/notices.mjs /tmp/map/_expo/static/js/android/index-*.map /tmp/deps.txt
//
// JavaScript packages are those whose files are in the bundle (from its source map),
// plus the app's own dependencies, which carry native code. Android libraries are the
// release runtime classpath; their licences come from their POM files in the Gradle
// cache, or from the table below. The script stops on a licence it does not know.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [mapPath, depsPath] = process.argv.slice(2);
if (!mapPath || !depsPath) {
  console.error('usage: node scripts/notices.mjs <bundle.map> <gradle-deps.txt>');
  process.exit(1);
}

// Licence names as the screen shows them.
const SPDX = {
  MIT: 'MIT',
  ISC: 'ISC',
  'BSD-2-Clause': 'BSD-2-Clause',
  'BSD-3-Clause': 'BSD-3-Clause',
  'Apache-2.0': 'Apache-2.0',
  'The Apache Software License, Version 2.0': 'Apache-2.0',
  'The Apache License, Version 2.0': 'Apache-2.0',
  'Apache License, Version 2.0': 'Apache-2.0',
  'Apache License 2.0': 'Apache-2.0',
  'Apache 2.0': 'Apache-2.0',
  'Apache-2.0 License': 'Apache-2.0',
  'MIT License': 'MIT',
  'The MIT License': 'MIT',
  'BSD License': 'BSD-3-Clause',
  'New BSD License': 'BSD-3-Clause',
  'The 3-Clause BSD License': 'BSD-3-Clause',
};
const spdx = (name) => SPDX[name?.trim()] ?? null;

// --- JavaScript packages --------------------------------------------------------------
const map = JSON.parse(readFileSync(mapPath, 'utf8'));
const dirs = new Map(); // package name -> directory
const addDir = (name, dir) => {
  if (!dirs.has(name) && existsSync(join(dir, 'package.json'))) dirs.set(name, dir);
};
for (const src of map.sources) {
  const i = src.lastIndexOf('node_modules/');
  if (i < 0) continue;
  const parts = src.slice(i + 'node_modules/'.length).split('/');
  const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
  // Paths are relative to the project ("/node_modules/…"), nested ones included.
  const base = src.slice(0, i).replace(/^(\.\.\/)+/, '');
  addDir(name, join(ROOT, base, 'node_modules', name));
}
const app = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
for (const name of Object.keys(app.dependencies)) addDir(name, join(ROOT, 'node_modules', name));

// The bundle's development-only tooling is not shipped code; fonts are listed with the fonts.
const SKIP = /^(@expo\/cli|@expo\/devtools|@expo-google-fonts\/)/;
// Packages without a licence file of their own take their project's notice.
const NOTICE_FALLBACK = { '@react-native/': 'Copyright (c) Meta Platforms, Inc. and affiliates.' };

const licenceFile = (dir) => {
  const file = readdirSync(dir).find((f) => /^licen[cs]e/i.test(f));
  return file ? join(dir, file) : null;
};

function copyrights(dir, name) {
  const file = licenceFile(dir);
  const lines = file ? readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => /^copyright\b/i.test(l) && !/notice|holders? (and|or|be)|liable/i.test(l)) : [];
  if (lines.length) return [...new Set(lines)];
  for (const [prefix, line] of Object.entries(NOTICE_FALLBACK)) if (name.startsWith(prefix)) return [line];
  return [];
}

const packages = [];
const problems = [];
for (const [name, dir] of [...dirs].sort(([a], [b]) => a.localeCompare(b))) {
  if (SKIP.test(name)) continue;
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const licence = spdx(typeof pkg.license === 'string' ? pkg.license : pkg.license?.type);
  const lines = copyrights(dir, name);
  if (!licence) problems.push(`${name}: licence "${pkg.license}"`);
  if (!lines.length) problems.push(`${name}: no copyright line`);
  // An MIT notice is the one licence text plus the package's copyright line; the BSD and
  // ISC licences vary (a BSD licence names its holder), so their own text is kept.
  const text = licence && licence !== 'MIT' ? readFileSync(licenceFile(dir), 'utf8').trim() : undefined;
  packages.push({ name, version: pkg.version, licence, copyright: lines, text });
}

// --- Android libraries ----------------------------------------------------------------
// From the dependency tree: "+--- group:artifact:requested -> resolved".
const coords = new Map();
for (const line of readFileSync(depsPath, 'utf8').split('\n')) {
  const m = /[+\\]--- ([\w.-]+):([\w.-]+)(?::([\w.+-]+))?(?: -> ([\w.+-]+))?/.exec(line);
  if (!m || line.includes('project :')) continue;
  const [, group, artifact, requested, resolved] = m;
  const version = resolved ?? requested;
  if (!version || version === '+') continue;
  coords.set(`${group}:${artifact}`, version);
}

// Libraries that are this project's JavaScript packages (listed above) are left out.
const FROM_JS = /^(host\.exp\.exponent:|expo\.modules\.|com\.facebook\.react:)/;
// Licences of groups whose POMs do not say, checked against each project's licence file.
const GROUP_LICENCE = [
  [/^androidx\./, 'Apache-2.0'],
  [/^com\.google\.android\.material$/, 'Apache-2.0'],
  [/^com\.google\.(guava|errorprone|code\.gson)$/, 'Apache-2.0'],
  [/^com\.google\.code\.findbugs$/, 'Apache-2.0'],
  [/^org\.jetbrains(\.kotlin|\.kotlinx)?$/, 'Apache-2.0'],
  [/^com\.squareup\.(okhttp3|okio|zstd)$/, 'Apache-2.0'],
  [/^commons-(io|codec)$/, 'Apache-2.0'],
  [/^javax\.inject$/, 'Apache-2.0'],
  [/^org\.jspecify$/, 'Apache-2.0'],
  [/^org\.brotli$/, 'MIT'],
  [/^com\.facebook\.(fresco|soloader|yoga|fbjni|hermes|infer\.annotation)$/, 'MIT'],
  [/^com\.parse\.bolts$/, 'BSD-3-Clause'],
];
// Copyright lines of the MIT and BSD libraries, from their licence files.
const ANDROID_NOTICES = [
  [/^com\.facebook\./, 'Copyright (c) Meta Platforms, Inc. and affiliates.'],
  [/^org\.brotli$/, 'Copyright (c) 2009, 2010, 2013-2016 by the Brotli Authors.'],
  [/^com\.parse\.bolts$/, 'Copyright (c) 2013-present, Facebook, Inc. All rights reserved.'],
  // pika ships no licence file; its POM gives the MIT licence, the author and the year.
  [/^io\.github\.lukmccall\.pika$/, 'Copyright (c) 2025 Łukasz Kosmaty'],
];

const CACHE = join(homedir(), '.gradle/caches/modules-2/files-2.1');
function pomLicence(group, artifact, version, depth = 0) {
  const dir = join(CACHE, group, artifact, version);
  if (!existsSync(dir) || depth > 4) return null;
  for (const hash of readdirSync(dir)) {
    const pom = readdirSync(join(dir, hash)).find((f) => f.endsWith('.pom'));
    if (!pom) continue;
    const xml = readFileSync(join(dir, hash, pom), 'utf8');
    const name = /<licenses>[\s\S]*?<name>([^<]+)<\/name>/.exec(xml)?.[1];
    if (name) return spdx(name) ?? `?${name}`;
    const parent = /<parent>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?<version>([^<]+)<\/version>/.exec(xml);
    if (parent) return pomLicence(parent[1], parent[2], parent[3], depth + 1);
  }
  return null;
}

const android = [];
for (const [id, version] of [...coords].sort(([a], [b]) => a.localeCompare(b))) {
  if (FROM_JS.test(id)) continue;
  const [group, artifact] = id.split(':');
  let licence = pomLicence(group, artifact, version);
  if (!licence || licence.startsWith('?')) licence = GROUP_LICENCE.find(([re]) => re.test(group))?.[1] ?? licence;
  if (!licence || licence.startsWith('?')) problems.push(`${id}:${version}: licence ${licence ?? 'unknown'}`);
  const notice = licence === 'Apache-2.0' ? [] : ANDROID_NOTICES.filter(([re]) => re.test(group)).map(([, l]) => l);
  if (licence !== 'Apache-2.0' && !notice.length) problems.push(`${id}: no copyright line`);
  // Licence texts of the BSD libraries, kept in scripts/licences (their jars carry none).
  let text;
  if (licence && licence.startsWith('BSD')) {
    const file = join(ROOT, 'scripts/licences', `${group}_${artifact}-${version}.txt`);
    if (existsSync(file)) text = readFileSync(file, 'utf8').trim();
    else problems.push(`${id}: no licence text in scripts/licences`);
  }
  android.push({ name: id, version, licence, copyright: notice, text });
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
const out = join(ROOT, 'src/notices.json');
writeFileSync(out, JSON.stringify({ packages, android }, null, 1) + '\n');
const count = (list) => Object.entries(list.reduce((a, p) => ({ ...a, [p.licence]: (a[p.licence] ?? 0) + 1 }), {})).map(([k, v]) => `${v} ${k}`).join(', ');
console.log(`${packages.length} JavaScript packages (${count(packages)}); ${android.length} Android libraries (${count(android)}) -> ${out}`);
