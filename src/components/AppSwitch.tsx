import React from 'react';
import { Switch } from 'react-native';
import { useTheme } from '../theme';

/** A switch whose track shows when off as well as on. */
export function AppSwitch({ value, onValueChange, accessibilityLabel }: { value: boolean; onValueChange: (value: boolean) => void; accessibilityLabel?: string }) {
  const theme = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: theme.dark ? '#4A4238' : '#CFC6B8', true: theme.accent }}
      thumbColor={value ? theme.onAccent : theme.dark ? theme.muted : '#FFFFFF'}
      ios_backgroundColor={theme.dark ? '#4A4238' : '#CFC6B8'}
    />
  );
}
