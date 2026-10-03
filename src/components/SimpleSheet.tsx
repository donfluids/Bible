import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useTheme } from '../theme';
import { Icon, IconButton } from './Icon';
import type { IconName } from './Icon';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * A bottom sheet for notes, verse actions and the like, in the word sheet's style: it
 * slides up, has 24 dp corners and a grip, and closes by dragging it down, tapping
 * outside or the close button.
 */
export function SimpleSheet({ visible, title, onClose, children }: Props) {
  if (!visible) return null;
  return (
    <SheetBody title={title} onClose={onClose}>
      {children}
    </SheetBody>
  );
}

function SheetBody({ title, onClose, children }: Omit<Props, 'visible'>) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  // 0 = shown, 1 = below the screen; a drag moves it by pixels on top of that.
  const shown = useRef(new Animated.Value(1)).current;
  const drag = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(shown, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  }, [shown]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 90 || g.vy > 1) onClose();
          else Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        },
        onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(),
      }),
    [drag, onClose],
  );
  const translateY = Animated.add(shown.interpolate({ inputRange: [0, 1], outputRange: [0, 600] }), drag);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('close')} />
      <Animated.View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: insets.bottom + 12, transform: [{ translateY }] }]}>
        <View {...pan.panHandlers}>
          <View style={styles.gripHit}>
            <View style={[styles.grip, { backgroundColor: theme.border }]} />
          </View>
          <View style={styles.head}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2} accessibilityRole="header">
              {title}
            </Text>
            <IconButton name="close" onPress={onClose} accessibilityLabel={t('close')} style={styles.close} />
          </View>
        </View>
        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

interface ActionProps {
  label: string;
  detail?: string;
  icon?: IconName;
  onPress: () => void;
  destructive?: boolean;
}

/** A row in a sheet: an icon, a label and an optional line under it. */
export function SheetAction({ label, detail, icon, onPress, destructive }: ActionProps) {
  const theme = useTheme();
  const color = destructive ? theme.error : theme.text;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.accentSoft }}
      style={({ pressed }) => [styles.action, { backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
      accessibilityRole="button"
    >
      {icon ? <Icon name={icon} color={destructive ? theme.error : theme.muted} /> : null}
      <View style={styles.actionTexts}>
        <Text style={[styles.actionText, { color }]}>{label}</Text>
        {detail ? (
          <Text style={[styles.actionDetail, { color: theme.muted }]} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,17,13,0.32)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
  },
  gripHit: { alignSelf: 'center', paddingTop: 10, paddingBottom: 6, paddingHorizontal: 24 },
  grip: { width: 40, height: 5, borderRadius: 3 },
  head: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginBottom: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '500' },
  close: { marginRight: -12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 56, paddingVertical: 8, marginHorizontal: -20, paddingHorizontal: 20 },
  actionTexts: { flex: 1 },
  actionText: { fontSize: 16 },
  actionDetail: { fontSize: 13, lineHeight: 18, marginTop: 2 },
});
