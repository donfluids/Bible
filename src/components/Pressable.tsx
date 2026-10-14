import React, { forwardRef } from 'react';
import { Platform, Pressable as RNPressable, StyleSheet } from 'react-native';
import type { PressableProps, PressableStateCallbackType, StyleProp, View, ViewStyle } from 'react-native';

/**
 * React Native's Pressable, with feedback on iOS too. A pressable surface here shows the
 * Android ripple when pressed; iOS has no ripple, so there the surface dims instead,
 * unless its style already reacts to being pressed.
 */
export const Pressable = forwardRef<View, PressableProps>(function Pressable({ style, ...rest }, ref) {
  if (Platform.OS !== 'ios' || !rest.android_ripple || typeof style === 'function') return <RNPressable ref={ref} style={style} {...rest} />;
  const dimmed = (state: PressableStateCallbackType): StyleProp<ViewStyle> => [style as StyleProp<ViewStyle>, state.pressed && styles.pressed];
  return <RNPressable ref={ref} style={dimmed} {...rest} />;
});

const styles = StyleSheet.create({
  pressed: { opacity: 0.55 },
});
