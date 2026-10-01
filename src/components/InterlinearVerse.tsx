import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { stripCantillation } from '../text';
import { useTheme } from '../theme';
import { FLAG_LXX, FLAG_NOT_IN_NA, FLAG_RESTORED } from '../types';
import type { OriginalWord, WordPick } from '../types';

interface Props {
  words: OriginalWord[];
  hebrew: boolean;
  fontSize: number;
  onWord: (pick: WordPick) => void;
  showTranslit?: boolean;
  hideCantillation?: boolean;
}

/** The Hebrew or Greek words of one verse as a wrapping row of cells. */
export function InterlinearVerse({ words, hebrew, fontSize, onWord, showTranslit = true, hideCantillation = false }: Props) {
  const theme = useTheme();
  const small = Math.max(11, Math.round(fontSize * 0.68));
  return (
    <View style={[styles.row, hebrew && styles.rowRtl]}>
      {words.map((w, i) => {
        const marked = (w.flags & (FLAG_NOT_IN_NA | FLAG_LXX | FLAG_RESTORED)) !== 0;
        return (
          <Pressable
            key={i}
            onPress={() => onWord({ strongs: w.strongs, original: w })}
            disabled={!w.strongs && !w.morph}
            style={({ pressed }) => [
              styles.cell,
              { backgroundColor: pressed ? theme.accentSoft : 'transparent', borderBottomColor: marked ? theme.accent : 'transparent' },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${w.text}, ${w.gloss}`}
          >
            <Text style={[styles.original, { color: theme.text, fontSize: fontSize + (hebrew ? 5 : 3), writingDirection: hebrew ? 'rtl' : 'ltr' }]}>
              {hebrew && hideCantillation ? stripCantillation(w.text) : w.text}
            </Text>
            {showTranslit ? <Text style={[styles.sub, { color: theme.muted, fontSize: small }]}>{w.translit}</Text> : null}
            <Text style={[styles.sub, { color: theme.text, fontSize: small }]}>{w.gloss}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 6, marginBottom: 4 },
  rowRtl: { flexDirection: 'row-reverse' },
  cell: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 2,
    marginBottom: 6,
    borderRadius: 6,
    borderBottomWidth: 2,
    maxWidth: 180,
  },
  original: { lineHeight: undefined },
  sub: { textAlign: 'center', marginTop: 1 },
});
