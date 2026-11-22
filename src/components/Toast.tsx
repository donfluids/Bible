import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { useT } from '../i18n';
import { useTheme } from '../theme';
import { Pressable } from './Pressable';

export interface ToastState {
  text: string;
  undo?: () => void;
}

/** A short message; one with an undo stays longer. Said by a screen reader too. */
export function useToast() {
  const [toast, setState] = useState<ToastState | null>(null);
  const show = useCallback((text: string | null, undo?: () => void) => setState(text ? { text, undo } : null), []);
  useEffect(() => {
    if (!toast) return;
    AccessibilityInfo.announceForAccessibility(toast.text);
    const timer = setTimeout(() => setState(null), toast.undo ? 6000 : 1600);
    return () => clearTimeout(timer);
  }, [toast]);
  return { toast, show };
}

/** The message at the foot of the screen, `bottom` above the screen's edge. */
export function Toast({ toast, bottom, onDone }: { toast: ToastState | null; bottom: number; onDone: () => void }) {
  const theme = useTheme();
  const t = useT();
  if (!toast) return null;
  const undo = toast.undo;
  return (
    <View style={[styles.toast, { backgroundColor: theme.text, bottom }]} pointerEvents={undo ? 'box-none' : 'none'}>
      <Text style={[styles.text, { color: theme.bg }]}>{toast.text}</Text>
      {undo ? (
        <Pressable
          onPress={() => {
            undo();
            onDone();
          }}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.action}
        >
          <Text style={[styles.text, styles.actionText, { color: theme.bg }]}>{t('undo')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '88%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  text: { flexShrink: 1, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  action: { minHeight: 40, justifyContent: 'center', paddingLeft: 12, paddingRight: 4 },
  actionText: { textDecorationLine: 'underline' },
});
