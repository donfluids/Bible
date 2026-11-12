# Seventh review: security, efficiency, and Android/iPhone features

Three reviewers read commit ba663f5 (version 0.4.30), each with one subject. Nothing was
run on a phone: timings and memory figures are estimates from the code. "Checked" means
the owner of this list read the code the reviewer pointed at and agrees.
Status: **open** until fixed; **yours** for a decision only the owner can take.

## Tier 1: fix before the next release

| # | Area | Platform | Item | Status |
|---|---|---|---|---|
| 1 | Features | iPhone | Sharing a handwritten page or a card as a picture asks view-shot for 1080 × up to 16000, which on iPhone are points, drawn at the screen's scale: a long page becomes about 3240 × 48000 pixels and the app is killed or the picture is blank (InkPageScreen.tsx:612, CardScreen.tsx:162). Checked: RNViewShot.mm uses the device scale. Divide by the pixel ratio on iPhone. | open |
| 2 | Features | iPhone | Read aloud with Meera hangs after a call, Siri, locking the phone or leaving the app: the player is paused without its "finished" call, so the verse never ends (BibleVoiceModule.swift). Watch for interruptions and for the app leaving the foreground, and end the verse. | open |
| 3 | Features | iPhone | A chosen phone voice that no longer exists makes read aloud hang (expo-speech throws, no callback). Checked. Check the voice against the phone's list first. | open |
| 4 | Features | iPhone | Share verse, share page, Save backup and Restore are opened in the same moment a sheet closes; the system sheet can vanish with it. Rests on the reviewer's knowledge of iOS, not seen. Open them after the sheet has gone. | open |
| 5 | Privacy | Android | Nothing in the build checks the "only vibration" promise: a dependency's new permission or component ships unnoticed (as ONNX Runtime 1.29's did). Add a check to the build that fails on any permission or provider not on a short list. | open |
| 6 | Efficiency | both | First sound is slow and Stop waits: a verse is made whole before playing, the next verse is made at the same time, skipped verses are still made, and stop/play queue behind the model on one thread. One queue with the current verse first, cancellable between phrases, and the model on its own thread. | open |
| 7 | Features | both | A Hebrew or Greek word is spoken over Meera: saying a word stops the phone's voice but not the app's (speech.ts:57). Checked. | open |

## Tier 2: soon

| # | Area | Platform | Item | Status |
|---|---|---|---|---|
| 8 | Size | both | ONNX Runtime is in the English and Tamil apps, which never use it: about 18 MB installed (6.6 MB compressed) on a 64-bit phone. Leave the voice module out of those editions. | open |
| 9 | Efficiency | Android | A long handwritten page keeps every tile drawn (about 14 MB each on a 1080-pixel phone), and zoom multiplies that by its square. Not confirmed on a phone. Draw only the tiles near the screen; limit pixels when zoomed. | open |
| 10 | Features | iPhone | Meera stops the reader's music and it does not come back; the silent switch mutes the phone's voices until Meera has played once. Set the audio session once and release it when reading ends. | open |
| 11 | Features | Android | Meera plays over music and over a call: audio focus is never asked for. | open |
| 12 | Efficiency | both | Each verse's sound is copied about eleven times and filtered on the interface's thread (roughly 0.15–0.3 s for a usual verse, 1 s for the longest). Filter and keep the sound on the native side. | open |
| 13 | Efficiency | both | The model (32 MB) and speech file stay in memory after reading stops, and Android keeps a second 37 MB copy in its cache. Release after a while; copy once. | open |
| 14 | Features | pen | A palm touching before or during a pen stroke turns it into a two-finger move (InkPageScreen.tsx:457). Ignore fingers while a pen writes. | open |
| 15 | Features | Android | With gesture navigation, a stroke from the screen's edge is taken as Back on a handwritten page. | open |
| 16 | Features | both | Welcome: long Malayalam or Tamil text can lose its last line on a small phone or large font; turning the phone leaves the pages between two. | open |
| 17 | Features | both | The verse hint can light the header when the chapter reopens scrolled down; not re-measured on rotation. | open |
| 18 | Privacy | both | Restoring a backup copies the picked file before checking its size, and leaves the copy (a whole notebook) in the cache. | open |
| 19 | Privacy | both | Card pictures and photo copies stay in the app's cache, though the policy says no copy is kept. Delete them, or reword. | open |

## Tier 3: small

| # | Item | Status |
|---|---|---|
| 20 | Android: pin ONNX Runtime strictly (`strictly '1.22.0'`). | open |
| 21 | iPhone: a stop and play landing together can skip a verse (compare players, as Android does). | open |
| 22 | iPhone: copy the model's output before the value is released, to be certain. | open |
| 23 | The voice module's `read` and `load` take any path; only the app's own two files are ever passed. | open |
| 24 | Changing verse wakes the phone's speech engine even when only Meera reads. | open |
| 25 | Cross references make 50–100 small queries per opening; batch them. | open |
| 26 | Corrupt settings with no backup count as a new install: welcome shown, loss not told. | open |

## Found sound

No internet use, trackers or secrets in the repository; INTERNET is removed from the Android
manifest; ONNX Runtime 1.22.0 has no network code or permissions; queries use bound
parameters; PDF text is escaped; links are constants; backup files are validated and
limited; workflows pin their actions and expose no secrets; fonts' names match on both
platforms; no other layout event is read late; reader gestures do not fight the system's.
