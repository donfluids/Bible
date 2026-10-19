# Task: update the Bible apps' privacy policy on riversresearch.org

Rivers Research LLC publishes Bible apps on Google Play, soon also on Apple's App Store:
**Bible** (`org.riversresearch.bible`), **വേദപുസ്തകം** (`org.riversresearch.bible.malayalam`)
and a third, new one, **வேதாகமம்** (`org.riversresearch.bible.tamil`).
Their privacy policy is on riversresearch.org (at `https://riversresearch.org/bible/privacy`,
or the address chosen when it was first published). This task replaces the page's policy text with the new version below.

## What changed in the policy

Compared with the version dated 15 October 2026, which added the Tamil app:

- Effective date **20 October 2026**.
- "Copying and sharing" now covers verses shared as a picture card: the card, with any
  heading and message typed on it, is made on the phone and the apps keep no copy.
- A new section, "Reading aloud", between "Copying and sharing" and "Links": the apps
  pass only the text being read to the phone's own text-to-speech engine.

Nothing else changed. If the page still shows an older version (dated 14 or 15 October
2026, or earlier), replace it all the same: the text below is the whole current policy.

This privacy page is the only change the website needs for these app updates.

## What to do

1. Find the existing privacy policy page for the Bible apps. Keep its address exactly as
   it is: Play Console already points to it, and App Store Connect will too.
2. Replace the policy text on that page with the text in the section below, **word for
   word**. Headings, lists and the contact link may take the site's own styling, but do
   not reword, shorten or add to the policy: it describes exactly what the apps do, and
   Google compares it with the apps' declarations.
3. Keep the site's normal page layout, and keep the Malayalam and Tamil app names
   (വേദപുസ്തകം, வேதாகமம்) as Unicode text, not images.
4. If no such page exists yet, create it at `https://riversresearch.org/bible/privacy`
   (or the nearest path that fits the site's conventions) and report the address.

## Requirements Google Play checks

- Reachable by anyone over **HTTPS**, with no login, password, paywall or region block.
- Served as an ordinary web page (HTML), not a PDF or a file download.
- The address stays the same for as long as the apps are on Google Play.
- Readable on a phone. If the site shows a cookie banner, it must not hide the text.
- The page names the apps and the developer (the text below does).

## Done when

- `curl -sI https://riversresearch.org/bible/privacy` (or the page's address) returns
  status 200 with `Content-Type: text/html`.
- The page shows "Effective 20 October 2026", "Reading aloud", "picture card", "வேதாகமம்", "for Android and iPhone" and
  "iCloud", plus "Rivers Research LLC", all three package names and dond@riversresearch.org.
- It opens on a phone without signing in.

## Report back

The page's address, and that the text now reads as below.

---

## The policy text (publish exactly this)

# Privacy policy

Bible (org.riversresearch.bible), വേദപുസ്തകം (org.riversresearch.bible.malayalam) and வேதாகமம் (org.riversresearch.bible.tamil), for Android and iPhone, published by Rivers Research LLC. Effective 20 October 2026.

> The apps collect no personal data and send nothing anywhere. They do not connect to the internet. Everything you save in them stays on your phone.

## What the apps keep, and where

The apps store your settings, your reading place, and the bookmarks, highlights, marked text, notes and notebook pages you make. These are kept only in the app's own storage on your phone. We never receive them and have no way to see them.

## Backup

If backup is switched on in your phone's settings, your phone can include the apps' settings, bookmarks, highlights, marked text, notes and notebook pages in its backup, so they come back when you reinstall the app or move to a new phone: on Android to your Google account, on iPhone to iCloud. Your phone does this under your Google or Apple account's terms; we cannot see the backup. You can switch backup off in your phone's settings. The Bible text itself is not included in the backup.

## Copying and sharing

When you copy or share a verse or a notebook page, or share a verse as a picture card, the text or picture goes to the clipboard or to the app you choose, and only when you ask for it. A card, with any heading and message you type on it, is made on your phone, and the apps keep no copy of it.

## Reading aloud

When you have a chapter, or a Hebrew or Greek word, read aloud, the apps pass that Bible text to your phone's own text-to-speech engine, which is part of your phone, not of the apps. Only the text being read is passed to it. Most engines work without the internet; if the engine on your phone uses online voices, its own privacy terms apply.

## Links

The Sources and licences screen has links to the websites the texts come from. They open in your web browser, and those websites have their own privacy policies.

## What the apps do not do

- No accounts or sign-in.
- No advertising.
- No analytics, tracking or crash reporting.
- No access to your contacts, location, camera, microphone or files.

On Android, the only permission the apps use is vibration, for the light ticks you feel when you hold a verse, mark text, save a highlight or change the text size. On iPhone the apps ask for no permissions; the same ticks use the phone's haptics, which need none.

## Children

The apps collect no data from anyone, including children.

## Removing your data

Uninstalling an app (on iPhone, deleting it), or choosing Clear storage for it in Android's settings, removes everything it stored on your phone. To remove a copy kept in a backup, manage your backups in your phone's settings, your Google account or iCloud.

## Changes

If this policy changes, the new version will be posted on this page with a new effective date.

## Contact

Rivers Research LLC
[dond@riversresearch.org](mailto:dond@riversresearch.org)
