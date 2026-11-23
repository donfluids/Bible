# Eighth review: security, usability, look, and every feature

Four reviewers read commit 331f497 (version 0.4.37), each with one subject: security and
privacy; usability; the look of each screen; features and correctness. The look reviewer
ran the web preview (en and ml, light and dark, 390 and 360 wide, largest text) and took
screenshots; the others read the code. Nothing was run on a phone. "Checked" means the owner
of this list read the code or screenshot the reviewer pointed at and agrees.
Status: **open** until fixed; **yours** for a decision only the owner can take. "Fixed" means
changed in the code and passing the checks here (types, 97 logic tests, the data check and
the web smoke test); none of it has been tried on a phone yet.

## Tier 1: fix before the next release

| # | Area | Platform | Item | Status |
|---|---|---|---|---|
| 1 | Usability | both | Saved tab: one tap on the bin deletes a bookmark, highlight, marked passage or a whole verse note, with no question and no undo, right beside the reference people tap to open (SavedScreen.tsx:118, :227). Its label is only "Remove". Checked. Add Undo to the toast (the reader's `setToast(text, undo)` exists), name the item in the label. | fixed in d002811 |
| 2 | Usability | both | The verse menu's remove-bookmark, remove-highlight and remove-note toasts have no Undo either (ReaderScreen.tsx:1051, :1074, :1096); a note's Delete only empties the box and closing always saves, so an edit cannot be abandoned. | fixed in d002811 |
| 3 | Data | both | "Save a backup" holds notebook pages only (notebookBackup.ts:28). Bookmarks, highlights, marked text and verse notes are not in it, so they are lost on a move to a new phone (Android to iPhone above all). Settings over 256 KB also lose their daily `.bak` (persist.ts:63-70). Checked. Put them in the same file, offer it in Settings too, and exempt settings from the size limit. | fixed in d002811 |
| 4 | Accessibility | both | The eight switches in Settings have no label: TalkBack and VoiceOver say only "Switch, off"; only the small switch takes a tap (SettingsScreen.tsx:161-310). Checked. Make each row the switch, with its title as label. | fixed in d002811 |
| 5 | Features | Android, ml/all | Any notification sound stops Meera: a "may duck" focus loss is treated as a full loss (BibleVoiceModule.kt:58). Checked. Lower the volume on duck, restore on gain. | fixed in a5c778a |
| 6 | Features | iPhone | Saved card looks keep the photo's full path, which iOS changes on each update; the photo is then dropped without a word and the copy left behind (cardLooks.ts:24, lookClean.ts:28). Keep the file name only. | fixed in a5c778a |
| 7 | Features | both | Saved: filter by a colour, delete its last highlight, and the list is stuck on "Nothing here" with the chips gone (SavedScreen.tsx:79-81). Checked. Clear the filter when its colour is gone. | fixed in d002811 |
| 8 | Features | both | Choosing another chapter in the 0.9 s pause between chapters while reading aloud reads a chapter that is not shown (readAloud.ts:150-173). Halt when the pause timer is set; check the list belongs to the chapter. | fixed in a5c778a |
| 9 | Security | iPhone | BVVoiceModel.m:30: an ONNX Runtime message that is not valid UTF-8 gives nil, and the error dictionary then throws: the app is closed instead of the verse failing. Checked. Fall back to a fixed message. | fixed in a5c778a |
| 10 | Look | both | 557 Malayalam, 827 BSB and 58 ASV verses begin with a space or an em space, so a wide gap follows the verse number (Genesis 1:1 in Malayalam). Checked in bible-ml.db and in the screenshot. Trim leading space where verses stand one per line. | fixed in a5c778a |
| 11 | Look | ml | "പങ്കുവയ്ക്കുക" (Share) in the verse menu breaks inside the word (ReaderScreen.tsx:2213). Checked in the screenshot. One line, shrinking to fit, or a shorter word. | fixed in a5c778a |
| 12 | Look | all | Saved's three buttons: the chosen one gains a tick and its label wraps ("Bookmarks / 1" even in English), so the row jumps (Segmented.tsx:33). Checked in the screenshot. Long Tamil and Malayalam words are worse. Keep room for the tick always, or put counts in a badge. | fixed in a5c778a |
| 13 | Security | iPhone build | The App Store Connect key (Admin) is written to disk before Archive, while every dependency's build scripts run (ios-testflight.yml:128-187); it is used only at upload. Checked. Write it just before upload; better, upload from a second job. | fixed in a5c778a |
| 14 | Security | Android build | check-apk reads only `uses-permission:` lines (check-apk.mjs:27), not `uses-permission-sdk-23:`, and checks providers, services and receivers but not activities (:55). A dependency could add INTERNET or an exported activity unnoticed. Checked. | fixed in a5c778a |

## Tier 2: soon

| # | Area | Item | Status |
|---|---|---|---|
| 15 | Usability | Android Back leaves the app while marking text or while the player shows, instead of ending that mode (ReaderScreen.tsx, no BackHandler). | fixed in 164ea30 |
| 16 | Accessibility | Books tab: no Old/New Testament headings; screen readers read across the rows (Genesis, Matthew, Exodus...) (BooksScreen.tsx:113). | fixed in 164ea30 |
| 17 | Accessibility | Passage picker chapter buttons are about 37 × 40 on a 360-wide phone, under the 44–48 minimum; book names cut short at large text (PassagePicker.tsx:157-164). | fixed in 164ea30 |
| 18 | Wording | The how-to text still describes the old picker ("books under their groups"), in all four languages (i18n.ts:365, :858, :1349, :1842); the read-aloud line says "your phone's voice" where Malayalam uses the app's own. | fixed in 164ea30 |
| 19 | Look | Search field runs off the screen at 360 wide on web (clear button cut); add `minWidth: 0` (SearchScreen.tsx:383). May be web only. | fixed in 164ea30 |
| 20 | Look | Settings: descriptions touch the switches (SettingsScreen.tsx:450, add a gap). | fixed in d002811 |
| 21 | Look | Dark theme: welcome pictures are bright light-theme shots; the title hint bubble and sheets have no visible edge (WelcomeScreen.tsx:29, Hint.tsx:72). | fixed in 164ea30 |
| 22 | Look | The previous-chapter arrow sits over the last verse's text at rest (ReaderScreen.tsx:1569). | fixed in 164ea30 |
| 23 | Look | Word sheet: the "Usual meaning" heading is cut in half by the footer at the opening height. | fixed in 164ea30 |
| 24 | Look | Footnote letter at a verse's start sticks to the first word ("aദൈവം") (VerseText.tsx:150-161). | fixed in a5c778a |
| 25 | Wording | iPhone shows the Android voice hint ("Speech Services by Google") (SettingsScreen.tsx:325); give iPhone its own. | fixed in 164ea30 |
| 26 | Wording | Compare in Malayalam mixes transliterated and English Bible names; its title breaks inside the reference (CompareSheet.tsx:81, :90). | fixed in 164ea30 |
| 27 | Features | iPhone, Meera: reading may stop at a chapter's end with the phone locked (a second or more of silence while the next chapter loads). Make the next chapter's first verse ahead. | fixed in 164ea30 |
| 28 | Features | "Next verse" (also from the lock screen) stops at a chapter's last verse instead of going on (readAloud.ts:206-215). | fixed in a5c778a |
| 29 | Features | Switching Bible sets the shown chapter before it loads: Recent not updated, notes not reset (ReaderScreen.tsx:982). | fixed in 164ea30 |
| 30 | Security | The four-language app is never built or checked in CI (matrices are en, ml, ta). Add `all`. | blocked: the four-language database is 134 MB, over GitHub's 100 MB file limit, so CI has no copy; it would have to be built in CI first |
| 31 | Security | check-ipa scans only this repository's code, not the JS bundle, and exempts all of notebookFiles.ts rather than its one web-only line. | fixed in 164ea30 |
| 32 | Security | A very large backup could use hundreds of MB while read; restore takes 50,000 strokes a page where the app writes 20,000. Cap them (ink.ts:144). | fixed in 164ea30 |
| 33 | Data | A few ASV/LSV word links point at the wrong word (ASV Genesis 22:2 "son" → Isaac; LSV Psalm 51:0 "TO"). Spot-check hand-picked verses. | open: needs hand corrections for the ASV and LSV (as data/align/mal/hand-checked.json does for Malayalam); with the next database build |
| 34 | Strings | Licences title is English in every language (LicencesScreen.tsx:106); card share and crash screens show English system errors. | title fixed in 164ea30; the system's reason under the card and crash messages stays on purpose (it found the iPhone card bug) |

## Small

| # | Item | Status |
|---|---|---|
| 35 | iPhone: `sessionActive` stays set after a call; clear it when an interruption begins. | open |
| 36 | Android: `BIBLE_NO_VOICE` is not honoured by Gradle (only matters for a voiceless Android build). | open |
| 37 | The voice model (about 45 MB) stays loaded for the app's life; council 7 #13 said it is released, it is not. | open |
| 38 | `forgetPhoto` checks the cache prefix but not `..` (cardLooks.ts:63); reuse `ownPhotoIn`. Not reachable today. | open |
| 39 | Interlinear small text on yellow (dark) and pink/blue (light) highlights is just under 4.5:1. | open |
| 40 | Screen readers are not told a verse is bookmarked or highlighted; the Hebrew/Greek row in the Bible chooser is read as two controls. | open |
| 41 | Card: a typed message and heading are lost on Back without a warning. | open |
| 42 | Empty Saved tabs say only "Nothing here yet"; say how to add one. | open |
| 43 | Web preview only: teal switch knob, focus rings, "Version 0.4.37 (?)". | open |
| 44 | Look: outlines differ between segmented buttons and cards; the "About the texts" card lacks dividers; Recent (clock) and Backup (arrow) icons look alike. | open |
| 45 | Unpinned Maestro installer in the simulator test job (no secrets there); Gradle and CocoaPods artifacts are not hash-checked. | open |

## Yours to decide

| # | Item | Status |
|---|---|---|
| 46 | Pushes to this working branch upload to TestFlight and Play with the signing secrets. Protect the branch, or keep uploads to main and tags with the secrets in a GitHub Environment. | yours |
| 47 | Select several verses at once to copy, share or highlight (common in Bible apps). | yours |
| 48 | Search in the Malayalam and Tamil apps covers only the Bible being read; offer the English Bibles as chips, as the four-language app does. | yours |
| 49 | Saved shows every item whichever Bible it was made in. | yours |
| 50 | Largest text in Malayalam breaks long words on narrow phones; cap at 32 there? | yours |
| 51 | Search "All" lists the New Testament first; the dictionary ranks H7453 (friend) above H157 (love) for "love". | yours |
| 52 | Check the 129 Malayalam meanings shown under common Hebrew and Greek words in the interlinear (docs/interlinear-ml-review.md; the list is src/data/interlinear-ml.json, now drafted and in the app). | yours: to review later |

## From council 7

#23 (voice module reads any path) is **fixed**: both platforms now take only the app's own
files, with symbolic links resolved. #13 is still open (see #37).

## Found sound

No internet use in the app's code; INTERNET removed from release builds; no analytics, ads or
update packages; every lockfile entry from the npm registry with a hash; ONNX Runtime pinned
on both platforms, and the NuGet copy checked by sha512 and commit. The new iPhone voice file
matches the model's inputs and the Android module, frees what it makes, and copies the output
before release. Queries bind their values; PDF text is escaped; backups are size-checked and
validated field by field; shared files go through a cleared folder; the media service is not
exported. Workflows pin actions by commit and keep secrets out of scripts. No secrets in the
repository or its history. Data: every Bible has 66 books and 1,189 chapters; the speech file
covers all 31,215 Malayalam verses; all four string tables have the same 487 keys. Body text
passes contrast in all nine palettes. The look is calm and mostly finished.
