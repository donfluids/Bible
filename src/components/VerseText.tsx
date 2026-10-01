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
  showNumber?: boolean;
  /** Keep the text to a few lines, for result lists. */
  numberOfLines?: number;
}

export function VerseText({ verse, fontSize, onWord, underline = true, emphasize, showNumber = true, numberOfLines }: Props) {
  const theme = useTheme();
  const segments = useMemo(() => parseSegments(verse), [verse]);
  const isTitle = verse.verse === 0;
  const lineHeight = Math.round(fontSize * 1.55);

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
        if (!seg.strongs) return <Text key={i}>{seg.text}</Text>;
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
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: undefined },
  title: { fontStyle: 'italic' },
  number: { fontWeight: '700' },
});
