# Hindi interface: what a Hindi speaker must check before release

The four-language app offers Hindi menus (`src/i18n.ts`, table `hi`). Everything below was
written by Claude without a Hindi reader and needs a Hindi speaker's eye before the app goes
to Google Play or the App Store. Mark each item OK, or write the correction beside it.

The Bible text itself (the Hindi IRV) is used as published and is not ours to correct.

## 1. Register and words chosen

The whole interface uses the formal आप. Words chosen for the app's own features, used
throughout; say if another word is more natural:

- पद: a verse (not आयत or वचन); अध्याय: a chapter
- बुकमार्क, हाइलाइट: left in English, as phone apps do; टिप्पणी: a note on a verse
- नोटबुक: the Notebook tab; सहेजे हुए: the Saved tab; पढ़ें: the Read tab
- संदर्भ पद: cross references; समानांतर अंश: parallel passages
- इब्रानी / यूनानी: Hebrew and Greek, as the Hindi Bible names them
- अध्ययन उपकरण: the study tools switch; टोपी: the graduation-cap button that switches them
- लिप्यंतरण: transliteration; शब्दकोश: dictionary
- नक़ल: copy; साझा: share; रबड़: the eraser; क़लम: the pen (with nukta; or कलम?)
- The Bibles: किंग जेम्स वर्जन, वर्ल्ड इंग्लिश बाइबल, सत्यवेदपुस्तकम; the IRV keeps its own
  name इंडियन रिवाइज्ड वर्जन

## 2. First screen and names

| Where | Text | Check |
| --- | --- | --- |
| First screen, Hindi card | हिन्दी · इंडियन रिवाइज्ड वर्जन · जारी रखें | |
| First screen, subtitle | भाषा चुनें | |
| Bible pill in the reader | हिन्दी | The language, in its own script |
| After a shared verse | — यूहन्ना 3:16 (IRV) | |
| Psalm title label | भजन संहिता 3 (शीर्षक) | |
| Word sheet heading | IRV (हिन्दी) में, KJV में | "How the IRV renders this word" |

## 3. Book names

The app shows the IRV's own names. People can also type the short names (the IRV's own
abbreviations without their dots: उत्प, निर्ग, 1 शमू, भज, यूह, प्रेरि…) and these other names
in search and in the notebook:

- लैव्यव्यवस्था: लैव्यवस्था; व्यवस्थाविवरण: विधि-विवरण; न्यायियों: न्यायकर्ता
- भजन संहिता: भजन, स्तोत्र; नीतिवचन: सूक्ति; सभोपदेशक: उपदेशक; श्रेष्ठगीत: गीतों का गीत
- विलापगीत: विलाप; प्रेरितों के काम: प्रेरितों, प्रेरित-चरित; प्रकाशितवाक्य: प्रकाशना, प्रकाशन

Are these right, and are common ones missing (the Catholic Hindi Bible's names in particular)?
न्याय, नीति and रोम are ordinary words too, so "न्याय 5" alone is not read as a reference.

## 4. Search

Typing मुंह finds मुँह, पड finds पड़, and a word typed with a nukta or a joiner finds the text
without them. Is anything else commonly typed differently from how the IRV spells it?

## 5. Interface strings

Every Hindi string in the app, beside the English it translates. The table is written by
`node scripts/review-strings.mjs hi`, so it always matches the app; notes in the Check column
are kept as long as the Hindi they refer to is unchanged. {placeholders} such as {n}, {ref},
{title} are filled in by the app and must stay as they are.

| Key | English | Hindi | Check |
| --- | --- | --- | --- |
| loading | Loading… | लोड हो रहा है… | |
| preparing | Preparing the Bible text… | बाइबल का पाठ तैयार हो रहा है… | |
| back | Back | पीछे | |
| results | Results | परिणाम | |
| saved | Saved | सहेजे हुए | |
| books | Books | पुस्तकें | |
| search | Search | खोज | |
| settings | Settings | सेटिंग्स | |
| bookmarks | Bookmarks | बुकमार्क | |
| highlights | Highlights | हाइलाइट | |
| notes | Notes | टिप्पणियाँ | |
| oldTestament | Old Testament | पुराना नियम | |
| newTestament | New Testament | नया नियम | |
| previousChapter | Previous chapter | पिछला अध्याय | |
| switchTo | Switch to {name} | {name} पढ़ें | |
| bibleEnglish | ENG | अंग्रेज़ी | |
| bibleMalayalam | MAL | मलयालम | |
| bibleTamil | TAM | तमिल | |
| bibleHindi | HIN | हिन्दी | |
| nextChapter | Next chapter | अगला अध्याय | |
| hebrewInterlinear | Hebrew | इब्रानी | |
| greekInterlinear | Greek | यूनानी | |
| tapVerseNumber | Tap a verse number to show its {lang} words | किसी पद की संख्या छूकर उसके {lang} शब्द देखें | |
| hebrew | Hebrew | इब्रानी | |
| greek | Greek | यूनानी | |
| sayWord | Say the word | शब्द सुनें | |
| stopSaying | Stop | रोकें | |
| noVoiceTitle | No voice for this language | इस भाषा के लिए आवाज़ नहीं है | |
| noHebrewVoice | This phone has no Hebrew voice. You can add one in the phone’s settings, under Text-to-speech (Android) or Spoken Content (iPhone). | इस फ़ोन में इब्रानी आवाज़ नहीं है। फ़ोन की सेटिंग्स में Text-to-speech (Android) या Spoken Content (iPhone) के अंतर्गत आप एक जोड़ सकते हैं। | |
| noGreekVoice | This phone has no Greek voice. You can add one in the phone’s settings, under Text-to-speech (Android) or Spoken Content (iPhone). | इस फ़ोन में यूनानी आवाज़ नहीं है। फ़ोन की सेटिंग्स में Text-to-speech (Android) या Spoken Content (iPhone) के अंतर्गत आप एक जोड़ सकते हैं। | |
| readAloud | Read aloud | सुनें | |
| stopReading | Stop reading | सुनना रोकें | |
| readFromHere | Read from here | यहाँ से सुनें | |
| readFromHereDetail | Listen to the chapter from this verse in the phone's voice | इस पद से अध्याय को फ़ोन की आवाज़ में सुनें | |
| pauseReading | Pause | रोकें | |
| resumeReading | Continue | जारी रखें | |
| previousVerse | Previous verse | पिछला पद | |
| nextVerse | Next verse | अगला पद | |
| readingSpeed | Reading speed | पढ़ने की गति | |
| backToReading | Back to reading | पढ़ने पर लौटें | |
| noEnglishVoice | This phone has no English voice. You can add one in the phone's settings, under Text-to-speech (Android) or Spoken Content (iPhone). | इस फ़ोन में अंग्रेज़ी आवाज़ नहीं है। फ़ोन की सेटिंग्स में Text-to-speech (Android) या Spoken Content (iPhone) के अंतर्गत आप एक जोड़ सकते हैं। | |
| noMalayalamVoice | This phone has no Malayalam voice. Install Speech Services by Google from the Play Store, choose it in the phone's Text-to-speech settings, and download the Malayalam voice there. | इस फ़ोन में मलयालम आवाज़ नहीं है। Play Store से Speech Services by Google इंस्टॉल करें, फ़ोन की Text-to-speech सेटिंग्स में उसे चुनें, और वहाँ मलयालम आवाज़ डाउनलोड करें। | |
| noTamilVoice | This phone has no Tamil voice. Install Speech Services by Google from the Play Store, choose it in the phone's Text-to-speech settings, and download the Tamil voice there. | इस फ़ोन में तमिल आवाज़ नहीं है। Play Store से Speech Services by Google इंस्टॉल करें, फ़ोन की Text-to-speech सेटिंग्स में उसे चुनें, और वहाँ तमिल आवाज़ डाउनलोड करें। | |
| noHindiVoice | This phone has no Hindi voice. Install Speech Services by Google from the Play Store, choose it in the phone's Text-to-speech settings, and download the Hindi voice there. | इस फ़ोन में हिन्दी आवाज़ नहीं है। Play Store से Speech Services by Google इंस्टॉल करें, फ़ोन की Text-to-speech सेटिंग्स में उसे चुनें, और वहाँ हिन्दी आवाज़ डाउनलोड करें। | |
| shareAsCard | Share as card | कार्ड के रूप में साझा करें | |
| shareAsCardDetail | A picture of the verse, for a greeting or your status | पद का एक चित्र, बधाई या अपने स्टेटस के लिए | |
| cardSquare | Square | वर्गाकार | |
| cardTall | Tall (status) | लंबा (स्टेटस) | |
| cardOccasion | Occasion | अवसर | |
| cardDesign | Design | डिज़ाइन | |
| cardHeading | Heading | शीर्षक | |
| cardMessage | Your message (optional) | आपका संदेश (वैकल्पिक) | |
| cardMessageHint | For example: Happy birthday, Mum! | जैसे: जन्मदिन मुबारक, माँ! | |
| cardVerses | Verses | पद | |
| cardShare | Share picture | चित्र साझा करें | |
| cardFailed | The picture could not be made. | चित्र नहीं बन सका। | |
| cardPhoto | Your photo | आपकी फ़ोटो | |
| cardChangePhoto | Change photo | फ़ोटो बदलें | |
| cardRemovePhoto | Remove photo | फ़ोटो हटाएँ | |
| cardPhotoFailed | The photo could not be opened. | फ़ोटो नहीं खुल सकी। | |
| cardVeil | Over the photo | फ़ोटो के ऊपर | |
| cardVeilLight | Light | हल्का | |
| cardVeilDark | Dark | गहरा | |
| cardFaint | Faint | धुँधला | |
| cardMedium | Medium | मध्यम | |
| cardStrong | Strong | गहरा | |
| cardBlur | Blur the photo | फ़ोटो धुँधली करें | |
| cardBlurDetail | The words stand out more | शब्द और साफ़ दिखते हैं | |
| cardBackground | Background | पृष्ठभूमि | |
| cardDesignColours | Design's own colours | डिज़ाइन के अपने रंग | |
| cardPlace | Text position | पाठ की जगह | |
| cardTop | Top | ऊपर | |
| cardMiddle | Middle | बीच में | |
| cardBottom | Bottom | नीचे | |
| cardFace | Typeface | अक्षर शैली | |
| cardFaceBook | Book | पुस्तक | |
| cardFacePlain | Plain | सादा | |
| cardExtras | Pictures and lines | चित्र और रेखाएँ | |
| cardExtrasDetail | The design's pictures, border and cross | डिज़ाइन के चित्र, किनारा और क्रूस | |
| cardSaveLook | Save as my design | मेरे डिज़ाइन के रूप में सहेजें | |
| cardLookSaved | Saved. It is first in the designs now. | सहेज लिया। अब यह डिज़ाइनों में पहला है। | |
| cardMyDesign | My design {n} | मेरा डिज़ाइन {n} | |
| cardRemoveLook | Remove this design? | यह डिज़ाइन हटाएँ? | |
| cardFewerVerses | One verse fewer | एक पद कम | |
| cardMoreVerses | One more verse | एक पद और | |
| occasionNone | None | कोई नहीं | |
| occasionBirthday | Birthday | जन्मदिन | |
| occasionWedding | Wedding | विवाह | |
| occasionAnniversary | Anniversary | वर्षगाँठ | |
| occasionSympathy | Sympathy | संवेदना | |
| occasionGetWell | Get well | शीघ्र स्वस्थ हों | |
| occasionChristmas | Christmas | क्रिसमस | |
| occasionEaster | Easter | ईस्टर | |
| occasionNewYear | New Year | नया साल | |
| headingBirthday | Happy Birthday | जन्मदिन मुबारक | |
| headingWedding | On your wedding day | आपके विवाह के दिन | |
| headingAnniversary | Happy Anniversary | वर्षगाँठ मुबारक | |
| headingSympathy | With deepest sympathy | गहरी संवेदना के साथ | |
| headingGetWell | Get well soon | शीघ्र स्वस्थ हों | |
| headingChristmas | Merry Christmas | क्रिसमस की बधाई | |
| headingEaster | Happy Easter | ईस्टर की बधाई | |
| headingNewYear | Happy New Year | नया साल मुबारक | |
| tip | Tap any underlined word to see the Hebrew or Greek behind it. Hold a verse to copy, share or bookmark it. The button below shows the whole verse in the original language. | रेखांकित किसी भी शब्द को छूकर उसके पीछे का इब्रानी या यूनानी शब्द देखें। किसी पद को दबाकर रखें: नक़ल, साझा या बुकमार्क करने के लिए। नीचे का बटन पूरे पद को मूल भाषा में दिखाता है। | |
| tipNoTags | Hold a verse to highlight it, add a note, compare translations or bookmark it. The button below shows the whole verse in Hebrew or Greek; tap a word there for its meaning. | किसी पद को दबाकर रखें: हाइलाइट करने, टिप्पणी जोड़ने, अनुवादों की तुलना करने या बुकमार्क करने के लिए। नीचे का बटन पूरे पद को इब्रानी या यूनानी में दिखाता है; वहाँ किसी शब्द को छूकर उसका अर्थ देखें। | |
| gotIt | Got it | समझ गया | |
| choosePassage | {title}, choose passage | {title}, अंश चुनें | |
| choosePassageTitle | Choose a passage | अंश चुनें | |
| allBooks | ‹ All books | ‹ सब पुस्तकें | |
| groupLaw | Law | व्यवस्था | |
| groupHistory | History | इतिहास | |
| groupPoetry | Poetry and wisdom | काव्य और ज्ञान | |
| groupProphets | Prophets | भविष्यद्वक्ता | |
| groupGospels | Gospels | सुसमाचार | |
| groupActs | Acts | प्रेरितों के काम | |
| groupLetters | Letters | पत्रियाँ | |
| groupRevelation | Revelation | प्रकाशितवाक्य | |
| copied | Copied | नक़ल हो गई | |
| bookmarked | Bookmarked | बुकमार्क हो गया | |
| actCopy | Copy | नक़ल | |
| actShare | Share | साझा | |
| actBookmark | Bookmark | बुकमार्क | |
| actBookmarked | Bookmarked | बुकमार्क हुआ | |
| actNote | Note | टिप्पणी | |
| noHighlight | No highlight | हाइलाइट नहीं | |
| bookmarkRemoved | Bookmark removed | बुकमार्क हटाया | |
| highlighted | Highlighted | हाइलाइट हुआ | |
| highlightRemoved | Highlight removed | हाइलाइट हटाया | |
| noteSaved | Note saved | टिप्पणी सहेजी | |
| noteRemoved | Note removed | टिप्पणी हटाई | |
| highlight | Highlight | हाइलाइट | |
| markText | Mark text | पाठ चिह्नित करें | |
| markTextDetail | Highlight some words or a passage across verses | कुछ शब्द, या कई पदों में फैला अंश, हाइलाइट करें | |
| markDone | Done | हो गया | |
| markHint | Hold a word, then drag to the last word to mark. | एक शब्द दबाकर रखें, फिर अंतिम शब्द तक खींचकर चिह्नित करें। | |
| eraseHint | Hold a marked word, then drag over the marks to remove them. | चिह्नित शब्द दबाकर रखें, फिर चिह्नों पर खींचकर उन्हें हटाएँ। | |
| eraser | Eraser | रबड़ | |
| markedText | Marked text | चिह्नित पाठ | |
| clear | Clear | साफ़ करें | |
| addNote | Add a note | टिप्पणी जोड़ें | |
| editNote | Edit note | टिप्पणी बदलें | |
| compare | Compare translations | अनुवादों की तुलना | |
| compareDetail | Side by side with the {lang} | {lang} के साथ, आमने-सामने | |
| copy | Copy | नक़ल करें | |
| copyDetail | Verse text with its reference | पद का पाठ, संदर्भ सहित | |
| share | Share… | साझा करें… | |
| bookmark | Bookmark | बुकमार्क | |
| removeBookmark | Remove bookmark | बुकमार्क हटाएँ | |
| bookmarkDetail | Saved items are listed at the top of the Books screen | सहेजी हुई चीज़ें पुस्तकें स्क्रीन के ऊपर सूचीबद्ध हैं | |
| note | Note | टिप्पणी | |
| notePlaceholder | Your note on this verse | इस पद पर आपकी टिप्पणी | |
| delete | Delete | मिटाएँ | |
| save | Save | सहेजें | |
| remove | Remove | हटाएँ | |
| footnote | Footnote | पादटिप्पणी | |
| crossReference | Cross reference | संदर्भ पद | |
| crossReferences | Cross references | संदर्भ पद | |
| crossReferencesDetail | {n} related passages, the strongest first | {n} संबंधित अंश, सबसे निकट पहले | |
| crossReferencesSource | Treasury of Scripture Knowledge, via OpenBible.info (CC BY) | Treasury of Scripture Knowledge, OpenBible.info के माध्यम से (CC BY) | |
| parallelPassages | Parallel passages | समानांतर अंश | |
| parallelPassagesDetail | {n} places with the same event or words | {n} जगहें जहाँ वही घटना या वही शब्द हैं | |
| parallelPassagesSource | Parallel Passages Database © 2023 United Bible Societies (CC BY-SA 4.0) | Parallel Passages Database © 2023 United Bible Societies (CC BY-SA 4.0) | |
| aboutBook | About this book | इस पुस्तक के बारे में | |
| aboutBookNamed | About {book} | {book} के बारे में | |
| introAuthor | Written by | लेखक | |
| introDate | When | कब | |
| introAudience | Written for | किसके लिए | |
| introThemes | Main themes | मुख्य विषय | |
| introOutline | Outline | रूपरेखा | |
| introKeyVerses | Key verses | मुख्य पद | |
| introNone | There is no introduction to this book yet. | इस पुस्तक का परिचय अभी नहीं है। | |
| omitted | Omitted in this translation. | इस अनुवाद में नहीं है। | |
| nothingSavedTitle | Nothing saved yet | अभी कुछ सहेजा नहीं | |
| nothingSaved | Hold a verse in the reader to bookmark it, highlight it or add a note. They will be listed here. | पढ़ते समय किसी पद को दबाकर रखें: बुकमार्क करने, हाइलाइट करने या टिप्पणी जोड़ने के लिए। वे यहाँ सूचीबद्ध होंगे। | |
| searchTitle | Search the {name} | {in} खोजें | |
| clearSearch | Clear search | खोज साफ़ करें | |
| searchExamples | Try | आज़माएँ | |
| searchPlaceholder | Words, a reference like John 3:16, or G26 | शब्द, यूहन्ना 3:16 जैसा संदर्भ, या G26 | |
| goTo | Go to {ref} | {ref} पर जाएँ | |
| openIn | Open in the {translation} | {in} खोलें | |
| open | Open {id} | {id} खोलें | |
| dictionaryEntry | {lang} dictionary entry | {lang} शब्दकोश प्रविष्टि | |
| dictionary | DICTIONARY | शब्दकोश | |
| noVerses | No verses found | कोई पद नहीं मिला | |
| allResults | All | सब | |
| showMore | Show more ({n} left) | और दिखाएँ ({n} बाकी) | |
| nVerses | {n} verses | {n} पद | |
| oneVerse | 1 verse | 1 पद | |
| versesIn | {n} verses in the {translation} | {in} {n} पद | |
| oneVerseIn | 1 verse in the {translation} | {in} 1 पद | |
| asWord |  as “{word}” |  “{word}” के रूप में | |
| versesInAs | {n} verses in the {translation} as “{word}” | {in} {n} पद, “{word}” के रूप में | |
| oneVerseInAs | 1 verse in the {translation} as “{word}” | {in} 1 पद, “{word}” के रूप में | |
| all | All | सब | |
| notInTranslation | Not in this translation. | इस अनुवाद में नहीं है। | |
| notTagged | Not tagged in the {translation} | {in} यह शब्द जुड़ा नहीं है | |
| noEntry | No dictionary entry for {id}. | {id} के लिए कोई शब्दकोश प्रविष्टि नहीं। | |
| noStrongs | This word has no Strong's number. | इस शब्द का कोई Strong संख्या नहीं है। | |
| marksQuestion | What do the marks mean? | इन चिह्नों का क्या अर्थ है? | |
| marksHide | Hide the key to the marks | चिह्नों की कुंजी छिपाएँ | |
| legendGloss | In the gloss, <a word> in angle brackets is in the original but best left untranslated, and [a word] in square brackets is implied but not in the original. A faded word with no meaning, such as אֵת, marks the object of the verb and is not translated. | अर्थ में, कोण कोष्ठक में <शब्द> मूल में है पर अनुवाद न करना ही ठीक है, और वर्ग कोष्ठक में [शब्द] अभिप्रेत है पर मूल में नहीं है। बिना अर्थ का फीका शब्द, जैसे אֵת, क्रिया के कर्म को दिखाता है और अनूदित नहीं होता। | |
| legendTranslit |  In the transliteration, dots separate syllables and the capital letter marks the stressed syllable. |  लिप्यंतरण में बिंदु अक्षरों (syllables) को अलग करते हैं और बड़ा अक्षर बलाघात वाले अक्षर को दिखाता है। | |
| legendVariant | A line under a Hebrew or Greek word marks text that differs between editions; the note above explains this one. | किसी इब्रानी या यूनानी शब्द के नीचे की रेखा ऐसे पाठ को दिखाती है जो संस्करणों में भिन्न है; ऊपर की टिप्पणी इसे समझाती है। | |
| noteTrByz | In the Textus Receptus, which the KJV translates, and in the Byzantine text, but not in the Nestle-Aland editions used by most modern translations. | Textus Receptus में, जिसका KJV अनुवाद है, और Byzantine पाठ में है, पर अधिकांश आधुनिक अनुवादों के Nestle-Aland संस्करणों में नहीं। | |
| noteTrOnly | Only in the Textus Receptus, which the KJV translates. The Byzantine text and the Nestle-Aland editions do not have it. | केवल Textus Receptus में, जिसका KJV अनुवाद है। Byzantine पाठ और Nestle-Aland संस्करणों में यह नहीं है। | |
| noteByzOnly | Only in the Byzantine text. The Textus Receptus and the Nestle-Aland editions do not have it. | केवल Byzantine पाठ में। Textus Receptus और Nestle-Aland संस्करणों में यह नहीं है। | |
| noteNotInTr | In the Nestle-Aland editions and the Byzantine text, but not in the Textus Receptus that the KJV translates. | Nestle-Aland संस्करणों और Byzantine पाठ में है, पर उस Textus Receptus में नहीं जिसका KJV अनुवाद है। | |
| noteNotInByz | In the Textus Receptus and the Nestle-Aland editions, but not in the Byzantine text. | Textus Receptus और Nestle-Aland संस्करणों में है, पर Byzantine पाठ में नहीं। | |
| noteNaReads | Here the Nestle-Aland editions read {word}. | यहाँ Nestle-Aland संस्करणों में {word} है। | |
| noteLxx | Not in the Hebrew Leningrad Codex. Supplied from the Septuagint, as some translations do. | इब्रानी Leningrad Codex में नहीं है। Septuagint से लिया गया, जैसा कुछ अनुवाद करते हैं। | |
| noteRestored | Missing from the Leningrad Codex and restored from a parallel passage. | Leningrad Codex में नहीं है; एक समानांतर अंश से पुनर्स्थापित। | |
| previousEntry | Previous entry | पिछली प्रविष्टि | |
| close | Close | बंद करें | |
| wordsInVerse | Words in this verse | इस पद के शब्द | |
| moreAboutWord | Meaning, examples and related words | अर्थ, उदाहरण और संबंधित शब्द | |
| inThisVerse | In this verse | इस पद में | |
| compoundWord | This word joins {n} Hebrew or Greek words; tap one | यह शब्द {n} इब्रानी या यूनानी शब्दों को जोड़ता है; एक छुएँ | |
| dictionaryForm | Dictionary form | शब्दकोश रूप | |
| examples | Examples | उदाहरण | |
| relatedWords | Related words | संबंधित शब्द | |
| strongsDictionary | Strong's dictionary (1890) | Strong का शब्दकोश (1890) | |
| lexiconGreek | Abbott-Smith's Greek lexicon (1922) | Abbott-Smith का यूनानी शब्दकोश (1922) | |
| lexiconHebrew | Brown–Driver–Briggs, outline of meanings (1906) | Brown–Driver–Briggs, अर्थों की रूपरेखा (1906) | |
| showWholeEntry | Show the whole entry | पूरी प्रविष्टि दिखाएँ | |
| showLess | Show less | कम दिखाएँ | |
| strongsNumberLine | Strong's number {id}, for looking the word up in other Bible tools | Strong संख्या {id}, दूसरे बाइबल साधनों में शब्द खोजने के लिए | |
| seeAllVerses | See all {n} verses | सभी {n} पद देखें | |
| seeOneVerse | See the one verse | वह एक पद देखें | |
| inTranslationSub | in {name} | {name} में | |
| usedHebrew | Used {n} times in the Hebrew Bible | इब्रानी बाइबल में {n} बार प्रयुक्त | |
| usedGreek | Used {n} times in the Greek New Testament | यूनानी नए नियम में {n} बार प्रयुक्त | |
| usedOnceHebrew | Used once in the Hebrew Bible | इब्रानी बाइबल में एक बार प्रयुक्त | |
| usedOnceGreek | Used once in the Greek New Testament | यूनानी नए नियम में एक बार प्रयुक्त | |
| originalVersesHebrew | {n} verses in the Hebrew Bible, shown in the {translation} | इब्रानी बाइबल में {n} पद, {in} दिखाए गए | |
| originalVersesGreek | {n} verses in the Greek New Testament, shown in the {translation} | यूनानी नए नियम में {n} पद, {in} दिखाए गए | |
| originalVerseHebrew | 1 verse in the Hebrew Bible, shown in the {translation} | इब्रानी बाइबल में 1 पद, {in} दिखाया गया | |
| originalVerseGreek | 1 verse in the Greek New Testament, shown in the {translation} | यूनानी नए नियम में 1 पद, {in} दिखाया गया | |
| kjvUsage | In the KJV: {list} | KJV में: {list} | |
| usageIdiom | idiom | मुहावरा | |
| usagePhrase | in a phrase | वाक्यांश में | |
| usageWith | with other words | अन्य शब्दों के साथ | |
| wordsInVerseDetail | Open the Hebrew or Greek entry for each linked word | हर जुड़े शब्द की इब्रानी या यूनानी प्रविष्टि खोलें | |
| verseHint | Double-tap and hold for highlight, note, copy and more | हाइलाइट, टिप्पणी, नक़ल और अधिक के लिए दो बार छूकर दबाए रखें | |
| verseActions | Verse {n}, actions | पद {n}, क्रियाएँ | |
| recent | Recent | हाल में पढ़े | |
| openFailed | The Bible text could not be opened. | बाइबल का पाठ नहीं खुल सका। | |
| openFailedDetail | This can happen when the phone is short of storage. Free about 100 MB and try again. | ऐसा तब हो सकता है जब फ़ोन में जगह कम हो। लगभग 100 MB खाली करके फिर आज़माएँ। | |
| loadFailed | This could not be loaded. | यह लोड नहीं हो सका। | |
| somethingWrong | Something went wrong. | कुछ गड़बड़ हुई। | |
| tryAgain | Try again | फिर आज़माएँ | |
| appearance | Appearance | रूप | |
| theme | Theme | थीम | |
| themeAuto | Auto | स्वतः | |
| themeLight | Light | उजला | |
| themeSepia | Sepia | सीपिया | |
| highlightStyle | Highlights | हाइलाइट | |
| highlightSoft | Soft | हल्के | |
| highlightFluorescent | Fluorescent | चमकीले | |
| highlightStyleDetail | Dark theme only | केवल गहरी थीम में | |
| themeDark | Dark | गहरा | |
| layout | Layout | विन्यास | |
| layoutVerses | Verse per line | हर पद अलग पंक्ति में | |
| layoutParagraphs | Paragraphs | अनुच्छेद | |
| serif | Serif typeface | सेरिफ़ अक्षर | |
| serifDetail | Scripture in a book-style face | पवित्रशास्त्र पुस्तक जैसी अक्षर शैली में | |
| keepAwake | Keep screen awake | स्क्रीन जगी रखें | |
| keepAwakeDetail | While the app is open | जब तक ऐप खुला है | |
| sideBySide | Side by side | आमने-सामने | |
| sideBySideDetail | {native} and English verses together on a tablet or a phone turned sideways | टैबलेट पर या फ़ोन को आड़ा करने पर {native} और अंग्रेज़ी पद साथ-साथ | |
| studyTools | Study tools | अध्ययन उपकरण | |
| studyToolsDetail | Tap a word for its Hebrew or Greek, the original words under each verse, cross references, parallel passages, Compare, and an introduction to each book. Off, the app is a plain Bible for reading; your highlights, notes and notebook stay. | किसी शब्द को छूकर उसका इब्रानी या यूनानी, हर पद के नीचे मूल शब्द, संदर्भ पद, समानांतर अंश, तुलना, और हर पुस्तक का परिचय। बंद होने पर ऐप पढ़ने के लिए एक सादी बाइबल है; आपके हाइलाइट, टिप्पणियाँ और नोटबुक बने रहते हैं। | |
| studyToolsOn | Switch the study tools on | अध्ययन उपकरण चालू करें | |
| studyToolsOff | Switch the study tools off | अध्ययन उपकरण बंद करें | |
| studyToolsOnNote | Study tools on | अध्ययन उपकरण चालू | |
| studyToolsOffNote | Study tools off: plain reading | अध्ययन उपकरण बंद: सादा पढ़ना | |
| language | Interface language | ऐप की भाषा | |
| translation | Translation | अनुवाद | |
| textSize | Text size | अक्षरों का आकार | |
| smallerText | Smaller text | छोटे अक्षर | |
| largerText | Larger text | बड़े अक्षर | |
| textSizeHint | You can also pinch the text while reading: spread two fingers to enlarge it, pinch to shrink it. | पढ़ते समय पाठ को दो उँगलियों से भी बदल सकते हैं: फैलाकर बड़ा, सिकोड़कर छोटा। | |
| interlinear | Hebrew and Greek words | इब्रानी और यूनानी शब्द | |
| showInterlinear | Show the Hebrew or Greek words | इब्रानी या यूनानी शब्द दिखाएँ | |
| showInterlinearDetail | Under each verse, word by word, with transliteration and meaning | हर पद के नीचे, शब्द-दर-शब्द, लिप्यंतरण और अर्थ के साथ | |
| everyVerse | Every verse | हर पद | |
| everyVerseDetail | The whole chapter is shown word by word | पूरा अध्याय शब्द-दर-शब्द दिखता है | |
| tappedVerses | Only verses I tap | केवल वे पद जिन्हें मैं छुऊँ | |
| tappedVersesDetail | Tap a verse number to show or hide its words. Keeps long chapters short. | पद की संख्या छूकर उसके शब्द दिखाएँ या छिपाएँ। लंबे अध्याय छोटे रहते हैं। | |
| transliteration | Transliteration | लिप्यंतरण | |
| transliterationDetail | Show how each word is pronounced | हर शब्द का उच्चारण दिखाएँ | |
| hideCantillation | Hide cantillation marks | स्वर-चिह्न (cantillation) छिपाएँ | |
| hideCantillationDetail | Hebrew with vowel points only, easier to read at small sizes | केवल मात्राओं के साथ इब्रानी; छोटे आकार में पढ़ना आसान | |
| reading | Reading | पढ़ना | |
| underline | Underline linked words | जुड़े शब्दों को रेखांकित करें | |
| underlineDetail | Marks words that open a Greek or Hebrew entry | उन शब्दों को चिह्नित करता है जो यूनानी या इब्रानी प्रविष्टि खोलते हैं | |
| aboutTexts | About the texts | पाठों के बारे में | |
| sourcesLicences | Sources and licences | स्रोत और लाइसेंस | |
| whyThisBible | Why this Bible | यह बाइबल क्यों | |
| howTo | How to use | कैसे उपयोग करें | |
| howToIntro | Tap a topic to open it. | किसी विषय को छूकर खोलें। | |
| howTopic1 | Reading a chapter | अध्याय पढ़ना | |
| howText1 | Turn the chapter with the arrows at the foot of the page, or swipe. Tap the book name at the top to choose any book and chapter: Old or New Testament, the books under their groups, then the chapter. The Books tab lists them too, with the chapters you read last. Spread two fingers to make the text larger, or set the size in Settings. | पृष्ठ के नीचे के तीरों से, या उँगली फिराकर, अध्याय बदलें। ऊपर पुस्तक का नाम छूकर कोई भी पुस्तक और अध्याय चुनें: पुराना या नया नियम, अपने समूहों में पुस्तकें, फिर अध्याय। पुस्तकें टैब में भी वे सूचीबद्ध हैं, उन अध्यायों के साथ जो आपने पिछली बार पढ़े। दो उँगलियाँ फैलाकर पाठ बड़ा करें, या सेटिंग्स में आकार चुनें। | |
| howTopic2 | Switching Bibles | बाइबल बदलना | |
| howText2 | The button at the foot of the page switches to the other Bible. On a tablet, or a phone turned on its side, both Bibles can be read together (Settings → Side by side). | पृष्ठ के नीचे का बटन दूसरी बाइबल पर ले जाता है। टैबलेट पर, या फ़ोन को आड़ा करने पर, दोनों बाइबलें साथ-साथ पढ़ी जा सकती हैं (सेटिंग्स → आमने-सामने)। | |
| howTopic3 | A verse's menu | पद का मेनू | |
| howText3 | Hold a verse to open its menu: copy, share, bookmark, a highlight colour, a note, a picture card, add to the notebook, read aloud from here, mark part of the verse, compare the Bibles, cross references and parallel passages. | किसी पद को दबाकर रखें और उसका मेनू खुलता है: नक़ल, साझा, बुकमार्क, हाइलाइट का रंग, टिप्पणी, चित्र कार्ड, नोटबुक में जोड़ना, यहाँ से सुनना, पद का कुछ भाग चिह्नित करना, बाइबलों की तुलना, संदर्भ पद और समानांतर अंश। | |
| howTopic4 | Words and their Hebrew or Greek | शब्द और उनका इब्रानी या यूनानी | |
| howText4 | Tap an underlined word to see the Hebrew or Greek word behind it, with its meaning, pronunciation and every verse it is used in. The Hebrew or Greek button at the foot of the page shows the whole verse in the original language, word by word. | रेखांकित शब्द छूकर उसके पीछे का इब्रानी या यूनानी शब्द देखें: अर्थ, उच्चारण और हर वह पद जिसमें वह आया है। पृष्ठ के नीचे का इब्रानी या यूनानी बटन पूरे पद को मूल भाषा में, शब्द-दर-शब्द, दिखाता है। | |
| howTopic5 | Highlighting part of a verse | पद का कुछ भाग हाइलाइट करना | |
| howText5 | Hold a verse and choose Mark text. Hold a word still, drag to the last word and let go. The bar at the foot picks the colour and has an eraser; tap Done when finished. Everything marked is listed under Saved. | किसी पद को दबाकर रखें और “पाठ चिह्नित करें” चुनें। एक शब्द को स्थिर दबाए रखें, अंतिम शब्द तक खींचें और छोड़ दें। नीचे की पट्टी रंग चुनती है और उसमें रबड़ है; पूरा होने पर “हो गया” छुएँ। चिह्नित सब कुछ “सहेजे हुए” में सूचीबद्ध है। | |
| howTopic6 | Saved | सहेजे हुए | |
| howText6 | The Saved tab lists your bookmarks, highlights, marked text and notes. Tap one to open its verse. | “सहेजे हुए” टैब में आपके बुकमार्क, हाइलाइट, चिह्नित पाठ और टिप्पणियाँ हैं। किसी एक को छूकर उसका पद खोलें। | |
| howTopic7 | Search | खोज | |
| howText7 | Type a word, or a reference such as John 3:16 or Psalm 23, in the search box. Results start in the New Testament; the buttons narrow them to a Testament or a book. | खोज के डिब्बे में कोई शब्द, या यूहन्ना 3:16 या भजन 23 जैसा संदर्भ लिखें। परिणाम नए नियम से शुरू होते हैं; बटन उन्हें एक नियम या एक पुस्तक तक सीमित करते हैं। | |
| howTopic8 | Notebook | नोटबुक | |
| howText8 | The Notebook tab holds typed pages for sermon notes or a study. A reference typed on a page, such as John 3:16, becomes a link with the verse shown beneath. Hold a verse and choose Add to notebook to put it on a page. A page can be shared as text or as a PDF. | नोटबुक टैब में उपदेश की टिप्पणियों या अध्ययन के लिए लिखे हुए पृष्ठ रहते हैं। पृष्ठ पर लिखा संदर्भ, जैसे यूहन्ना 3:16, एक कड़ी बन जाता है और पद नीचे दिखता है। किसी पद को दबाकर रखें और “नोटबुक में जोड़ें” चुनकर उसे पृष्ठ पर रखें। पृष्ठ पाठ या PDF के रूप में साझा किया जा सकता है। | |
| howTopic9 | Handwritten pages | हाथ से लिखे पृष्ठ | |
| howText9 | New page → Handwritten gives a page to write on with a pen or a finger, on plain or lined paper: three pens, a highlighter, an eraser, undo and redo. Two fingers move the page. With a stylus, the pen-only switch lets your hand rest on the screen. The page is shared as a picture or a PDF. | नया पृष्ठ → हाथ से लिखा: सादे या रेखांकित काग़ज़ पर क़लम या उँगली से लिखने का पृष्ठ देता है: तीन क़लम, एक हाइलाइटर, रबड़, पूर्ववत और पुनः। दो उँगलियाँ पृष्ठ को हिलाती हैं। स्टाइलस के साथ, “केवल क़लम” का बटन आपके हाथ को स्क्रीन पर टिकने देता है। पृष्ठ चित्र या PDF के रूप में साझा होता है। | |
| howTopic10 | Backing up the notebook | नोटबुक का बैकअप | |
| howText10 | In the Notebook, tap the backup button to save every page to one file, and keep it in Drive, Files or a chat. Restore from a backup adds the file's pages back; a page already here is replaced only by a newer copy of itself, and nothing is deleted. | नोटबुक में बैकअप बटन छूकर हर पृष्ठ को एक फ़ाइल में सहेजें, और उसे Drive, Files या किसी चैट में रखें। “बैकअप से वापस लाएँ” फ़ाइल के पृष्ठ फिर जोड़ता है; यहाँ पहले से मौजूद पृष्ठ केवल अपनी नई प्रति से बदलता है, और कुछ भी मिटता नहीं। | |
| howTopic11 | Listening | सुनना | |
| howText11 | Tap the speaker in the top bar to hear the chapter read in your phone's voice, verse by verse; the verse being read is marked, and reading goes on to the next chapter. The player sets the speed and moves between verses. | ऊपर की पट्टी में स्पीकर छूकर अध्याय को अपने फ़ोन की आवाज़ में, पद-दर-पद, सुनें; पढ़ा जा रहा पद चिह्नित रहता है, और पढ़ना अगले अध्याय में चलता रहता है। प्लेयर गति तय करता है और पदों के बीच आगे-पीछे जाता है। | |
| howTopic12 | Study tools and book introductions | अध्ययन उपकरण और पुस्तक परिचय | |
| howText12 | Settings → Study tools switches the study side of the app off, for plain reading, and on again; the cap at the top of the reader switches it off and on too. With it on, About this book at the top of a book's first chapter (and above its chapter numbers) tells who wrote the book, when and for whom, its themes and outline, and key verses. | सेटिंग्स → अध्ययन उपकरण ऐप के अध्ययन वाले हिस्से को सादे पढ़ने के लिए बंद करता है, और फिर चालू; ऊपर की टोपी भी इसे बंद और चालू करती है। चालू होने पर, पुस्तक के पहले अध्याय के ऊपर (और उसके अध्यायों की संख्याओं के ऊपर) “इस पुस्तक के बारे में” बताता है कि पुस्तक किसने लिखी, कब और किसके लिए, उसके विषय और रूपरेखा, और मुख्य पद। | |
| howTopic13 | Picture cards | चित्र कार्ड | |
| howText13 | Hold a verse and choose Share as card to put it on a picture, for a birthday, a wedding or any day, with a message of your own and your own photo if you like. A design you make can be saved for next time. | किसी पद को दबाकर रखें और “कार्ड के रूप में साझा करें” चुनें: जन्मदिन, विवाह या किसी भी दिन के लिए, उसे एक चित्र पर रखें, अपने संदेश के साथ और चाहें तो अपनी फ़ोटो के साथ। आपका बनाया डिज़ाइन अगली बार के लिए सहेजा जा सकता है। | |
| feedback | Write to us | हमें लिखें | |
| feedbackDetail | A problem, a wish, a word of thanks: anything. Opens your mail app. | कोई समस्या, कोई इच्छा, धन्यवाद के दो शब्द: कुछ भी। आपका मेल ऐप खुलता है। | |
| feedbackCard | You have been reading with this app for a while. What could be better? A line from you helps us more than you might think. | आप कुछ समय से इस ऐप में पढ़ रहे हैं। क्या बेहतर हो सकता है? आपकी एक पंक्ति हमारी जितनी मदद करती है, उतनी आप शायद सोच भी न सकें। | |
| feedbackNotNow | Not now | अभी नहीं | |
| feedbackNever | No thanks | नहीं, धन्यवाद | |
| feedbackSubject | Feedback: {app} {version} | प्रतिक्रिया: {app} {version} | |
| feedbackSentFrom | Sent from {app} {version} ({build}) on {device}. You may delete this line. | {app} {version} ({build}) से, {device} पर, भेजा गया। आप यह पंक्ति मिटा सकते हैं। | |
| feedbackNoMail | No mail app found | कोई मेल ऐप नहीं मिला | |
| feedbackNoMailText | You can write to us at {address}. | आप हमें {address} पर लिख सकते हैं। | |
| feedbackCopyAddress | Copy address | पता नक़ल करें | |
| privacy | Privacy | निजता | |
| aboutEnglish | Bibles: the King James Version (1769), the Berean Standard Bible and the World English Bible. The translators' footnotes appear as small letters in the text; tap one to read it. | बाइबलें: King James Version (1769), Berean Standard Bible और World English Bible। अनुवादकों की पादटिप्पणियाँ पाठ में छोटे अक्षरों के रूप में दिखती हैं; एक को छूकर पढ़ें। | |
| aboutMalayalam | Bibles: the Sathyavedapusthakam 1910 (Malayalam), in a revised edition in contemporary orthography, and the King James Version (1769). The links from Malayalam words to the Hebrew and Greek are machine-generated and not fully reviewed. | बाइबलें: सत्यवेदपुस्तकम 1910 (मलयालम), आज की वर्तनी में संशोधित संस्करण, और King James Version (1769)। मलयालम शब्दों से इब्रानी और यूनानी तक की कड़ियाँ मशीन से बनी हैं और पूरी तरह जाँची नहीं गईं। | |
| aboutTamil | Bibles: the Indian Revised Version (Tamil) and the King James Version (1769). The links from Tamil words to the Hebrew and Greek are machine-generated and not reviewed. | बाइबलें: Indian Revised Version (तमिल) और King James Version (1769)। तमिल शब्दों से इब्रानी और यूनानी तक की कड़ियाँ मशीन से बनी हैं और जाँची नहीं गईं। | |
| aboutAll | Bibles: the King James Version (1769), the Berean Standard Bible, the World English Bible, the Sathyavedapusthakam 1910 (Malayalam) in contemporary orthography, and the Indian Revised Version in Tamil and in Hindi. The links from Malayalam and Tamil words to the Hebrew and Greek are machine-generated and not fully reviewed; the Hindi words are not linked yet. The translators' footnotes appear as small letters in the text; tap one to read it. | बाइबलें: King James Version (1769), Berean Standard Bible, World English Bible, सत्यवेदपुस्तकम 1910 (मलयालम) आज की वर्तनी में, और तमिल तथा हिन्दी में Indian Revised Version। मलयालम और तमिल शब्दों से इब्रानी और यूनानी तक की कड़ियाँ मशीन से बनी हैं और पूरी तरह जाँची नहीं गईं; हिन्दी शब्द अभी जुड़े नहीं हैं। अनुवादकों की पादटिप्पणियाँ पाठ में छोटे अक्षरों के रूप में दिखती हैं; एक को छूकर पढ़ें। | |
| sideBySideDetailAll | Your Indian Bible beside the English, verse by verse, on a tablet or a phone turned sideways | टैबलेट पर या फ़ोन को आड़ा करने पर आपकी भारतीय बाइबल और अंग्रेज़ी, पद-दर-पद, साथ-साथ | |
| chooseBible | Choose a Bible | बाइबल चुनें | |
| hindiNote | Hindi words are not yet linked to the Hebrew and Greek, so tapping a word does nothing here. Cross references, parallel passages and the introductions still work, and the English Bibles have the word links. | हिन्दी शब्द अभी इब्रानी और यूनानी से जुड़े नहीं हैं, इसलिए यहाँ शब्द छूने से कुछ नहीं होता। संदर्भ पद, समानांतर अंश और पुस्तक परिचय काम करते हैं, और अंग्रेज़ी बाइबलों में शब्दों की कड़ियाँ हैं। | |
| moreEntries | More ({n}) | और ({n}) | |
| fewerEntries | Fewer | कम | |
| englishBibles | English | अंग्रेज़ी | |
| indianBibles | Indian languages | भारतीय भाषाएँ | |
| aboutStrongs | Dictionaries: Strong's Hebrew and Greek Dictionaries (1890), Abbott-Smith's Greek lexicon (1922) and the Brown–Driver–Briggs Hebrew lexicon (1906). | शब्दकोश: Strong के इब्रानी और यूनानी शब्दकोश (1890), Abbott-Smith का यूनानी शब्दकोश (1922) और Brown–Driver–Briggs इब्रानी शब्दकोश (1906)। | |
| aboutInterlinear | The Hebrew (Leningrad Codex) and Greek words, with transliteration, glosses and grammar are from the Translators Amalgamated Hebrew OT and Greek NT of STEPBible.org (Tyndale House, Cambridge). The Greek is spelled as in the Nestle-Aland 28th edition and has every word of the Textus Receptus and the Byzantine text; where those texts have a different word from Nestle-Aland, their word is shown. Words not in the Nestle-Aland editions have a line beneath; tap one to see which texts have it. | इब्रानी (Leningrad Codex) और यूनानी शब्द, लिप्यंतरण, अर्थ और व्याकरण सहित, STEPBible.org (Tyndale House, Cambridge) के Translators Amalgamated Hebrew OT और Greek NT से हैं। यूनानी की वर्तनी Nestle-Aland 28वें संस्करण की है और इसमें Textus Receptus और Byzantine पाठ का हर शब्द है; जहाँ उन पाठों में Nestle-Aland से भिन्न शब्द है, वहाँ उनका शब्द दिखाया गया है। जो शब्द Nestle-Aland संस्करणों में नहीं हैं, उनके नीचे रेखा है; एक को छूकर देखें कि किन पाठों में वह है। | |
| aboutWeb | The World English Bible is shown as plain text: the Strong's numbers in its source file are attached to the wrong words too often to use. Word lookups and verse lists use the King James Version; to tap the original words while reading the WEB, switch on Hebrew words or Greek words. | World English Bible सादे पाठ के रूप में दिखाई जाती है: उसकी स्रोत फ़ाइल में Strong संख्याएँ इतनी बार ग़लत शब्दों से जुड़ी हैं कि उपयोग नहीं की जा सकतीं। शब्द खोज और पद सूचियाँ King James Version का उपयोग करती हैं; WEB पढ़ते समय मूल शब्द छूने के लिए इब्रानी या यूनानी शब्द चालू करें। | |
| databaseBuilt | Database built {date} | डेटाबेस {date} को बना | |
| appVersion | Version {version} | संस्करण {version} | |
| previewText | In the beginning | आदि में | |
| title | (title) | (शीर्षक) | |
| notebook | Notebook | नोटबुक | |
| newPage | New page | नया पृष्ठ | |
| untitled | Untitled | बिना शीर्षक | |
| pageTitle | Title | शीर्षक | |
| pageBody | Write here. A reference such as John 3:16 or Ps 23:1-3 links to the verse and shows its text. | यहाँ लिखें। यूहन्ना 3:16 या भज 23:1-3 जैसा संदर्भ पद से जुड़ जाता है और उसका पाठ दिखाता है। | |
| editPage | Edit page | पृष्ठ बदलें | |
| donePage | Done | हो गया | |
| deletePage | Delete page | पृष्ठ मिटाएँ | |
| deletePageConfirm | Delete this page? It cannot be brought back. | यह पृष्ठ मिटाएँ? इसे वापस नहीं लाया जा सकता। | |
| cancel | Cancel | रद्द करें | |
| sharePage | Share page | पृष्ठ साझा करें | |
| backupRestore | Back up or restore | बैकअप लें या वापस लाएँ | |
| saveBackup | Save a backup | बैकअप सहेजें | |
| saveBackupDetail | Every page, typed and handwritten, in one file to keep in Drive or Files, or to bring to another phone | हर पृष्ठ, लिखा और हाथ से लिखा, एक फ़ाइल में: Drive या Files में रखने, या दूसरे फ़ोन पर ले जाने के लिए | |
| restoreBackup | Restore from a backup | बैकअप से वापस लाएँ | |
| restoreBackupDetail | Pages in the file are added; a page here is replaced only by a newer copy of itself. Nothing is deleted. | फ़ाइल के पृष्ठ जोड़े जाते हैं; यहाँ का पृष्ठ केवल अपनी नई प्रति से बदलता है। कुछ भी मिटता नहीं। | |
| backupEmpty | The notebook has no pages yet. | नोटबुक में अभी कोई पृष्ठ नहीं है। | |
| backupFailed | The backup could not be made. | बैकअप नहीं बन सका। | |
| restoreNotBackup | This file is not a notebook backup. | यह फ़ाइल नोटबुक का बैकअप नहीं है। | |
| restoreTooLarge | This file is too large to be a notebook backup. | यह फ़ाइल नोटबुक का बैकअप होने के लिए बहुत बड़ी है। | |
| restoreDone | Restored: {added} new, {updated} updated, {kept} already here. | वापस लाया: {added} नए, {updated} अद्यतन, {kept} पहले से यहाँ। | |
| shareAsText | Share as text | पाठ के रूप में साझा करें | |
| shareAsPdf | Share as PDF | PDF के रूप में साझा करें | |
| shareAsPicture | Share as picture | चित्र के रूप में साझा करें | |
| pdfFailed | The PDF could not be made. | PDF नहीं बन सकी। | |
| inkPageFull | This page is full. Start a new page to go on writing. | यह पृष्ठ भर गया है। लिखना जारी रखने के लिए नया पृष्ठ शुरू करें। | |
| restoreFailed | The backup could not be restored. Nothing was changed. | बैकअप वापस नहीं लाया जा सका। कुछ भी बदला नहीं गया। | |
| backupInkUnreadable | The writing on “{page}” cannot be read, so no backup was made. Open the page to check it, then try again. | “{page}” की लिखावट पढ़ी नहीं जा सकी, इसलिए बैकअप नहीं बना। पृष्ठ खोलकर जाँचें, फिर आज़माएँ। | |
| restoreOtherEdition | This backup was made in the {app} app. Its verses are quoted from that Bible. Restore it here? | यह बैकअप {app} ऐप में बना था। इसके पद उस बाइबल से उद्धृत हैं। इसे यहाँ वापस लाएँ? | |
| pageTyped | Typed page | लिखा हुआ पृष्ठ | |
| pageTypedDetail | References such as John 3:16 link to the verse | यूहन्ना 3:16 जैसे संदर्भ पद से जुड़ जाते हैं | |
| pageHandPlain | Handwritten, plain paper | हाथ से लिखा, सादा काग़ज़ | |
| pageHandLined | Handwritten, lined paper | हाथ से लिखा, रेखांकित काग़ज़ | |
| pageHandDetail | Write with a pen or your finger | क़लम या उँगली से लिखें | |
| handwritten | Handwritten | हाथ से लिखा | |
| penBlack | Black pen | काला क़लम | |
| penBlue | Blue pen | नीला क़लम | |
| penRed | Red pen | लाल क़लम | |
| highlighterYellow | Yellow highlighter | पीला हाइलाइटर | |
| penThin | Thin pen | पतला क़लम | |
| penThick | Thick pen | मोटा क़लम | |
| undo | Undo | पूर्ववत | |
| redo | Redo | पुनः | |
| linedPaper | Lined paper | रेखांकित काग़ज़ | |
| plainPaper | Plain paper | सादा काग़ज़ | |
| inkHint | Write with one finger or a pen. Move the page with two fingers. | एक उँगली या क़लम से लिखें। दो उँगलियों से पृष्ठ हिलाएँ। | |
| inkPenFound | Pen found: now a finger moves the page and only the pen writes. | क़लम मिला: अब उँगली पृष्ठ हिलाती है और केवल क़लम लिखता है। | |
| inkPenOnly | Only the pen writes | केवल क़लम लिखे | |
| inkPenOnlyOn | Only the pen writes now; a finger moves the page. | अब केवल क़लम लिखता है; उँगली पृष्ठ हिलाती है। | |
| inkPenOnlyOff | A finger writes again; two fingers move the page. | उँगली फिर लिखती है; दो उँगलियाँ पृष्ठ हिलाती हैं। | |
| inkMovePen | One finger moves the page. | एक उँगली पृष्ठ हिलाती है। | |
| inkMoveFingers | Two fingers move the page. | दो उँगलियाँ पृष्ठ हिलाती हैं। | |
| colourYellow | yellow | पीला | |
| colourGreen | green | हरा | |
| colourBlue | blue | नीला | |
| colourPink | pink | गुलाबी | |
| inkShareFailed | The page could not be shared. | पृष्ठ साझा नहीं हो सका। | |
| notebookEmptyTitle | No pages yet | अभी कोई पृष्ठ नहीं | |
| notebookEmpty | Write sermon notes, a study or a list of verses. Tap + to start a page, or hold a verse in the reader and choose Add to notebook. | उपदेश की टिप्पणियाँ, अध्ययन या पदों की सूची लिखें। + छूकर पृष्ठ शुरू करें, या पढ़ते समय किसी पद को दबाकर रखें और “नोटबुक में जोड़ें” चुनें। | |
| addToNotebook | Add to notebook | नोटबुक में जोड़ें | |
| addToNotebookDetail | Put this verse on a page of your notebook | इस पद को अपनी नोटबुक के किसी पृष्ठ पर रखें | |
| choosePage | Add to which page? | किस पृष्ठ में जोड़ें? | |
| addedToPage | Added to {title} | {title} में जोड़ा | |
| moreVerses | {n} more verses | {n} पद और | |
| pageEdited | Edited {date} | {date} को बदला | |
| tabRead | Read | पढ़ें | |
| saveFailedTitle | Not saved | सहेजा नहीं गया | |
| saveFailed | Your latest changes could not be saved. The phone may be out of storage space. The app will keep trying while it is open. | आपके नवीनतम बदलाव सहेजे नहीं जा सके। फ़ोन में शायद जगह नहीं बची। ऐप खुला रहने तक कोशिश करता रहेगा। | |
| readFailedTitle | Saved data could not be read | सहेजा डेटा पढ़ा नहीं जा सका | |
| readFailed | Your bookmarks, notes or notebook could not be read this time. They are left untouched; changes made now will not be saved. Close the app fully and open it again. | आपके बुकमार्क, टिप्पणियाँ या नोटबुक इस बार पढ़े नहीं जा सके। वे जैसे थे वैसे हैं; अभी किए बदलाव सहेजे नहीं जाएँगे। ऐप को पूरी तरह बंद करके फिर खोलें। | |
| restoredBackupTitle | Restored from a backup | बैकअप से वापस लाया | |
| restoredBackup | Some saved data was damaged, so an earlier copy was used. Recent changes may be missing. | कुछ सहेजा डेटा खराब हो गया था, इसलिए पुरानी प्रति उपयोग की गई। हाल के बदलाव ग़ायब हो सकते हैं। | |

## 6. Why this Bible page

Settings → यह बाइबल क्यों opens this page (src/screens/WhyScreen.tsx). The quoted verses are
the IRV Hindi text itself; the references open the verse. Please check the tone: it speaks
of the Lord Jesus and the Holy Spirit with the respectful plural (उन्होंने, उनके, वे).

## 7. How to use and Privacy

The How to use page (the `howTopic…` and `howText…` rows above) and the Privacy page
(`privacyText`) are long; read them as a whole for flow, not only line by line.
