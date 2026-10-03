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
  register: (key: string, slot: WordSlot | null) => void;
}

/**
 * A verse in marker mode: its words in a wrapping row, each its own view so it can be
 * measured, coloured where marked and where the finger is marking now.
 */
export const MarkableVerse = memo(function MarkableVerse({ verse, fontSize, lineHeight, font, theme, marks, selection, selectionColor, register }: Props) {
  const words = useMemo(() => wordsOf(verse.text), [verse.text]);
  const gap = Math.round(fontSize * 0.28);
  return (
    <View style={styles.row}>
      {verse.verse > 0 ? (
        <Text style={[styles.number, { color: theme.accent, fontSize: Math.max(11, fontSize - 6), lineHeight, marginRight: gap }]}>{verse.verse}</Text>
      ) : null}
      {words.map((w) => {
        const selected = selection && w.start < selection[1] && w.end > selection[0];
        const mark = [...marks].reverse().find(([a, b]) => w.start < b && w.end > a);
        const key = `${verse.book}:${verse.chapter}:${verse.verse}:${w.start}`;
        return (
          <View
            key={w.start}
            collapsable={false}
            ref={(view) => register(key, view ? { verse: verse.verse, start: w.start, end: w.end, view } : null)}
            style={[
              { marginRight: gap, borderRadius: 4 },
              mark && { backgroundColor: theme.marks[mark[2]] },
              selected && { backgroundColor: selectionColor },
            ]}
          >
            <Text style={[{ fontSize, lineHeight, color: theme.text, fontFamily: font }, verse.verse === 0 && styles.title]}>{w.text}</Text>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  number: { fontWeight: '700' },
  title: { fontStyle: 'italic' },
});
