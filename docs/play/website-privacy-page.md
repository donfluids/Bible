# Task: update the Bible apps' privacy policy on riversresearch.org

Rivers Research LLC publishes two Android apps on Google Play: **Bible**
(`org.riversresearch.bible`) and **വേദപുസ്തകം** (`org.riversresearch.bible.malayalam`).
Their privacy policy is on riversresearch.org (at `https://riversresearch.org/bible/privacy`,
or the address chosen when it was first published). The apps gained a notebook, so the
policy now names notebook pages. This task replaces the page's policy text with the new
version below.

## What changed in the policy

- Effective date: 5 October 2026 → **12 October 2026**.
- "What the apps keep, and where" and "Android backup": the list now ends
  "marked text, notes **and notebook pages**".
- "Copying and sharing": "When you copy or share a verse **or a notebook page**, …".

Nothing else changed.

## What to do

1. Find the existing privacy policy page for the Bible apps. Keep its address exactly as
   it is: Play Console already points to it.
2. Replace the policy text on that page with the text in the section below, **word for
   word**. Headings, lists and the contact link may take the site's own styling, but do
   not reword, shorten or add to the policy: it describes exactly what the apps do, and
   Google compares it with the apps' declarations.
3. Keep the site's normal page layout, and keep the Malayalam app name (വേദപുസ്തകം) as
   Unicode text, not an image.
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
- The page shows "Effective 12 October 2026", "notebook pages" (twice) and "or a notebook
  page", plus "Rivers Research LLC", both package names and dond@riversresearch.org.
- It opens on a phone without signing in.

## Report back

The page's address, and that the text now reads as below.

---

## The policy text (publish exactly this)

# Privacy policy

Bible (org.riversresearch.bible) and വേദപുസ്തകം (org.riversresearch.bible.malayalam), published by Rivers Research LLC. Effective 12 October 2026.

> The apps collect no personal data and send nothing anywhere. They do not connect to the internet. Everything you save in them stays on your phone.

## What the apps keep, and where

The apps store your settings, your reading place, and the bookmarks, highlights, marked text, notes and notebook pages you make. These are kept only in the app's own storage on your phone. We never receive them and have no way to see them.

## Android backup

If backup is switched on in your phone's settings, Android can include the apps' settings, bookmarks, highlights, marked text, notes and notebook pages in your phone's backup to your Google account, so they come back when you reinstall the app or move to a new phone. Android does this under your Google account's terms; we cannot see the backup. You can switch backup off in your phone's settings. The Bible text itself is not included in the backup.

## Copying and sharing

When you copy or share a verse or a notebook page, the text goes to the clipboard or to the app you choose, and only when you ask for it.

## Links

The Sources and licences screen has links to the websites the texts come from. They open in your web browser, and those websites have their own privacy policies.

## What the apps do not do

- No accounts or sign-in.
- No advertising.
- No analytics, tracking or crash reporting.
- No access to your contacts, location, camera, microphone or files.

The only permission the apps use is vibration, for the light ticks you feel when you hold a verse, mark text, save a highlight or change the text size.

## Children

The apps collect no data from anyone, including children.

## Removing your data

Uninstalling an app, or choosing Clear storage for it in your phone's settings, removes everything it stored on your phone. To remove a copy kept in your Google account's backup, manage your backups in your phone's or Google account's settings.

## Changes

If this policy changes, the new version will be posted on this page with a new effective date.

## Contact

Rivers Research LLC
[dond@riversresearch.org](mailto:dond@riversresearch.org)
