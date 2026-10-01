#!/usr/bin/env bash
# Draws an edition's app icon, Android adaptive icon layers, splash images and favicon
# with ImageMagick: an open book, Hebrew aleph on the left page, Greek alpha on the right.
#   bash scripts/make-icons.sh en     parchment and brown (English edition)
#   bash scripts/make-icons.sh ml     cream and forest green (Malayalam edition)
set -euo pipefail
cd "$(dirname "$0")/.."
EDITION="${1:-en}"
case "$EDITION" in
  en) BG='#F4EFE4'; INK='#5A3A14'; DARKBG='#15130F' ;;
  ml) BG='#EEF3E6'; INK='#1F4D2E'; DARKBG='#0F1A12' ;;
  *) echo "unknown edition $EDITION" >&2; exit 1 ;;
esac
OUT="assets/icons/$EDITION"
mkdir -p "$OUT"
FONT="${ICON_FONT:-/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf}"

# $1 = size, $2 = scale of the artwork, $3 = page colour, $4 = letter colour,
# $5 = background ('none' for transparent), $6 = output file
draw() {
  local size=$1 scale=$2 page=$3 letter=$4 bg=$5 out=$6
  local s=$(python3 -c "print($size/1024*$scale)")
  local c=$((size / 2))
  convert -size ${size}x${size} xc:"$bg" \
    -fill "$page" -stroke none \
    -draw "translate $c,$c scale $s,$s path 'M 0,-190 C -90,-230 -230,-240 -400,-200 L -400,230 C -230,190 -90,200 0,250 Z'" \
    -draw "translate $c,$c scale $s,$s path 'M 0,-190 C 90,-230 230,-240 400,-200 L 400,230 C 230,190 90,200 0,250 Z'" \
    -fill "$bg" -draw "translate $c,$c scale $s,$s rectangle -6,-200 6,250" \
    -fill "$letter" -font "$FONT" -pointsize $(python3 -c "print(int(300*$s))") -gravity center \
    -annotate $(python3 -c "print('%+d%+d' % (-205*$s, 30*$s))") 'א' \
    -annotate $(python3 -c "print('%+d%+d' % (200*$s, 20*$s))") 'α' \
    "$out"
}

draw 1024 0.80 "$INK" "$BG" "$BG" "$OUT/icon.png"
draw 1024 0.56 "$INK" "$BG" none "$OUT/android-icon-foreground.png"
convert -size 1024x1024 xc:"$BG" "$OUT/android-icon-background.png"
draw 1024 0.56 white none none "$OUT/android-icon-monochrome.png"
draw 1024 0.90 "$INK" "$BG" none "$OUT/splash-icon.png"
draw 1024 0.90 "$BG" "$INK" none "$OUT/splash-icon-dark.png"
convert "$OUT/icon.png" -resize 48x48 "$OUT/favicon.png"
echo "icons for edition $EDITION written to $OUT"
