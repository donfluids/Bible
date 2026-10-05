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

The Malayalam wording in the listing and in the app's interface still needs a
Malayalam speaker to read it.

## 1. Before the first upload

- [ ] Fill in `[ORGANISATION NAME]` and `[CONTACT EMAIL]` in `privacy-policy.html` and
      upload it to riversresearch.org (for example `https://riversresearch.org/bible/privacy`).
      Play needs the address to be public and stable.
- [ ] Install the 0.3.6 APK from the `apk-builds` branch and use it for a while: it is
      the first build without the internet, storage and overlay permissions.
- [ ] Keep `credentials/bible-release.jks` and `credentials/signing.env` safe and backed
      up outside this machine. They are not in the repo. With Play App Signing this key
      becomes the **upload key**: losing it is recoverable (Play support can register
      a new one), but it is still slow.

## 2. Create the app in Play Console

- [ ] Create app: app name `വേദപുസ്തകം: മലയാളം ബൈബിൾ`, default language
      Malayalam (ml-IN), type App, Free or Paid. A free app cannot later become paid.
- [ ] Accept the declarations (Developer Program Policies, US export laws).

## 3. App signing and the first build

- [ ] Testing → Internal testing → Create new release.
- [ ] When asked about app signing, choose **Use Google-generated key**. The bundle
      you upload is signed with your current release key, which Play records as the
      upload key.
- [ ] Upload `Vedapusthakam-0.3.6-b18.aab` from the `apk-builds` branch.
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
- [ ] **Target audience and content**: choose the age groups. Including under-13s
      brings in the Families policy and its extra review; that is your decision.
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
- [ ] Phone screenshots, at least 2 (up to 8), 9:16 or 16:9, 320 to 3840 pixels a side.
      Take them on your phone: the reader, a word sheet, the Hebrew or Greek words,
      search, and marker mode make a good set.
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
