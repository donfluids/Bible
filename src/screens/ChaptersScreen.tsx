import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header } from '../components/Header';
import { useTheme } from '../theme';
import type { Book } from '../types';

interface Props {
  book: Book;
  current?: number;
  onPick: (chapter: number) => void;
  onBack: () => void;
}

export function ChaptersScreen({ book, current, onPick, onBack }: Props) {
  const theme = useTheme();
  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={book.name} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.grid}>
        {chapters.map((c) => {
          const active = c === current;
          return (
            <Pressable
              key={c}
              onPress={() => onPick(c)}
              style={({ pressed }) => [
                styles.cell,
                { borderColor: theme.border, backgroundColor: active ? theme.accent : pressed ? theme.accentSoft : theme.card },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${book.name} chapter ${c}`}
            >
              <Text style={[styles.cellText, { color: active ? '#fff' : theme.text }]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 10, paddingBottom: 40 },
  cell: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
