import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HEBREW_FONT } from '../fonts';
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

/**
 * The object marker אֵת (H853) is not translated; STEPBible glosses it "<obj.>". The
 * label is dropped, and an אֵת that carries nothing else is shown faded with no meaning
 * line. One joined to "and" or a pronoun (וְאֵת "and", אֹתוֹ "him") shows that part.
 */
const OBJECT_MARKER = 'H853';
function objectMarkerGloss(gloss: string): string {
  return gloss.replace(/<obj\.>/g, '').replace(/\s+/g, ' ').trim();
}

/** The Hebrew or Greek words of one verse as a wrapping row of cells. */
export function InterlinearVerse({ words, hebrew, fontSize, onWord, showTranslit = true, hideCantillation = false }: Props) {
  const theme = useTheme();
  const small = Math.max(11, Math.round(fontSize * 0.68));
  return (
    <View style={[styles.row, hebrew && styles.rowRtl]}>
      {words.map((w, i) => {
        const marked = (w.flags & (FLAG_NOT_IN_NA | FLAG_LXX | FLAG_RESTORED)) !== 0;
        const gloss = w.strongs === OBJECT_MARKER ? objectMarkerGloss(w.gloss) : w.gloss;
        const faded = w.strongs === OBJECT_MARKER && !gloss;
        return (
          <Pressable
            android_ripple={{ color: theme.accentSoft }}
            key={i}
            onPress={() => onWord({ strongs: w.strongs, original: w })}
            disabled={!w.strongs && !w.morph}
            style={({ pressed }) => [
              styles.cell,
              { backgroundColor: pressed ? theme.accentSoft : 'transparent', borderBottomColor: marked ? theme.accent : 'transparent' },
            ]}
            accessibilityRole="button"
            accessibilityLabel={faded ? w.text : `${w.text}, ${gloss}`}
          >
            <Text style={[styles.original, { color: faded ? theme.muted : theme.text, fontSize: fontSize + (hebrew ? 5 : 3), writingDirection: hebrew ? 'rtl' : 'ltr', fontFamily: hebrew ? HEBREW_FONT : undefined }]}>
              {hebrew && hideCantillation ? stripCantillation(w.text) : w.text}
            </Text>
            {showTranslit ? <Text style={[styles.sub, { color: theme.muted, fontSize: small }]}>{w.translit}</Text> : null}
            {gloss ? <Text style={[styles.sub, { color: theme.text, fontSize: small }]}>{gloss}</Text> : null}
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
