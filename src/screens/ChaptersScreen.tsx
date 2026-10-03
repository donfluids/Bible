import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useT } from '../i18n';
import { useSettings } from '../settings';
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
  // Lists run under the system navigation bar; the last row must clear it.
  const insets = useSafeAreaInsets();
  const t = useT();
  const { settings } = useSettings();
  const title = book.names[settings.translation] && settings.translation !== 'KJV' && settings.translation !== 'WEB' ? book.names[settings.translation]! : book.name;
  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
  // As many columns of at least 56 dp as fit, stretched to fill the row exactly, so the
  // grid has no ragged gap on the right.
  const { width: windowWidth } = useWindowDimensions();
  const inner = Math.min(windowWidth, MAX_WIDTH) - PADDING * 2;
  const columns = Math.max(1, Math.floor((inner + GAP) / (MIN_CELL + GAP)));
  const cell = Math.floor((inner - GAP * (columns - 1)) / columns);
  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={title} onBack={onBack} backLabel={t('back')} />
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}>
        {chapters.map((c) => {
          const active = c === current;
          return (
            <Pressable
              key={c}
              onPress={() => onPick(c)}
              android_ripple={{ color: theme.accentSoft }}
              style={({ pressed }) => [
                styles.cell,
                { width: cell, height: Math.min(cell, 64) },
                { borderColor: theme.border, backgroundColor: active ? theme.accent : pressed ? theme.accentSoft : theme.card },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${title} ${c}`}
            >
              <Text style={[styles.cellText, { color: active ? theme.onAccent : theme.text }]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const MIN_CELL = 56;
const GAP = 10;
const PADDING = 14;
const MAX_WIDTH = 720;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: PADDING, gap: GAP, paddingBottom: 40, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  cell: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
