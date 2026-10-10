import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useTheme } from '../theme';
import { Icon, IconButton } from './Icon';
import type { IconName } from './Icon';

interface Props {
  title?: string;
  onBack?: () => void;
  /** Read out for the back button; it shows as an arrow. */
  backLabel?: string;
  /** Replaces the plain title when given. */
  center?: React.ReactNode;
  right?: React.ReactNode;
}

/**
 * The most the phone's font-size setting may enlarge text in the top bar. Past this the
 * title and the buttons beside it no longer fit on a narrow phone; the Bible text itself
 * still follows the phone's setting in full.
 */
export const HEADER_MAX_FONT_SCALE = 1.2;

/** The Android top bar: back arrow, title on the left, icon buttons on the right. */
export function Header({ title, onBack, backLabel, center, right }: Props) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: theme.bg, paddingLeft: onBack ? 4 : 16 }]}>
      {onBack ? <IconButton name="arrow_back" onPress={onBack} accessibilityLabel={backLabel ?? t('back')} color={theme.text} /> : null}
      <View style={[styles.center, onBack && styles.centerAfterBack]}>
        {center ?? (
          <Text numberOfLines={1} maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE} style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {title}
          </Text>
        )}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

/** An icon button for the top bar. */
export function HeaderIconButton({ icon, onPress, accessibilityLabel }: { icon: IconName; onPress: () => void; accessibilityLabel: string }) {
  return <IconButton name={icon} onPress={onPress} accessibilityLabel={accessibilityLabel} />;
}

/** A tonal chip with an icon and a short label, such as the translation switch. */
export function HeaderChip({ icon, label, onPress, accessibilityLabel }: { icon: IconName; label: string; onPress: () => void; accessibilityLabel: string }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: theme.border }}
      hitSlop={8}
      style={({ pressed }) => [styles.chip, { backgroundColor: theme.accentSoft, opacity: pressed ? 0.8 : 1 }]}
    >
      <Icon name={icon} size={18} color={theme.accent} />
      <Text maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE} style={[styles.chipText, { color: theme.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingRight: 4 },
  center: { flex: 1, justifyContent: 'center', minHeight: 48 },
  centerAfterBack: { marginLeft: 4 },
  title: { fontSize: 22, fontWeight: '500' },
  right: { flexDirection: 'row', alignItems: 'center' },
  chip: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 12,
    marginRight: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chipText: { fontSize: 14, fontWeight: '600' },
});
