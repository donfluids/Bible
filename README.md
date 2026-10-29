# Bible

Four phone apps from one codebase, built with Expo and React Native for iOS and
Android. All text ships inside each app, so they work without a connection.

| Edition | App name | Texts | Interface |
| --- | --- | --- | --- |
| `en` | Bible | King James Version, World English Bible, Hebrew and Greek interlinear | English |
| `ml` | വേദപുസ്തകം | Malayalam Sathyavedapusthakam 1910, King James Version, Hebrew and Greek interlinear | Malayalam (English available) |
| `ta` | வேதாகமம் | Tamil Indian Revised Version, King James Version, Hebrew and Greek interlinear | Tamil (English available) |
| `all` | Bibles (name to be chosen) | King James Version, Berean Standard Bible, World English Bible, Malayalam Sathyavedapusthakam 1910, Tamil and Hindi Indian Revised Version, Hebrew and Greek interlinear | English, Malayalam, Tamil or Hindi, asked on first opening |

The four-language app (`all`, package `org.riversresearch.bible.india`) asks on first
opening which language to read in: English, മലയാളം, தமிழ் or हिन्दी (the phone's own
first, ticked), each opening its Bible, with the menus in that language (the Hindi menus
are unchecked: docs/hindi-review.md). Its reader's Bible pill opens the six Bibles under their own names, and a swap
button beside it goes back and forth between the two read last. Search has a row of the
six Bibles under its box. Side by side pairs the English with the Indian Bible open or
read last. The Hindi words are not yet linked to the Hebrew and Greek, so the word sheet
and occurrence lists use the KJV's links while reading the Hindi, as for the WEB; a
one-time card says so when the Hindi first opens. In every app, the search dictionary
shows two entries and More, and none with the study tools off.
Its database is 109 MB, over GitHub's 100 MB file limit, so it is not committed: build it
with `npm run fetch-data` and `node scripts/build-db.mjs all` before building this app.
The GitHub release workflow builds the other three only.

The edition is chosen at build time with `BIBLE_EDITION=en` (default) or
`BIBLE_EDITION=ml`; see `src/edition.ts`, `app.config.js` and `metro.config.js`.
Each edition has its own database (`assets/db/bible-en.db`, `assets/db/bible-ml.db`),
icon set (`assets/icons/<edition>/`), app name and package id, so both can be
installed side by side. Every feature below is in both apps. In the Malayalam
app, Malayalam words are linked to their Hebrew or Greek by a machine alignment
(see Malayalam word links below), so tapping a word, the occurrence lists and the
rendering counts all work in Malayalam.

## What it does

- Read the King James Version or the World English Bible, switchable with one tap.
- Tap any underlined word to see the original Hebrew or Greek word in a sheet that
  opens at half height: the form the Hebrew or Greek has in that verse (with its
  grammar; every form, when the word is there more than once), the word you tapped
  beside the dictionary form, a short modern
  meaning (from STEPBible's glosses), the pronunciation with its stressed syllable, and
  the words this Bible and the KJV use for it. Drag it up for two example verses,
  related words and Strong's 1890 dictionary entry, which also gives the Strong's
  number for looking the word up elsewhere. In the Malayalam interface the large line
  is the Malayalam word the Sathyavedapusthakam uses most (and a second when it is a
  real alternative: ദൈവം · ദേവന്മാർ), with the English meaning under it, and the KJV
  words wait in the full view.
- From that entry, list every verse where the same Hebrew or Greek word stands, shown
  in the current translation, and jump to any of them. The count comes from the
  original text, not from a translation's tags, which miss many (the KJV tags הָיָה in
  72 of its 3,133 verses); chips narrow the list to one rendering. The sheet hides a
  translation's chips when it tags the word in under half its verses, and the full view
  shows Strong's own list of KJV renderings in plain words.
- Tap the Hebrew words or Greek words button (എബ്രായ or ഗ്രീക്ക് in the Malayalam app) to see
  the Hebrew (Leningrad Codex) or Greek text of every verse, word by word, each with
  its transliteration and a short gloss. (The code and this README call this view the
  interlinear.)
  Tap any word for its grammar (parsed in plain words) and its dictionary entry.
  Greek words absent from the modern critical editions are marked, and tapping one
  says which of the Textus Receptus, the Byzantine text and Nestle-Aland have it.
- Poetry keeps its line breaks, and the translators' footnotes and cross references
  appear as small letters in the text; tap one to read it.
- Hold a verse, or tap its number, to highlight it in one of four colours, add a note,
  compare the KJV and WEB side by side with the Hebrew or Greek, list its linked words,
  copy it, share it, or bookmark it. Bookmarks, highlights and notes are listed under
  Saved; the clock at the top of the Books tab lists the chapters read most recently.
- The Books tab shows all 66 books at once, the Old Testament down the left and the New
  down the right, names only, with a filter above for one Testament alone; the book being
  read is marked and in view.
- To highlight part of a verse, or a passage running over several verses, hold a verse
  and choose Mark text. Hold a word still, drag to the
  last word and let go; the bottom bar picks the colour, has an eraser for taking marks
  off, and Done. Scrolling still works as usual, and dragging to the top or bottom edge
  scrolls on. Marks belong to the Bible they were made in and are listed under Saved as
  Marked text.
- The Notebook (നോട്ട്ബുക്ക് in the Malayalam app, குறிப்பேடு in the Tamil), under the Books screen, holds pages
  of free writing: sermon notes, a study, a list of verses. A reference typed on a page
  ("യോഹന്നാൻ 3:16", "1 കൊരി 13:4-7", "Ps 23:1", "Romans 8") becomes a link to the verse,
  and the verse text (up to eight verses of a range) shows under the line, in the Bible
  being read. Hold a verse and choose Add to notebook to put it on a page, or start a
  new page with it. A page shares as plain text with its verses quoted. The note on a
  single verse is called വാക്യക്കുറിപ്പ് in Malayalam, to tell it apart.
- A notebook page can instead be handwritten (New page → Handwritten, plain or lined
  paper), for writing sermon notes with a pen on a tablet or phone, or with a finger:
  black, blue and red pens in two widths, a yellow highlighter, an eraser that takes away
  the strokes it passes over, undo and redo. One finger writes and two move the page; once
  a pen has touched the page, a finger only moves it, so a resting hand does not write.
  The page grows as the writing nears its foot and shares as a picture. The strokes are
  kept on the phone in an entry of the page's own (src/ink.ts), with the same safety
  copies as the rest.
- Any notebook page shares as a PDF (A4; a long handwritten page runs over several), and
  the whole notebook saves to one backup file (Notebook → Back up or restore) through the
  share sheet, to Drive, Files or another phone. Restore picks such a file and adds its
  pages: a page already in the notebook is replaced only by a newer copy of itself, and
  nothing is deleted (src/notebookBackup.ts, src/notebookFiles.ts, src/pagePdf.ts).
- Tapping the reader's title opens the passage picker (src/components/PassagePicker.tsx):
  Old or New Testament, the books as a grid of short names under their groups (Law,
  History, Poetry and wisdom, Prophets; Gospels, Acts, Letters, Revelation), then the
  chapter numbers, with the chapter last read in that book marked. Two taps from any
  chapter to any other; the Books tab remains.
- Settings → How to use is a page of short topics (reading, the verse menu, words, marking,
  notebook, handwriting, backup, listening, study tools, cards), in the interface
  language; the reader's first-time tip links to it too (src/screens/HowToScreen.tsx).
- Settings → Study tools switches the study side of the app off and on: off, words are not
  tapped, the Hebrew or Greek pill goes, the graduation cap in the reader's top bar switches
  them back on (filled when on, with a short note each time), the
  verse menu loses Compare, cross references, parallels and Words in this verse, and the
  introductions are not offered; highlights, notes and the notebook stay. On by default.
- Settings → Write to us starts a note in the phone's mail app (address, a subject with the
  app's version, a last line naming the build and the phone that the reader may delete);
  the address itself is not shown unless no mail app opens. About two weeks after install,
  the reader is invited once above the chapter, with Not now and No thanks
  (src/feedback.ts, src/writeToUs.ts).
- A verse opened from search, Saved or a word's verse list opens in a reader of its own;
  Back returns to the list and then to the chapter you were reading.
- The search box also searches the dictionary: an English meaning ("love"), a
  transliteration ("logos") or a Hebrew or Greek word, accents optional.
- The occurrences list for a word starts with how the translation renders it
  ("God 2,075 · gods 190 · judges 3"); tap a rendering to see only those verses.
- Interlinear options: show every verse or only verses whose number you tap, hide
  the transliteration, hide Hebrew cantillation marks.
- Search the text, type a reference such as `John 3:16` or `Ps 23` to jump to it, or
  type a Strong's number such as `G26` to open its entry. Malayalam references take
  everyday spellings and the Catholic (POC) names too: സങ്കീർത്തനം 23, മർക്കോസ് 1,
  1 ശമൂവേൽ 3, നടപടികൾ 2. Malayalam search accepts
  modern spelling: ആത്മാവ് finds the 1910 text's ആത്മാവു, and കൽപിച്ചു finds കല്പിച്ചു.
- Swipe left or right to change chapter (a swipe from the very edge is left to the
  phone's back gesture). Screens slide natively, and on iPhone you can swipe back from
  the left edge. Rotates to landscape; on tablets the text keeps a
  comfortable column width.
- Appearance: light, sepia or dark (or follow the phone), a serif typeface, verse-per-line
  or paragraph layout, and keep-the-screen-awake. Both apps are brown on cream
  paper; all three apps share one icon, an open white book under a lamp's flame on brown (Psalm 119:105). Android-style top bars and icons (Material Symbols
  Rounded), and one bottom-sheet style throughout; the verse sheet has Copy, Share,
  Bookmark and Note buttons and highlight colours in one place.
- Text size in eight steps, from Settings or by pinching the text with two fingers.
  Remembers the verse you left off at, and keeps your place when
  you switch translation.

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

The iPhone apps build from the same code in Expo's cloud (EAS Build, profiles `ios-en` and
`ios-ml` in `eas.json`); `docs/ios/README.md` has the steps from Apple enrolment to the App
Store, with the listing text and screenshots beside it.

Release signing is configured by `plugins/withAndroidRelease.js`, which also turns
on code and resource shrinking and builds for 32- and 64-bit ARM (the Play bundle
carries both; the workflow's APK is built for 64-bit ARM only with
`-PreactNativeArchitectures=arm64-v8a`). It reads the key
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
cd android
./gradlew assembleRelease   # APK, for installing directly
./gradlew bundleRelease     # app bundle (.aab), for Google Play
```

Release builds leave out the internet permission (the app never goes online; see
`plugins/withAndroidRelease.js`), and `app.json` blocks the storage and overlay
permissions that libraries would otherwise add. Built APKs and bundles are published
on the `apk-builds` branch. `docs/play/` has the Play listing text, the privacy
policy page and a release checklist.

## Project layout

```
App.tsx                  App shell: database provider, screen stack, word sheet
src/db.ts                Database asset and folder; checks the on-device copy is complete
src/dbSizes.json         Byte size of each built database, written by build-db, for that check
src/place.ts             Reading place (position, recent and last chapters), saved in the background
src/selection.ts         The word whose sheet is open, so only its verse redraws
src/fonts.ts             Hebrew and Malayalam typefaces built into the app
src/licences.ts          Sources, licences and changes shown under Sources and licences
plugins/withAndroidRelease.js  Android release signing and shrinking
plugins/withBackupRules.js     Keeps the 47 MB database out of Android backup, so notes are backed up
app.config.js            Per-edition and per-build values layered over app.json
src/navigation.ts        Screen names and parameters for the native stack
src/refs.ts              Parses typed references like "1 Cor 13:4" and finds them in written text
src/theme.ts             Light, sepia and dark palettes and the serif face
src/queries.ts           All SQL, typed
src/text.ts              Expands offset-encoded Strong's tags into text runs
src/morph.ts             Turns Hebrew and Greek grammar codes into plain words
src/malayalamSearch.ts   Matches modern Malayalam spelling against the 1910 text
src/settings.tsx         Persisted settings (translation, text size, bookmarks, notes)
src/notebook.tsx         Notebook pages, kept in their own storage entry
src/notebookBackup.ts    Notebook backup file: written, read back and merged in (notebookFiles.ts saves and picks it; pagePdf.ts makes a page PDF)
src/ink.ts               Handwritten pages: strokes, how they are stored, read back and drawn
src/components/          Header, Icon, SectionLabel, VerseText, InterlinearVerse, WordSheet, CompareSheet, SimpleSheet, VerseListItem
src/screens/             Reader, Books, Chapters, Saved, Notebook, NotePage, InkPage, Search, Concordance, Settings, Licences
scripts/fetch-data.sh    Downloads the source texts into data/raw/ (not committed)
scripts/build-db.mjs     Builds assets/db/bible-<edition>.db from data/raw/
scripts/make-icons.mjs   Draws the icon, adaptive icon layers, splash images and 512 px Play icons (SVG, rendered with Chromium)
scripts/make-feature-graphic.mjs  Draws the Play feature graphics from the same art (scripts/icon-art.mjs)
scripts/make-icon-font.py  Cuts the interface icons out of Material Symbols Rounded
scripts/notices.mjs      Lists the third-party software in the app with licences and copyright lines (src/notices.json)
scripts/review-strings.mjs        Rewrites the strings table of docs/tamil-review.md or docs/hindi-review.md (ta | hi) from src/i18n.ts
assets/db/               bible-en.db (32 MB) and bible-ml.db (47 MB), one per edition
assets/icons/            Icon, adaptive icon layers and splash images per edition (the same in each)
data/overrides/          Hand corrections: Malayalam text, verse map, short meanings
src/edition.ts           Which texts and interface languages this build carries
src/i18n.ts              Interface strings in English and Malayalam
```

## Rebuilding the database

The database is committed so the app runs straight after `npm install`. To
rebuild it from the sources:

```bash
npm run fetch-data   # downloads KJV, WEB, the Strong's dictionaries and the STEPBible texts
npm run build-db     # writes assets/db/bible-en.db, -ml, -ta and -all (needs Node 22+)
npm run icons        # redraws both editions' icons (needs Chromium; see scripts/make-icons.mjs)
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
| `strongs`     | 14,197 dictionary entries: lemma, transliteration, pronunciation, derivation, definition, KJV usage, plus accent-free `lemma_plain` and `translit_plain` for search, a short `gloss`, and `uses` (times the word is used in the Hebrew or Greek) |
| `concordance` | per Strong's number and translation: verse count and a packed list of verse references; translation `ORIG` lists every verse the word is in in the Hebrew or Greek itself (KJV numbering) |
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
empty), grammar code, flags, and for a replaced word the Nestle-Aland reading it
replaces. Flags: 1 a Greek word absent from the Nestle-Aland editions, 2 a Hebrew word
supplied from the Septuagint, 4 text restored where the Leningrad Codex is damaged,
8 not in the Textus Receptus, 16 not in the Byzantine text, 32 a Textus Receptus or
Byzantine word standing where Nestle-Aland has a different one.

The Greek line is TAGNT's text (spelled as in NA28) with every word that the Textus
Receptus or the Byzantine text has. Where those texts read a different word from
Nestle-Aland (2,591 places, such as θεὸς for ὃς in 1 Timothy 3:16), their word is
shown and the Nestle-Aland word is kept with it; the 1,009 words found only in
Nestle-Aland with no traditional counterpart are left out. A phrase that replaces one
word is shown in one cell. The Hebrew paragraph marks פ and ס that end some verses in
TAHOT are dropped. Verse numbers follow the KJV.

`verse_map` lists the verses a translation numbers differently from the KJV (the
Malayalam in 15 chapters; the WEB's Romans 14:24–26, the doxology the KJV has at
16:25–27), so the reader shows the right Hebrew or Greek under them, switching
translation keeps the verse (staying in the same chapter where a Malayalam verse holds
two KJV verses), and Compare shows every verse that holds the same words.

## Checks before a release

```
npm test             # typecheck, reference finder and logic tests (scripts/test-logic.mts)
npm run check-data   # the built databases: numbering, text, links, verse counts
npm run smoke        # every main screen of each app in a browser, at four sizes
```

- `npm test` covers what once broke without anyone seeing: which Greek or Hebrew word a
  tapped word stands for, the word sheet's chips and Malayalam headline, settings and
  saved card designs read back from a damaged file, search order and filters, Malayalam
  search spelling, the Malayalam meanings of the build (`scripts/lib/forms.mjs`), and
  patterns that must stay fast on long text.
- `npm run check-data` runs after every `npm run build-db`. Besides the rules (no gaps,
  no empty verses, no stray characters, every link to a Strong's entry that exists), it
  compares each chapter's verse count with `data/checks/verse-counts.json`; after an
  intended change run it with `-- --update` and commit the snapshot.
- `npm run smoke` needs the web packages once: `npm install --no-save react-dom@19.2.3
  react-native-web@^0.21.2`. It fails on a screen that does not open, a step that does
  not work or a JavaScript error, and leaves a screenshot of each step in `smoke-out/`.
- What only a phone can show (the photo picker, voices, the back button, TalkBack, an
  update over the old version) is in [`docs/testing/phone-checklist.md`](docs/testing/phone-checklist.md),
  about 20 minutes a phone.

## Sources and licences

- **King James Version**, 1769 text with Strong's numbers, from
  [eBible.org](https://ebible.org/find/details.php?id=eng-kjv2006). Public domain
  (outside the United Kingdom, where printing rights are held by the Crown's patentees).
- **World English Bible**, from
  [eBible.org](https://ebible.org/find/details.php?id=engwebp). Public domain;
  "World English Bible" is a trademark of eBible.org. Its Strong's numbers are not
  used (see Known limitations).
- **Berean Standard Bible**, BSB Publishing, dedicated to the public domain (CC0), from
  [CrossWire's SWORD module](https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=BSB)
  (version 2.0), whose Strong's numbers come from the Berean word tables. eBible.org's
  engbsb is not used: its Strong's numbers are shifted by a word in many verses.
  `scripts/bsb-from-sword.mjs` turns the module into USFM. English edition only.
- **Malayalam Sathyavedapusthakam 1910**, revised edition in contemporary orthography,
  copyright © 2015 The Free Bible Foundation, from
  [eBible.org](https://ebible.org/find/details.php?id=mal2015), CC BY-SA 4.0.
  Bundled in the Malayalam edition only.
- **Tamil Indian Revised Version**, © 2017, 2019 Bridge Connectivity Solutions, from
  [eBible.org](https://ebible.org/find/details.php?id=tam2017), CC BY-SA 4.0. Section
  headings are left out and eight stray zero-width non-joiners removed. Tamil edition only.
- **Strong's Hebrew and Greek dictionaries**, digital edition by
  [Open Scriptures](https://github.com/openscriptures/strongs), CC BY-SA.
- **Abbott-Smith**, *A Manual Greek Lexicon of the New Testament* (1922), public domain,
  in the [TEI edition](https://github.com/translatable-exegetical-tools/Abbott-Smith) of
  the translatable-exegetical-tools project; and **BDB Glosses**, the sense outline of
  Brown, Driver and Briggs (1906), public domain, in the digital edition of the Open
  Scriptures Hebrew Bible Project's [Hebrew Lexicon](https://github.com/openscriptures/HebrewLexicon)
  (CC BY 4.0) as arranged in CrossWire's BDBGlosses_Strongs module. Shown as the fuller entry in the word sheet
  (`scripts/lib/lexicons.mjs`); all editions.
- **Cross references**, [OpenBible.info](https://www.openbible.info/labs/cross-references/),
  CC BY, drawn from the Treasury of Scripture Knowledge and ranked by readers' votes. Up to
  ten per verse, the most voted first, in every edition (`scripts/lib/crossrefs.mjs`;
  `node --no-warnings scripts/add-study-data.mjs` renews them, the parallel passages and
  the book introductions in built databases). Hold a verse → Cross references.
- **Parallel passages**, the United Bible Societies'
  [Parallel Passages Database](https://github.com/ubsicap/ubs-open-license/tree/main/parallel%20passages),
  © 2023 United Bible Societies, CC BY-SA 4.0: the same event or words in another place,
  verse by verse (the Gospels with each other, Kings with Chronicles, a psalm found twice).
  Only parallels within one Testament are kept, and the source's Hebrew and Greek verse
  numbers are turned into the KJV's with the STEPBible files (`scripts/lib/parallels.mjs`).
  The `parallels` table made from it is offered under the same licence, CC BY-SA 4.0.
  Hold a verse → Parallel passages.
- **Book introductions**, written for these apps in English, Malayalam, Tamil and Hindi
  (`data/intros`, see `data/intros/GUIDE.md`; checked by `scripts/check-intros.mjs`): who
  wrote each book, when and for whom, what it is about, its themes, an outline and key
  verses, giving the church's traditional view of authorship and dates. A line above a
  book's first chapter opens its introduction, and so does About this book above the
  book's chapter numbers.
- **Interlinear Hebrew and Greek**: Translators Amalgamated Hebrew OT (TAHOT) and
  Greek NT (TAGNT) by [STEPBible](https://github.com/STEPBible/STEPBible-Data),
  Tyndale House Cambridge, CC BY 4.0. Their licence permits bundling the data in
  software and asks that the source files are not redistributed, so only the built
  database is committed here, never the files in `data/raw/`. The short meanings in
  the word sheet are the senses their glosses give each word most often.
- **Fonts**: Noto Serif Hebrew, Noto Sans Malayalam and Noto Serif Malayalam (Google),
  SIL Open Font License, taken from the `@expo-google-fonts` packages and built into
  the Android app by the expo-font config plugin (`app.config.js`; the English edition
  carries only the Hebrew one). Expo Go does not have them and shows the phone's fonts.
- **Icons**: Material Symbols Rounded (Google), Apache License 2.0, from the
  `material-symbols` npm package. `scripts/make-icon-font.py` keeps only the icons the
  app uses, at one weight and size, as `assets/fonts/BibleIcons.ttf` (8 KB) with the
  code points in `src/iconCodes.json`; `src/components/Icon.tsx` draws them.
- **Verse card pictures** (`assets/cards`, see `SOURCES.md` there): Microsoft Fluent
  Emoji, 3D style, MIT licence; and a rose by Pierre-Joseph Redouté from *Les Roses*
  (The Metropolitan Museum of Art, Open Access, public domain), its paper taken out by
  `scripts/card-rose.mjs`.

The app shows these sources, their licences with links and the modifications made to
each under Settings → Sources and licences, in English (`src/licences.ts`), followed by
the third-party software in the Android app and the full MIT, Apache and Open Font
License texts. The software list, `src/notices.json`, is generated from the JavaScript
bundle's source map and the release runtime classpath, with each package's licence and
copyright lines (BSD and ISC licences in full):

```
npx expo export --platform android --source-maps --output-dir /tmp/map
(cd android && ./gradlew :app:dependencies --configuration releaseRuntimeClasspath -q > /tmp/deps.txt)
node scripts/notices.mjs /tmp/map/_expo/static/js/android/index-*.map /tmp/deps.txt
```

Run it again when dependencies change; it stops on a licence it does not recognise.
Native libraries that list cannot see (C++ libraries compiled into React Native, libwebp,
and the CocoaPods of an iPhone build) are kept by hand in `src/nativeNotices.ts`; an iPhone
build shows those instead of the Android list.

### Licences of the data

- The app's source code is © 2026 Rivers Research, MIT licensed (`LICENSE`).
- `assets/db/bible-ml.db`, `data/align/mal/` and the Malayalam corrections in
  `data/overrides/` are adapted from the CC BY-SA 4.0 Malayalam text (and CC BY 4.0
  STEPBible data), so they are shared under **CC BY-SA 4.0**. The Malayalam word links
  are machine-made; only 33 well-known verses were checked by hand.
- `assets/db/bible-ta.db` and `data/align/tam/` adapt the CC BY-SA 4.0 Tamil text, so
  they are shared under **CC BY-SA 4.0**; its word links are machine-made and not reviewed.
- Each database as a whole is offered under **CC BY-SA 4.0**; each text and data set in it
  keeps its own licence given here, and the public-domain and CC BY parts may be reused
  on those terms. The databases and the scripts that build them are in this repository.
- The `strongs` table in both databases adapts Open Scriptures' CC BY-SA dictionary
  (adding short meanings from STEPBible), and is shared under **CC BY-SA 4.0**.
- The interlinear data in both databases adapts STEPBible's CC BY 4.0 data. Changes:
  words found only in the Nestle-Aland editions left out, Textus Receptus or Byzantine
  readings shown where they differ, the Hebrew marks פ and ס removed, verse numbers
  mapped. Attribution: STEPBible.org, Tyndale House Cambridge,
  https://github.com/STEPBible/STEPBible-Data.
- The KJV, WEB and BSB text and Abbott-Smith are public domain (the KJV outside the
  United Kingdom). The BDB text is public domain; its digital edition by Open Scriptures
  is CC BY 4.0 (attribution: Open Scriptures Hebrew Bible Project).

## Malayalam word links

The Malayalam text carries no Strong's tags, so each Malayalam word is linked to the
Hebrew or Greek word it renders by `scripts/align.mjs`. It calls the Claude
CLI headlessly (`claude -p`, no API key: it uses the CLI's own login) with the
Malayalam words and the original words of each verse, asks for one link per Malayalam
word with a confidence, validates the answer against a JSON schema, and caches each
chunk as a file under `data/align/mal/`. `npm run build-db` then writes the confident
links (confidence 2) into the Malayalam verse tags, concordance and renderings tables;
uncertain links stay in the cache for review. A link is skipped if the verse text has
changed since it was made.

```bash
npm run align-ml -- --chapters 43:3,45:8   # book:chapter pairs
npm run align-ml -- --all                  # the whole Bible
npm run align-ml -- --report 43:3          # readable result for one chapter
npm run build-db                           # apply the links
```

Words with no link (words added for sense, auxiliary words, uncertain cases) are not
tappable. Links are made by a language model. The 33 verses in
`scripts/hand-check-links.mjs` (Genesis 1:1, Psalm 23, the Lord's Prayer, John 3:16 and
others people know by heart) were checked by hand; that script writes
`data/align/mal/hand-checked.json`, which the build prefers to the model's links.

The full run covered all 31,215 Malayalam verses in 2,154 calls. About 57% of Malayalam
words carry a confident link and 70% some link; the rest are mostly words with no
counterpart in the original. Two helpers keep the result complete:

- `--fill-gaps` re-sends only verses that no cached chunk covers (a model answer
  occasionally leaves out the last verses of a chunk; answers that skip more than a
  quarter of their verses are now retried automatically).
- `data/overrides/versification.json` pairs Malayalam verses with differently numbered
  original verses, in 15 chapters: Exodus 8:1 and 1 Samuel 30:30 and 2 Samuel 17:28
  each hold two KJV verses; Deuteronomy 13 and 28:69–29 and Song of Songs 7 follow
  the Hebrew chapter breaks; Acts 15:34, Acts 28:29 and Romans 16:24 are absent and
  the verses after them are numbered one lower; 1 Timothy 6:21 and 3 John 14 are
  split in two. The same map goes into the database for the reader.
  `--fill-gaps` also re-sends verses whose text changed after they were aligned.

The title the Malayalam gives Psalm 146 has no Hebrew counterpart and stays unlinked.

### Corrections to the Malayalam source

The eBible mal2015 edition repeats Titus 1 in place of Titus 2 and 3, and Titus 1:1
starts with the stray words "Testing ag live sync"; eBible.org's own web edition has
the same faults. `data/overrides/text-corrections.json` replaces Titus 2 and 3 with
the 1910 text from [Malayalam Wikisource](https://ml.wikisource.org/wiki/സത്യവേദപുസ്തകം/തീത്തൊസ്)
(public domain) and removes the stray words; `scripts/build-db.mjs` applies it.
Wikisource's transcription joins and splits a few compound words differently from
eBible's, so these two chapters may differ slightly in spacing from the rest.
Seven transcription slips in the Wikisource text (one a vowel sign doubled so that it
rendered as a dotted circle) are corrected to the spelling used elsewhere in this
Bible; the corrections file lists them. Twelve misspelt words in the eBible text itself
(each occurring once, for example ക്ഷിമിച്ചിരിക്കുന്നതുപോലെ in Matthew 6:12) are
corrected to the spelling used elsewhere; the same file lists them.

The eBible source also carries five illustration captions (`\fig`) inside verses, for
example after Genesis 5:5; the build drops them.

### Links the build leaves out, and grouped forms

Hebrew writes "your", "our" or "him" as a suffix on a noun or verb, and Hebrew and
Greek verbs carry "I", "he", "they" in their endings, so the aligner often gave a
Malayalam pronoun the number of the word it goes with (in നിന്റെ ദൈവം both words linked
to Elohim) or of a neighbour (ഞാൻ → "all" in Philippians 4:13). The build leaves a
pronoun unlinked unless its counterpart is a pronoun word, and never links to the
untranslatable object marker אֵת (H853): 5,653 links in all.

The aligner also sometimes slipped by one word. A word linked to a number it renders
at most twice in the Bible, when another Hebrew or Greek word of the same verse is its
usual match (ten times or more) and no other Malayalam word renders that one well, is
moved to it, unless the word contains a usual rendering of its own number (a compound
such as പൊന്മണി, "golden bell"). That moves 3,413 links; in a sample of 40, about 31
became right, 5 were judgement calls and 4 got worse.

### Compound words

Malayalam writes many phrases as one word: നിത്യജീവൻ "eternal life", ദൈവപുരുഷൻ "man of
God", സകലവൃക്ഷങ്ങളുടെയും "of all the trees". The first alignment linked each word to one
Hebrew or Greek word only. `data/align/compound-verses.json` lists 9,131 verses where an
unlinked content word's usual Malayalam rendering sits inside another linked word; those
were aligned again with `--compound`, which lets a word link to each content word it
renders (not to prepositions, conjunctions or pronouns). 1,196 calls cost $48.88. The
result: 8,087 compound words in 5,701 verses; in a sample of 30, about 25 were right and
5 had a wrong extra word. In the tags such a word lists its numbers with "+" (chief word
first); tapping it opens the word sheet with a chooser row for each word.

In the "renders it as" lists, Malayalam forms of one word are grouped (ദൈവം, ദൈവമായ,
ദൈവത്തിന്റെ … as ദൈവം).

## Malayalam interface

The Malayalam strings in `src/i18n.ts` were written for this project and have not
yet been reviewed by a native speaker. Corrections are welcome: each key is listed
once with its English reference.

## Known limitations

- The World English Bible is plain text in the app. The Strong's numbers in eBible's
  WEB file are attached to the wrong words too often (Genesis 1:1 tags "In", "God" and
  "and" as H8064 "heavens"), so `scripts/build-db.mjs` leaves them out and word lookups
  use the KJV.
- The WEB omits five New Testament verses that are absent from the earliest
  manuscripts (for example Matthew 17:21). They appear as greyed rows carrying the
  translators' note.
- Text search is a plain substring match, case-insensitive for English letters. In
  Malayalam, a final ് or ു, a chillu or its consonant with ്, and the joiner after
  some ് all count as the same (src/malayalamSearch.ts); other forms of a word are
  not found unless typed as a shorter stem.
- The interlinear line and the English line are not linked word to word. Tapping
  an English word opens its Strong's entry; tapping an original word opens the same
  entry plus that word's grammar.
- Greek words that occur only in the Nestle-Aland editions are not shown, except
  as the replaced reading noted on a Textus Receptus or Byzantine word.
