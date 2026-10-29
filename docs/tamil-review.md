# Tamil app: what a Tamil speaker must check before release

The Tamil app (வேதாகமம், `BIBLE_EDITION=ta`) was built without a Tamil reader. Everything
below was written or chosen by Claude and needs a Tamil speaker's eye before the app goes to
Google Play or the App Store. Mark each item OK, or write the correction beside it.

Bible text itself (the IRV) is used as published and is not ours to correct; section 3 lists
only how the app presents it.

## 1. Names

| Where | Text | Check |
| --- | --- | --- |
| Store name | வேதாகமம் – தமிழ் ஆங்கிலம் | Natural? Would people search for this? |
| Home screen name | வேதாகமம் | |
| Bible's name in Settings | இண்டியன் ரிவைஸ்டு வெர்ஸன் | The IRV's own Tamil name, or what readers call it |
| Translation chip in the reader | TAM / ENG | Latin letters, as in the Malayalam app (MAL / ENG). Or தமிழ் / ENG? |
| After a shared verse | — யோவான் 3:16 (IRV) | |
| Psalm title label | சங்கீதங்கள் 3 (தலைப்பு) | |
| Word sheet heading | IRV-இல், KJV-இல் | "How the IRV renders this word" |

## 2. Book names

The app shows the IRV's own names. People can also type the short names and the other names
below in search and in the notebook (for example "சங். 23" or "திருப்பாடல்கள் 23").

- Are the short names (top bar, when the full name does not fit) the usual ones?
- Are the other names right, and are any common ones missing? The Catholic names
  (திருவிவிலியம்) were written from memory and are the least certain.
- எண், ஆதி, நீதி, புலம், வெளி are ordinary words too, so "எண் 7" alone is not read as a
  reference (it needs a verse, "எண் 7:1", or a dot, "எண். 7"). Any other short name that is
  also a common word?

| # | IRV name | Short name | Other names accepted |
| --- | --- | --- | --- |
| 1 | ஆதியாகமம் | ஆதி | தொடக்கநூல் |
| 2 | யாத்திராகமம் | யாத் | விடுதலைப்பயணம் |
| 3 | லேவியராகமம் | லேவி | லேவியர் |
| 4 | எண்ணாகமம் | எண் | எண்ணிக்கை |
| 5 | உபாகமம் | உபா | இணைச்சட்டம் |
| 6 | யோசுவா | யோசு |  |
| 7 | நியாயாதிபதிகள் | நியா | நீதித்தலைவர்கள், நியாயாதிபதி |
| 8 | ரூத் | ரூத் | ரூத்து |
| 9 | 1 சாமுவேல் | 1 சாமு |  |
| 10 | 2 சாமுவேல் | 2 சாமு |  |
| 11 | 1 இராஜாக்கள் | 1 இராஜா | அரசர்கள் |
| 12 | 2 இராஜாக்கள் | 2 இராஜா | அரசர்கள் |
| 13 | 1 நாளாகமம் | 1 நாளா | குறிப்பேடு |
| 14 | 2 நாளாகமம் | 2 நாளா | குறிப்பேடு |
| 15 | எஸ்றா | எஸ்றா | எஸ்ரா |
| 16 | நெகேமியா | நெகே |  |
| 17 | எஸ்தர் | எஸ்தர் |  |
| 18 | யோபு | யோபு |  |
| 19 | சங்கீதங்கள் | சங் | சங்கீதம், திருப்பாடல்கள் |
| 20 | நீதிமொழிகள் | நீதி |  |
| 21 | பிரசங்கி | பிரச | சபைஉரையாளர் |
| 22 | உன்னதப்பாட்டு | உன்னத | இனிமைமிகுபாடல், உன்னதப்பாட்டு |
| 23 | ஏசாயா | ஏசா | எசாயா |
| 24 | எரேமியா | எரே |  |
| 25 | புலம்பல்கள் | புலம் | புலம்பல் |
| 26 | எசேக்கியேல் | எசேக் |  |
| 27 | தானியேல் | தானி |  |
| 28 | ஓசியா | ஓசியா | ஓசேயா |
| 29 | யோவேல் | யோவே |  |
| 30 | ஆமோஸ் | ஆமோ |  |
| 31 | ஒபதியா | ஒபதி |  |
| 32 | யோனா | யோனா |  |
| 33 | மீகா | மீகா | மீக்கா |
| 34 | நாகூம் | நாகூ |  |
| 35 | ஆபகூக் | ஆப | அபக்கூக்கு, ஆபகூக் |
| 36 | செப்பனியா | செப்ப |  |
| 37 | ஆகாய் | ஆகாய் |  |
| 38 | சகரியா | சகரி | செக்கரியா |
| 39 | மல்கியா | மல்கி | மலாக்கி |
| 40 | மத்தேயு | மத் |  |
| 41 | மாற்கு | மாற்கு |  |
| 42 | லூக்கா | லூக் |  |
| 43 | யோவான் | யோவா |  |
| 44 | அப்போஸ்தலருடைய நடபடிகள் | அப் | அப்போஸ்தலர், அப்போஸ்தலர்நடபடிகள், நடபடிகள், திருத்தூதர்பணிகள் |
| 45 | ரோமர் | ரோமர் | உரோமையர் |
| 46 | 1 கொரிந்தியர் | 1 கொரி |  |
| 47 | 2 கொரிந்தியர் | 2 கொரி |  |
| 48 | கலாத்தியர் | கலா |  |
| 49 | எபேசியர் | எபே |  |
| 50 | பிலிப்பியர் | பிலி |  |
| 51 | கொலோசெயர் | கொலோ | கொலோசையர் |
| 52 | 1 தெசலோனிக்கேயர் | 1 தெச | தெசலோனிக்கர் |
| 53 | 2 தெசலோனிக்கேயர் | 2 தெச | தெசலோனிக்கர் |
| 54 | 1 தீமோத்தேயு | 1 தீமோ | திமொத்தேயு |
| 55 | 2 தீமோத்தேயு | 2 தீமோ | திமொத்தேயு |
| 56 | தீத்து | தீத் |  |
| 57 | பிலேமோன் | பிலே | பிலமோன் |
| 58 | எபிரெயர் | எபி | எபிரேயர் |
| 59 | யாக்கோபு | யாக் |  |
| 60 | 1 பேதுரு | 1 பேது |  |
| 61 | 2 பேதுரு | 2 பேது |  |
| 62 | 1 யோவான் | 1 யோவா |  |
| 63 | 2 யோவான் | 2 யோவா |  |
| 64 | 3 யோவான் | 3 யோவா |  |
| 65 | யூதா | யூதா |  |
| 66 | வெளிப்படுத்தின விசேஷம் | வெளி | வெளிப்படுத்தல், திருவெளிப்பாடு |

## 3. How the text is shown

- Genesis 1:1 reads "ஆதியிலே தேவன் வானத்தையும் பூமியையும் படைத்தார்". Is this the IRV
  people know, or does it read like the older Union version? (Only to know what to call it.)
- Psalm 119: the IRV's letter heading "ஆலெப்." stands as the psalm's title; the other
  letters (பேத், …) are headings inside the psalm. Fine, or should ஆலெப் be a heading too?
- Psalm 115 has a title "தாவீதின் பாடல்." in the IRV that the Hebrew and the KJV do not have.
- 3 John: the IRV has 15 verses (KJV 14); verse 15 is matched with KJV verse 14 for the
  Greek.
- Poetry lines in 12 verses start with an indent (Genesis 1:27, 4:23–24 and others).
- Text is in Noto Sans Tamil, or Noto Serif Tamil with "புத்தக எழுத்துரு" on. Do both read
  well at the usual sizes, and is the line spacing comfortable?

## 4. Search

- Search finds the letters as typed (அன்பு finds அன்புகூர்ந்து). Unlike the Malayalam app,
  it does not yet match spelling variants. Which variants do people type that the IRV spells
  differently (ஜ/ச, ஸ/ச, long and short vowels, இராஜா/ராஜா, …)? Each one named here can be
  added.
- Search examples on the empty search screen: யோவான் 3:16, சங்கீதம் 23, அன்பு, H430.
- References typed in search or written in the notebook: the short names in section 2 work
  (அப் 2:38, நீதி 3:5), as do ordinals (முதலாம் கொரிந்தியர் 13:4, 1-ஆம் யோவான் 4:8) and
  யோ 3:16 for John. Which other short forms do people write in sermon notes? எஸ் alone is
  left out, since it could be Ezra or Esther.

## 5. Word links

The Tamil words are now linked to the Hebrew and Greek (all but two psalm titles). A reader should tap through the 33
verses checked by hand for Malayalam (Genesis 1:1, John 3:16, Psalm 23, Romans 8:28 …) and
note wrong links, and check the Tamil headline words the word sheet shows (for example அன்பு · செலுத்துவான் for ἀγαπάω, where செலுத்துவான் is only the helper verb of அன்பு செலுத்து).

## 6. Sources and licences screen

The Sources and licences screen is in English only, by design: it is a formal notice, the
same in all three apps. Nothing on it needs a Tamil check.

## 7. Store listings

All the Tamil in `docs/play/listing-vedagamam.md` (Play name, short and full description) and
`docs/ios/listing-vedagamam.md` (App Store subtitle, promotional text, keywords). The store
name is checked in section 1; the rest should read as natural Tamil to someone deciding
whether to install the app.

## 8. Interface strings

Every Tamil string in the app (`src/i18n.ts`, table `ta`), beside the English it translates.
The table is written by `node scripts/review-strings.mjs ta`, so it always matches the app;
notes in the Check column are kept as long as the Tamil they refer to is unchanged.
{placeholders} such as {n}, {ref}, {title} are filled in by the app and must stay as they are.
Words chosen for the app's own features, used throughout:

- குறிப்பேடு: the Notebook tab (pages of notes)
- வசனக் குறிப்பு: a note on one verse
- சேமித்தவை: the Saved tab (bookmarks, highlights, notes)
- வாசிப்பு: the Read tab
- அடையாளக்குறி: bookmark; ஹைலைட்: highlight
- எபிரெயம் / கிரேக்கம்: the buttons that show the Hebrew or Greek words

| Key | English | Tamil | Check |
| --- | --- | --- | --- |
| loading | Loading… | ஏற்றுகிறது… | |
| preparing | Preparing the Bible text… | வேதாகம உரை தயாராகிறது… | |
| back | Back | பின்செல் | |
| results | Results | முடிவுகள் | |
| saved | Saved | சேமித்தவை | |
| books | Books | புத்தகங்கள் | |
| search | Search | தேடு | |
| settings | Settings | அமைப்புகள் | |
| bookmarks | Bookmarks | அடையாளக்குறிகள் | |
| highlights | Highlights | ஹைலைட்டுகள் | |
| notes | Notes | வசனக் குறிப்புகள் | |
| oldTestament | Old Testament | பழைய ஏற்பாடு | |
| newTestament | New Testament | புதிய ஏற்பாடு | |
| previousChapter | Previous chapter | முந்தைய அதிகாரம் | |
| switchTo | Switch to {name} | {name} வாசிக்க | |
| bibleEnglish | ENG | ஆங்கிலம் | |
| bibleMalayalam | MAL | மலையாளம் | |
| bibleTamil | TAM | தமிழ் | |
| bibleHindi | HIN | இந்தி | |
| nextChapter | Next chapter | அடுத்த அதிகாரம் | |
| hebrewInterlinear | Hebrew | எபிரெயம் | |
| greekInterlinear | Greek | கிரேக்கம் | |
| tapVerseNumber | Tap a verse number to show its {lang} words | வசன எண்ணைத் தொட்டால் அதன் {lang} வார்த்தைகள் தெரியும் | |
| hebrew | Hebrew | எபிரெய | |
| greek | Greek | கிரேக்க | |
| sayWord | Say the word | சொல்லை உச்சரி | |
| stopSaying | Stop | நிறுத்து | |
| noVoiceTitle | No voice for this language | இந்த மொழிக்குக் குரல் இல்லை | |
| noHebrewVoice | This phone has no Hebrew voice. You can add one in the phone’s settings, under Text-to-speech (Android) or Spoken Content (iPhone). | இந்தத் தொலைபேசியில் எபிரெயக் குரல் இல்லை. தொலைபேசியின் அமைப்புகளில் Text-to-speech (Android) அல்லது Spoken Content (iPhone) பகுதியில் ஒன்றைச் சேர்க்கலாம். | |
| noGreekVoice | This phone has no Greek voice. You can add one in the phone’s settings, under Text-to-speech (Android) or Spoken Content (iPhone). | இந்தத் தொலைபேசியில் கிரேக்கக் குரல் இல்லை. தொலைபேசியின் அமைப்புகளில் Text-to-speech (Android) அல்லது Spoken Content (iPhone) பகுதியில் ஒன்றைச் சேர்க்கலாம். | |
| readAloud | Read aloud | உரக்க வாசி | |
| stopReading | Stop reading | வாசிப்பை நிறுத்து | |
| readFromHere | Read from here | இங்கிருந்து வாசித்துக் காட்டு | |
| readFromHereDetail | Listen to the chapter from this verse in the phone's voice | தொலைபேசியின் குரலில் இந்த வசனம் முதல் அதிகாரத்தைக் கேட்கலாம் | |
| pauseReading | Pause | இடைநிறுத்து | |
| resumeReading | Continue | தொடர் | |
| previousVerse | Previous verse | முந்தைய வசனம் | |
| nextVerse | Next verse | அடுத்த வசனம் | |
| readingSpeed | Reading speed | வாசிப்பு வேகம் | |
| backToReading | Back to reading | வாசிக்கும் இடத்திற்கு | |
| noEnglishVoice | This phone has no English voice. You can add one in the phone's settings, under Text-to-speech (Android) or Spoken Content (iPhone). | இந்தத் தொலைபேசியில் ஆங்கிலக் குரல் இல்லை. தொலைபேசியின் அமைப்புகளில் Text-to-speech (Android) அல்லது Spoken Content (iPhone) பகுதியில் ஒன்றைச் சேர்க்கலாம். | |
| noMalayalamVoice | This phone has no Malayalam voice. Install Speech Services by Google from the Play Store, choose it in the phone's Text-to-speech settings, and download the Malayalam voice there. | இந்தத் தொலைபேசியில் மலையாளக் குரல் இல்லை. Play Store-இலிருந்து Speech Services by Google-ஐ நிறுவி, தொலைபேசியின் Text-to-speech அமைப்புகளில் அதைத் தேர்ந்தெடுத்து, அங்கே மலையாளக் குரலைப் பதிவிறக்கவும். | |
| noTamilVoice | This phone has no Tamil voice. Install Speech Services by Google from the Play Store, choose it in the phone's Text-to-speech settings, and download the Tamil voice there. | இந்தத் தொலைபேசியில் தமிழ்க் குரல் இல்லை. Play Store-இலிருந்து Speech Services by Google-ஐ நிறுவி, தொலைபேசியின் Text-to-speech அமைப்புகளில் அதைத் தேர்ந்தெடுத்து, அங்கே தமிழ்க் குரலைப் பதிவிறக்கவும். | |
| noHindiVoice | This phone has no Hindi voice. Install Speech Services by Google from the Play Store, choose it in the phone's Text-to-speech settings, and download the Hindi voice there. | இந்தத் தொலைபேசியில் இந்திக் குரல் இல்லை. Play Store-இலிருந்து Speech Services by Google-ஐ நிறுவி, தொலைபேசியின் Text-to-speech அமைப்புகளில் அதைத் தேர்ந்தெடுத்து, அங்கே இந்திக் குரலைப் பதிவிறக்கவும். | |
| shareAsCard | Share as card | அட்டையாகப் பகிர் | |
| shareAsCardDetail | A picture of the verse, for a greeting or your status | வாழ்த்துக்கோ ஸ்டேட்டஸுக்கோ வசனத்தின் படம் | |
| cardSquare | Square | சதுரம் | |
| cardTall | Tall (status) | நீளம் (ஸ்டேட்டஸ்) | |
| cardOccasion | Occasion | நிகழ்வு | |
| cardDesign | Design | வடிவமைப்பு | |
| cardHeading | Heading | தலைப்பு | |
| cardMessage | Your message (optional) | உங்கள் செய்தி (விருப்பம்) | |
| cardMessageHint | For example: Happy birthday, Mum! | எ.கா: பிறந்தநாள் வாழ்த்துக்கள், அம்மா! | |
| cardVerses | Verses | வசனங்கள் | |
| cardShare | Share picture | படத்தைப் பகிர் | |
| cardFailed | The picture could not be made. | படத்தை உருவாக்க முடியவில்லை. | |
| cardPhoto | Your photo | உங்கள் புகைப்படம் | |
| cardChangePhoto | Change photo | புகைப்படத்தை மாற்று | |
| cardRemovePhoto | Remove photo | புகைப்படத்தை நீக்கு | |
| cardPhotoFailed | The photo could not be opened. | புகைப்படத்தைத் திறக்க முடியவில்லை. | |
| cardVeil | Over the photo | புகைப்படத்தின் மேல் | |
| cardVeilLight | Light | வெளிர் | |
| cardVeilDark | Dark | அடர் | |
| cardFaint | Faint | மெலிதாக | |
| cardMedium | Medium | நடுத்தரம் | |
| cardStrong | Strong | அதிகம் | |
| cardBlur | Blur the photo | புகைப்படத்தை மங்கலாக்கு | |
| cardBlurDetail | The words stand out more | சொற்கள் இன்னும் தெளிவாகத் தெரியும் | |
| cardBackground | Background | பின்னணி | |
| cardDesignColours | Design's own colours | வடிவமைப்பின் நிறங்கள் | |
| cardPlace | Text position | உரையின் இடம் | |
| cardTop | Top | மேலே | |
| cardMiddle | Middle | நடுவில் | |
| cardBottom | Bottom | கீழே | |
| cardFace | Typeface | எழுத்துரு | |
| cardFaceBook | Book | புத்தக | |
| cardFacePlain | Plain | எளிய | |
| cardExtras | Pictures and lines | படங்களும் கோடுகளும் | |
| cardExtrasDetail | The design's pictures, border and cross | வடிவமைப்பின் படங்கள், ஓரக்கோடு, சிலுவை | |
| cardSaveLook | Save as my design | என் வடிவமைப்பாகச் சேமி | |
| cardLookSaved | Saved. It is first in the designs now. | சேமிக்கப்பட்டது. இனி வடிவமைப்புகளில் முதலில் இருக்கும். | |
| cardMyDesign | My design {n} | என் வடிவமைப்பு {n} | |
| cardRemoveLook | Remove this design? | இந்த வடிவமைப்பை நீக்கவா? | |
| cardFewerVerses | One verse fewer | ஒரு வசனம் குறைவாக | |
| cardMoreVerses | One more verse | இன்னும் ஒரு வசனம் | |
| occasionNone | None | எதுவுமில்லை | |
| occasionBirthday | Birthday | பிறந்தநாள் | |
| occasionWedding | Wedding | திருமணம் | |
| occasionAnniversary | Anniversary | திருமண நாள் | |
| occasionSympathy | Sympathy | இரங்கல் | |
| occasionGetWell | Get well | நலம் பெற | |
| occasionChristmas | Christmas | கிறிஸ்துமஸ் | |
| occasionEaster | Easter | ஈஸ்டர் | |
| occasionNewYear | New Year | புத்தாண்டு | |
| headingBirthday | Happy Birthday | பிறந்தநாள் வாழ்த்துக்கள் | |
| headingWedding | On your wedding day | திருமண வாழ்த்துக்கள் | |
| headingAnniversary | Happy Anniversary | திருமண நாள் வாழ்த்துக்கள் | |
| headingSympathy | With deepest sympathy | ஆழ்ந்த இரங்கல்கள் | |
| headingGetWell | Get well soon | விரைவில் நலம் பெற வாழ்த்துக்கள் | |
| headingChristmas | Merry Christmas | கிறிஸ்துமஸ் வாழ்த்துக்கள் | |
| headingEaster | Happy Easter | ஈஸ்டர் வாழ்த்துக்கள் | |
| headingNewYear | Happy New Year | புத்தாண்டு வாழ்த்துக்கள் | |
| tip | Tap any underlined word to see the Hebrew or Greek behind it. Hold a verse to copy, share or bookmark it. The button below shows the whole verse in the original language. | அடிக்கோடிட்ட ஒரு வார்த்தையைத் தொட்டால் அதன் எபிரெய அல்லது கிரேக்க மூலச்சொல் தெரியும். ஒரு வசனத்தை அழுத்திப் பிடித்தால் நகலெடுக்கலாம், பகிரலாம், அடையாளக்குறி இடலாம். கீழே உள்ள பொத்தான் முழு வசனத்தையும் மூலமொழியில் காட்டும். | |
| tipNoTags | Hold a verse to highlight it, add a note, compare translations or bookmark it. The button below shows the whole verse in Hebrew or Greek; tap a word there for its meaning. | ஒரு வசனத்தை அழுத்திப் பிடித்து ஹைலைட் செய்யலாம், குறிப்பு சேர்க்கலாம், மொழிபெயர்ப்புகளை ஒப்பிடலாம், அடையாளக்குறி இடலாம். கீழே உள்ள பொத்தான் முழு வசனத்தையும் எபிரெயத்தில் அல்லது கிரேக்கத்தில் காட்டும்; அங்கே ஒரு வார்த்தையைத் தொட்டால் அதன் பொருள் தெரியும். | |
| gotIt | Got it | புரிந்தது | |
| choosePassage | {title}, choose passage | {title}, பகுதியைத் தேர்ந்தெடுக்க | |
| choosePassageTitle | Choose a passage | பகுதியைத் தேர்ந்தெடுக்க | |
| allBooks | ‹ All books | ‹ எல்லாப் புத்தகங்களும் | |
| groupLaw | Law | நியாயப்பிரமாணம் | |
| groupHistory | History | சரித்திரம் | |
| groupPoetry | Poetry and wisdom | கவிதையும் ஞானமும் | |
| groupProphets | Prophets | தீர்க்கதரிசிகள் | |
| groupGospels | Gospels | சுவிசேஷங்கள் | |
| groupActs | Acts | அப்போஸ்தலர் நடபடிகள் | |
| groupLetters | Letters | நிருபங்கள் | |
| groupRevelation | Revelation | வெளிப்படுத்தல் | |
| copied | Copied | நகலெடுக்கப்பட்டது | |
| bookmarked | Bookmarked | அடையாளக்குறி இடப்பட்டது | |
| actCopy | Copy | நகலெடு | |
| actShare | Share | பகிர் | |
| actBookmark | Bookmark | அடையாளம் | |
| actBookmarked | Bookmarked | குறியிடப்பட்டது | |
| actNote | Note | வசனக் குறிப்பு | |
| noHighlight | No highlight | ஹைலைட் வேண்டாம் | |
| bookmarkRemoved | Bookmark removed | அடையாளக்குறி நீக்கப்பட்டது | |
| highlighted | Highlighted | ஹைலைட் செய்யப்பட்டது | |
| highlightRemoved | Highlight removed | ஹைலைட் நீக்கப்பட்டது | |
| noteSaved | Note saved | வசனக் குறிப்பு சேமிக்கப்பட்டது | |
| noteRemoved | Note removed | வசனக் குறிப்பு நீக்கப்பட்டது | |
| highlight | Highlight | ஹைலைட் | |
| markText | Mark text | பகுதியை ஹைலைட் செய் | |
| markTextDetail | Highlight some words or a passage across verses | சில வார்த்தைகளையோ பல வசனங்களில் நீளும் ஒரு பகுதியையோ ஹைலைட் செய்யுங்கள் | |
| markDone | Done | முடிந்தது | |
| markHint | Hold a word, then drag to the last word to mark. | ஒரு வார்த்தையை அழுத்திப் பிடித்து, ஹைலைட் செய்ய வேண்டிய கடைசி வார்த்தை வரை விரலை நகர்த்துங்கள். | |
| eraseHint | Hold a marked word, then drag over the marks to remove them. | ஹைலைட் செய்த ஒரு வார்த்தையை அழுத்திப் பிடித்து, அழிக்க வேண்டிய பகுதியின் மேல் விரலை நகர்த்துங்கள். | |
| eraser | Eraser | அழிப்பான் | |
| markedText | Marked text | ஹைலைட் செய்த பகுதிகள் | |
| clear | Clear | அழி | |
| addNote | Add a note | வசனக் குறிப்பு சேர் | |
| editNote | Edit note | வசனக் குறிப்பைத் திருத்து | |
| compare | Compare translations | மொழிபெயர்ப்புகளை ஒப்பிடு | |
| compareDetail | Side by side with the {lang} | {lang} உடன் அருகருகே | |
| copy | Copy | நகலெடு | |
| copyDetail | Verse text with its reference | வசனமும் அதன் குறிப்பும் | |
| share | Share… | பகிர்… | |
| bookmark | Bookmark | அடையாளக்குறி இடு | |
| removeBookmark | Remove bookmark | அடையாளக்குறியை நீக்கு | |
| bookmarkDetail | Saved items are listed at the top of the Books screen | சேமித்தவை "சேமித்தவை" பகுதியில் இருக்கும் | |
| note | Note | வசனக் குறிப்பு | |
| notePlaceholder | Your note on this verse | இந்த வசனத்தைப் பற்றிய உங்கள் குறிப்பு | |
| delete | Delete | நீக்கு | |
| save | Save | சேமி | |
| remove | Remove | நீக்கு | |
| footnote | Footnote | அடிக்குறிப்பு | |
| crossReference | Cross reference | தொடர்புடைய வசனம் | |
| crossReferences | Cross references | தொடர்புடைய வசனங்கள் | |
| crossReferencesDetail | {n} related passages, the strongest first | தொடர்புடைய {n} பகுதிகள், மிக நெருக்கமானவை முதலில் | |
| crossReferencesSource | Treasury of Scripture Knowledge, via OpenBible.info (CC BY) | Treasury of Scripture Knowledge, OpenBible.info வழியாக (CC BY) | |
| parallelPassages | Parallel passages | இணையான பகுதிகள் | |
| parallelPassagesDetail | {n} places with the same event or words | இதே நிகழ்வு அல்லது வார்த்தைகள் உள்ள {n} பகுதிகள் | |
| parallelPassagesSource | Parallel Passages Database © 2023 United Bible Societies (CC BY-SA 4.0) | Parallel Passages Database © 2023 United Bible Societies (CC BY-SA 4.0) | |
| aboutBook | About this book | இந்தப் புத்தகத்தைப் பற்றி | |
| aboutBookNamed | About {book} | {book}: இந்தப் புத்தகத்தைப் பற்றி | |
| introAuthor | Written by | எழுதியவர் | |
| introDate | When | எழுதப்பட்ட காலம் | |
| introAudience | Written for | யாருக்காக | |
| introThemes | Main themes | முக்கிய கருப்பொருள்கள் | |
| introOutline | Outline | பொருளடக்கம் | |
| introKeyVerses | Key verses | முக்கிய வசனங்கள் | |
| introNone | There is no introduction to this book yet. | இந்தப் புத்தகத்திற்கு இன்னும் முன்னுரை இல்லை. | |
| omitted | Omitted in this translation. | இந்த மொழிபெயர்ப்பில் இல்லை. | |
| nothingSavedTitle | Nothing saved yet | இன்னும் எதுவும் சேமிக்கப்படவில்லை | |
| nothingSaved | Hold a verse in the reader to bookmark it, highlight it or add a note. They will be listed here. | வாசிக்கும்போது ஒரு வசனத்தை அழுத்திப் பிடித்து அடையாளக்குறி இடலாம், ஹைலைட் செய்யலாம், வசனக் குறிப்பு சேர்க்கலாம். அவை இங்கே தெரியும். | |
| searchTitle | Search the {name} | {in} தேடு | |
| clearSearch | Clear search | தேடலை அழி | |
| searchExamples | Try | இப்படித் தேடலாம் | |
| searchPlaceholder | Words, a reference like John 3:16, or G26 | வார்த்தை, யோவான் 3:16 போன்ற குறிப்பு, அல்லது G26 | |
| goTo | Go to {ref} | {ref}-க்குச் செல் | |
| openIn | Open in the {translation} | {in} திற | |
| open | Open {id} | {id} திற | |
| dictionaryEntry | {lang} dictionary entry | {lang} அகராதிப் பதிவு | |
| dictionary | DICTIONARY | அகராதி | |
| noVerses | No verses found | வசனங்கள் எதுவும் கிடைக்கவில்லை | |
| allResults | All | அனைத்தும் | |
| showMore | Show more ({n} left) | மேலும் காட்டு (இன்னும் {n}) | |
| nVerses | {n} verses | {n} வசனங்கள் | |
| oneVerse | 1 verse | 1 வசனம் | |
| versesIn | {n} verses in the {translation} | {in} {n} வசனங்கள் | |
| oneVerseIn | 1 verse in the {translation} | {in} 1 வசனம் | |
| asWord |  as “{word}” |  “{word}” என்று | |
| versesInAs | {n} verses in the {translation} as “{word}” | {in} “{word}” என்று வரும் {n} வசனங்கள் | |
| oneVerseInAs | 1 verse in the {translation} as “{word}” | {in} “{word}” என்று வரும் 1 வசனம் | |
| all | All | எல்லாம் | |
| notInTranslation | Not in this translation. | இந்த மொழிபெயர்ப்பில் இல்லை. | |
| notTagged | Not tagged in the {translation} | {in} இந்தச் சொல்லோடு இணைக்கப்பட்ட வார்த்தை இல்லை | |
| noEntry | No dictionary entry for {id}. | {id}-க்கு அகராதிப் பதிவு இல்லை. | |
| noStrongs | This word has no Strong's number. | இந்த வார்த்தைக்கு ஸ்ட்ராங் எண் இல்லை. | |
| marksQuestion | What do the marks mean? | இந்தக் குறிகளின் பொருள் என்ன? | |
| marksHide | Hide the key to the marks | குறிகளின் விளக்கத்தை மறை | |
| legendGloss | In the gloss, <a word> in angle brackets is in the original but best left untranslated, and [a word] in square brackets is implied but not in the original. A faded word with no meaning, such as אֵת, marks the object of the verb and is not translated. | பொருளில், <கோண அடைப்பில்> உள்ள சொல் மூலத்தில் உண்டு, ஆனால் மொழிபெயர்க்காமல் விடுவது நல்லது; [சதுர அடைப்பில்] உள்ள சொல் மூலத்தில் இல்லை, பொருளுக்காகச் சேர்க்கப்பட்டது. அஎத் (אֵת) போன்ற பொருள் இல்லாத மங்கிய சொல் வினையின் செயப்படுபொருளைக் காட்டும் குறி; அது மொழிபெயர்க்கப்படுவதில்லை. | |
| legendTranslit |  In the transliteration, dots separate syllables and the capital letter marks the stressed syllable. |  ஒலிபெயர்ப்பில் புள்ளிகள் அசைகளைப் பிரிக்கின்றன; பெரிய எழுத்து அழுத்தம் விழும் அசையைக் காட்டுகிறது. | |
| legendVariant | A line under a Hebrew or Greek word marks text that differs between editions; the note above explains this one. | எபிரெய அல்லது கிரேக்கச் சொல்லின் கீழ் உள்ள கோடு, பதிப்புகளுக்கிடையே வேறுபடும் உரையைக் குறிக்கிறது; மேலே உள்ள குறிப்பு இதை விளக்குகிறது. | |
| noteTrByz | In the Textus Receptus, which the KJV translates, and in the Byzantine text, but not in the Nestle-Aland editions used by most modern translations. | KJV மொழிபெயர்க்கும் டெக்ஸ்டஸ் ரிசெப்டஸிலும் பைசாந்திய உரையிலும் உள்ளது; பெரும்பாலான நவீன மொழிபெயர்ப்புகள் பயன்படுத்தும் நெஸ்லே-ஆலந்து பதிப்புகளில் இல்லை. | |
| noteTrOnly | Only in the Textus Receptus, which the KJV translates. The Byzantine text and the Nestle-Aland editions do not have it. | KJV மொழிபெயர்க்கும் டெக்ஸ்டஸ் ரிசெப்டஸில் மட்டும் உள்ளது. பைசாந்திய உரையிலும் நெஸ்லே-ஆலந்து பதிப்புகளிலும் இல்லை. | |
| noteByzOnly | Only in the Byzantine text. The Textus Receptus and the Nestle-Aland editions do not have it. | பைசாந்திய உரையில் மட்டும் உள்ளது. டெக்ஸ்டஸ் ரிசெப்டஸிலும் நெஸ்லே-ஆலந்து பதிப்புகளிலும் இல்லை. | |
| noteNotInTr | In the Nestle-Aland editions and the Byzantine text, but not in the Textus Receptus that the KJV translates. | நெஸ்லே-ஆலந்து பதிப்புகளிலும் பைசாந்திய உரையிலும் உள்ளது; KJV மொழிபெயர்க்கும் டெக்ஸ்டஸ் ரிசெப்டஸில் இல்லை. | |
| noteNotInByz | In the Textus Receptus and the Nestle-Aland editions, but not in the Byzantine text. | டெக்ஸ்டஸ் ரிசெப்டஸிலும் நெஸ்லே-ஆலந்து பதிப்புகளிலும் உள்ளது; பைசாந்திய உரையில் இல்லை. | |
| noteNaReads | Here the Nestle-Aland editions read {word}. | இங்கே நெஸ்லே-ஆலந்து பதிப்புகளில் {word} என்று உள்ளது. | |
| noteLxx | Not in the Hebrew Leningrad Codex. Supplied from the Septuagint, as some translations do. | எபிரெய லெனின்கிராட் கையெழுத்துப் பிரதியில் இல்லை. சில மொழிபெயர்ப்புகளைப் போல செப்டுவஜின்டிலிருந்து (கிரேக்கப் பழைய ஏற்பாடு) சேர்க்கப்பட்டது. | |
| noteRestored | Missing from the Leningrad Codex and restored from a parallel passage. | லெனின்கிராட் கையெழுத்துப் பிரதியில் விடுபட்டது; இணையான பகுதியிலிருந்து மீட்டெடுக்கப்பட்டது. | |
| previousEntry | Previous entry | முந்தைய பதிவு | |
| close | Close | மூடு | |
| wordsInVerse | Words in this verse | இந்த வசனத்தின் சொற்கள் | |
| moreAboutWord | Meaning, examples and related words | பொருள், எடுத்துக்காட்டுகள், தொடர்புடைய சொற்கள் | |
| inThisVerse | In this verse | இந்த வசனத்தில் | |
| compoundWord | This word joins {n} Hebrew or Greek words; tap one | இந்த வார்த்தை {n} எபிரெய அல்லது கிரேக்கச் சொற்களை இணைக்கிறது; அவற்றில் ஒன்றைத் தொடுங்கள் | |
| dictionaryForm | Dictionary form | அகராதி வடிவம் | |
| examples | Examples | எடுத்துக்காட்டுகள் | |
| relatedWords | Related words | தொடர்புடைய சொற்கள் | |
| strongsDictionary | Strong's dictionary (1890) | ஸ்ட்ராங் அகராதி (1890) | |
| lexiconGreek | Abbott-Smith's Greek lexicon (1922) | Abbott-Smith கிரேக்க அகராதி (ஆங்கிலம், 1922) | |
| lexiconHebrew | Brown–Driver–Briggs, outline of meanings (1906) | Brown–Driver–Briggs, பொருள் சுருக்கம் (ஆங்கிலம், 1906) | |
| showWholeEntry | Show the whole entry | முழுவதையும் காட்டு | |
| showLess | Show less | சுருக்கு | |
| strongsNumberLine | Strong's number {id}, for looking the word up in other Bible tools | ஸ்ட்ராங் எண் {id}; மற்ற வேதாகமக் கருவிகளில் இந்தச் சொல்லைத் தேட | |
| seeAllVerses | See all {n} verses | {n} வசனங்களையும் காண்க | |
| seeOneVerse | See the one verse | அந்த ஒரு வசனத்தைக் காண்க | |
| inTranslationSub | in {name} | {name} | |
| usedHebrew | Used {n} times in the Hebrew Bible | எபிரெய வேதாகமத்தில் {n} முறை | |
| usedGreek | Used {n} times in the Greek New Testament | கிரேக்கப் புதிய ஏற்பாட்டில் {n} முறை | |
| usedOnceHebrew | Used once in the Hebrew Bible | எபிரெய வேதாகமத்தில் ஒரு முறை | |
| usedOnceGreek | Used once in the Greek New Testament | கிரேக்கப் புதிய ஏற்பாட்டில் ஒரு முறை | |
| originalVersesHebrew | {n} verses in the Hebrew Bible, shown in the {translation} | எபிரெய வேதாகமத்தின் {n} வசனங்கள், {in} | |
| originalVersesGreek | {n} verses in the Greek New Testament, shown in the {translation} | கிரேக்கப் புதிய ஏற்பாட்டின் {n} வசனங்கள், {in} | |
| originalVerseHebrew | 1 verse in the Hebrew Bible, shown in the {translation} | எபிரெய வேதாகமத்தின் 1 வசனம், {in} | |
| originalVerseGreek | 1 verse in the Greek New Testament, shown in the {translation} | கிரேக்கப் புதிய ஏற்பாட்டின் 1 வசனம், {in} | |
| kjvUsage | In the KJV: {list} | KJV-யில்: {list} | |
| usageIdiom | idiom | மரபுத்தொடர் | |
| usagePhrase | in a phrase | சொற்றொடரில் | |
| usageWith | with other words | மற்ற சொற்களுடன் | |
| wordsInVerseDetail | Open the Hebrew or Greek entry for each linked word | இணைக்கப்பட்ட ஒவ்வொரு சொல்லின் எபிரெய அல்லது கிரேக்க விவரத்தையும் திறக்க | |
| verseHint | Double-tap and hold for highlight, note, copy and more | ஹைலைட், குறிப்பு, நகல் போன்றவற்றுக்கு இருமுறை தொட்டுப் பிடியுங்கள் | |
| verseActions | Verse {n}, actions | வசனம் {n}, செயல்கள் | |
| recent | Recent | சமீபத்தில் வாசித்தவை | |
| openFailed | The Bible text could not be opened. | வேதாகம உரையைத் திறக்க முடியவில்லை. | |
| openFailedDetail | This can happen when the phone is short of storage. Free about 100 MB and try again. | தொலைபேசியில் சேமிப்பிடம் குறைவாக இருந்தால் இப்படி நடக்கலாம். சுமார் 100 MB இடம் விடுவித்து மீண்டும் முயலுங்கள். | |
| loadFailed | This could not be loaded. | இதை ஏற்ற முடியவில்லை. | |
| somethingWrong | Something went wrong. | ஏதோ தவறு நடந்துவிட்டது. | |
| tryAgain | Try again | மீண்டும் முயல்க | |
| appearance | Appearance | தோற்றம் | |
| theme | Theme | நிறத் திட்டம் | |
| themeAuto | Auto | தானாக | |
| themeLight | Light | வெளிச்சம் | |
| themeSepia | Sepia | செபியா | |
| highlightStyle | Highlights | ஹைலைட்டுகள் | |
| highlightSoft | Soft | மென்மை | |
| highlightFluorescent | Fluorescent | ஃப்ளோரசன்ட் | |
| highlightStyleDetail | Dark theme only | இருள் நிறத் திட்டத்தில் மட்டும் | |
| themeDark | Dark | இருள் | |
| layout | Layout | உரை அமைப்பு | |
| layoutVerses | Verse per line | வசனம் வசனமாக | |
| layoutParagraphs | Paragraphs | பத்திகள் | |
| serif | Serif typeface | புத்தக எழுத்துரு | |
| serifDetail | Scripture in a book-style face | அச்சிட்ட வேதாகமம் போன்ற எழுத்து வடிவம் | |
| keepAwake | Keep screen awake | திரையை அணையாமல் வை | |
| keepAwakeDetail | While the app is open | செயலி திறந்திருக்கும் வரை | |
| sideBySide | Side by side | அருகருகே | |
| sideBySideDetail | {native} and English verses together on a tablet or a phone turned sideways | டேப்லெட்டில் அல்லது தொலைபேசியைச் சாய்த்துப் பிடிக்கும்போது தமிழும் ஆங்கிலமும் ஒன்றாக | |
| studyTools | Study tools | படிப்புக் கருவிகள் | |
| studyToolsDetail | Tap a word for its Hebrew or Greek, the original words under each verse, cross references, parallel passages, Compare, and an introduction to each book. Off, the app is a plain Bible for reading; your highlights, notes and notebook stay. | ஒரு வார்த்தையைத் தொட்டால் அதன் எபிரெய / கிரேக்க மூலச்சொல், ஒவ்வொரு வசனத்தின் கீழும் மூல மொழி வார்த்தைகள், தொடர்புடைய வசனங்கள், இணையான பகுதிகள், ஒப்பீடு, ஒவ்வொரு புத்தகத்துக்கும் முன்னுரை. அணைத்தால் வாசிப்பதற்கான சாதாரண வேதாகமம்; ஹைலைட்டுகள், குறிப்புகள், குறிப்பேடு அப்படியே இருக்கும். | |
| studyToolsOn | Switch the study tools on | படிப்புக் கருவிகளை இயக்கு | |
| studyToolsOff | Switch the study tools off | படிப்புக் கருவிகளை அணை | |
| studyToolsOnNote | Study tools on | படிப்புக் கருவிகள் இயக்கத்தில் | |
| studyToolsOffNote | Study tools off: plain reading | படிப்புக் கருவிகள் அணைக்கப்பட்டன: வெறும் வாசிப்பு | |
| language | Interface language | செயலியின் மொழி | |
| translation | Translation | மொழிபெயர்ப்பு | |
| textSize | Text size | எழுத்தளவு | |
| smallerText | Smaller text | சிறிய எழுத்து | |
| largerText | Larger text | பெரிய எழுத்து | |
| textSizeHint | You can also pinch the text while reading: spread two fingers to enlarge it, pinch to shrink it. | வாசிக்கும்போது இரண்டு விரல்களாலும் எழுத்தளவை மாற்றலாம்: பெரிதாக்க விரல்களை விரியுங்கள், சிறிதாக்கக் குவியுங்கள். | |
| interlinear | Hebrew and Greek words | எபிரெய, கிரேக்கச் சொற்கள் | |
| showInterlinear | Show the Hebrew or Greek words | எபிரெய அல்லது கிரேக்கச் சொற்களைக் காட்டு | |
| showInterlinearDetail | Under each verse, word by word, with transliteration and meaning | ஒவ்வொரு வசனத்தின் கீழும், சொல்லுக்குச் சொல், ஒலிபெயர்ப்பும் பொருளும் சேர்த்து | |
| everyVerse | Every verse | எல்லா வசனங்களும் | |
| everyVerseDetail | The whole chapter is shown word by word | முழு அதிகாரமும் சொல்லுக்குச் சொல் காட்டப்படும் | |
| tappedVerses | Only verses I tap | நான் தொடும் வசனங்கள் மட்டும் | |
| tappedVersesDetail | Tap a verse number to show or hide its words. Keeps long chapters short. | வசன எண்ணைத் தொட்டு அதன் சொற்களைக் காட்டவோ மறைக்கவோ செய்யலாம். நீண்ட அதிகாரங்கள் அதிகம் நீளாது. | |
| transliteration | Transliteration | ஒலிபெயர்ப்பு | |
| transliterationDetail | Show how each word is pronounced | ஒவ்வொரு சொல்லும் எப்படி உச்சரிக்கப்படுகிறது என்று காட்டு | |
| hideCantillation | Hide cantillation marks | பாராயணக் குறிகளை மறை | |
| hideCantillationDetail | Hebrew with vowel points only, easier to read at small sizes | எபிரெயத்தில் உயிர்க்குறிகள் மட்டும்; சிறிய எழுத்தில் வாசிக்க எளிது | |
| reading | Reading | வாசிப்பு | |
| underline | Underline linked words | இணைக்கப்பட்ட சொற்களுக்கு அடிக்கோடு | |
| underlineDetail | Marks words that open a Greek or Hebrew entry | எபிரெய அல்லது கிரேக்க விவரம் திறக்கும் சொற்களுக்குக் கீழ் கோடு காட்டும் | |
| aboutTexts | About the texts | உரைகளைப் பற்றி | |
| sourcesLicences | Sources and licences | மூலங்களும் உரிமங்களும் | |
| whyThisBible | Why this Bible | இந்த வேதாகமம் ஏன் | |
| howTo | How to use | எப்படிப் பயன்படுத்துவது | |
| howToIntro | Tap a topic to open it. | ஒரு தலைப்பைத் தொட்டால் திறக்கும். | |
| howTopic1 | Reading a chapter | ஒரு அதிகாரத்தை வாசிக்க | |
| howText1 | Turn the chapter with the arrows at the foot of the page, or swipe. Tap the book name at the top to choose any book and chapter: Old or New Testament, the books under their groups, then the chapter. The Books tab lists them too, with the chapters you read last. Spread two fingers to make the text larger, or set the size in Settings. | பக்கத்தின் அடியிலுள்ள அம்புகளாலோ ஸ்வைப் செய்தோ அதிகாரத்தை மாற்றலாம். மேலே புத்தகத்தின் பெயரைத் தொட்டால் எந்தப் புத்தகத்தையும் அதிகாரத்தையும் தேர்ந்தெடுக்கலாம்: பழைய அல்லது புதிய ஏற்பாடு, பிரிவுகளின் கீழ் புத்தகங்கள், பின்பு அதிகாரம். புத்தகங்கள் தாவலிலும் எல்லாம் உண்டு, கடைசியாக வாசித்த அதிகாரங்களோடு. இரண்டு விரல்களை விரித்தால் எழுத்து பெரிதாகும்; அமைப்புகளிலும் அளவை மாற்றலாம். | |
| howTopic2 | Switching Bibles | வேதாகமத்தை மாற்ற | |
| howText2 | The button at the foot of the page switches to the other Bible. On a tablet, or a phone turned on its side, both Bibles can be read together (Settings → Side by side). | பக்கத்தின் அடியிலுள்ள பொத்தான் மற்ற வேதாகமத்துக்கு மாற்றும். டேப்லெட்டிலோ தொலைபேசியைச் சாய்த்துப் பிடிக்கும்போதோ இரண்டு வேதாகமங்களையும் சேர்த்து வாசிக்கலாம் (அமைப்புகள் → அருகருகே). | |
| howTopic3 | A verse's menu | வசனத்தின் பட்டி | |
| howText3 | Hold a verse to open its menu: copy, share, bookmark, a highlight colour, a note, a picture card, add to the notebook, read aloud from here, mark part of the verse, compare the Bibles, cross references and parallel passages. | ஒரு வசனத்தை அழுத்திப் பிடித்தால் அதன் பட்டி திறக்கும்: நகல், பகிர், அடையாளக்குறி, ஹைலைட் நிறம், குறிப்பு, பட அட்டை, குறிப்பேட்டில் சேர், இங்கிருந்து வாசிக்கச் செய், வசனத்தின் ஒரு பகுதியைக் குறி, வேதாகமங்களை ஒப்பிடு, தொடர்புடைய வசனங்கள், இணையான பகுதிகள். | |
| howTopic4 | Words and their Hebrew or Greek | வார்த்தைகளும் அவற்றின் எபிரெய / கிரேக்க மூலச்சொல்லும் | |
| howText4 | Tap an underlined word to see the Hebrew or Greek word behind it, with its meaning, pronunciation and every verse it is used in. The Hebrew or Greek button at the foot of the page shows the whole verse in the original language, word by word. | அடிக்கோடிட்ட வார்த்தையைத் தொட்டால் அதன் பின்னுள்ள எபிரெய அல்லது கிரேக்க வார்த்தை, பொருள், உச்சரிப்பு, அது வரும் எல்லா வசனங்களும் தெரியும். பக்கத்தின் அடியிலுள்ள எபிரெய / கிரேக்கப் பொத்தான் முழு வசனத்தையும் மூல மொழியில் வார்த்தை வார்த்தையாகக் காட்டும். | |
| howTopic5 | Highlighting part of a verse | வசனத்தின் ஒரு பகுதியை ஹைலைட் செய்ய | |
| howText5 | Hold a verse and choose Mark text. Hold a word still, drag to the last word and let go. The bar at the foot picks the colour and has an eraser; tap Done when finished. Everything marked is listed under Saved. | வசனத்தை அழுத்திப் பிடித்து, உரையைக் குறி என்பதைத் தேர்ந்தெடுங்கள். ஒரு வார்த்தையை அழுத்திப் பிடித்து, கடைசி வார்த்தை வரை இழுத்து விடுங்கள். அடியிலுள்ள பட்டையில் நிறமும் அழிப்பானும்; முடிந்ததும் முடிந்தது என்பதைத் தொடுங்கள். குறித்தவை எல்லாம் சேமித்தவையில் இருக்கும். | |
| howTopic6 | Saved | சேமித்தவை | |
| howText6 | The Saved tab lists your bookmarks, highlights, marked text and notes. Tap one to open its verse. | சேமித்தவை தாவலில் அடையாளக்குறிகள், ஹைலைட்டுகள், குறித்த உரை, குறிப்புகள். ஒன்றைத் தொட்டால் அந்த வசனம் திறக்கும். | |
| howTopic7 | Search | தேடல் | |
| howText7 | Type a word, or a reference such as John 3:16 or Psalm 23, in the search box. Results start in the New Testament; the buttons narrow them to a Testament or a book. | தேடல் பெட்டியில் ஒரு வார்த்தையையோ யோவான் 3:16, சங்கீதம் 23 போன்ற குறிப்பையோ தட்டச்சு செய்யுங்கள். முடிவுகள் புதிய ஏற்பாட்டிலிருந்து தொடங்கும்; பொத்தான்கள் ஒரு ஏற்பாட்டுக்கோ புத்தகத்துக்கோ சுருக்கும். | |
| howTopic8 | Notebook | குறிப்பேடு | |
| howText8 | The Notebook tab holds typed pages for sermon notes or a study. A reference typed on a page, such as John 3:16, becomes a link with the verse shown beneath. Hold a verse and choose Add to notebook to put it on a page. A page can be shared as text or as a PDF. | குறிப்பேடு தாவலில் பிரசங்கக் குறிப்புகளுக்கோ படிப்புக்கோ தட்டச்சுப் பக்கங்கள். பக்கத்தில் தட்டச்சு செய்யும் யோவான் 3:16 போன்ற குறிப்பு இணைப்பாகும்; வசனம் கீழே தெரியும். வசனத்தை அழுத்திப் பிடித்து குறிப்பேட்டில் சேர் என்பதைத் தேர்ந்தெடுத்தால் அது பக்கத்தில் வரும். பக்கத்தை உரையாகவோ PDF-ஆகவோ பகிரலாம். | |
| howTopic9 | Handwritten pages | கையால் எழுதும் பக்கங்கள் | |
| howText9 | New page → Handwritten gives a page to write on with a pen or a finger, on plain or lined paper: three pens, a highlighter, an eraser, undo and redo. Two fingers move the page. With a stylus, the pen-only switch lets your hand rest on the screen. The page is shared as a picture or a PDF. | புதிய பக்கம் → கையெழுத்து என்பது பேனாவாலோ விரலாலோ எழுதும் பக்கத்தைத் தரும், வெற்றுத் தாளிலோ கோடிட்ட தாளிலோ: மூன்று பேனாக்கள், ஹைலைட்டர், அழிப்பான், செயல்தவிர், மீண்டும் செய். இரண்டு விரல்களால் பக்கத்தை நகர்த்தலாம். ஸ்டைலஸ் இருந்தால், பேனா மட்டும் எழுதும் சுவிட்ச் கையைத் திரையில் வைக்க அனுமதிக்கும். பக்கத்தைப் படமாகவோ PDF-ஆகவோ பகிரலாம். | |
| howTopic10 | Backing up the notebook | குறிப்பேட்டின் காப்புப்பிரதி | |
| howText10 | In the Notebook, tap the backup button to save every page to one file, and keep it in Drive, Files or a chat. Restore from a backup adds the file's pages back; a page already here is replaced only by a newer copy of itself, and nothing is deleted. | குறிப்பேட்டில் காப்புப்பிரதிப் பொத்தானைத் தொட்டால் எல்லாப் பக்கங்களும் ஒரே கோப்பில் சேமிக்கப்படும்; Drive, Files அல்லது ஒரு அரட்டையில் வைக்கலாம். காப்புப்பிரதியிலிருந்து மீட்டெடுக்கும்போது கோப்பின் பக்கங்கள் சேர்க்கப்படும்; இங்குள்ள ஒரு பக்கம் அதன் புதிய பதிப்பால் மட்டுமே மாற்றப்படும், எதுவும் நீக்கப்படாது. | |
| howTopic11 | Listening | கேட்க | |
| howText11 | Tap the speaker in the top bar to hear the chapter read in your phone's voice, verse by verse; the verse being read is marked, and reading goes on to the next chapter. The player sets the speed and moves between verses. | மேலுள்ள ஸ்பீக்கரைத் தொட்டால் தொலைபேசியின் குரலில் அதிகாரம் வசனம் வசனமாக வாசிக்கப்படும்; வாசிக்கப்படும் வசனம் குறிக்கப்படும், அடுத்த அதிகாரத்துக்குத் தொடரும். பிளேயரில் வேகத்தை மாற்றலாம், வசனங்களுக்கிடையே நகரலாம். | |
| howTopic12 | Study tools and book introductions | படிப்புக் கருவிகளும் புத்தக முன்னுரைகளும் | |
| howText12 | Settings → Study tools switches the study side of the app off, for plain reading, and on again; the cap at the top of the reader switches it off and on too. With it on, About this book at the top of a book's first chapter (and above its chapter numbers) tells who wrote the book, when and for whom, its themes and outline, and key verses. | அமைப்புகள் → படிப்புக் கருவிகள் செயலியின் படிப்புப் பகுதியை அணைக்கும் (வெறும் வாசிப்புக்கு), மீண்டும் இயக்கும்; வாசிப்புப் பக்கத்தின் மேலுள்ள தொப்பிக் குறியும் அணைக்கும், இயக்கும். இயங்கும்போது, புத்தகத்தின் முதல் அதிகாரத்தின் மேலுள்ள (அதிகார எண்களுக்கு மேலும் உள்ள) இந்தப் புத்தகத்தைப் பற்றி, யார் எழுதினார், எப்போது, யாருக்காக, முக்கிய கருப்பொருள்கள், பொருளடக்கம், முக்கிய வசனங்கள் ஆகியவற்றைச் சொல்லும். | |
| howTopic13 | Picture cards | பட அட்டைகள் | |
| howText13 | Hold a verse and choose Share as card to put it on a picture, for a birthday, a wedding or any day, with a message of your own and your own photo if you like. A design you make can be saved for next time. | வசனத்தை அழுத்திப் பிடித்து அட்டையாகப் பகிர் என்பதைத் தேர்ந்தெடுத்தால், பிறந்தநாள், திருமணம் அல்லது எந்த நாளுக்கும் ஒரு படத்தில் வசனம், உங்கள் செய்தியோடும், விரும்பினால் உங்கள் சொந்தப் புகைப்படத்தோடும். நீங்கள் உருவாக்கும் வடிவமைப்பை அடுத்த முறைக்குச் சேமிக்கலாம். | |
| feedback | Write to us | எங்களுக்கு எழுதுங்கள் | |
| feedbackDetail | A problem, a wish, a word of thanks: anything. Opens your mail app. | ஒரு பிரச்சினை, ஒரு விருப்பம், ஒரு நன்றி வார்த்தை: எதுவும். உங்கள் மெயில் செயலி திறக்கும். | |
| feedbackCard | You have been reading with this app for a while. What could be better? A line from you helps us more than you might think. | சில நாட்களாக இந்தச் செயலியில் வாசித்து வருகிறீர்கள். எதை மேம்படுத்தலாம்? உங்களிடமிருந்து ஒரு வரி எங்களுக்குப் பெரிய உதவி. | |
| feedbackNotNow | Not now | இப்போது வேண்டாம் | |
| feedbackNever | No thanks | வேண்டாம், நன்றி | |
| feedbackSubject | Feedback: {app} {version} | கருத்து: {app} {version} | |
| feedbackSentFrom | Sent from {app} {version} ({build}) on {device}. You may delete this line. | இந்தக் குறிப்பு {app} {version} ({build}) செயலியிலிருந்து, {device} தொலைபேசியிலிருந்து, அனுப்பப்பட்டது. இந்த வரியை நீக்கலாம். | |
| feedbackNoMail | No mail app found | மெயில் செயலி கிடைக்கவில்லை | |
| feedbackNoMailText | You can write to us at {address}. | இந்த முகவரிக்கு எழுதலாம்: {address} | |
| feedbackCopyAddress | Copy address | முகவரியை நகலெடு | |
| privacy | Privacy | தனியுரிமை | |
| aboutEnglish | Bibles: the King James Version (1769), the Berean Standard Bible and the World English Bible. The translators' footnotes appear as small letters in the text; tap one to read it. | வேதாகமங்கள்: கிங் ஜேம்ஸ் வெர்ஸன் (1769), பெரியன் ஸ்டாண்டர்டு பைபிள், வேர்ல்டு இங்கிலீஷ் பைபிள். மொழிபெயர்ப்பாளர்களின் அடிக்குறிப்புகள் சிறிய எழுத்துகளாகத் தெரியும்; தொட்டால் படிக்கலாம். | |
| aboutMalayalam | Bibles: the Sathyavedapusthakam 1910 (Malayalam), in a revised edition in contemporary orthography, and the King James Version (1769). The links from Malayalam words to the Hebrew and Greek are machine-generated and not fully reviewed. | வேதாகமங்கள்: மலையாள சத்தியவேதபுஸ்தகம் 1910 (இன்றைய எழுத்துமுறையில் திருத்தப்பட்ட பதிப்பு), கிங் ஜேம்ஸ் வெர்ஸன் (1769). மலையாள வார்த்தைகளிலிருந்து எபிரெய, கிரேக்க வார்த்தைகளுக்கான இணைப்புகள் இயந்திரத்தால் உருவாக்கப்பட்டவை; முழுமையாகச் சரிபார்க்கப்படவில்லை. | |
| aboutTamil | Bibles: the Indian Revised Version (Tamil) and the King James Version (1769). The links from Tamil words to the Hebrew and Greek are machine-generated and not reviewed. | வேதாகமங்கள்: இண்டியன் ரிவைஸ்டு வெர்ஸன் (IRV) தமிழ், கிங் ஜேம்ஸ் வெர்ஸன் (1769). தமிழ் வார்த்தைகளிலிருந்து எபிரெய, கிரேக்க வார்த்தைகளுக்கான இணைப்புகள் இயந்திர உதவியுடன் உருவாக்கப்பட்டவை; சரிபார்க்கப்படவில்லை. | |
| aboutAll | Bibles: the King James Version (1769), the Berean Standard Bible, the World English Bible, the Sathyavedapusthakam 1910 (Malayalam) in contemporary orthography, and the Indian Revised Version in Tamil and in Hindi. The links from Malayalam and Tamil words to the Hebrew and Greek are machine-generated and not fully reviewed; the Hindi words are not linked yet. The translators' footnotes appear as small letters in the text; tap one to read it. | வேதாகமங்கள்: கிங் ஜேம்ஸ் வெர்ஸன் (1769), பெரியன் ஸ்டாண்டர்டு பைபிள், வேர்ல்டு இங்கிலீஷ் பைபிள், மலையாள சத்தியவேதபுஸ்தகம் 1910 (இன்றைய எழுத்துமுறையில்), தமிழிலும் இந்தியிலும் இண்டியன் ரிவைஸ்டு வெர்ஸன். மலையாள, தமிழ் வார்த்தைகளிலிருந்து எபிரெய, கிரேக்க வார்த்தைகளுக்கான இணைப்புகள் இயந்திரம் உருவாக்கியவை, முழுமையாகச் சரிபார்க்கப்படவில்லை; இந்தி வார்த்தைகள் இன்னும் இணைக்கப்படவில்லை. | |
| sideBySideDetailAll | Your Indian Bible beside the English, verse by verse, on a tablet or a phone turned sideways | டேப்லெட்டில் அல்லது தொலைபேசியைச் சாய்த்துப் பிடிக்கும்போது உங்கள் இந்திய வேதாகமமும் ஆங்கிலமும் வசனம் வசனமாக ஒன்றாக | |
| chooseBible | Choose a Bible | வேதாகமத்தைத் தேர்ந்தெடுக்க | |
| hindiNote | Hindi words are not yet linked to the Hebrew and Greek, so tapping a word does nothing here. Cross references, parallel passages and the introductions still work, and the English Bibles have the word links. | இந்தி வார்த்தைகள் இன்னும் எபிரெய, கிரேக்க வார்த்தைகளுடன் இணைக்கப்படவில்லை; எனவே இங்கே வார்த்தையைத் தொட்டால் ஒன்றும் நடக்காது. தொடர்புடைய வசனங்கள், இணையான பகுதிகள், புத்தக முன்னுரைகள் வேலை செய்யும்; ஆங்கில வேதாகமங்களில் வார்த்தை இணைப்புகள் உள்ளன. | |
| moreEntries | More ({n}) | மேலும் ({n}) | |
| fewerEntries | Fewer | குறைவாக | |
| englishBibles | English | ஆங்கிலம் | |
| indianBibles | Indian languages | இந்திய மொழிகள் | |
| aboutStrongs | Dictionaries: Strong's Hebrew and Greek Dictionaries (1890), Abbott-Smith's Greek lexicon (1922) and the Brown–Driver–Briggs Hebrew lexicon (1906). | அகராதிகள்: ஸ்ட்ராங் எபிரெய, கிரேக்க அகராதிகள் (1890), Abbott-Smith கிரேக்க அகராதி (1922), Brown–Driver–Briggs எபிரெய அகராதி (1906). | |
| aboutInterlinear | The Hebrew (Leningrad Codex) and Greek words, with transliteration, glosses and grammar are from the Translators Amalgamated Hebrew OT and Greek NT of STEPBible.org (Tyndale House, Cambridge). The Greek is spelled as in the Nestle-Aland 28th edition and has every word of the Textus Receptus and the Byzantine text; where those texts have a different word from Nestle-Aland, their word is shown. Words not in the Nestle-Aland editions have a line beneath; tap one to see which texts have it. | எபிரெய (லெனின்கிராட் கோடெக்ஸ்), கிரேக்க வார்த்தைகள், ஒலிபெயர்ப்பு, பொருள், இலக்கணத்துடன், STEPBible.org (Tyndale House Cambridge) தயாரித்த Translators Amalgamated Hebrew OT and Greek NT-இலிருந்து. கிரேக்கம் நெஸ்லே-ஆலந்து 28-ஆம் பதிப்பின் எழுத்துக்கூட்டலில் உள்ளது; டெக்ஸ்டஸ் ரிசெப்டஸ், பைசாந்திய பாடங்களின் ஒவ்வொரு வார்த்தையும் அதில் உண்டு. அவற்றில் வேறு வார்த்தை இருக்கும் இடத்தில் அந்த வார்த்தை காட்டப்படுகிறது. நெஸ்லே-ஆலந்து பதிப்புகளில் இல்லாத வார்த்தைகளுக்குக் கீழே கோடு இருக்கும்; எந்தப் பாடங்களில் அது உள்ளது என்று அறியத் தொடுங்கள். | |
| aboutWeb | The World English Bible is shown as plain text: the Strong's numbers in its source file are attached to the wrong words too often to use. Word lookups and verse lists use the King James Version; to tap the original words while reading the WEB, switch on Hebrew words or Greek words. | வேர்ல்டு இங்கிலீஷ் பைபிள் வெறும் உரையாக மட்டுமே காட்டப்படுகிறது: அதன் மூலக் கோப்பில் உள்ள ஸ்ட்ராங் எண்கள் அடிக்கடி தவறான வார்த்தைகளில் உள்ளன. சொல் விவரமும் வசனப் பட்டியலும் KJV-ஐப் பயன்படுத்துகின்றன; WEB-ஐ வாசிக்கும்போது மூல வார்த்தைகளைத் தொட, எபிரெய / கிரேக்க வார்த்தைகளை இயக்குங்கள். | |
| databaseBuilt | Database built {date} | தரவுத்தளம் உருவாக்கப்பட்டது {date} | |
| appVersion | Version {version} | பதிப்பு {version} | |
| previewText | In the beginning | ஆதியிலே | |
| title | (title) | (தலைப்பு) | |
| notebook | Notebook | குறிப்பேடு | |
| newPage | New page | புதிய பக்கம் | |
| untitled | Untitled | தலைப்பு இல்லை | |
| pageTitle | Title | தலைப்பு | |
| pageBody | Write here. A reference such as John 3:16 or Ps 23:1-3 links to the verse and shows its text. | இங்கே எழுதுங்கள். யோவான் 3:16, சங் 23:1-3 போன்ற வசனக்குறிப்பு அந்த வசனத்திற்கான இணைப்பாகும்; வசனமும் கீழே தெரியும். | |
| editPage | Edit page | பக்கத்தைத் திருத்து | |
| donePage | Done | முடிந்தது | |
| deletePage | Delete page | பக்கத்தை நீக்கு | |
| deletePageConfirm | Delete this page? It cannot be brought back. | இந்தப் பக்கத்தை நீக்கவா? பிறகு திரும்பப் பெற முடியாது. | |
| cancel | Cancel | வேண்டாம் | |
| sharePage | Share page | பக்கத்தைப் பகிர் | |
| backupRestore | Back up or restore | காப்புப்பிரதியும் மீட்டெடுப்பும் | |
| saveBackup | Save a backup | காப்புப்பிரதி சேமி | |
| saveBackupDetail | Every page, typed and handwritten, in one file to keep in Drive or Files, or to bring to another phone | தட்டச்சு, கையால் எழுதிய எல்லாப் பக்கங்களும் ஒரே கோப்பில்; Drive அல்லது Files-இல் வைக்கலாம், வேறு தொலைபேசிக்குக் கொண்டுசெல்லலாம் | |
| restoreBackup | Restore from a backup | காப்புப்பிரதியிலிருந்து மீட்டெடு | |
| restoreBackupDetail | Pages in the file are added; a page here is replaced only by a newer copy of itself. Nothing is deleted. | கோப்பிலுள்ள பக்கங்கள் சேர்க்கப்படும்; இங்குள்ள ஒரு பக்கம் அதன் புதிய பதிப்பால் மட்டுமே மாற்றப்படும். எதுவும் நீக்கப்படாது. | |
| backupEmpty | The notebook has no pages yet. | குறிப்பேட்டில் இன்னும் பக்கங்கள் இல்லை. | |
| backupFailed | The backup could not be made. | காப்புப்பிரதியை உருவாக்க முடியவில்லை. | |
| restoreNotBackup | This file is not a notebook backup. | இந்தக் கோப்பு குறிப்பேட்டுக் காப்புப்பிரதி அல்ல. | |
| restoreTooLarge | This file is too large to be a notebook backup. | குறிப்பேட்டுக் காப்புப்பிரதியாக இருக்க இந்தக் கோப்பு மிகப் பெரியது. | |
| restoreDone | Restored: {added} new, {updated} updated, {kept} already here. | மீட்டெடுக்கப்பட்டது: {added} புதியவை, {updated} புதுப்பிக்கப்பட்டவை, {kept} ஏற்கெனவே இருந்தவை. | |
| shareAsText | Share as text | உரையாகப் பகிர் | |
| shareAsPdf | Share as PDF | PDF-ஆகப் பகிர் | |
| shareAsPicture | Share as picture | படமாகப் பகிர் | |
| pdfFailed | The PDF could not be made. | PDF-ஐ உருவாக்க முடியவில்லை. | |
| inkPageFull | This page is full. Start a new page to go on writing. | இந்தப் பக்கம் நிறைந்துவிட்டது. தொடர்ந்து எழுத புதிய பக்கத்தைத் தொடங்குங்கள். | |
| restoreFailed | The backup could not be restored. Nothing was changed. | காப்புப்பிரதியை மீட்டெடுக்க முடியவில்லை. எதுவும் மாற்றப்படவில்லை. | |
| backupInkUnreadable | The writing on “{page}” cannot be read, so no backup was made. Open the page to check it, then try again. | “{page}” பக்கத்தின் எழுத்தைப் படிக்க முடியவில்லை, ஆகவே காப்புப்பிரதி எடுக்கப்படவில்லை. பக்கத்தைத் திறந்து பார்த்துவிட்டு மீண்டும் முயலுங்கள். | |
| restoreOtherEdition | This backup was made in the {app} app. Its verses are quoted from that Bible. Restore it here? | இந்தக் காப்புப்பிரதி {app} செயலியில் எடுக்கப்பட்டது. அதிலுள்ள வசனங்கள் அந்த வேதாகமத்திலிருந்து எடுக்கப்பட்டவை. இங்கே மீட்டெடுக்கவா? | |
| pageTyped | Typed page | தட்டச்சுப் பக்கம் | |
| pageTypedDetail | References such as John 3:16 link to the verse | யோவான் 3:16 போன்ற குறிப்புகள் வசனத்துக்கு இணைப்பாகும் | |
| pageHandPlain | Handwritten, plain paper | கையெழுத்துப் பக்கம், வெற்றுத் தாள் | |
| pageHandLined | Handwritten, lined paper | கையெழுத்துப் பக்கம், கோடிட்ட தாள் | |
| pageHandDetail | Write with a pen or your finger | பேனாவாலோ விரலாலோ எழுதலாம் | |
| handwritten | Handwritten | கையால் எழுதியது | |
| penBlack | Black pen | கருப்புப் பேனா | |
| penBlue | Blue pen | நீலப் பேனா | |
| penRed | Red pen | சிவப்புப் பேனா | |
| highlighterYellow | Yellow highlighter | மஞ்சள் ஹைலைட்டர் | |
| penThin | Thin pen | மெல்லிய பேனா | |
| penThick | Thick pen | தடித்த பேனா | |
| undo | Undo | செயல்தவிர் | |
| redo | Redo | மீண்டும் செய் | |
| linedPaper | Lined paper | கோடிட்ட தாள் | |
| plainPaper | Plain paper | வெற்றுத் தாள் | |
| inkHint | Write with one finger or a pen. Move the page with two fingers. | ஒரு விரலாலோ பேனாவாலோ எழுதுங்கள். இரண்டு விரல்களால் பக்கத்தை நகர்த்தலாம். | |
| inkPenFound | Pen found: now a finger moves the page and only the pen writes. | பேனா கண்டறியப்பட்டது: இனி விரல் பக்கத்தை நகர்த்தும், பேனா மட்டும் எழுதும். | |
| inkPenOnly | Only the pen writes | பேனா மட்டும் எழுதும் | |
| inkPenOnlyOn | Only the pen writes now; a finger moves the page. | இனி பேனா மட்டும் எழுதும்; விரல் பக்கத்தை நகர்த்தும். | |
| inkPenOnlyOff | A finger writes again; two fingers move the page. | விரலும் இனி எழுதும்; இரண்டு விரல்களால் பக்கத்தை நகர்த்தலாம். | |
| inkMovePen | One finger moves the page. | ஒரு விரலால் பக்கத்தை நகர்த்தலாம். | |
| inkMoveFingers | Two fingers move the page. | இரண்டு விரல்களால் பக்கத்தை நகர்த்தலாம். | |
| colourYellow | yellow | மஞ்சள் | |
| colourGreen | green | பச்சை | |
| colourBlue | blue | நீலம் | |
| colourPink | pink | இளஞ்சிவப்பு | |
| inkShareFailed | The page could not be shared. | பக்கத்தைப் பகிர முடியவில்லை. | |
| notebookEmptyTitle | No pages yet | இன்னும் பக்கங்கள் இல்லை | |
| notebookEmpty | Write sermon notes, a study or a list of verses. Tap + to start a page, or hold a verse in the reader and choose Add to notebook. | பிரசங்கக் குறிப்புகள், வேத ஆய்வு, வசனப் பட்டியல் எழுதலாம். புதிய பக்கம் தொடங்க + ஐத் தொடுங்கள், அல்லது வாசிப்பில் ஒரு வசனத்தை அழுத்திப் பிடித்து “குறிப்பேட்டில் சேர்” என்பதைத் தேர்ந்தெடுங்கள். | |
| addToNotebook | Add to notebook | குறிப்பேட்டில் சேர் | |
| addToNotebookDetail | Put this verse on a page of your notebook | இந்த வசனத்தை உங்கள் குறிப்பேட்டின் ஒரு பக்கத்தில் சேர்க்க | |
| choosePage | Add to which page? | எந்தப் பக்கத்தில் சேர்க்க? | |
| addedToPage | Added to {title} | “{title}” பக்கத்தில் சேர்க்கப்பட்டது | |
| moreVerses | {n} more verses | மேலும் {n} வசனங்கள் | |
| pageEdited | Edited {date} | திருத்தியது {date} | |
| tabRead | Read | வாசிப்பு | |
| saveFailedTitle | Not saved | சேமிக்கப்படவில்லை | |
| saveFailed | Your latest changes could not be saved. The phone may be out of storage space. The app will keep trying while it is open. | கடைசியாகச் செய்த மாற்றங்களைச் சேமிக்க முடியவில்லை. தொலைபேசியில் இடம் தீர்ந்திருக்கலாம். செயலி திறந்திருக்கும் வரை மீண்டும் முயலும். | |
| readFailedTitle | Saved data could not be read | சேமித்தவற்றைப் படிக்க முடியவில்லை | |
| readFailed | Your bookmarks, notes or notebook could not be read this time. They are left untouched; changes made now will not be saved. Close the app fully and open it again. | உங்கள் அடையாளக்குறிகளையோ குறிப்புகளையோ குறிப்பேட்டையோ இந்த முறை படிக்க முடியவில்லை. அவை மாற்றப்படவில்லை; இப்போது செய்யும் மாற்றங்கள் சேமிக்கப்படாது. செயலியை முழுவதுமாக மூடி மீண்டும் திறங்கள். | |
| restoredBackupTitle | Restored from a backup | பழைய நகலிலிருந்து மீட்கப்பட்டது | |
| restoredBackup | Some saved data was damaged, so an earlier copy was used. Recent changes may be missing. | சேமித்திருந்த சில தகவல்கள் சேதமடைந்ததால் முந்தைய நகல் பயன்படுத்தப்பட்டது. சமீபத்திய மாற்றங்கள் இல்லாமல் இருக்கலாம். | |

## 9. Verse cards

A verse shared as a picture card carries Tamil the reader cannot edit, and people forward
these widely, so check them with extra care:

- The occasion headings (the `heading…` rows in section 8). The sender can change a heading
  before sharing, but most will keep the one given.
- The credit line printed under the reference on every Tamil card, which the IRV's licence
  (CC BY-SA 4.0) asks for: `IRV © Bridge Connectivity Solutions · CC BY-SA 4.0`. It is in
  English; say whether it should read in Tamil instead (for example with the IRV's Tamil name).
- The card screen's labels (the `card…` and `occasion…` rows in section 8).

## 10. Why this Bible page

Settings → இந்த வேதாகமம் ஏன் opens this page (src/screens/WhyScreen.tsx). The quoted verses are the IRV Tamil text itself; the references open the verse. Please check that the Tamil reads naturally and keeps the meaning.

| English | Tamil | Check |
|---|---|---|
| This Bible was made to bring the word of God within reach of all who need it. It was inspired by Bibles that others have given, and it rests on the work of many who went before us. | தேவனுடைய வார்த்தை தேவைப்படுகிற அனைவருக்கும் அது எட்டும்படி இந்த வேதாகமம் உருவாக்கப்பட்டது. மற்றவர்கள் அளித்த வேதாகமங்களே இதற்குத் தூண்டுதலாக இருந்தன; நமக்கு முன்சென்ற பலருடைய உழைப்பின்மேல் இது கட்டப்பட்டிருக்கிறது. | |
| In offering it, we follow the Lord Jesus. When He sent out the twelve disciples (Matthew 10:5–10), He told them to take nothing with them, for those who work for Him will be given what they need, and He said: “Freely ye have received, freely give” (Matthew 10:8). | இதை அளிப்பதில் நாங்கள் கர்த்தராகிய இயேசுவைப் பின்பற்றுகிறோம். அவர் பன்னிரண்டு சீஷர்களை அனுப்பியபோது (மத்தேயு 10:5–10), எதையும் எடுத்துச்செல்ல வேண்டாம் என்று அவர்களிடம் சொன்னார்; அவருக்காக ஊழியம் செய்கிறவர்களுக்குத் தேவையானது கொடுக்கப்படும். அவர் சொன்னார்: “இலவசமாகப் பெற்றீர்கள், இலவசமாகக் கொடுங்கள்” (மத்தேயு 10:8). | |
| But the word is given for a purpose. Wherever you are on your journey, whether you are new to the faith or have walked with Him for many years, I pray that you come to know the Lord Jesus more and more. Having the word is not enough on its own; my hope is that you will spend time with Him, meditating on His word and drawing closer to Him. | ஆனால் வார்த்தை ஒரு நோக்கத்திற்காகக் கொடுக்கப்படுகிறது. நீங்கள் விசுவாசத்தில் புதியவராக இருந்தாலும், பல ஆண்டுகளாக அவரோடு நடந்தவராக இருந்தாலும், உங்கள் பயணத்தில் எங்கே இருந்தாலும், கர்த்தராகிய இயேசுவை நீங்கள் மேலும் மேலும் அறிந்துகொள்ள வேண்டுமென்று ஜெபிக்கிறேன். வார்த்தை கையில் இருப்பது மட்டும் போதாது; நீங்கள் அவரோடு நேரம் செலவழித்து, அவருடைய வார்த்தையைத் தியானித்து, அவரிடம் இன்னும் நெருங்கி வருவீர்கள் என்பதே என் நம்பிக்கை. | |
| To help with that, the Hebrew and Greek words are here to help you understand the text. But more than understanding, it is the Holy Spirit who lights up a life. That is His ministry. | அதற்கு உதவியாக, வசனத்தின் பொருளைப் புரிந்துகொள்ள எபிரெய, கிரேக்க வார்த்தைகள் இங்கே தரப்பட்டுள்ளன. ஆனால் புரிந்துகொள்வதைவிட மேலாக, ஒரு வாழ்க்கையை ஒளிரச்செய்கிறவர் பரிசுத்த ஆவியானவரே. அதுவே அவருடைய ஊழியம். | |
| And to know Him is life itself: “This is eternal life, to know the Father, the only true God, and Jesus Christ whom He has sent” (John 17:3). May the Holy Spirit be with you on that journey and, like a fire, burn away your troubles, so that they no longer weigh on you, for it is He who carries them, not we. And may we give to that fire not only our burdens but our old life, on the altar of God, so that, as Paul says, our old self is crucified with Christ (Galatians 2:20), and we find new life wholly in the Lord Jesus, living in His glory every moment, for ever. | அவரை அறிவதே ஜீவன்: “ஒன்றான உண்மை தேவனாகிய உம்மையும் நீர் அனுப்பினவராகிய இயேசுகிறிஸ்துவையும் அறிவதே நித்தியஜீவன்” (யோவான் 17:3). அந்தப் பயணத்தில் பரிசுத்த ஆவியானவர் உங்களோடு இருப்பாராக; ஒரு அக்கினியைப்போல அவர் உங்கள் துன்பங்களைச் சுட்டெரிப்பாராக; அவற்றைச் சுமப்பவர் நாமல்ல, அவரே; ஆகவே அவை இனி உங்களுக்குப் பாரமாக இருக்காது. நம்முடைய பாரங்களை மட்டுமல்ல, நம்முடைய பழைய வாழ்க்கையையும் தேவனுடைய பலிபீடத்தில் அந்த அக்கினிக்கு ஒப்புக்கொடுப்போமாக; அப்பொழுது, பவுல் சொல்லுகிறபடி, நம்முடைய பழைய மனுஷன் கிறிஸ்துவோடு சிலுவையில் அறையப்பட்டு (கலாத்தியர் 2:20), கர்த்தராகிய இயேசுவுக்குள் நாம் முழுமையாகப் புதிய ஜீவனைக் கண்டடைந்து, ஒவ்வொரு கணமும் என்றென்றும் அவருடைய மகிமையில் வாழ்வோமாக. | |
| Amen. | ஆமென். | |
