# Releasing on Google Play

Everything needed to put the two apps on Google Play from an organisation developer
account, the Malayalam app first. The English app follows the same steps with its
own listing.

| File | What it is |
| --- | --- |
| `listing-vedapusthakam.md` | Name and descriptions for വേദപുസ്തകം, in Malayalam (default) and English |
| `listing-bible.md` | Name and descriptions for Bible, in English |
| `privacy-policy.html` | Privacy policy page for both apps, to upload to riversresearch.org |
| `graphics/*-icon-512.png` | The 512 × 512 icons Play asks for |
| `graphics/vedapusthakam-feature-*.png` | Feature graphics for the Malayalam app, Malayalam and English |
| `screenshots/ml/*.png` | Seven framed phone screenshots for the Malayalam listing |
| `screenshots/en/*.png` | The same seven with the interface in English and English captions, for the English translation |

The Malayalam wording in the listing and in the app's interface still needs a
Malayalam speaker to read it.

## 1. Before the first upload

- [ ] Upload `privacy-policy.html` (Rivers Research LLC, dond@riversresearch.org) to
      riversresearch.org, for example `https://riversresearch.org/bible/privacy`.
      Play needs the address to be public and stable.
- [ ] Install the 0.3.8 APK from the `apk-builds` branch and use it for a while: it is
      the first build without the internet, storage and overlay permissions.
- [ ] Keep `credentials/bible-release.jks` and `credentials/signing.env` safe and backed
      up outside this machine. They are not in the repo. With Play App Signing this key
      becomes the **upload key**: losing it is recoverable (Play support can register
      a new one), but it is still slow.

## 2. Create the app in Play Console

- [ ] Create app: app name `വേദപുസ്തകം – മലയാളം ഇംഗ്ലീഷ്`, package name
      `org.riversresearch.bible.malayalam` (permanent; the English app is
      `org.riversresearch.bible`), default language
      Malayalam (ml-IN), type App, **Free** (a free app cannot later become paid).
- [ ] Accept the declarations (Developer Program Policies, US export laws).

## 3. App signing and the first build

- [ ] Testing → Internal testing → Create new release.
- [ ] When asked about app signing, choose **Use Google-generated key**. The bundle
      you upload is signed with your current release key, which Play records as the
      upload key.
- [ ] Upload `Vedapusthakam-0.3.8-b20.aab` from the `apk-builds` branch.
- [ ] Add yourself (and anyone helping) as internal testers, install from the test
      link, and check the app installed from Play works.

Phones that have the sideloaded APK must uninstall it before installing from Play:
Play's copy is signed with Google's key, so Android treats it as a different signer.
Uninstalling removes the bookmarks and notes on that phone.

## 4. App content (Policy → App content)

- [ ] **Privacy policy**: the riversresearch.org address.
- [ ] **App access**: all functionality is available without special access.
- [ ] **Ads**: No, the app does not contain ads.
- [ ] **Content rating**: fill in the questionnaire (category for reference or
      educational apps); the app has no violence, user-generated content shared
      with others, purchases or location.
- [ ] **Target audience and content**: tick every age group (all ages, children
      included). That puts the app under Play's
      [Families policy](https://support.google.com/googleplay/android-developer/answer/9893335);
      it complies: no ads, no data collected from anyone, no third-party SDKs, content
      suitable for children, and a privacy policy that covers children. With no ads, no
      neutral age screen is needed. The Share button hands a verse to the app the user
      picks in Android's share menu; Play defines a social feature as one that lets users
      "share freeform content or communicate with large groups of people", which this is
      not. If a reviewer reads it otherwise, the fix is a one-line safe-online reminder
      before sharing. Review of an app for children can take longer than usual.
- [ ] **Data safety**: the app collects and shares no data: no network access, no
      accounts, no analytics. Bookmarks and notes can reach the user's Google account
      only through Android's own system backup, which the user controls. Declaring
      "no data collected" is the usual reading for that case; check Play's Data safety
      help if you want to be sure.
- [ ] **Government apps**: No. **Financial features**: None. **Health**: None.
      **News app**: No.

## 5. Store listing (Grow → Store presence → Main store listing)

- [ ] App name, short and full description from `listing-vedapusthakam.md` (Malayalam).
- [ ] Add a translation: English (en-US), from the English section of the same file.
- [ ] App icon: `graphics/vedapusthakam-icon-512.png`.
- [ ] Feature graphic: `graphics/vedapusthakam-feature-ml.png` for the Malayalam listing and
      `graphics/vedapusthakam-feature-en.png` for its English translation (1024 × 500, redrawn
      by `node scripts/make-feature-graphic.mjs`).
- [ ] Phone screenshots: the seven in `screenshots/ml/` (1080 × 1920, Malayalam captions),
      in this order: reader with highlights, word sheet, Hebrew/Greek words, compare,
      marker, search, dark theme. They are the app's own screens rendered in Chromium from
      a web build at phone size (no Android emulator was available), so the system status
      bar is missing; the captions need a Malayalam speaker's read.
- [ ] English translation of the listing: the seven in `screenshots/en/` (interface set to
      English, English captions, same order).
- [ ] Category: Books & Reference. Contact email; website optional.

## 6. Countries and release

- [ ] Countries / regions. The King James Version is in the public domain outside the
      United Kingdom; in the UK the Crown's rights in it are administered by Cambridge
      University Press. Whether to include the UK is your call.
- [ ] Production → Create release → reuse the bundle from internal testing → roll out.
      Review of a new app usually takes a few days.

## 7. Later updates

Each upload needs a higher version code. Build with `BIBLE_VERSION_CODE` raised and
`version` in `app.json` bumped, then:

```bash
BIBLE_EDITION=ml npx expo prebuild --platform android --no-install --clean
cd android && ./gradlew bundleRelease   # android/app/build/outputs/bundle/release/app-release.aab
```

The release key variables in the main README must be set, or the bundle is signed
with the debug key, which Play rejects.
