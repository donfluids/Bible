import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { parseSegments } from '../text';
import { useTheme } from '../theme';
import type { VerseRow, WordPick } from '../types';

interface Props {
  verse: VerseRow;
  fontSize: number;
  onWord?: (pick: WordPick) => void;
  /** Draw a faint underline under every word that links to Greek or Hebrew. */
  underline?: boolean;
  /** Emphasise words tagged with this Strong's number. */
  emphasize?: string;
  /** Emphasise every occurrence of this text, as typed in the search box. */
  highlightText?: string;
  showNumber?: boolean;
  /** Keep the text to a few lines, for result lists. */
  numberOfLines?: number;
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

export function VerseText({
  verse,
  fontSize,
  onWord,
  underline = true,
  emphasize,
  highlightText,
  showNumber = true,
  numberOfLines,
}: Props) {
  const theme = useTheme();
  const segments = useMemo(() => parseSegments(verse), [verse]);
  const ranges = useMemo(() => (highlightText ? matchRanges(verse.text, highlightText) : []), [verse.text, highlightText]);
  const isTitle = verse.verse === 0;
  const lineHeight = Math.round(fontSize * 1.55);

  if (verse.omitted) {
    return (
      <Text style={[styles.text, styles.omitted, { fontSize: fontSize - 2, lineHeight, color: theme.muted }]} numberOfLines={numberOfLines}>
        {showNumber ? <Text style={[styles.number, { fontSize: Math.max(11, fontSize - 6) }]}>{verse.verse} </Text> : null}
        Omitted in this translation. {verse.text}
      </Text>
    );
  }

  // Split a run of text into plain and highlighted pieces by the match ranges.
  const pieces = (text: string, start: number): React.ReactNode => {
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

  let offset = 0;
  return (
    <Text
      style={[styles.text, { fontSize, lineHeight, color: theme.text }, isTitle && styles.title]}
      numberOfLines={numberOfLines}
      selectable={false}
    >
      {showNumber && !isTitle ? (
        <Text style={[styles.number, { color: theme.accent, fontSize: Math.max(11, fontSize - 6) }]}>{verse.verse} </Text>
      ) : null}
      {segments.map((seg, i) => {
        const start = offset;
        offset += seg.text.length;
        if (!seg.strongs) return <Text key={i}>{pieces(seg.text, start)}</Text>;
        const strong = emphasize === seg.strongs;
        return (
          <Text
            key={i}
            onPress={onWord ? () => onWord({ strongs: seg.strongs!, word: seg.text }) : undefined}
            suppressHighlighting={false}
            style={[
              underline && { textDecorationLine: 'underline', textDecorationColor: theme.linked },
              strong && { fontWeight: '700', color: theme.accent, backgroundColor: theme.highlight },
            ]}
          >
            {pieces(seg.text, start)}
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
