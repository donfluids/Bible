# iPhone apps: from here to the App Store

The apps build for iPhone from this same code: **Bible** (`org.riversresearch.bible`),
**വേദപുസ്തകം** (`org.riversresearch.bible.malayalam`) and, once it is ready, **வேதாகமம்**
(`org.riversresearch.bible.tamil`). They are built in Expo's cloud
(EAS Build), so no Mac is needed. iPhone only, as on Android phones only.

Steps 1 to 3 happen once. Steps 4 to 6 repeat for each new version.

## 1. Apple Developer Program (Rivers Research LLC)

- [ ] Get a free **D-U-N-S number** for Rivers Research LLC, if it has none:
      https://developer.apple.com/enroll/duns-lookup/ (can take up to about 5 working days).
- [ ] Enrol as an **organisation** at https://developer.apple.com/programs/enroll/
      ($99 a year). Use a work email at riversresearch.org and the company's legal name;
      Apple calls to confirm you may sign for the company. The App Store then shows
      "Rivers Research LLC" as the seller.
- [ ] In App Store Connect (https://appstoreconnect.apple.com) → Business, accept the
      Free Apps agreement. (No banking or tax forms are needed for free apps.)

## 2. Expo account and the build tool

- [ ] Make a free account at https://expo.dev (an organisation named riversresearch, or
      your own account).
- [ ] On any computer with Node.js: `npm install -g eas-cli`, then `eas login`.
- [ ] In this repository, link each app to an EAS project:

      BIBLE_EDITION=ml eas init
      BIBLE_EDITION=en eas init
      BIBLE_EDITION=ta eas init

      Each prints a project ID. Put it in `app.config.js` as `easProjectId` for that
      edition (or send the IDs to Claude to put in).

## 3. The apps in App Store Connect

For each app: My Apps → + → New App.

| | വേദപുസ്തകം | Bible | வேதாகமம் (later) |
| --- | --- | --- | --- |
| Platform | iOS | iOS | iOS |
| Name | വേദപുസ്തകം – മലയാളം ഇംഗ്ലീഷ് | Bible: KJV, WEB, Hebrew, Greek | வேதாகமம் – தமிழ் ஆங்கிலம் |
| Primary language | Malayalam if listed, else English (India) | English (U.S.) | Tamil if listed, else English (India) |
| Bundle ID | org.riversresearch.bible.malayalam | org.riversresearch.bible | org.riversresearch.bible.tamil |
| SKU | vedapusthakam | bible | vedagamam |

If the bundle ID is not in the list yet, run the first build (step 4): it registers it.
Afterwards copy each app's **Apple ID** (App Information page, a number) into
`eas.json` → `submit` → `ascAppId` for `ios-ml` / `ios-en` / `ios-ta`.

## 4. Build

    eas build --platform ios --profile ios-ml
    eas build --platform ios --profile ios-en
    eas build --platform ios --profile ios-ta     # the Tamil app, once it is ready

The first time, EAS asks to sign in with the Apple account and makes the signing
certificate and provisioning profile itself (answer yes). Build numbers count up by
themselves. A build takes about 20 to 40 minutes in the queue on the free plan.

## 5. TestFlight

    eas submit --platform ios --profile ios-ml --latest
    eas submit --platform ios --profile ios-en --latest
    eas submit --platform ios --profile ios-ta --latest

The build appears in App Store Connect → TestFlight after Apple processes it (minutes to
an hour). Add yourself under Internal Testing, install the TestFlight app on an iPhone and
try the app there before sending it for review. Things to try on an iPhone:

- Malayalam, Tamil and Hebrew letters show in the bundled fonts (compare with the Android app).
- Swipe from the left edge goes back from a pushed screen; chapters still turn by swiping.
- The keyboard does not cover the verse note box or a notebook page.
- Bookmarks and notes survive closing the app from the app switcher.
- On an iPad: turn it on its side and back; the text, bars and sheets keep to a reading
  width, and Split View (two apps side by side) still lays out properly.

## 6. The listing and review

- Listing text: `listing-vedapusthakam.md`, `listing-bible.md` and `listing-vedagamam.md` in this folder.
- Screenshots: `screenshots/ml` and `screenshots/en`, 1320 × 2868 (6.9-inch iPhone), which
  App Store Connect scales for smaller iPhones.
- iPad screenshots: the apps run on iPad too, so App Store Connect also asks for 13-inch iPad
  screenshots (2064 × 2752, portrait): `screenshots/ipad-ml` and `screenshots/ipad-en`.
- App Privacy: **Data Not Collected** (the apps collect nothing and have no internet use).
- Age rating questionnaire: none of the content types apply → 4+.
- Pricing: Free. Availability: all countries and regions **except the United Kingdom**
  (the KJV's Crown copyright, as on Google Play).
- Content rights: the apps contain third-party texts, used under their licences
  (public domain, CC BY 4.0, CC BY-SA); details in the app's Sources and licences screen.
- Privacy policy URL: the riversresearch.org page (it covers iPhone as well as Android).
- Export compliance is answered in the app itself (no non-exempt encryption).

Then Add for Review → Submit. Review usually takes one to two days.
