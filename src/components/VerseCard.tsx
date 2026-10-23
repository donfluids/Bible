import React, { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CARD_HEIGHT, CARD_WIDTH, VEIL_COLOUR, VEIL_OPACITY } from '../cards';
import type { Art, CardLook, CardSize, Design, TextPlace } from '../cards';
import { scriptOf, scriptureFont } from '../fonts';
import type { Script } from '../fonts';

interface Props {
  design: Design;
  size: CardSize;
  /** Width on screen; everything scales with it. */
  width: number;
  heading: string;
  text: string;
  reference: string;
  message: string;
  /** The sender's photo behind the words, with its veil (from their look). */
  photo?: Pick<CardLook, 'veil' | 'strength' | 'blur'> & { uri: string };
  place?: TextPlace;
  /** A plain face instead of the book face. */
  plainFace?: boolean;
  /** Light words on a dark photo or colour: a soft shadow keeps them clear. */
  lightWords?: boolean;
}

const JUSTIFY: Record<TextPlace, 'flex-start' | 'center' | 'flex-end'> = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };

// Stars of the Christmas design, on the square grid; a tall card spreads them down.
const STARS: [number, number, number][] = [
  [300, 26, 1],
  [340, 120, 1.4],
  [110, 22, 0.9],
  [330, 330, 1],
  [20, 140, 1.1],
  [200, 40, 0.8],
  [60, 300, 0.9],
];

// The space one character of each script takes at size 1, line height included.
const CHAR_AREA: Record<Script | 'latin', number> = { latin: 0.62, ml: 1.15, ta: 1.2 };
const LINE_HEIGHT: Record<Script | 'latin', number> = { latin: 1.5, ml: 1.75, ta: 1.7 };

/**
 * The verse as a card, drawn at `width` and captured from here for sharing. The verse is
 * sized to fill what the heading, reference and message leave of the text box: first by
 * an estimate from its length, then, once laid out, made smaller or larger until the
 * text fits the box (long Malayalam and Tamil words wrap less evenly than English).
 */
export const VerseCard = forwardRef<View, Props>(function VerseCard({ design, size, width, heading, text, reference, message, photo, place = 'middle', plainFace = false, lightWords = false }, ref) {
  const u = width / CARD_WIDTH;
  const height = CARD_HEIGHT[size] * u;
  const layout = design[size];
  const tall = size === 'tall';

  const verseScript = scriptOf(text);
  const v = verseScript ?? 'latin';
  const headScript = scriptOf(heading);
  const refScript = scriptOf(reference);
  const msgScript = scriptOf(message);
  const serif = (script: Script | null, bold = false) => scriptureFont(script, !plainFace, bold);
  // On a photo, light words get a soft dark shadow so they stay clear over busy parts.
  const shadow = lightWords ? { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 * (width / CARD_WIDTH) }, textShadowRadius: 4 * (width / CARD_WIDTH) } : null;

  const headingSize = (headScript ? (tall ? 26 : 20) : tall ? 36 : 28) * (heading.length > 22 ? 0.82 : 1);
  const aboveHeight = layout.above ? Math.max(...layout.above.map((a) => a.width * (a.ratio ?? 1))) + 8 : 0;
  const boxW = CARD_WIDTH - layout.box.left - layout.box.right;
  // Lines a line of text takes in the box, at a font size, from its length.
  const lines = (s: string, size: number, script: Script | null) => Math.max(1, Math.ceil((s.length * size * (script ? 0.75 : 0.5)) / boxW));
  const messageSize = tall ? 17 : 14.5;
  const messageLine = messageSize * (msgScript ? 1.7 : 1.4);
  const used =
    aboveHeight +
    (design.cross ? (design.halo ? 60 : 42) : 0) +
    (heading ? headingSize * 1.4 * (heading.length * headingSize * 0.5 > boxW ? 2 : 1) + 10 : 0) +
    28 +
    (message ? 14 + messageLine * lines(message, messageSize, msgScript) : 0);
  const boxH = CARD_HEIGHT[size] - layout.box.top - layout.box.bottom - used;
  const estimate = Math.sqrt((boxW * Math.max(boxH, 40) * 0.9) / (Math.max(text.length, 1) * CHAR_AREA[v]));
  const maxSize = tall ? 34 : 26;
  const [fitScale, setFitScale] = useState(1);
  const tries = useRef(0);
  const content = `${design.id}|${size}|${heading}|${text}|${reference}|${message}|${plainFace}`;
  // Before the new content is laid out, so no layout of it is measured at the old scale.
  useLayoutEffect(() => {
    tries.current = 0;
    setFitScale(1);
  }, [content]);
  const MIN_SIZE = 8;
  const verseSize = Math.max(MIN_SIZE, Math.min(maxSize, estimate * fitScale));
  // The text box's height on screen; the laid-out text is measured against it.
  const boxPx = (CARD_HEIGHT[size] - layout.box.top - layout.box.bottom) * u;
  const onContentLayout = (h: number) => {
    if (tries.current >= 6 || h <= 0) return;
    // Each step works from the size in use, which the limits may hold below or above the
    // estimate: a short verse stays at the largest size until it is made smaller.
    if (h > boxPx && verseSize > MIN_SIZE) {
      tries.current++;
      setFitScale((f) => Math.min(f, maxSize / estimate) * Math.max(0.6, Math.sqrt(boxPx / h) * 0.96));
    } else if (h < boxPx * 0.72 && verseSize < maxSize) {
      tries.current++;
      setFitScale((f) => Math.max(f, MIN_SIZE / estimate) * Math.min(1.3, Math.sqrt((boxPx * 0.88) / h)));
    }
  };
  const align = layout.align === 'left' ? 'left' : 'center';

  const art = (a: Art, i: number, placed: boolean) => (
    <Image
      key={i}
      source={a.src}
      resizeMode="contain"
      style={[
        { width: a.width * u, height: a.width * (a.ratio ?? 1) * u },
        placed && {
          position: 'absolute',
          left: a.left !== undefined ? a.left * u : undefined,
          right: a.right !== undefined ? a.right * u : undefined,
          top: a.top !== undefined ? a.top * u : undefined,
          bottom: a.bottom !== undefined ? a.bottom * u : undefined,
        },
        (!!a.rotate || !!a.flip) && { transform: [...(a.rotate ? [{ rotate: `${a.rotate}deg` }] : []), ...(a.flip ? [{ scaleX: -1 }] : [])] },
      ]}
    />
  );

  return (
    <View ref={ref} collapsable={false} style={{ width, height, overflow: 'hidden', backgroundColor: design.background[0] }}>
      {photo ? (
        <>
          <Image source={{ uri: photo.uri }} resizeMode="cover" blurRadius={photo.blur ? 8 * u : 0} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: VEIL_COLOUR[photo.veil], opacity: VEIL_OPACITY[photo.veil][photo.strength] }]} />
        </>
      ) : null}
      {!photo && design.background.length > 1 ? (
        <LinearGradient
          colors={design.background as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={design.diagonal ? { x: 1, y: 1 } : { x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {design.stars
        ? STARS.map(([x, y, r], i) => (
            <View
              key={i}
              style={{ position: 'absolute', left: (x - r) * u, top: (y * (CARD_HEIGHT[size] / 360) - r) * u, width: 2 * r * u, height: 2 * r * u, borderRadius: r * u, backgroundColor: design.stars, opacity: 0.7 }}
            />
          ))
        : null}
      {design.borders?.map((b, i) => (
        <View key={i} style={{ position: 'absolute', left: b.inset * u, right: b.inset * u, top: b.inset * u, bottom: b.inset * u, borderWidth: b.width * u, borderColor: b.color, borderRadius: 2 * u }} />
      ))}
      {layout.art?.map((a, i) => art(a, i, true))}
      <View
        style={{
          position: 'absolute',
          left: layout.box.left * u,
          right: layout.box.right * u,
          top: layout.box.top * u,
          bottom: layout.box.bottom * u,
          justifyContent: JUSTIFY[place],
          alignItems: layout.align === 'left' ? 'flex-start' : 'center',
        }}
      >
        <View onLayout={(e) => onContentLayout(e.nativeEvent.layout.height)} style={{ width: '100%', alignItems: layout.align === 'left' ? 'flex-start' : 'center' }}>
          {design.cross ? (
            <View style={{ width: 22 * u, height: 30 * u, marginBottom: (design.halo ? 26 : 12) * u, marginTop: design.halo ? 18 * u : 0 }}>
              {design.halo ? (
                <>
                  <View style={{ position: 'absolute', left: -33 * u, top: -29 * u, width: 88 * u, height: 88 * u, borderRadius: 44 * u, backgroundColor: design.halo, opacity: 0.25 }} />
                  <View style={{ position: 'absolute', left: -19 * u, top: -15 * u, width: 60 * u, height: 60 * u, borderRadius: 30 * u, backgroundColor: design.halo, opacity: 0.45 }} />
                </>
              ) : null}
              <View style={{ position: 'absolute', left: 9 * u, width: 4 * u, height: 30 * u, backgroundColor: design.cross }} />
              <View style={{ position: 'absolute', top: 9 * u, width: 22 * u, height: 4 * u, backgroundColor: design.cross }} />
            </View>
          ) : null}
          {layout.above ? <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 * u, marginBottom: 8 * u }}>{layout.above.map((a, i) => art(a, i, false))}</View> : null}
          {heading ? (
            <Text
              allowFontScaling={false}
              style={{
                ...shadow,
                color: design.accent,
                fontFamily: serif(headScript, !!headScript),
                fontStyle: headScript ? 'normal' : 'italic',
                fontSize: headingSize * u,
                lineHeight: headingSize * 1.35 * u,
                textAlign: align,
                marginBottom: 10 * u,
              }}
            >
              {heading}
            </Text>
          ) : null}
          <Text
            allowFontScaling={false}
            style={{ ...shadow, color: design.ink, fontFamily: serif(verseScript), fontSize: verseSize * u, lineHeight: verseSize * LINE_HEIGHT[v] * u, textAlign: align }}
          >
            {text}
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              ...shadow,
              color: design.accent,
              fontFamily: serif(refScript, true),
              fontWeight: refScript ? undefined : '700',
              fontSize: (refScript ? 12 : 11.5) * (tall ? 1.15 : 1) * u,
              letterSpacing: refScript ? 0.3 * u : 2 * u,
              textTransform: refScript ? 'none' : 'uppercase',
              marginTop: 12 * u,
              textAlign: align,
            }}
          >
            {reference}
          </Text>
          {message ? (
            <Text
              allowFontScaling={false}
              style={{
                ...shadow,
                color: design.ink,
                fontFamily: serif(msgScript),
                fontStyle: msgScript ? 'normal' : 'italic',
                // Never larger than the verse it goes with.
                fontSize: Math.min(messageSize, verseSize) * u,
                lineHeight: (messageLine * Math.min(messageSize, verseSize)) / messageSize * u,
                marginTop: 14 * u,
                textAlign: align,
              }}
            >
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});
