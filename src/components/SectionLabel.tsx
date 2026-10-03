import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../theme';

/**
 * The one style for a section's label in lists, settings and sheets: as written (no forced
 * capitals, which Malayalam does not have, and no letter spacing, which pulls Malayalam
 * conjuncts apart), in the accent colour.
 */
export function SectionLabel({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return (
    <Text style={[styles.label, { color: theme.accent }, style]} accessibilityRole="header">
      {text}
    </Text>
  );
}

export const sectionLabelStyle: TextStyle = { fontSize: 14, fontWeight: '600' };

const styles = StyleSheet.create({ label: sectionLabelStyle });
