import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatRef } from '../text';
import { useTheme } from '../theme';
import type { Book, VerseRow, WordPick } from '../types';
import { VerseText } from './VerseText';

interface Props {
  verse: VerseRow;
  books: Book[];
  fontSize: number;
  onOpen: (verse: VerseRow) => void;
  onWord: (pick: WordPick) => void;
  emphasize?: string;
}

/** A verse in a results list: the reference opens the chapter, words open the word sheet. */
export function VerseListItem({ verse, books, fontSize, onOpen, onWord, emphasize }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onOpen(verse)}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
    >
      <View style={styles.refRow}>
        <Text style={[styles.ref, { color: theme.accent }]}>{formatRef(books, verse)}</Text>
        <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
      </View>
      <VerseText verse={verse} fontSize={fontSize} onWord={onWord} underline={false} emphasize={emphasize} showNumber={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ref: { fontSize: 14, fontWeight: '700' },
  chevron: { fontSize: 20, lineHeight: 20 },
});
