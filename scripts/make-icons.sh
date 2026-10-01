#!/usr/bin/env bash
# Draws the app icon, Android adaptive icon layers, splash image and favicon with
# ImageMagick: an open book, Hebrew aleph on the left page, Greek alpha on the right,
# in the app's parchment and brown palette.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=assets
PARCHMENT='#F4EFE4'
BROWN='#5A3A14'
FONT="${ICON_FONT:-/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf}"

# $1 = size, $2 = scale of the artwork (1 = fills the canvas width), $3 = page colour,
# $4 = letter colour, $5 = background ('none' for transparent), $6 = output file
draw() {
  local size=$1 scale=$2 page=$3 letter=$4 bg=$5 out=$6
  local s=$(python3 -c "print($size/1024*$scale)")
  local c=$((size / 2))
  # Book geometry in a 1024 space, scaled by $s around the centre.
  local px=$(python3 -c "print(int($c))")
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

# iOS and store icon: artwork on parchment.
draw 1024 0.80 "$BROWN" "$PARCHMENT" "$PARCHMENT" $OUT/icon.png
# Android adaptive icon: foreground keeps to the central safe zone, background is flat.
draw 1024 0.56 "$BROWN" "$PARCHMENT" none $OUT/android-icon-foreground.png
convert -size 1024x1024 xc:"$PARCHMENT" $OUT/android-icon-background.png
# Monochrome layer: the system tints it, so draw the book in white with cut-out letters.
draw 1024 0.56 white none none $OUT/android-icon-monochrome.png
# Splash: artwork only, brown for light backgrounds and parchment for dark.
draw 1024 0.90 "$BROWN" "$PARCHMENT" none $OUT/splash-icon.png
draw 1024 0.90 "$PARCHMENT" "$BROWN" none $OUT/splash-icon-dark.png
convert $OUT/icon.png -resize 48x48 $OUT/favicon.png
echo "icons written to $OUT"
