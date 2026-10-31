# Sixth council: where the fixes stand

The sixth council reviewed commit 27502d8. This list follows its ranked report, item by item.
Status: **done** (committed and pushed), **partly**, **open**, or **yours** (a decision or a step only the owner can take).

## Outside the report

| | Item | Status |
|---|---|---|
| — | Card heading lost its second word on some phones ("Stay blessed" → "Stay") | done (7f36c69); not yet seen on a phone |
| — | Reader redesign: one bar (passage and Bible drop-downs, search, settings), no footer row, chapters by swipe with faint corner arrows, serif and no underlines by default in the English app, grey verse numbers; study tools only in Settings, Hebrew/Greek switch in the Bible list, read aloud from the verse menu | done; not yet seen on a phone |

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
| 8 | Hindi introductions: Hebrews meaning, honorifics, Esther, grammar | done (b4e9c58): about 55 वे/उनका places named, the Messiah's plural, 125 IRV spellings; rules in data/intros/GUIDE.md. Still to have a Hindi speaker read them (docs/hindi-review.md) |
| 9 | Hindi interface slips | done: क़लम feminine, गायन-चिह्न, Strong संख्या, ठीक है, हल्की/गहरी, card strengths, टाइप किया पृष्ठ, कॉपी, labels, study tools line, two words on the Why page. Reference parsing (Devanagari digits, Catholic names) is Tier 2 item 16 |
| 10 | Two Hindi verses without a KJV partner | done; the data check now fails on any unmapped verse |
| 11 | Four Tamil verses start with a stray number | done; the data check catches a bridged verse's "-18" |
| 12 | Introductions' licence and credit; IRV change statements; README | done. Introductions: © 2026 Rivers Research, CC BY-SA 4.0 (my choice, to match the databases; change it if you prefer another) |
| 13 | Package name, app name, icon, store languages, the Tamil app | **yours** |
| 14 | Four-language backups lose their app tag; iOS languages miss Hindi | done; the notebook calls that app "Bibles" until its name is decided (13) |

## Tier 2

| # | Item | Status |
|---|---|---|
| 15 | Tamil picker cuts off 1 இராஜா, 2 இராஜா, உன்னத | done (bd6acc4) |
| 16 | Hindi references: Devanagari digits, dot spellings, Catholic names | done (56e2907) |
| 17 | "Rom 8:28, 1 Cor 2:9" read as Romans 8:1 | done (20f2416) |
| 18 | Common Hindi words become links (मर, गिन, गिनती) | done (56e2907) |
| 19 | Malayalam Books tab shows 1910 spellings | done: nine names in modern spelling (data/overrides/text-corrections.json, bookNames) |
| 20 | Smaller Malayalam and Tamil strings, intro slips | done; check-intros now refuses the mistakes fixed by hand (a short list per language) |
| 21 | Hindi intros mix spellings | done (b4e9c58) |
| 22 | Word sheet headline follows the last Indian Bible | done (6616f6a) |
| 23 | Side by side does nothing before an Indian Bible is opened | done (6616f6a) |
| 24 | Raw codes in search wording | done (6616f6a); also old results cleared when the Bible chip changes |
| 25 | Bible chooser and swap button for screen readers | open |
| 26 | Language screen: English largest; "selected" before choosing | open |
| 27 | Search can't be cancelled; loose Hindi filter | partly: the Hindi filter is tight (6350cd9); paging English and Tamil is open |
| 28 | Books rows fixed height; filter text size | open |
| 29 | Card buttons and search chips 36 dp; cards ignore text size | open |
| — | Hindi text: stray joiners and misplaced nukta | done (a24113f) |

## Tier 3

Open; after Tier 2.
