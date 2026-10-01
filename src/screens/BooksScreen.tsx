import React from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { Header } from '../components/Header';
import { useTheme } from '../theme';
import type { Book } from '../types';

interface Props {
  books: Book[];
  current: number;
  onPick: (book: Book) => void;
  onBack: () => void;
}

export function BooksScreen({ books, current, onPick, onBack }: Props) {
  const theme = useTheme();
  const sections = [
    { title: 'Old Testament · Hebrew', data: books.filter((b) => b.testament === 'OT') },
    { title: 'New Testament · Greek', data: books.filter((b) => b.testament === 'NT') },
  ];
  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title="Books" onBack={onBack} />
      <SectionList
        sections={sections}
        keyExtractor={(b) => String(b.id)}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <Text style={[styles.section, { color: theme.muted, backgroundColor: theme.bg }]}>{section.title.toUpperCase()}</Text>
        )}
        renderItem={({ item }) => {
          const active = item.id === current;
          return (
            <Pressable
              onPress={() => onPick(item)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: theme.border, backgroundColor: pressed || active ? theme.accentSoft : 'transparent' },
              ]}
            >
              <Text style={[styles.name, { color: theme.text, fontWeight: active ? '700' : '400' }]}>{item.name}</Text>
              <Text style={[styles.count, { color: theme.muted }]}>{item.chapters}</Text>
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 17 },
  count: { fontSize: 15, fontVariant: ['tabular-nums'] },
});
