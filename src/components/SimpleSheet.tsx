import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, KeyboardAvoidingView, Modal, PanResponder, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Pressable } from './Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useTheme } from '../theme';
import { useBlockKeys } from '../keys';
import { SHORT_SCREEN } from './Header';
import { Icon, IconButton } from './Icon';
import type { IconName } from './Icon';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Rows opened at the end of the sheet (a group shown in place): when this turns true, the
   * sheet scrolls to its end once they are laid out, so they are seen, not left below the edge.
   */
  openedAtEnd?: boolean;
}

/**
 * A bottom sheet for notes, verse actions and the like, in the word sheet's style: it
 * slides up, has 24 dp corners and a grip, and closes by dragging it down, tapping
 * outside or the close button.
 */
export function SimpleSheet({ visible, title, onClose, children, openedAtEnd }: Props) {
  if (!visible) return null;
  return (
    <SheetBody title={title} onClose={onClose} openedAtEnd={openedAtEnd}>
      {children}
    </SheetBody>
  );
}

function SheetBody({ title, onClose, children, openedAtEnd }: Omit<Props, 'visible'>) {
  // An arrow key on a keyboard does not turn the chapter under an open sheet.
  useBlockKeys(true);
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  // On a phone on its side the sheet may take nearly all the height, so more of the list shows.
  const short = useWindowDimensions().height < SHORT_SCREEN;
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
  // Only a change while the sheet is open scrolls: one opened with the group already shown
  // starts at its top, as any sheet does.
  const scroller = useRef<ScrollView>(null);
  const wasOpened = useRef(openedAtEnd);
  const toEnd = useRef(false);
  useEffect(() => {
    if (openedAtEnd && !wasOpened.current) toEnd.current = true;
    wasOpened.current = openedAtEnd;
  }, [openedAtEnd]);
  const translateY = Animated.add(shown.interpolate({ inputRange: [0, 1], outputRange: [0, 600] }), drag);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* The backdrop closes the sheet with a tap; screen readers use the close button instead. */}
      <Pressable style={styles.backdrop} onPress={onClose} importantForAccessibility="no" accessibilityElementsHidden />
      {/* Lifted above the keyboard while a note is typed: the app draws edge to edge, so Android does not resize it. */}
      <KeyboardAvoidingView behavior="padding" style={styles.lift} pointerEvents="box-none">
        <Animated.View onAccessibilityEscape={onClose} style={[styles.sheet, short && styles.sheetShort, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: insets.bottom + 12, transform: [{ translateY }] }]}>
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
          <ScrollView
            ref={scroller}
            style={{ flexGrow: 0 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (!toEnd.current) return;
              toEnd.current = false;
              scroller.current?.scrollToEnd({ animated: true });
            }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface ActionProps {
  label: string;
  detail?: string;
  icon?: IconName;
  onPress: () => void;
  destructive?: boolean;
  /** Lines of the detail shown (three by default); 0 shows all of it, for a detail that must be read whole. */
  detailLines?: number;
  /** A bundled typeface for the label, for a name in an Indian script. */
  labelFont?: string;
  /** The choice now in use, for a screen reader (the tick shows it on screen). */
  selected?: boolean;
  /** What the row does, read by a screen reader but not shown: a short row on screen. */
  hint?: string;
  /** A number after the label (how many cross references, for instance). */
  count?: number;
  /** A row that shows or hides the rows under it: whether they are shown. */
  expanded?: boolean;
  /** A row shown under an open row, set in a little. */
  inner?: boolean;
}

/** A row in a sheet: an icon, a label and an optional line under it. */
export function SheetAction({ label, detail, icon, onPress, destructive, detailLines = 3, labelFont, selected, hint, count, expanded, inner }: ActionProps) {
  const theme = useTheme();
  const color = destructive ? theme.error : theme.text;
  const state = selected === undefined && expanded === undefined ? undefined : { ...(selected === undefined ? {} : { selected }), ...(expanded === undefined ? {} : { expanded }) };
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.accentSoft }}
      style={({ pressed }) => [styles.action, inner ? styles.inner : null, { backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
      accessibilityRole="button"
      accessibilityLabel={count === undefined ? undefined : `${label}, ${count}`}
      accessibilityHint={hint}
      accessibilityState={state}
    >
      {icon ? <Icon name={icon} color={destructive ? theme.error : theme.muted} /> : null}
      <View style={styles.actionTexts}>
        <Text style={[styles.actionText, { color }, labelFont ? { fontFamily: labelFont } : null]}>
          {label}
          {count === undefined ? null : <Text style={{ color: theme.muted }}>{`  ${count}`}</Text>}
        </Text>
        {detail ? (
          <Text style={[styles.actionDetail, { color: theme.muted }]} numberOfLines={detailLines || undefined}>
            {detail}
          </Text>
        ) : null}
      </View>
      {expanded === undefined ? null : <Icon name={expanded ? 'expand_less' : 'expand_more'} color={theme.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,17,13,0.32)' },
  lift: { flex: 1, justifyContent: 'flex-end' },
  sheetShort: { maxHeight: '94%' },
  sheet: {
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
  inner: { paddingLeft: 60, minHeight: 52 },
  actionText: { fontSize: 16 },
  actionDetail: { fontSize: 13, lineHeight: 18, marginTop: 2 },
});
