import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from './Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { IPHONE_LOOK } from '../platform';
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

const IOS = IPHONE_LOOK;

/**
 * The top bar: back arrow, title, icon buttons on the right. On Android the title stands
 * on the left; on iPhone a plain title is centred, as iPhone apps have it, and the back
 * arrow is the iPhone chevron.
 */
export function Header({ title, onBack, backLabel, center, right }: Props) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  // To centre the title between buttons of different widths, the narrower side is padded
  // to the width of the wider one.
  const centred = IOS && !center;
  const [sides, setSides] = useState({ left: 0, right: 0 });
  const pad = sides.right - sides.left;
  return (
    <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: theme.bg, paddingLeft: onBack ? 4 : 16 }]}>
      {onBack ? (
        <View onLayout={centred ? (e) => setSides((s) => ({ ...s, left: e.nativeEvent.layout.width + 4 })) : undefined}>
          <IconButton name={IOS ? 'arrow_back_ios_new' : 'arrow_back'} onPress={onBack} accessibilityLabel={backLabel ?? t('back')} color={theme.text} />
        </View>
      ) : null}
      <View style={[styles.center, onBack && styles.centerAfterBack, centred && { paddingLeft: Math.max(0, pad), paddingRight: Math.max(0, -pad) }]}>
        {center ?? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE}
            style={[styles.title, { color: theme.text }, centred && styles.titleCentred]}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}
      </View>
      {right ? (
        <View style={styles.right} onLayout={centred ? (e) => setSides((s) => ({ ...s, right: e.nativeEvent.layout.width })) : undefined}>
          {right}
        </View>
      ) : null}
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
  // Room above and below for Malayalam's stacked letters (ഞായറാഴ്ച), which a tight line clips.
  title: { fontSize: 22, lineHeight: 30, paddingVertical: 2, fontWeight: '500' },
  titleCentred: { textAlign: 'center', fontWeight: '600' },
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
