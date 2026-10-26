import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Pressable } from './Pressable';
import { useTheme } from '../theme';
import { Icon } from './Icon';

/**
 * Connected buttons for picking one of a few options. The selected one is filled, and
 * ticked when there is room (three options or fewer; four Malayalam words leave none).
 * Four options on a narrow phone stand two by two, so a long word (ഫോണിലേതുപോലെ) fits.
 */
export function Segmented<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (value: T) => void }) {
  const theme = useTheme();
  const narrow = useWindowDimensions().width < 420;
  const grid = options.length === 4 && narrow;
  return (
    <View style={[styles.segmented, grid && styles.grid, { borderColor: theme.muted }]} accessibilityRole="radiogroup">
      {options.map(([option, label], i) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            android_ripple={{ color: theme.accentSoft }}
            style={[
              styles.segment,
              grid && styles.gridSegment,
              (grid ? i % 2 === 1 : i > 0) && { borderLeftWidth: 1, borderLeftColor: theme.muted },
              grid && i >= 2 && { borderTopWidth: 1, borderTopColor: theme.muted },
              active && { backgroundColor: theme.accentSoft },
            ]}
          >
            {active && options.length <= 3 ? <Icon name="check" size={18} color={theme.accent} /> : null}
            {/* A long label (ഫോണിലേതുപോലെ) takes a second line rather than being cut. */}
            <Text numberOfLines={2} style={[styles.segmentText, { color: active ? theme.accent : theme.text }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  segment: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 4 },
  grid: { flexWrap: 'wrap' },
  gridSegment: { flexBasis: '50%', flexGrow: 0 },
  segmentText: { fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'center' },
});
