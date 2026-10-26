# Security review (26 October 2026, version 0.4.19 and the fifth council's fixes)

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
| Notebook pages, verse notes, card heading and message | Script or markup run from text | On screen, text is only ever drawn as text. A page shared as a PDF is turned into HTML on the phone (expo-print) with every typed character escaped and stroke data written only as numbers; script and image tags in titles, bodies and stroke data were tried and came through as text. References in notebook pages are found with patterns that stay fast on long pages. |
| Notebook backup file picked for restore | A crafted file deleting pages, writing other storage, or exhausting memory | The file is read only after the user picks it, at most 25 MB. Every page is checked field by field (id pattern, length caps, times no later than now; an undated page counts as the oldest), so it can only add pages or replace an older copy of one, never delete; strokes are written only under the page's own key, and are put back if the restore fails part-way. A backup from another of the apps is restored only when the user agrees. **Changed (fifth council):** strokes far down a page are not read (a page runs at most 200,000 units), and a page's PDF carries each stroke only on the sheets it crosses, so a crafted file cannot make a huge PDF. |
| Card photo | Reaching other files or photos | The phone's own picker hands over one photo; the app has no gallery permission. The crop screen is private. **Changed:** a saved design may point only at the app's copy or the picker's cache copy (or a blob: address in the web preview), never a web or content address. |
| Saved card designs, settings, notebook (stored on the phone, and in Android backup) | A damaged or altered file making the app delete or read other files, or crash on start | **Changed:** a saved design's photo must be the app's own copy (`card-photos/<id>.jpg`) or the picker's copy in the cache, with no `..`; only such a copy is ever deleted. Every field of a saved design is checked. Settings of the wrong kind fall back to their defaults, and text size and reading speed are kept within range. A file that cannot be read at all is kept aside and the last good copy used (as before). |
| Links on the licences screen | Opening an unexpected address | Fixed `https://` addresses written in the app; nothing from the user. |
| Keyboard keys | | Only "left", "right" and "find" are passed on; keys typed in a text box are left alone. |

## Data that leaves the app, only when the user asks

Copying and sharing (verse text, notebook pages, card pictures, page PDFs, the notebook
backup file) go to the clipboard or the app the user picks. A shared file is a temporary
file shared through Android's file sharing, which grants the receiving app that one file;
backups and PDFs are written to one folder in the cache that is emptied before each new
one. A backup file is plain JSON: anyone it is given to can read the notebook. Reading aloud passes the
text being read to the phone's speech engine. Notes, highlights and notebook pages are
in Android's backup to the user's own Google account; card photos and the Bible
database are not. All of this is in the privacy policy.

## Not in the app, but noted

`npm audit` lists 8 advisories, all in Expo's build tools
(the command-line tools and config plugins). None of that code is in the app.
They go away with Expo updates; nothing to do now.

The CI workflow (`.github/workflows/android-release.yml`) gives the signing passwords only
to the step that builds and signs; earlier they were written to the job's environment,
where every later step could read them.
