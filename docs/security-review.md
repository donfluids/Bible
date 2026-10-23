# Security review (23 October 2026, version 0.4.14 plus the card photos)

What was checked in the code and in the built Android app, what was found, and what was
changed. To be repeated when a feature takes in new kinds of input.

## How the apps are exposed

- **No network.** The release build removes the internet permission. Nothing is sent,
  so nothing typed or chosen can leak over the network.
- **Permissions:** only vibration (and Android's own internal receiver permission).
  Camera, microphone, storage and media permissions are blocked in `app.json`.
- **Entry points from other apps:** only the launcher. No links (no URL scheme or web
  links) open the app; every helper component (file providers, the crop screen) is
  private. The only exported receiver is Android's profile installer, which needs a
  system permission.
- **Release build:** not debuggable, code shrunk (R8). No keys or passwords in the
  repository or the app (the signing key stays in the gitignored `credentials/`).

## Places where the user puts something in

| Input | What could go wrong | Finding |
|---|---|---|
| Search box | SQL injection; a typed pattern that hangs the app | Every query passes typed text as a bound value, never as SQL text. Malayalam patterns escape every character and have no nested repeats. The reference pattern can backtrack badly on runs of spaces (1,000 spaces: 45 s), but the app squeezes spaces first; after that, every long input tried ran in under 5 ms. **Changed:** the box now takes at most 200 characters. |
| Notebook pages, verse notes, card heading and message | Script or markup run from text | Text is only ever drawn as text (no web view, no HTML). References in notebook pages are found with patterns that stay fast on long pages. |
| Card photo | Reaching other files or photos | The phone's own picker hands over one photo; the app has no gallery permission. The crop screen is private. |
| Saved card designs, settings, notebook (stored on the phone, and in Android backup) | A damaged or altered file making the app delete or read other files, or crash on start | **Changed:** a saved design's photo must be the app's own copy (`card-photos/<id>.jpg`) or the picker's copy in the cache, with no `..`; only such a copy is ever deleted. Every field of a saved design is checked. Settings of the wrong kind fall back to their defaults, and text size and reading speed are kept within range. A file that cannot be read at all is kept aside and the last good copy used (as before). |
| Links on the licences screen | Opening an unexpected address | Fixed `https://` addresses written in the app; nothing from the user. |
| Keyboard keys | | Only "left", "right" and "find" are passed on; keys typed in a text box are left alone. |

## Data that leaves the app, only when the user asks

Copying and sharing (verse text, notebook pages, card pictures) go to the clipboard or
the app the user picks. A card picture is a temporary file shared through Android's
file sharing, which grants the receiving app that one file. Reading aloud passes the
text being read to the phone's speech engine. Notes, highlights and notebook pages are
in Android's backup to the user's own Google account; card photos and the Bible
database are not. All of this is in the privacy policy.

## Not in the app, but noted

`npm audit` lists 7 advisories (node-forge, xcode, uuid), all in Expo's build tools
(the command-line tools and config plugins). None of that code is in the app.
They go away with Expo updates; nothing to do now.
