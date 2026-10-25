# Book introductions: points for the Malayalam and Tamil reviewers

The introductions in `data/intros` (see `data/intros/GUIDE.md`) were written in English and
translated into Malayalam and Tamil. They have not yet been read by a native speaker. Please
read them in the app (reader → the (i) button) and check especially the choices below, which
the translators were unsure of. A change is made in `data/intros/<lang>/<book>.json`, checked
with `node --no-warnings scripts/check-intros.mjs`, and put in the databases with
`node --no-warnings scripts/add-study-data.mjs`.

## Both languages

- Names follow the app's Bible (Sathyavedapusthakam 1910, the IRV Tamil). Where that Bible
  spells a name two ways, the translators took the spelling of the book being introduced.
- Pronouns for God and Jesus: Malayalam uses the respectful അവിടുന്ന് / അവിടുത്തെ, as the
  "Why this Bible" page does; Tamil uses அவர். Apostles and godly people get the respectful
  forms in Tamil (the IRV itself uses அவன் for them).
- New words for the interface: Cross references is now ഒത്തുവാക്യങ്ങൾ / தொடர்புடைய வசனங்கள்
  (it was സമാന്തര വാക്യങ്ങൾ / இணை வசனங்கள், "parallel verses"), so that Parallel passages
  can be സമാന്തര ഭാഗങ്ങൾ / இணைப் பகுதிகள். About this book: ഈ പുസ്തകത്തെക്കുറിച്ച് /
  இந்தப் புத்தகத்தைப் பற்றி; Written by, When, Written for, Main themes, Outline, Key
  verses: എഴുത്തുകാരൻ, കാലം, ആർക്കുവേണ്ടി, മുഖ്യ വിഷയങ്ങൾ, രൂപരേഖ, പ്രധാന വാക്യങ്ങൾ /
  எழுதியவர், காலம், யாருக்காக, முக்கிய கருப்பொருள்கள், உள்ளடக்கம், முக்கிய வசனங்கள்.

## Malayalam

- The LORD is യഹോവ in the Old Testament books, as in the 1910 text.
- Names ending in -വു in the 1910 text are written in today's spelling when they stand alone
  (ഏലീയാവ്, ഹിസ്കീയാവ്, യോശീയാവ്); Micah keeps യെഹിസ്കീയാവ് as Micah 1:1 has it.
- Acts is named in full, അപ്പൊസ്തലന്മാരുടെ പ്രവൃത്തികൾ (the table of book names has only the
  short form); in the text, അപ്പൊസ്തലപ്രവൃത്തികൾ.
- Spellings chosen where the 1910 text varies: എഫെസൊസ്, തിഹിക്കൊസ്, തീത്തൊസ്, തിമൊഥെയൊസ്,
  ഹനോക്ക് (Jude), രാഹാബ് (James), മൊർദ്ദെഖായി, നെബൂഖദ്നേസർ, ഗോമെർ (from Genesis 10:2).
- Words not in the 1910 text, the translators' own: ഗിരിപ്രഭാഷണം (Sermon on the Mount),
  അന്ത്യ അത്താഴം (Last Supper), മാളികമുറി (upper room), പൊൻകാളക്കുട്ടി (golden calf, the
  Bible has only the plural), ഇടയലേഖനങ്ങൾ (Pastoral Letters), ആസ്യാമൈനർ, യൂറോപ്പ്.
- Kept from the 1910 text: കാര്യസ്ഥൻ (the Comforter, John 14:16), മാന്യനായകി (the elect lady),
  കർത്തൃദിവസം (the Lord's day), അധർമ്മമൂർത്തി (the man of sin), എതിർക്രിസ്തു, പാതാളം.
- പത്ഥ്യോപദേശം (sound teaching) is the traditional word but literary; സത്യോപദേശം is plainer.
- "New covenant" is പുതിയ ഉടമ്പടി, not the 1910 പുതിയോരു നിയമം, so that it is not read as
  പുതിയനിയമം (the New Testament).
- 1 Kings 18:21 (wavering between two opinions) is put as രണ്ടു തോണിയിൽ കാൽവെക്കുക.

## Tamil

- The LORD is கர்த்தர் throughout, the word most church members use; the IRV text itself
  has யெகோவா almost everywhere. Ezekiel 48:35 keeps யேகோவா ஷம்மா. If the introductions
  should match the IRV, this is a search and replace across the files.
- God is தேவன், as in the IRV.
- Silvanus: சில்வான் (2 Thessalonians) and சில்வானு (1 Peter), each as that book has it, with
  (சீலா). John Mark: மாற்கு என்னும் யோவான் (Acts 12:12). John the Baptist: யோவான்ஸ்நானன்.
- Gentiles: யூதரல்லாதவர்கள் / யூதரல்லாத மக்கள், as the IRV mostly has it.
- The Lord's day (Revelation 1:10): கர்த்தரை ஆராதிக்கும் நாள், the IRV's wording; the day of
  the Lord: கர்த்தருடைய நாள்.
- The IRV's words kept where older Tamil Bibles differ: வெள்ளப்பெருக்கு (the flood), கப்பல்
  (Noah's ark), உணவுபலி, பாவநிவாரணபலி, குற்றநிவாரணபலி, பாவநிவிர்த்தி நாள், யூபிலி வருடம்,
  இராட்சசப் பாம்பு (the dragon, Revelation 12), மனிதகுமாரன்.
- The translators' own words: மீட்கும் உறவினர் (kinsman-redeemer), மேல்வீட்டறை (upper room),
  'மேய்ப்பர் கடிதங்கள்' (Pastoral Letters), இரத்தசாட்சி (martyr), மிஷனரிப் பயணங்கள், ஆசியா
  மைனர், துருக்கி, ஐரோப்பா; எல்கோஷ் (Elkosh, the IRV has only எல்கோசானாகிய).
- Numbers use the Indian grouping (1,85,000).
