# iOS builds

Both editions build for iPhone and iPad from the same code as Android. Builds run on
Expo's build service (EAS), so no Mac is needed. Each edition is its own app on the App
Store, with its own bundle identifier.

| Edition | App name | Bundle identifier | Build profiles |
| --- | --- | --- | --- |
| `en` | Bible | `org.riversresearch.bible` | `preview-en`, `production-en` |
| `ml` | വേദപുസ്തകം | `org.riversresearch.bible.malayalam` | `preview-ml`, `production-ml` |

The profiles are in `eas.json`. Each one sets `BIBLE_EDITION`, which picks the name,
identifier, icon and database exactly as it does for Android.

## What is different on iOS

- **Backup.** iOS backs up an app's Documents folder to iCloud. The Bible database copy
  goes to Library/Caches instead, which iOS never backs up (`src/db.ts`). Settings,
  bookmarks, highlights, notes and notebook pages stay in Documents, so iCloud backs
  them up. If iOS empties Caches to free space, the next launch copies the database again.
- **Edition in the Xcode project.** `plugins/withIosEdition.js` writes the edition into
  `ios/.xcode.env`, so Xcode's build steps bundle the right database. It does the same
  job as the `bible.edition` line in Android's `gradle.properties`.
- **Export compliance.** The app declares that it uses no encryption of its own
  (`ITSAppUsesNonExemptEncryption` is false), so App Store Connect does not ask on each upload.
- **Privacy manifest.** `app.json` declares no tracking and no collected data, and lists
  the system APIs React Native and Expo use, with Apple's reason codes.
- **Build numbers.** EAS keeps the iOS build number and raises it on each production
  build (`appVersionSource` is `remote`). The version shown to users is `version` in `app.json`.

## One-time setup

1. Join the Apple Developer Program as Rivers Research LLC. Enrolling as an organization
   needs the company's D-U-N-S number.
2. Create a free account at expo.dev, then install the command-line tool and sign in:

   ```bash
   npm install -g eas-cli
   eas login
   ```

3. Create an EAS project for each edition. The app config is a script, so `eas init`
   cannot write the project ID itself; it prints it instead. Put each ID into
   `easProjectId` for that edition in `app.config.js`.

   ```bash
   BIBLE_EDITION=en eas init
   BIBLE_EDITION=ml eas init
   ```

4. In App Store Connect, create one app record per edition with the bundle identifiers
   above. App Store names must be unique, so "Bible" alone will probably be refused.

## Test on an iPhone

Register the phone once, then build an installable test version:

```bash
eas device:create
eas build --platform ios --profile preview-en
eas build --platform ios --profile preview-ml
```

EAS asks for the Apple account on the first build and creates the signing certificate
and provisioning profile. When the build finishes it shows a link and a QR code; open it
on the registered iPhone to install.

Things to check on the phone: the first launch copies the database and opens the reader,
Hebrew and Malayalam text use the bundled fonts, buttons darken when pressed, sharing and
copying a verse work, and notes survive closing and reopening the app.

## Release to the App Store

```bash
eas build --platform ios --profile production-en
eas submit --platform ios --profile production-en
```

Repeat with `production-ml` for the Malayalam app. `eas submit` uploads the build to
App Store Connect, where it appears in TestFlight and can then be sent for review.

## Building locally on a Mac

This needs Xcode and CocoaPods:

```bash
BIBLE_EDITION=ml npx expo prebuild --platform ios --clean
open ios/*.xcworkspace
```

The generated `ios` folder is not committed. Generate it again after changing
`app.json`, `app.config.js` or a plugin.
