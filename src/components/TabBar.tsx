import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, StackActions } from '@react-navigation/native';
import { HEADER_MAX_FONT_SCALE, SHORT_SCREEN } from './Header';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { useT } from '../i18n';
import type { StringKey } from '../i18n';
import { navigationRef } from '../navigation';
import { MAX_CONTENT_WIDTH } from '../text';
import { useTheme } from '../theme';

/** The four places the bar switches between; each is a screen of the stack. */
export type TabName = 'Reader' | 'Books' | 'Bookmarks' | 'Notebook';

const TABS: { name: TabName; icon: IconName; selectedIcon: IconName; label: StringKey }[] = [
  { name: 'Reader', icon: 'menu_book', selectedIcon: 'menu_book_fill', label: 'tabRead' },
  { name: 'Books', icon: 'format_list_bulleted', selectedIcon: 'format_list_bulleted', label: 'books' },
  { name: 'Bookmarks', icon: 'bookmarks', selectedIcon: 'bookmarks_fill', label: 'saved' },
  { name: 'Notebook', icon: 'note_stack', selectedIcon: 'note_stack_fill', label: 'notebook' },
];

/** Height of the bar above the system navigation area. */
export const TAB_BAR_HEIGHT = 64;
/** On a phone turned on its side the bar is a row of icons, so more text shows. */
const SHORT_BAR_HEIGHT = 40;

/**
 * Shows a tab. The main reader is always at the bottom of the stack and the other tabs
 * sit directly on it, so the back button from any tab returns to the reading.
 */
export function switchTab(to: TabName): void {
  if (!navigationRef.isReady()) return;
  const state = navigationRef.getRootState();
  if (!state) return;
  if (to === 'Reader') {
    if (state.index > 0) navigationRef.dispatch(StackActions.popToTop());
    return;
  }
  if (state.index === 1 && state.routes[1].name === to) return;
  navigationRef.dispatch(CommonActions.reset({ ...state, index: 1, routes: [state.routes[0], { key: `${to}-${Date.now()}`, name: to }] }));
}

/**
 * The bar along the bottom of the reading screen, the book list, Saved and the notebook.
 * `hidden` folds it away (the reader does this while the text is scrolled down); the
 * space for the phone's own navigation bar stays.
 */
export function TabBar({ current, hidden = false }: { current: TabName; hidden?: boolean }) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const short = useWindowDimensions().height < SHORT_SCREEN;
  const shown = useRef(new Animated.Value(hidden ? 0 : 1)).current;
  useEffect(() => {
    // Height cannot use the native driver; the list above resizes with it.
    Animated.timing(shown, { toValue: hidden ? 0 : 1, duration: 180, useNativeDriver: false }).start();
  }, [hidden, shown]);
  const height = shown.interpolate({ inputRange: [0, 1], outputRange: [0, short ? SHORT_BAR_HEIGHT : TAB_BAR_HEIGHT] });
  return (
    <View style={{ paddingBottom: insets.bottom, backgroundColor: theme.bg }}>
      <Animated.View
        style={[styles.bar, { height, opacity: shown, borderTopColor: theme.border }]}
        accessibilityRole="tablist"
        importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      >
        {/* On a tablet the tabs keep to the reading width rather than spread to the edges. */}
        <View style={styles.tabs}>
        {TABS.map((tab) => {
          const selected = tab.name === current;
          const label = t(tab.label);
          return (
            <Pressable
              key={tab.name}
              onPress={() => switchTab(tab.name)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
            >
              <View style={[styles.indicator, selected && { backgroundColor: theme.accentSoft }]}>
                <Icon name={selected ? tab.selectedIcon : tab.icon} color={selected ? theme.accent : theme.muted} />
              </View>
              {short ? null : (
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE}
                  style={[styles.label, { color: selected ? theme.accent : theme.muted, fontWeight: selected ? '700' : '500' }]}
                >
                  {label}
                </Text>
              )}
            </Pressable>
          );
        })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { overflow: 'hidden', borderTopWidth: StyleSheet.hairlineWidth },
  tabs: { flex: 1, flexDirection: 'row', width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  indicator: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12 },
});
