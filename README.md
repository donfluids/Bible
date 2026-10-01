# Bible

A phone app for reading the Bible with every word linked to its Greek or Hebrew.
Built with Expo and React Native for iOS and Android. All text ships inside the
app, so it works without a connection.

## What it does

- Read the King James Version or the World English Bible, switchable with one tap.
- Tap any underlined word to see the original Hebrew or Greek word, its
  transliteration, pronunciation, Strong's number, derivation, definition and the
  ways the KJV renders it.
- From that entry, list every verse in the current translation that uses the same
  original word, and jump to any of them.
- Search the text, or type a Strong's number such as `G26` to open it directly.
- Adjustable text size, light and dark appearance, remembers where you left off.

## Running it on your phone

1. Install [Node.js](https://nodejs.org) (version 22 or newer) on your computer.
2. Install the Expo Go app on your phone from the App Store or Google Play.
3. In this folder run:

   ```bash
   npm install
   npm start
   ```

4. Scan the QR code shown in the terminal with your phone's camera (iPhone) or
   with the Expo Go app (Android). Phone and computer must be on the same Wi-Fi.

The first launch copies the 25 MB database onto the phone and takes a moment.
No native build is needed: every module the app uses is included in Expo Go.
To produce a store-ready build later, use `npx eas-cli build`.

## Project layout

```
App.tsx                  App shell: database provider, screen stack, word sheet
src/db.ts                Database asset and on-device database name
src/queries.ts           All SQL, typed
src/text.ts              Expands offset-encoded Strong's tags into text runs
src/settings.tsx         Persisted settings (translation, text size, position)
src/components/          Header, VerseText (tappable words), WordSheet, VerseListItem
src/screens/             Reader, Books, Chapters, Search, Concordance, Settings
scripts/fetch-data.sh    Downloads the source texts into data/raw/ (not committed)
scripts/build-db.mjs     Builds assets/db/bible.db from data/raw/
assets/db/bible.db       The bundled database (committed, about 25 MB)
```

## Rebuilding the database

The database is committed so the app runs straight after `npm install`. To
rebuild it from the sources:

```bash
npm run fetch-data   # downloads KJV, WEB and the Strong's dictionaries
npm run build-db     # writes assets/db/bible.db (needs Node 22+)
```

Then bump the suffix in `DATABASE_NAME` in `src/db.ts` (for example `bible-v2.db`)
so phones that already hold a copy of the old file pick up the new one.

### Schema

| Table         | Contents                                                                  |
| ------------- | ------------------------------------------------------------------------- |
| `books`       | 66 books: id, USFM code, name, testament, chapter count                   |
| `verses`      | one row per verse and translation: plain `text` plus offset-encoded `tags` |
| `headings`    | section headings that fall between verses (the acrostic labels of Psalm 119 in the WEB) |
| `strongs`     | 14,197 dictionary entries: lemma, transliteration, pronunciation, derivation, definition, KJV usage |
| `concordance` | per Strong's number and translation: verse count and a packed list of verse references |
| `meta`        | build date and source information                                         |

`tags` holds `gap,length,number` triples separated by spaces. `gap` is the number
of characters since the end of the previous tag, `length` the tagged span, and
`number` the Strong's number without its letter (H for Old Testament books, G for
New Testament books). Psalm titles are stored as verse 0.

## Sources and licences

- **King James Version**, 1769 text with Strong's numbers, from
  [eBible.org](https://ebible.org/find/details.php?id=eng-kjv2006). Public domain
  (outside the United Kingdom, where printing rights are held by the Crown's patentees).
- **World English Bible** with Strong's numbers, from
  [eBible.org](https://ebible.org/find/details.php?id=engwebp). Public domain;
  "World English Bible" is a trademark of eBible.org.
- **Strong's Hebrew and Greek dictionaries**, digital edition by
  [Open Scriptures](https://github.com/openscriptures/strongs), CC BY-SA.

## Known limitations

- The Strong's tagging in the World English Bible is less precise than in the
  KJV. Occasionally a word opens the entry of a neighbouring word.
- The WEB omits five New Testament verses that are absent from the earliest
  manuscripts (for example Matthew 17:21). They are also absent here, as in print.
- Text search is a plain substring match, case-insensitive for English letters.
- The app does not yet show the full Hebrew or Greek verse text, only the word
  behind each English word.
