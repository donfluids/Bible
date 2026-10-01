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
# Strong's dictionaries as JSON, Open Scriptures (CC BY-SA)
fetch strongs-hebrew.js https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js
fetch strongs-greek.js  https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js

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

rm -rf kjv web mal2015
mkdir -p kjv web mal2015
unzip -oq kjv.zip -d kjv
unzip -oq web.zip -d web
unzip -oq mal2015.zip -d mal2015
echo "done: $(ls kjv/*.usfm | wc -l) KJV files, $(ls web/*.usfm | wc -l) WEB files, $(ls mal2015/*.usfm | wc -l) Malayalam files"
