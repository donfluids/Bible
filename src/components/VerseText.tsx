import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useT } from '../i18n';
import { useSettings } from '../settings';
import { parseSegments } from '../text';
import { useTheme } from '../theme';
import { translationInfo } from '../types';
import type { Note, VerseRow, WordPick } from '../types';

interface Props {
  verse: VerseRow;
  fontSize: number;
  onWord?: (pick: WordPick) => void;
  /** Long press anywhere on the verse, for the actions sheet. */
  onLongPress?: () => void;
  /** Tap on the verse number. */
  onNumberPress?: () => void;
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
  /** The verse has a personal note; tapping the pencil opens it. */
  hasNote?: boolean;
  onNotePress?: () => void;
}

/** Character ranges of `query` inside `text`, ignoring case and apostrophe style. */
export function matchRanges(text: string, query: string): [number, number][] {
  const q = query.trim().replace(/\s+/g, ' ').toLowerCase().replace(/[’‘]/g, "'");
  if (!q) return [];
  const t = text.toLowerCase().replace(/[’‘]/g, "'");
  if (t.length !== text.length) return []; // case folding changed lengths; skip rather than mis-highlight
  const out: [number, number][] = [];
  let i = t.indexOf(q);
  while (i >= 0) {
    out.push([i, i + q.length]);
    i = t.indexOf(q, i + q.length);
  }
  return out;
}

export function noteLetter(n: number): string {
  return String.fromCharCode(97 + (n % 26));
}

export function VerseText({
  verse,
  fontSize,
  onWord,
  onLongPress,
  onNumberPress,
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
  hasNote,
  onNotePress,
}: Props) {
  const theme = useTheme();
  const t = useT();
  const { settings } = useSettings();
  const segments = useMemo(() => parseSegments(verse), [verse]);
  const ranges = useMemo(() => (highlightText ? matchRanges(verse.text, highlightText) : []), [verse.text, highlightText]);
  const isTitle = verse.verse === 0;
  const lineHeight = Math.round(fontSize * translationInfo(settings.translation).lineHeight);
  const small = Math.max(11, fontSize - 6);

  if (verse.omitted) {
    return (
      <Text
        style={[styles.text, styles.omitted, { fontSize: fontSize - 2, lineHeight, color: theme.muted, fontFamily: theme.font }]}
        numberOfLines={numberOfLines}
        onLongPress={onLongPress}
      >
        {showNumber ? <Text style={[styles.number, { fontSize: small }]}>{verse.verse} </Text> : null}
        {t('omitted')} {verse.text}
      </Text>
    );
  }

  // Split a run of text into plain and highlighted pieces by the match ranges.
  const highlighted = (text: string, start: number): React.ReactNode => {
    if (ranges.length === 0) return text;
    const end = start + text.length;
    const out: React.ReactNode[] = [];
    let pos = start;
    for (const [a, b] of ranges) {
      if (b <= pos || a >= end) continue;
      const from = Math.max(a, pos);
      const to = Math.min(b, end);
      if (from > pos) out.push(text.slice(pos - start, from - start));
      out.push(
        <Text key={from} style={{ fontWeight: '700', backgroundColor: theme.highlight }}>
          {text.slice(from - start, to - start)}
        </Text>,
      );
      pos = to;
    }
    if (pos < end) out.push(text.slice(pos - start));
    return out;
  };

  const marker = (note: Note) => (
    <Text
      key={`n${note.n}`}
      onPress={onNote ? () => onNote(note) : undefined}
      style={{ fontSize: small, color: theme.accent, fontWeight: '700' }}
      accessibilityLabel={`Note ${noteLetter(note.n)}`}
    >
      {' '}
      {noteLetter(note.n)}
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
      if (cut > pos) out.push(<Text key={`t${pos}`}>{highlighted(text.slice(pos - start, cut - start), pos)}</Text>);
      out.push(marker(note));
      pos = cut;
    }
    if (pos < end) out.push(<Text key={`t${pos}`}>{highlighted(text.slice(pos - start), pos)}</Text>);
    return out;
  };

  let offset = 0;
  return (
    <Text
      style={[
        styles.text,
        { fontSize, lineHeight, color: theme.text, fontFamily: theme.font },
        isTitle && styles.title,
        highlightColor ? { backgroundColor: highlightColor } : null,
        flash && { backgroundColor: theme.highlight },
      ]}
      numberOfLines={numberOfLines}
      selectable={false}
      onLongPress={onLongPress}
    >
      {bookmarked ? <Text style={{ color: theme.accent }}>▎</Text> : null}
      {hasNote ? (
        <Text onPress={onNotePress} style={{ color: theme.accent, fontSize: small }} accessibilityLabel="Open note">
          ✎{' '}
        </Text>
      ) : null}
      {showNumber && !isTitle ? (
        <Text
          onPress={onNumberPress}
          onLongPress={onLongPress}
          style={[styles.number, { color: theme.accent, fontSize: small }, onNumberPress && { textDecorationLine: 'underline' }]}
        >
          {verse.verse}{' '}
        </Text>
      ) : null}
      {segments.map((seg, i) => {
        const start = offset;
        offset += seg.text.length;
        if (!seg.strongs) return <Text key={i}>{pieces(seg.text, start, i === 0)}</Text>;
        const strong = emphasize === seg.strongs;
        return (
          <Text
            key={i}
            onPress={onWord ? () => onWord({ strongs: seg.strongs!, word: seg.text }) : undefined}
            onLongPress={onLongPress}
            suppressHighlighting={false}
            style={[
              underline && { textDecorationLine: 'underline', textDecorationColor: theme.linked },
              strong && { fontWeight: '700', color: theme.accent, backgroundColor: theme.highlight },
            ]}
          >
            {pieces(seg.text, start, i === 0)}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: undefined },
  title: { fontStyle: 'italic' },
  omitted: { fontStyle: 'italic' },
  number: { fontWeight: '700' },
});
