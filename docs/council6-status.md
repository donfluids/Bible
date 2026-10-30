# Sixth council: where the fixes stand

The sixth council reviewed commit 27502d8. This list follows its ranked report, item by item.
Status: **done** (committed and pushed), **partly**, **open**, or **yours** (a decision or a step only the owner can take).

## Outside the report

| | Item | Status |
|---|---|---|
| — | Card heading lost its second word on some phones ("Stay blessed" → "Stay") | done (7f36c69); not yet seen on a phone |

## Tier 1: before the next upload of the Malayalam app (and the others)

| # | Item | Status |
|---|---|---|
| 1 | How to use describes the old app | done (8e8d8ce) |
| 2 | Study tools cap: no undo, no switch state, long toast | done (f73f4ea, 74d478b) |
| 3 | Privacy policy out of date | done (6fb7c9f); **yours**: upload docs/play/website-privacy-page.md's text to riversresearch.org/bible/privacy. The four-language app is added once its name and package are decided (13). |
| 4 | Micah introduction cites 3:12 for 1:6 | done (0e0f454) |

## Tier 1, four-language app: before its first Play upload

| # | Item | Status |
|---|---|---|
| 5 | Hindi search misses the everyday spelling (मंदिर) | done (6350cd9) |
| 6 | First open: space check and language | done (0cd8c63). Later: the language screen before the copy, and one copy instead of two |
| 7 | Database fingerprint, source checks, CI | partly (d567b69): fingerprint stable, sources checked. CI cannot build the four-language app until a copy of the sources is kept (release files); the Sources screen no longer says that database is on GitHub |
| 8 | Hindi introductions: Hebrews meaning, honorifics, Esther, grammar | open |
| 9 | Hindi interface slips | open |
| 10 | Two Hindi verses without a KJV partner | done; the data check now fails on any unmapped verse |
| 11 | Four Tamil verses start with a stray number | done; the data check catches a bridged verse's "-18" |
| 12 | Introductions' licence and credit; IRV change statements; README | done. Introductions: © 2026 Rivers Research, CC BY-SA 4.0 (my choice, to match the databases; change it if you prefer another) |
| 13 | Package name, app name, icon, store languages, the Tamil app | **yours** |
| 14 | Four-language backups lose their app tag; iOS languages miss Hindi | done; the notebook calls that app "Bibles" until its name is decided (13) |

## Tier 2 and 3

Open; worked through after Tier 1, in the report's order.
