# Putting a test build on an iPhone

An iPhone runs only apps signed for it. The GitHub workflow "iPhone build (unsigned)"
makes each app as an unsigned `.ipa`: a Release build with the Bible text and JavaScript
inside, so it runs on its own once installed. It has to be signed before an iPhone
accepts it. There are three ways to do that.

| Way | Needs | How long an install lasts |
| --- | --- | --- |
| Sideloadly or AltStore, with a free Apple ID | A Windows PC or a Mac, and a USB cable | 7 days, then sign it again |
| Xcode, with a free Apple ID | A Mac | 7 days, then build again |
| TestFlight | The paid Apple Developer Program | 90 days per build, no computer |

TestFlight is the way to give builds to other testers. The two free ways are for your own
phone.

## 1. Download the .ipa

1. Sign in to GitHub and open the repository's **Actions** tab.
2. Choose **iPhone build (unsigned)** and open the latest run with a green tick.
3. Under **Artifacts**, download `Bible-<version>-unsigned.ipa`,
   `Vedapusthakam-<version>-unsigned.ipa` or `Vedagamam-<version>-unsigned.ipa`.
   GitHub hands it over inside a `.zip`; unzip it to get the `.ipa`.

To make a fresh build without a push, use **Run workflow** on that page. A run takes
about half an hour. Artifacts are kept for 30 days.

## 2. Sign and install it with Sideloadly

Sideloadly is a free third-party tool for Windows and macOS, from sideloadly.io.

1. On Windows, install iTunes and iCloud from Apple's website first, not from the
   Microsoft Store, so Sideloadly can talk to the phone.
2. Connect the iPhone by cable, unlock it, and tap **Trust** on the phone.
3. Open Sideloadly, drag the `.ipa` onto it, enter an Apple ID and press **Start**.
4. On the iPhone, open **Settings → General → VPN & Device Management**, tap the Apple ID
   under Developer App and tap **Trust**.
5. On iOS 16 or later, also turn on **Settings → Privacy & Security → Developer Mode**
   and restart the phone when asked.

Sideloadly sends the Apple ID and password to Apple to make the signing certificate.
A separate Apple ID made only for testing keeps your main account out of it.

With a free Apple ID:

- The app stops opening after 7 days. Sign and install the same `.ipa` again; bookmarks,
  notes and settings stay, because it is the same app.
- At most three such apps can be installed at once.

AltStore (altstore.io) does the same job and can re-sign the app over Wi-Fi before the
7 days run out, while its helper runs on the computer.

## 3. Build it with Xcode on a Mac

With the repository on a Mac, Node 22 and Xcode 26:

```
npm ci
BIBLE_EDITION=en npx expo prebuild --platform ios
cd ios && pod install && open *.xcworkspace
```

In Xcode, choose the app target, then **Signing & Capabilities**, tick **Automatically
manage signing** and choose your Apple ID as the team. Free accounts need a bundle
identifier no one else has used, so add a suffix such as `.test` if Xcode complains.
Choose the iPhone as the destination, set the scheme to **Release**
(**Product → Scheme → Edit Scheme → Run → Build Configuration**), and press Run.

A **Debug** build only opens while the computer runs the Metro server (`npx expo start`)
on the same Wi-Fi network. Release is the build to carry around.

## 4. TestFlight

Once the Apple Developer Program enrolment is through, EAS Build or this workflow signs
the app for TestFlight (docs/ios/README.md). Testers install the TestFlight app, accept an
invitation, and receive each new build without a computer.
