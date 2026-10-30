# Book introductions: how they are written

One file per book and language: `data/intros/<lang>/<book>.json`, book 1 (Genesis) to 66
(Revelation), lang `en`, `ml` (Malayalam), `ta` (Tamil) or `hi` (Hindi). `scripts/lib/intros.mjs` checks
them and puts them in the databases; the app shows one from the reader's menu (About this
book), in the interface language.

## The file

```json
{
  "book": 41,
  "name": "Mark",
  "facts": { "author": "…", "date": "…", "audience": "…" },
  "about": ["paragraph", "paragraph"],
  "themes": [{ "title": "…", "text": "…" }],
  "outline": [{ "from": "1:1", "to": "1:13", "title": "…" }],
  "keyVerses": ["1:1", "8:29"]
}
```

- `name`: the book's name in that language, as the Bible of that language names it (only
  for people reading the file; the app uses its own book names).
- `facts.author`: who wrote it, one or two sentences. `facts.date`: when, short ("About AD
  55–65", "About 1445–1405 BC"). `facts.audience`: to whom or for whom, one sentence.
- `about`: two or three paragraphs, 120–200 words in all: what the book is, what happens or
  what it teaches, how it fits in the Bible's story.
- `themes`: three to five, each a short title and one or two sentences.
- `outline`: four to eight sections that cover the whole book in order, with no gaps or
  overlaps: each `from` is the verse after the previous `to`; the first starts at 1:1 and
  the last ends at the book's last verse. Verse numbers are the KJV's.
- `keyVerses`: two to four verses (or a short range, "3:16-17") of the book, KJV numbering.
- A reference inside a text is written in brackets as chapter and verse of the same book:
  "(8:29)". The app makes it a link. Do not cite other books inside the texts.
- No quotations from any Bible translation; say what a verse says in your own words.

## Viewpoint

- The traditional view of the church on authorship and date. Where the Bible itself names
  the author, say so. Where it does not and tradition is firm, give the tradition ("The
  early church held that…"). Where the author is unknown (Hebrews, Job, Judges, 1–2 Kings,
  Esther…), say it is not known and give the traditional suggestions.
- Early dates: the Exodus about 1446 BC; Moses wrote the Pentateuch; Isaiah wrote the whole
  of Isaiah; Daniel wrote in the 6th century BC; Paul wrote all thirteen letters that bear
  his name; Peter wrote 2 Peter; the apostle John wrote the Gospel, the three letters and
  Revelation; the Gospels before AD 70 except John (about AD 85–95).
- Reverent and plain. In English, capitalise the pronouns for God and for Jesus (He, Him,
  His, Himself) as well as Lord, God, Son of God, Holy Spirit, as the app's "Why this Bible"
  page does.
- No denominational argument, no modern critical theories, no other Bible translations.

## English

The divine name is "the LORD" in capitals in the Old Testament books, as the KJV prints it
(Hebrew YHWH); "Lord" is for Adonai (Isaiah 6:1, Malachi 3:1) and in the New Testament.

Plain, warm, simple sentences that a reader with school English follows easily. British
spelling (baptised, honour). Names as in the KJV (Elijah, Hezekiah, Nebuchadnezzar).

## Hindi

As for Malayalam and Tamil below, from the English file, with names as the Hindi Indian
Revised Version spells them (`assets/db/bible-all.db`, translation HIN: मूसा, एलिय्याह,
हिजकिय्याह, नबूकदनेस्सर, यरूशलेम; book names उत्पत्ति … प्रकाशितवाक्य). The LORD is यहोवा in
the Old Testament books, as the IRV prints it; "Lord" (Adonai, and the New Testament) is
प्रभु; God is परमेश्वर; the Holy Spirit पवित्र आत्मा. God and Jesus take the respectful
plural throughout (वे, उन्होंने, उनका, उनसे), as "Why this Bible" does; other people the
ordinary forms. Where the people in the sentence are also वे, name God or Jesus
(परमेश्वर, यहोवा, यीशु) instead of the pronoun: "पुराने बलिदान केवल छाया थे; उनका लहू…"
read as the sacrifices' blood. The Messiah and the Servant take the respectful plural in
Old Testament books too. Spell as the IRV does: the half nasal where it writes one (अन्त,
आरम्भ, मन्दिर, सन्तान, आनन्द), the dot where it does (क्योंकि, चंगा, संकट). Titles of
themes and outline parts may keep the Bible's own तुम exhortations (पीछे न हटो); the rest
of the text says आप. Formal register, plain modern Hindi, no Urdu-heavy or Sanskrit-heavy
words where a common one exists. Dates: "लगभग 55–65 ईस्वी", "लगभग 1446–1406 ई. पू.".

## Malayalam and Tamil

Translate the English file faithfully and naturally, not word for word. Use the names of
people, places and books exactly as the app's Bible spells them (Sathyavedapusthakam 1910
for Malayalam, the Indian Revised Version for Tamil): look them up in the database
(`assets/db/bible-ml.db`, `bible-ta.db`, table verses, translation MAL or TAM). Modern
spelling and plain words for everything else. Keep the JSON keys and the references as
they are; translate only the text values. The LORD (the divine name) is യഹോവ / யெகோவா, as
both Bibles print it; "Lord" (Jesus, and the New Testament) is കർത്താവ് / கர்த்தர். God is
ദൈവം / தேவன். Pronouns for God and Jesus are the respectful അവിടുന്ന് / அவர். Tamil gives every named person அவர் (Haman, Pharaoh and Diotrephes too, as modern Tamil prose does); only Satan is அவன். Dates: "ഏകദേശം എ.ഡി. 55–65" / "ஏறக்குறைய கி.பி.
55–65" style, "ബി.സി." / "கி.மு." for BC.
