# Putting the iPhone apps on the App Store

The apps are built, signed and uploaded by the GitHub workflow **iPhone build to
TestFlight** (`.github/workflows/ios-testflight.yml`). It needs four things from your Apple
Developer account, added once as GitHub secrets. After that, each upload is a button on
GitHub. No Mac is needed.

Bundle IDs of the three apps:

| App | Bundle ID |
|---|---|
| വേദപുസ്തകം (Malayalam) | `org.riversresearch.bible.malayalam` |
| Bible (English) | `org.riversresearch.bible` |
| வேதாகமம் (Tamil) | `org.riversresearch.bible.tamil` |

## Once: register the apps

1. **Bundle ID.** At [developer.apple.com/account](https://developer.apple.com/account), go to
   Certificates, Identifiers & Profiles → Identifiers → **+** → App IDs → App. Enter a
   description (the app's name) and an **Explicit** bundle ID from the table. Tick no
   capabilities: the apps use none.
2. **The app in App Store Connect.** At [appstoreconnect.apple.com](https://appstoreconnect.apple.com),
   go to Apps → **+** → New App:
   - Platform: iOS.
   - Name: the name shown on the App Store. It must be unique there, so "Bible" alone will
     likely be taken. A longer name works, such as "Bible – KJV, BSB, WEB".
   - Primary language.
   - Bundle ID: the one registered in step 1.
   - SKU: any text of your own, such as `vedapusthakam`.
   - User access: Full.

Do both steps for each app you will publish. Starting with the Malayalam app alone is fine.

## Once: the API key and the GitHub secrets

1. In App Store Connect, go to Users and Access → Integrations → App Store Connect API →
   Team Keys → **+**.
   - Name: e.g. "GitHub upload".
   - Access: **Admin**. Only Admin (or the Account Holder) may create the distribution
     certificate, which Xcode does on the first upload.
2. **Download** the `.p8` file. Apple lets you download it only once; keep it somewhere safe.
3. Note the key's **Key ID** (in the list) and the **Issuer ID** (shown above the list).
4. Note your **Team ID**: developer.apple.com/account → Membership details.
5. On GitHub, open the repository's Settings → Secrets and variables → Actions → **New
   repository secret**, and add these four:

| Secret | Value |
|---|---|
| `APP_STORE_CONNECT_KEY_ID` | the Key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | the Issuer ID |
| `APP_STORE_CONNECT_KEY` | the whole `.p8` file: open it in a text editor, copy everything from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----` |
| `APPLE_TEAM_ID` | the Team ID |

Do not paste the key into a chat, an email or a file in the repository. The workflow
writes it to the build machine only for the length of a run, and removes it at the end.

## Each upload

1. On GitHub, go to **Actions** → **iPhone build to TestFlight** → **Run workflow**.
   - Choose the app (`ml` for the Malayalam app).
   - Leave the build number blank: each run takes one higher than the last.
   - Click Run workflow.
2. The run takes about 20 minutes. When it is green, the build appears in App Store
   Connect → your app → **TestFlight** within about half an hour, once Apple has processed it.
3. **Test it.** Under TestFlight → Internal Testing, add yourself (and anyone on your team).
   Install the free **TestFlight** app on the iPhone and open the invitation. A TestFlight
   build runs for 90 days, with no Sideloadly and no 7-day limit.

The export-compliance question is already answered by the app: it uses no encryption
beyond the phone's own.

## Each release: the store listing and review

In App Store Connect, open your app → the version (e.g. 1.0, or **+** for a new one):

- **Screenshots.** iPhone 6.9" (1320 × 2868) or 6.7" (1290 × 2796), 3 to 10 of them. The
  apps are iPhone-only for now, so no iPad screenshots are needed. They can be made from
  the app's own screen check: ask for them.
- **Description, keywords and support URL.** The support URL can be the website.
- **Privacy policy URL**: the website's privacy page (docs/play/website-privacy-page.md
  gives its text).
- **App Privacy** (in the app's sidebar): "No, we do not collect data from this app".
- **Category**: Reference (or Books). **Age rating**: answer the questionnaire; all "None".
- **Build**: choose the TestFlight build to send.
- **App Review information**: a contact, and a note for the reviewer, for example: "Reading
  aloud goes on in the background (audio background mode), with controls on the lock
  screen; the app plays a silent sound under the reading so that it is not suspended in
  the moment between verses. No account is needed."

Then **Add for Review** → **Submit**. Review usually takes one to three days. If Apple
asks a question, it arrives in App Store Connect and by email.

## If a run fails

The step that failed shows the error. The usual ones:

- **"Missing secrets"**: a secret's name is misspelt, or it was added under Environments
  instead of Actions.
- **"No profiles for 'org.riversresearch…' were found"** or **"bundle identifier not
  registered"**: do step 1 of "Once: register the apps".
- **"not allowed to create a certificate"**: the API key's role is not Admin.
- **"The bundle version must be higher"**: run again with a build number higher than the
  last one in TestFlight.
