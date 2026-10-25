#!/usr/bin/env bash
# Downloads the public domain source texts used to build assets/db/bible.db.
# Everything lands in data/raw/, which is not committed.
set -euo pipefail

RAW="$(cd "$(dirname "$0")/.." && pwd)/data/raw"
mkdir -p "$RAW"
cd "$RAW"

fetch() {
  local out="$1" url="$2"
  if [ -s "$out" ]; then
    echo "have $out"
  else
    echo "get  $out"
    curl -sS -L --fail --retry 3 -o "$out" "$url"
  fi
}

# King James Version (1769 text) with Strong's numbers, USFM, eBible.org
fetch kjv.zip https://ebible.org/Scriptures/eng-kjv2006_usfm.zip
# World English Bible with Strong's numbers, USFM, eBible.org
fetch web.zip https://ebible.org/Scriptures/engwebp_usfm.zip
# Malayalam Sathyavedapusthakam 1910, contemporary orthography, Free Bible Foundation 2015 (CC BY-SA 4.0)
fetch mal2015.zip https://ebible.org/Scriptures/mal2015_usfm.zip
# Tamil Indian Revised Version 2017/2019, Bridge Connectivity Solutions (CC BY-SA 4.0)
fetch tam2017.zip https://ebible.org/Scriptures/tam2017_usfm.zip
# Strong's dictionaries as JSON, Open Scriptures (CC BY-SA)
fetch strongs-hebrew.js https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js
fetch strongs-greek.js  https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js

# Berean Standard Bible (CC0), CrossWire's SWORD module: its Strong's tags sit on the right
# words (eBible's engbsb are shifted). Turned into USFM by scripts/bsb-from-sword.mjs below.
fetch bsb-sword.zip https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/BSB.zip
# Abbott-Smith, A Manual Greek Lexicon of the New Testament (1922), TEI, public domain
fetch abbott-smith.tei.xml https://raw.githubusercontent.com/translatable-exegetical-tools/Abbott-Smith/master/abbott-smith.tei.xml
# BDB Glosses keyed to Strong's (CrossWire, from Open Scriptures' Hebrew Lexicon), public domain
fetch bdbglosses.zip https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/BDBGlosses_Strongs.zip

# Cross references from OpenBible.info (CC BY), drawn from the Treasury of Scripture Knowledge
# and ranked by readers' votes; KJV verse numbering.
fetch cross-references.zip https://a.openbible.info/data/cross-references.zip

# Parallel passages from the United Bible Societies' Parallel Passages Database
# (© 2023 United Bible Societies, CC BY-SA 4.0); Hebrew and Greek verse numbering.
mkdir -p ubs
fetch ubs/ParallelPassages.xml "https://raw.githubusercontent.com/ubsicap/ubs-open-license/main/parallel%20passages/ParallelPassages.xml"

# STEPBible Translators Amalgamated Hebrew OT and Greek NT (CC BY 4.0), Tyndale House Cambridge.
# Their licence permits bundling in software but asks that the files themselves are not redistributed.
mkdir -p step
STEP="https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT"
for name in \
  "TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt" \
  "TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt" \
  "TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt" \
  "TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt" \
  "TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt" \
  "TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt"; do
  encoded=$(printf '%s' "$name" | sed 's/ /%20/g; s/+/%2B/g')
  fetch "step/$name" "$STEP/$encoded"
done

rm -rf kjv web mal2015 tam2017 bsb-sword bsb bdbglosses openbible
mkdir -p kjv web mal2015 tam2017 bsb-sword bdbglosses openbible
unzip -oq cross-references.zip -d openbible
unzip -oq kjv.zip -d kjv
unzip -oq web.zip -d web
unzip -oq mal2015.zip -d mal2015
unzip -oq tam2017.zip -d tam2017
unzip -oq bsb-sword.zip -d bsb-sword
unzip -oq bdbglosses.zip -d bdbglosses
node "$RAW/../../scripts/bsb-from-sword.mjs" "$RAW/bsb-sword" "$RAW/bsb"
echo "done: $(ls kjv/*.usfm | wc -l) KJV files, $(ls web/*.usfm | wc -l) WEB files, $(ls mal2015/*.usfm | wc -l) Malayalam files, $(ls tam2017/*.usfm | wc -l) Tamil files"
