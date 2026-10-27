# Task: update the Bible apps' privacy policy on riversresearch.org

Rivers Research LLC publishes Bible apps on Google Play, soon also on Apple's App Store:
**Bible** (`org.riversresearch.bible`), **വേദപുസ്തകം** (`org.riversresearch.bible.malayalam`)
and a third, new one, **வேதாகமம்** (`org.riversresearch.bible.tamil`).
Their privacy policy is on riversresearch.org (at `https://riversresearch.org/bible/privacy`,
or the address chosen when it was first published). This task replaces the page's policy text with the new version below.

## What changed in the policy

Compared with the version dated 20 October 2026:

- Effective date **26 October 2026**.
- "Copying and sharing" also covers a photo the user puts on a card: it is chosen in the
  phone's own photo picker, the app sees only that photo and sends it nowhere, and a saved
  card design keeps a copy on the phone (outside Android's backup, inside iCloud backup).
- A new section, "Notebook backup and PDFs": the notebook can be saved to a backup file and
  a page shared as a PDF or picture, through the share menu; a backup is restored from a
  file the user picks, and only that file is read.
- The summary and "What the apps do not do" now say that data leaves the phone only when
  the user shares, copies, exports or prints it, and that a file is opened only when the
  user picks it.

If the page shows an older version (dated 20 or 23 October 2026, or earlier), replace it
all the same: the text below is the whole current policy.

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
- The page shows "Effective 26 October 2026", "Reading aloud", "picture card", "photo picker", "Notebook backup", "வேதாகமம்", "for Android and iPhone" and
  "iCloud", plus "Rivers Research LLC", all three package names and dond@riversresearch.org.
- It opens on a phone without signing in.

## Report back

The page's address, and that the text now reads as below.

---

## The policy text (publish exactly this)

# Privacy policy

Bible (org.riversresearch.bible), വേദപുസ്തകം (org.riversresearch.bible.malayalam) and வேதாகமம் (org.riversresearch.bible.tamil), for Android and iPhone, published by Rivers Research LLC. Effective 26 October 2026.

> The apps collect no personal data and send nothing to us or to anyone else. They do not connect to the internet. What you save in them stays on your phone, and leaves it only when you share, copy, export or print it yourself, to the place you choose.

## What the apps keep, and where

The apps store your settings, your reading place, and the bookmarks, highlights, marked text, notes and notebook pages you make. These are kept only in the app's own storage on your phone. We never receive them and have no way to see them.

## Backup

If backup is switched on in your phone's settings, your phone can include the apps' settings, bookmarks, highlights, marked text, notes and notebook pages in its backup, so they come back when you reinstall the app or move to a new phone: on Android to your Google account, on iPhone to iCloud. Your phone does this under your Google or Apple account's terms; we cannot see the backup. You can switch backup off in your phone's settings. The Bible text itself is not included in the backup.

## Copying and sharing

When you copy or share a verse or a notebook page, or share a verse as a picture card, the text or picture goes to the clipboard or to the app you choose, and only when you ask for it. A card, with any heading and message you type on it, is made on your phone, and the apps keep no copy of it. If you put one of your own photos on a card, you choose it in your phone's own photo picker: the app sees only that photo, uses it on your phone and sends it nowhere. A card design you save keeps its own copy of the photo on your phone (left out of Android's backup; on iPhone it is included in iCloud backup); removing the design deletes the copy.

## Notebook backup and PDFs

You can save your notebook as a backup file, or a notebook page as a PDF or a picture. The file is made on your phone and goes only where you send it in your phone's share menu (for example Files, Google Drive or a chat); it is a plain file that anyone you give it to can read. To restore, you pick a backup file in your phone's own file picker: the app reads only that file, adds its pages to your notebook and sends nothing anywhere. We never receive these files.

## Reading aloud

When you have a chapter, or a Hebrew or Greek word, read aloud, the apps pass that Bible text to your phone's own text-to-speech engine, which is part of your phone, not of the apps. Only the text being read is passed to it. Most engines work without the internet; if the engine on your phone uses online voices, its own privacy terms apply.

## Links

The Sources and licences screen has links to the websites the texts come from. They open in your web browser, and those websites have their own privacy policies.

## Writing to us

Settings has a Write to us row, and after about two weeks the reader is invited once to write. Either opens a note in your own mail app, addressed to us, with a last line naming the app's version and your phone's model (for example "Android 14, Samsung SM-S911B"), so a problem can be understood. You can delete that line, and the apps send nothing themselves: the note goes only if you send it, from your mail app, under its terms. Your address and what you write are used only to answer you and to improve the apps, and are not shared.

## What the apps do not do

- No accounts or sign-in.
- No advertising.
- No analytics, tracking or crash reporting.
- No access to your contacts, location, camera or microphone. The apps open a file only when you pick it yourself (see Notebook backup and PDFs), and see only that file.

On Android, the only permission the apps use is vibration, for the light ticks you feel when you hold a verse, mark text, save a highlight or change the text size. On iPhone the apps ask for no permissions; the same ticks use the phone's haptics, which need none, and the photo and file pickers are the phone's own, which show only what you choose.

## Children

The apps collect no data from anyone, including children.

## Removing your data

Uninstalling an app (on iPhone, deleting it), or choosing Clear storage for it in Android's settings, removes everything it stored on your phone. To remove a copy kept in a backup, manage your backups in your phone's settings, your Google account or iCloud.

## Changes

If this policy changes, the new version will be posted on this page with a new effective date.

## Contact

Rivers Research LLC
[dond@riversresearch.org](mailto:dond@riversresearch.org)
