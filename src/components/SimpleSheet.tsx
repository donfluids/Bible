import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** A small bottom sheet for notes and verse actions. */
export function SimpleSheet({ visible, title, onClose, children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: theme.muted }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={[styles.close, { color: theme.muted }]}>✕</Text>
          </Pressable>
        </View>
        <ScrollView style={{ flexGrow: 0 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

interface ActionProps {
  label: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
}

export function SheetAction({ label, detail, onPress, destructive }: ActionProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, { borderTopColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
      accessibilityRole="button"
    >
      <Text style={[styles.actionText, { color: destructive ? '#B3261E' : theme.text }]}>{label}</Text>
      {detail ? <Text style={[styles.actionDetail, { color: theme.muted }]}>{detail}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { maxHeight: '70%', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 20, paddingTop: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  close: { fontSize: 18, paddingHorizontal: 4 },
  action: { paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  actionText: { fontSize: 17 },
  actionDetail: { fontSize: 13, marginTop: 2 },
});
