import React, { memo, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { scriptOf, scriptureFont } from '../fonts';
import { useT } from '../i18n';
import { useSelectedStart } from '../selection';
import { ICON_FONT_FAMILY, iconChar } from './Icon';
import { useDisplaySettings } from '../settings';
import { PILCROW, parseSegments } from '../text';
import { matchRanges } from '../searchMatch';
import { useTheme } from '../theme';
import { textLineHeight, translationInfo } from '../types';
import type { HighlightColor, Note, Segment, TranslationId, VerseRow, WordPick } from '../types';

/** White space at a verse's start (U+2003 is the em space BSB and the Malayalam Bible use). */
const LEADING_SPACE = /^[\s\u2003]+/;

interface Props {
  verse: VerseRow;
  fontSize: number;
  /**
   * The size is the reader's own (A− / A+), shown as it is whatever the phone's text size:
   * the two would otherwise multiply (30 at the phone's 200% is 60, words split).
   */
  appSized?: boolean;
  onWord?: (pick: WordPick) => void;
  /** Long press anywhere on the verse, for the actions sheet. */
  onLongPress?: () => void;
  /** Tap on the verse number. */
  onNumberPress?: () => void;
  /** What tapping the number does, for screen readers. */
  numberLabel?: string;
  /** Footnotes and cross references of this verse, shown as lettered markers. */
  notes?: Note[];
  onNote?: (note: Note) => void;
  /** Draw a faint underline under every word that links to Greek or Hebrew. */
  underline?: boolean;
  /** Emphasise words tagged with this Strong's number. */
  emphasize?: string;
  /** Emphasise every occurrence of this text, as typed in the search box. */
  highlightText?: string;
  showNumber?: boolean;
  /** Keep the text to a few lines, for result lists. */
  numberOfLines?: number;
  /** Briefly tinted after a jump to this verse. */
  flash?: boolean;
  /** Show a small mark before the number (paragraph layout, where there is no margin bar). */
  bookmarked?: boolean;
  /** Background colour of a highlighted verse. */
  highlightColor?: string;
  /** The verse stands on a highlight colour drawn behind it (the reader's verse rows). */
  onHighlight?: boolean;
  /** Marked parts of the verse, as [start, end, colour] by character offset. */
  marks?: [number, number, HighlightColor][];
  /** The verse has a personal note; tapping the pencil opens it. */
  hasNote?: boolean;
  onNotePress?: () => void;
  /** Mark the word whose sheet is open when it is in this verse (the reader's translation). */
  selectionTranslation?: TranslationId;
  /** Number the verse with its chapter (7:25), for a verse beside another chapter's. */
  withChapter?: boolean;
  /** The verse is selected (its number was tapped): its number filled, the verse shaded. */
  selected?: boolean;
  /** The verse stands on a shade drawn behind it already (the reader's verse rows). */
  shadedBehind?: boolean;
}

export function noteLetter(n: number): string {
  return String.fromCharCode(97 + (n % 26));
}

/** One verse's text. Memoised: a list redraws only the verses whose props changed. */
export const VerseText = memo(function VerseText({
  verse,
  fontSize,
  appSized = false,
  onWord,
  onLongPress,
  onNumberPress,
  numberLabel,
  notes,
  onNote,
  underline = true,
  emphasize,
  highlightText,
  showNumber = true,
  numberOfLines,
  flash,
  bookmarked,
  highlightColor,
  onHighlight,
  marks,
  hasNote,
  onNotePress,
  selectionTranslation,
  withChapter = false,
  selected = false,
  shadedBehind = false,
}: Props) {
  const scales = !appSized;
  const theme = useTheme();
  const t = useT();
  const display = useDisplaySettings();
  const serif = display?.serif ?? false;
  // The words of Jesus, where the Bible marks them, in burgundy (Settings; on unless turned off).
  const redLetters = display?.redLetters ?? true;
  const segments = useMemo(() => parseSegments(verse), [verse]);
  const selectedStart = useSelectedStart(selectionTranslation, verse.book, verse.chapter, verse.verse);
  const ranges = useMemo(() => (highlightText ? matchRanges(verse.text, highlightText) : []), [verse.text, highlightText]);
  // Words the translators supplied, in square brackets (the LSV throughout, the KJV once):
  // drawn lighter and in italics, as printed Bibles set them, the brackets left out. Only in
  // English: in the Malayalam and Hindi Bibles brackets mark words not in every manuscript,
  // and the ASV's "[Selah" has no closing bracket; both stay as printed.
  const jesus = useMemo(
    () =>
      redLetters && verse.jesus
        ? verse.jesus.split(' ').map((pair) => pair.split(',').map(Number) as [number, number]).filter(([a, b]) => b > a)
        : [],
    [redLetters, verse.jesus],
  );
  const supplied = useMemo(() => (scriptOf(verse.text) ? [] : [...verse.text.matchAll(/\[[^[\]]*\]/g)].map((m) => [m.index!, m.index! + m[0].length] as [number, number])), [verse.text]);
  const isTitle = verse.verse === 0;
  // The verse's own script decides its face and spacing (Compare shows two at once).
  const script = scriptOf(verse.text);
  const font = scriptureFont(script, serif) ?? theme.font;
  const bold = script ? { fontFamily: scriptureFont(script, serif, true) } : { fontWeight: '700' as const };
  // Devanagari reads smaller than Latin at the same size: Hindi gets half a step more.
  const size = script === 'hi' ? fontSize + 1 : fontSize;
  const lineHeight = textLineHeight(size, translationInfo(script === 'ta' ? 'TAM' : script === 'ml' ? 'MAL' : script === 'hi' ? 'HIN' : 'KJV').lineHeight);
  // Verse numbers and note letters grow more slowly than the text, but enough to be found
  // at large sizes (14 -> 11, 21 -> 14, 30 -> 19).
  const small = Math.max(11, Math.round(Math.min(fontSize - 6, 11 + (fontSize - 15) * 0.55)));
  // On a highlight colour the text, number and note letters take the colours made for it.
  // A flash covers the highlight colour, so the text keeps the page's colours under it.
  const onMark = (onHighlight || !!highlightColor) && !flash;
  const textColor = onMark ? theme.markText : theme.text;
  const accent = onMark ? theme.markAccent : theme.accent;

  if (verse.omitted) {
    return (
      <Text allowFontScaling={scales}
        style={[styles.text, styles.omitted, { fontSize: fontSize - 2, lineHeight, color: theme.muted, fontFamily: font }]}
        numberOfLines={numberOfLines}
        onLongPress={onLongPress}
        suppressHighlighting
      >
        {showNumber ? <Text allowFontScaling={scales} style={[styles.number, { fontSize: small }]}>{verse.verse} </Text> : null}
        {/* omitted 2: joined to an earlier verse (\v 17-18), whose number is its text. */}
        {verse.omitted === 2 ? t('joinedVerse', { verse: verse.text }) : `${t('omitted')} ${verse.text}`}
      </Text>
    );
  }

  // Split a run of text into pieces by the search matches (bold on the highlight colour)
  // and the marked parts (their colour; a later mark shows over an earlier one).
  const highlighted = (text: string, start: number): React.ReactNode => {
    const marked = marks ?? [];
    // The ¶ is dropped only from what is drawn, so marks and matches keep their offsets; so
    // is the space or em space some Bibles start a verse with (a paragraph indent in the
    // source), which would leave a wide gap after the verse number.
    const drawn = (piece: string, from: number) => {
      const plain = piece.replace(PILCROW, '');
      return from === 0 ? plain.replace(LEADING_SPACE, '') : plain;
    };
    const end = start + text.length;
    const here = supplied.filter(([a, b]) => a < end && b > start);
    const spoken = jesus.filter(([a, b]) => a < end && b > start);
    if (ranges.length === 0 && marked.length === 0 && here.length === 0 && spoken.length === 0) return drawn(text, start);
    const cuts = new Set([start, end]);
    for (const [a, b] of [...ranges, ...marked, ...here, ...spoken]) {
      if (a > start && a < end) cuts.add(a);
      if (b > start && b < end) cuts.add(b);
    }
    const points = [...cuts].sort((a, b) => a - b);
    const out: React.ReactNode[] = [];
    for (let i = 0; i + 1 < points.length; i++) {
      const [from, to] = [points[i], points[i + 1]];
      const added = here.some(([a, b]) => a <= from && b >= to);
      const piece = added ? drawn(text.slice(from - start, to - start), from).replace(/[[\]]/g, '') : drawn(text.slice(from - start, to - start), from);
      const match = ranges.some(([a, b]) => a <= from && b >= to);
      const mark = [...marked].reverse().find(([a, b]) => a <= from && b >= to);
      const red = spoken.some(([a, b]) => a <= from && b >= to);
      if (!match && !mark && !added && !red) {
        out.push(piece);
        continue;
      }
      out.push(
        <Text
          allowFontScaling={scales}
          key={from}
          style={[
            added && { fontStyle: 'italic', color: onMark || mark ? theme.markMuted : theme.muted },
            match && bold,
            mark ? { backgroundColor: theme.marks[mark[2]], color: added ? theme.markMuted : theme.markText } : match ? { backgroundColor: theme.highlight } : null,
            // The words of Jesus keep their colour through the rest; supplied words in them
            // stay italic, in burgundy.
            red && { color: onMark || mark ? theme.markJesus : theme.jesus },
          ]}
        >
          {piece}
        </Text>,
      );
    }
    return out;
  };

  const marker = (note: Note) => (
    <Text allowFontScaling={scales}
      key={`n${note.n}`}
      onPress={onNote ? () => onNote(note) : undefined}
      style={{ fontSize: Math.max(10, small - 3), color: accent, fontWeight: '700' }}
      accessibilityRole="button"
      accessibilityLabel={`${note.kind === 'x' ? t('crossReference') : t('footnote')} ${noteLetter(note.n)}`}
    >
      {' '}
      {noteLetter(note.n)}
      {/* Before the verse's first word a full space, or the letter reads as part of the word. */}
      {note.pos === 0 ? ' ' : '\u202F'}
    </Text>
  );

  // A run of text with note markers inserted at their positions, then highlighted.
  const pieces = (text: string, start: number, first: boolean): React.ReactNode => {
    const end = start + text.length;
    const here = (notes ?? []).filter((n) => (n.pos > start && n.pos <= end) || (first && n.pos === 0));
    if (here.length === 0) return highlighted(text, start);
    const out: React.ReactNode[] = [];
    let pos = start;
    for (const note of here) {
      const cut = Math.max(pos, Math.min(note.pos, end));
      if (cut > pos) out.push(<Text allowFontScaling={scales} key={`t${pos}`}>{highlighted(text.slice(pos - start, cut - start), pos)}</Text>);
      out.push(marker(note));
      pos = cut;
    }
    if (pos < end) out.push(<Text allowFontScaling={scales} key={`t${pos}`}>{highlighted(text.slice(pos - start), pos)}</Text>);
    return out;
  };

  let offset = 0;
  return (
    <Text allowFontScaling={scales}
      style={[
        styles.text,
        { fontSize: size, lineHeight, color: textColor, fontFamily: font },
        isTitle && styles.title,
        highlightColor ? { backgroundColor: highlightColor } : null,
        flash && { backgroundColor: theme.highlight },
        selected && !shadedBehind && { backgroundColor: theme.accentSoft },
      ]}
      numberOfLines={numberOfLines}
      selectable={false}
      onLongPress={onLongPress}
      // No pressed shading on the verse either (iPhone): holding it opens the menu before
      // the finger lifts and the shading stayed on its words that have no link of their own,
      // every other word, the linked ones having none (see the word spans below).
      suppressHighlighting
      accessibilityHint={onLongPress ? t('verseHint') : undefined}
    >
      {bookmarked ? <Text allowFontScaling={scales} style={{ color: accent }}>▎</Text> : null}
      {hasNote ? (
        <Text allowFontScaling={scales} onPress={onNotePress} style={{ color: accent, fontSize: small + 2 }} accessibilityRole="button" accessibilityLabel={t('editNote')}>
          <Text allowFontScaling={scales} style={{ fontFamily: ICON_FONT_FAMILY }}>{iconChar('edit_note')}</Text>{' '}
        </Text>
      ) : null}
      {showNumber && !isTitle ? (
        <Text allowFontScaling={scales}
          onPress={onNumberPress}
          onLongPress={onLongPress}
          suppressHighlighting
          accessibilityRole={onNumberPress ? 'button' : undefined}
          accessibilityLabel={onNumberPress ? numberLabel : undefined}
          accessibilityState={onNumberPress ? { selected } : undefined}
          style={[
            styles.number,
            fontSize >= 24 && styles.numberBig,
            { color: onMark ? accent : theme.muted, fontSize: small },
            // A number that selects its verse looks it: in the accent colour, and filled while
            // its verse is selected (text inside text takes no rounding or padding, so thin
            // spaces pad the fill, and widen the number for a finger).
            !!onNumberPress && { color: accent },
            !!onNumberPress && selected && { color: theme.onAccent, backgroundColor: theme.accent },
          ]}
        >
          {onNumberPress ? '\u2009' : null}
          {withChapter ? `${verse.chapter}:${verse.verse}` : verse.verse}
          {onNumberPress ? '\u2009' : null}
        </Text>
      ) : null}
      {/* The space after the number at the text's size: at the number's size it is so narrow
          that the number touches the first word ("1In"). */}
      {showNumber && !isTitle ? ' ' : null}
      {segments.map((seg, i) => {
        const start = offset;
        offset += seg.text.length;
        // Plain text needs no element of its own; it takes the verse's style as before.
        if (!seg.strongs) return <React.Fragment key={i}>{pieces(seg.text, start, i === 0)}</React.Fragment>;
        const strong = !!emphasize && (emphasize === seg.strongs || !!seg.choices?.includes(emphasize));
        return (
          <Text allowFontScaling={scales}
            key={i}
            onPress={
              onWord
                ? () => onWord({ strongs: seg.strongs!, word: seg.text, choices: seg.choices, at: { book: verse.book, chapter: verse.chapter, verse: verse.verse, start }, nth: nthOf(segments, i) })
                : undefined
            }
            onLongPress={onLongPress}
            // Android exposes a tappable span inside text to TalkBack and keyboards only as a link.
            accessibilityRole={onWord ? 'link' : undefined}
            // No pressed shading (iPhone): a long press opens the verse's menu before the finger
            // lifts, and the shading then stays on the word. A tap opens the word's sheet anyway.
            suppressHighlighting
            style={[
              underline && { textDecorationLine: 'underline', textDecorationColor: theme.linked },
              strong && [bold, { color: theme.accent, backgroundColor: theme.highlight }],
              selectedStart === start && [bold, { color: theme.accent, backgroundColor: theme.accentSoft }],
            ]}
          >
            {pieces(seg.text, start, i === 0)}
          </Text>
        );
      })}
    </Text>
  );
});

const styles = StyleSheet.create({
  text: { fontFamily: undefined },
  title: { fontStyle: 'italic' },
  omitted: { fontStyle: 'italic' },
  number: { fontWeight: '600' },
  numberBig: { fontWeight: '700' },
});

/** Which of the verse's words with each of this segment's numbers it is, and how many there are. */
function nthOf(segments: Segment[], index: number): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  for (const id of segments[index].choices ?? [segments[index].strongs!]) {
    let n = 0, total = 0;
    segments.forEach((seg, i) => {
      if (seg.strongs !== id && !seg.choices?.includes(id)) return;
      total++;
      if (i < index) n++;
    });
    out[id] = [n, total];
  }
  return out;
}
