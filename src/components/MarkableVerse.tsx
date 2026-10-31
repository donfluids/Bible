import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { wordsOf } from '../marks';
import type { Theme } from '../theme';
import type { HighlightColor, VerseRow } from '../types';

/** A word laid out in marker mode, which the reader measures on screen to find under a finger. */
export interface WordSlot {
  verse: number;
  start: number;
  end: number;
  view: View;
}

interface Props {
  verse: VerseRow;
  fontSize: number;
  lineHeight: number;
  font: string | undefined;
  theme: Theme;
  /** Marked parts already saved, as [start, end, colour]. */
  marks: [number, number, HighlightColor][];
  /** The part being marked now in this verse, and its colour (or null for the eraser). */
  selection: [number, number] | null;
  selectionColor: string;
  /** Text colour on the part being marked now. */
  selectionText: string;
  /** The whole verse stands on a highlight colour. */
  highlighted: boolean;
  register: (key: string, slot: WordSlot | null) => void;
}

/**
 * A verse in marker mode: its words in a wrapping row, each its own view so it can be
 * measured, coloured where marked and where the finger is marking now. A word coloured
 * like the next one takes the space between them into its colour, so a marked run
 * reads as one stroke as it does outside marker mode.
 */
export const MarkableVerse = memo(function MarkableVerse({ verse, fontSize, lineHeight, font, theme, marks, selection, selectionColor, selectionText, highlighted, register }: Props) {
  const words = useMemo(() => wordsOf(verse.text), [verse.text]);
  const gap = Math.round(fontSize * 0.28);
  // Each word's colour: the part being marked now over a saved mark.
  const selectedAt = words.map((w) => !!selection && w.start < selection[1] && w.end > selection[0]);
  const fills = words.map((w, i) => {
    if (selectedAt[i]) return selectionColor;
    const mark = [...marks].reverse().find(([a, b]) => w.start < b && w.end > a);
    return mark ? theme.marks[mark[2]] : undefined;
  });
  return (
    <View style={styles.row}>
      {verse.verse > 0 ? (
        <Text style={[styles.number, { color: highlighted ? theme.markAccent : theme.muted, fontSize: Math.max(11, fontSize - 6), lineHeight, marginRight: gap }]}>{verse.verse}</Text>
      ) : null}
      {words.map((w, i) => {
        const fill = fills[i];
        const joinNext = !!fill && fills[i + 1] === fill;
        const joinPrev = !!fill && fills[i - 1] === fill;
        const textColor = fill === selectionColor && selectedAt[i] ? selectionText : fill ? theme.markText : highlighted ? theme.markText : theme.text;
        const key = `${verse.book}:${verse.chapter}:${verse.verse}:${w.start}`;
        return (
          <View
            key={w.start}
            collapsable={false}
            ref={(view) => register(key, view ? { verse: verse.verse, start: w.start, end: w.end, view } : null)}
            style={[
              joinNext ? { paddingRight: gap } : { marginRight: gap },
              {
                borderTopLeftRadius: joinPrev ? 0 : 4,
                borderBottomLeftRadius: joinPrev ? 0 : 4,
                borderTopRightRadius: joinNext ? 0 : 4,
                borderBottomRightRadius: joinNext ? 0 : 4,
              },
              fill ? { backgroundColor: fill } : null,
            ]}
          >
            <Text style={[{ fontSize, lineHeight, color: textColor, fontFamily: font }, verse.verse === 0 && styles.title]}>{w.text}</Text>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  number: { fontWeight: '600' },
  title: { fontStyle: 'italic' },
});
