# Bible

Two phone apps from one codebase, built with Expo and React Native for iOS and
Android. All text ships inside each app, so they work without a connection.

| Edition | App name | Texts | Interface |
| --- | --- | --- | --- |
| `en` | Bible | King James Version, World English Bible, Hebrew and Greek interlinear | English |
| `ml` | വേദപുസ്തകം | Malayalam Sathyavedapusthakam 1910, King James Version, Hebrew and Greek interlinear | Malayalam (English available) |

The edition is chosen at build time with `BIBLE_EDITION=en` (default) or
`BIBLE_EDITION=ml`; see `src/edition.ts`, `app.config.js` and `metro.config.js`.
Each edition has its own database (`assets/db/bible-en.db`, `assets/db/bible-ml.db`),
icon set (`assets/icons/<edition>/`), app name and package id, so both can be
installed side by side. Every feature below is in both apps; in the Malayalam
app, tapping words for their Hebrew or Greek works in the KJV, since the
Malayalam text carries no Strong's tags, and the interlinear and Compare work
with every translation.

## What it does

- Read the King James Version or the World English Bible, switchable with one tap.
- Tap any underlined word to see the original Hebrew or Greek word, its
  transliteration, pronunciation, Strong's number, derivation, definition and the
  ways the KJV renders it.
- From that entry, list every verse in the current translation that uses the same
  original word, and jump to any of them.
- Switch on the interlinear view to see the Hebrew (Leningrad Codex) or Greek text
  of every verse, word by word, each with its transliteration and a short gloss.
  Tap any word for its grammar (parsed in plain words) and its dictionary entry.
  Greek words absent from the modern critical editions are marked.
- Poetry keeps its line breaks, and the translators' footnotes and cross references
  appear as small letters in the text; tap one to read it.
- Hold a verse to highlight it in one of four colours, add a note, compare the KJV
  and WEB side by side with the Hebrew or Greek, copy it, share it, or bookmark it.
  Bookmarks, highlights and notes are listed under Saved on the Books screen.
- The search box also searches the dictionary: an English meaning ("love"), a
  transliteration ("logos") or a Hebrew or Greek word, accents optional.
- The occurrences list for a word starts with how the translation renders it
  ("God 2,075 · gods 190 · judges 3"); tap a rendering to see only those verses.
- Interlinear options: show every verse or only verses whose number you tap, hide
  the transliteration, hide Hebrew cantillation marks.
- Search the text, type a reference such as `John 3:16` or `Ps 23` to jump to it, or
  type a Strong's number such as `G26` to open its entry.
- Swipe left or right to change chapter. Screens slide natively, and on iPhone you can
  swipe back from the left edge. Rotates to landscape; on tablets the text keeps a
  comfortable column width.
- Appearance: light, sepia or dark (or follow the phone), a serif typeface, verse-per-line
  or paragraph layout, and keep-the-screen-awake.
- Adjustable text size, remembers where you left off.

## Running it on your phone

1. Install [Node.js](https://nodejs.org) (version 22 or newer) on your computer.
2. Install the Expo Go app on your phone from the App Store or Google Play.
3. In this folder run:

   ```bash
   npm install
   npm start          # English edition
   npm run start:ml   # Malayalam edition
   ```

4. Scan the QR code shown in the terminal with your phone's camera (iPhone) or
   with the Expo Go app (Android). Phone and computer must be on the same Wi-Fi.

The first launch copies the 41 MB database onto the phone and takes a moment.
No native build is needed: every module the app uses is included in Expo Go.
Expo Go shows its own splash screen; the app's own icon and splash appear in a
development or store build, made with `npx eas-cli build`.

## Android builds and releases

`.github/workflows/android-release.yml` builds a release APK of each edition on
every push to the development branch and on manual runs, and attaches it to a GitHub release when a
tag such as `v0.2.1` is pushed. Each build's Android version code is the workflow
run number, so every build can be installed over the previous one.

Release signing is configured by `plugins/withAndroidRelease.js`, which also turns
on code and resource shrinking and limits the APK to 64-bit ARM. It reads the key
from these environment variables, and falls back to the debug key when they are
unset:

```
BIBLE_KEYSTORE_PATH       path to the .jks file
BIBLE_KEYSTORE_PASSWORD
BIBLE_KEY_ALIAS
BIBLE_KEY_PASSWORD
```

For the workflow, store the same values as repository secrets named
`ANDROID_KEYSTORE_BASE64` (the file, base64 encoded), `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`. Keep the keystore file and its
password somewhere safe and never in the repo: Android only accepts updates signed
with the same key, so losing it means users must uninstall to update.

To build locally:

```bash
BIBLE_EDITION=ml npx expo prebuild --platform android --no-install --clean
cd android && ./gradlew assembleRelease
```

Built APKs are published on the `apk-builds` branch.

## Project layout

```
App.tsx                  App shell: database provider, screen stack, word sheet
src/db.ts                Database asset, on-device database name, stale copy cleanup
plugins/                 Expo config plugin for Android release signing and shrinking
app.config.js            Per-build values (Android version code) layered over app.json
src/navigation.ts        Screen names and parameters for the native stack
src/refs.ts              Parses typed references like "1 Cor 13:4"
src/theme.ts             Light, sepia and dark palettes and the serif face
src/queries.ts           All SQL, typed
src/text.ts              Expands offset-encoded Strong's tags into text runs
src/morph.ts             Turns Hebrew and Greek grammar codes into plain words
src/settings.tsx         Persisted settings (translation, text size, position)
src/components/          Header, VerseText, InterlinearVerse, WordSheet, CompareSheet, SimpleSheet, VerseListItem
src/screens/             Reader, Books, Chapters, Saved, Search, Concordance, Settings
scripts/fetch-data.sh    Downloads the source texts into data/raw/ (not committed)
scripts/build-db.mjs     Builds assets/db/bible.db from data/raw/
scripts/make-icons.sh    Draws the icon, adaptive icon layers and splash images with ImageMagick
assets/db/               bible-en.db (41 MB) and bible-ml.db (38 MB), one per edition
assets/icons/            Icon, adaptive icon layers and splash images per edition
src/edition.ts           Which texts and interface languages this build carries
src/i18n.ts              Interface strings in English and Malayalam
```

## Rebuilding the database

The database is committed so the app runs straight after `npm install`. To
rebuild it from the sources:

```bash
npm run fetch-data   # downloads KJV, WEB, the Strong's dictionaries and the STEPBible texts
npm run build-db     # writes assets/db/bible-en.db and bible-ml.db (needs Node 22+)
npm run icons        # redraws both editions' icons with ImageMagick
```

Then bump the suffix in `DATABASE_NAME` in `src/db.ts` (for example `bible-v2.db`)
so phones that already hold a copy of the old file pick up the new one.

### Schema

| Table         | Contents                                                                  |
| ------------- | ------------------------------------------------------------------------- |
| `books`       | 66 books: id, USFM code, English name, testament, chapter count           |
| `book_names`  | book names in each translation's own language (Malayalam, from the USFM headers) |
| `verses`      | one row per verse and translation: plain `text` plus offset-encoded `tags`; `omitted` = 1 for the five verses the WEB leaves out, with the translators' note as `text` |
| `headings`    | section headings that fall between verses (the acrostic labels of Psalm 119 in the WEB) |
| `strongs`     | 14,197 dictionary entries: lemma, transliteration, pronunciation, derivation, definition, KJV usage, plus accent-free `lemma_plain` and `translit_plain` for search |
| `concordance` | per Strong's number and translation: verse count and a packed list of verse references |
| `interlinear` | per chapter: the Hebrew or Greek words of every verse, deflate-compressed  |
| `notes`       | translators' footnotes (kind `f`) and cross references (kind `x`) with the character offset of their marker |
| `renderings`  | per Strong's number and translation: each English rendering, its verse count and packed verse references |
| `meta`        | build date and source information                                         |

`tags` holds `gap,length,number` triples separated by spaces. `gap` is the number
of characters since the end of the previous tag, `length` the tagged span, and
`number` the Strong's number without its letter (H for Old Testament books, G for
New Testament books). Psalm titles are stored as verse 0. Poetry and paragraph breaks
inside a verse are newlines, and an indented poetry line starts with one em space per
level of indentation.

`verses.para` records the break the source marks before a verse: `p` paragraph,
`b` blank line, `q0` to `q2` a poetry line at that indent, or empty. The paragraph
layout groups verses with it. The KJV source marks few poetry lines, so its Psalms
mostly read as prose in either layout.

`interlinear.data` is raw deflate of the chapter as text. Verses are separated by
U+001C, each verse is its number, U+001D, then its words. Words are separated by
U+001E and their fields by U+001F: text, transliteration, gloss, Strong's id (may be
empty), grammar code, flags. Flag 1 marks a Greek word absent from the Nestle-Aland
editions, 2 a Hebrew word supplied from the Septuagint, 4 text restored where the
Leningrad Codex is damaged. The Greek line holds every word found in the Textus
Receptus or the Byzantine text; the 3,600 words found only in Nestle-Aland are left
out. Verse numbers follow the KJV where editions differ.

## Sources and licences

- **King James Version**, 1769 text with Strong's numbers, from
  [eBible.org](https://ebible.org/find/details.php?id=eng-kjv2006). Public domain
  (outside the United Kingdom, where printing rights are held by the Crown's patentees).
- **World English Bible** with Strong's numbers, from
  [eBible.org](https://ebible.org/find/details.php?id=engwebp). Public domain;
  "World English Bible" is a trademark of eBible.org.
- **Malayalam Sathyavedapusthakam 1910**, revised edition in contemporary orthography,
  copyright © 2015 The Free Bible Foundation, from
  [eBible.org](https://ebible.org/find/details.php?id=mal2015), CC BY-SA 4.0.
  Bundled in the Malayalam edition only.
- **Strong's Hebrew and Greek dictionaries**, digital edition by
  [Open Scriptures](https://github.com/openscriptures/strongs), CC BY-SA.
- **Interlinear Hebrew and Greek**: Translators Amalgamated Hebrew OT (TAHOT) and
  Greek NT (TAGNT) by [STEPBible](https://github.com/STEPBible/STEPBible-Data),
  Tyndale House Cambridge, CC BY 4.0. Their licence permits bundling the data in
  software and asks that the source files are not redistributed, so only the built
  database is committed here, never the files in `data/raw/`.

## Malayalam interface

The Malayalam strings in `src/i18n.ts` were written for this project and have not
yet been reviewed by a native speaker. Corrections are welcome: each key is listed
once with its English reference.

## Known limitations

- The Strong's tagging in the World English Bible is less precise than in the
  KJV. Occasionally a word opens the entry of a neighbouring word.
- The WEB omits five New Testament verses that are absent from the earliest
  manuscripts (for example Matthew 17:21). They appear as greyed rows carrying the
  translators' note.
- Text search is a plain substring match, case-insensitive for English letters.
- The interlinear line and the English line are not linked word to word. Tapping
  an English word opens its Strong's entry; tapping an original word opens the same
  entry plus that word's grammar.
- Greek words that occur only in the Nestle-Aland editions are not shown.
