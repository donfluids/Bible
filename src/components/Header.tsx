import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useTheme } from '../theme';

interface Props {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  /** Replaces the plain title when given. */
  center?: React.ReactNode;
  right?: React.ReactNode;
}

export function Header({ title, onBack, backLabel, center, right }: Props) {
  const theme = useTheme();
  const t = useT();
  const back = backLabel ?? t('back');
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6, backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
      <View style={[styles.side, !onBack && styles.sideEmpty]}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={[styles.backGlyph, { color: theme.accent }]}>‹</Text>
            <Text style={[styles.backText, { color: theme.accent }]}>{back}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.center, !onBack && styles.centerLeft]}>
        {center ?? (
          <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
            {title}
          </Text>
        )}
      </View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  active?: boolean;
  accessibilityLabel?: string;
}

/** Compact text button for the header bar. */
export function HeaderButton({ label, onPress, active, accessibilityLabel }: ButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.button,
        { borderColor: theme.border, backgroundColor: active ? theme.accentSoft : 'transparent', opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: theme.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { minWidth: 72, flexDirection: 'row', alignItems: 'center' },
  sideEmpty: { minWidth: 0 },
  right: { justifyContent: 'flex-end', gap: 6 },
  center: { flex: 1, alignItems: 'center' },
  centerLeft: { alignItems: 'flex-start' },
  title: { fontSize: 17, fontWeight: '600' },
  back: { flexDirection: 'row', alignItems: 'center' },
  backGlyph: { fontSize: 30, lineHeight: 32, marginRight: 2, marginTop: -3 },
  backText: { fontSize: 16 },
  button: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  buttonText: { fontSize: 14, fontWeight: '600' },
});
