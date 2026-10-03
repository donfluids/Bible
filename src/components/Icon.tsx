import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import ICON_CODES from '../iconCodes.json';
import { useTheme } from '../theme';

/**
 * Icons from Material Symbols Rounded (Apache License 2.0), cut down to the ones the app
 * uses by scripts/make-icon-font.py and built into the app as the BibleIcons font. An
 * icon is one character of that font, so it sizes and colours like text and can sit
 * inside a line of text.
 */
export type IconName = keyof typeof ICON_CODES;

const ICON_FONT = 'BibleIcons';

export function Icon({ name, size = 24, color, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return (
    <Text
      style={[{ fontFamily: ICON_FONT, fontSize: size, lineHeight: size, color: color ?? theme.text, includeFontPadding: false }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {String.fromCharCode(ICON_CODES[name])}
    </Text>
  );
}

/** The icon's character, for an icon set inside a run of text. */
export function iconChar(name: IconName): string {
  return String.fromCharCode(ICON_CODES[name]);
}
export const ICON_FONT_FAMILY = ICON_FONT;

interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A 48 dp round button holding one icon, with the Android ripple. */
export function IconButton({ name, onPress, accessibilityLabel, color, size = 24, disabled, style }: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      android_ripple={{ color: theme.accentSoft, borderless: true, radius: 24 }}
      style={({ pressed }) => [styles.button, { opacity: disabled ? 0.38 : pressed ? 0.7 : 1 }, style]}
    >
      <Icon name={name} size={size} color={color ?? theme.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
});
