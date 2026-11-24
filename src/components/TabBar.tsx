import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, StackActions } from '@react-navigation/native';
import { HEADER_MAX_FONT_SCALE, SHORT_SCREEN } from './Header';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { languageScript } from '../fonts';
import { useT } from '../i18n';
import { useDisplaySettings } from '../settings';
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
 * The bar's height for a window this tall: what the screens above it allow for (the
 * reader's arrows and the fade above them, the toasts), so they sit on the bar as drawn.
 */
export function tabBarHeight(windowHeight: number): number {
  return windowHeight < SHORT_SCREEN ? SHORT_BAR_HEIGHT : TAB_BAR_HEIGHT;
}

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
 * `hidden` folds it away (the reader does this while marking text); the space for the
 * phone's own navigation bar stays.
 *
 * `slide` (the reader) floats the bar over the bottom of the text instead, and moves it by
 * the value given (1 shown, 0 gone below the screen's edge): it slides away while the text
 * is read downward and back on scrolling up, the text never changing size under it.
 */
export function TabBar({ current, hidden = false, slide, away = false }: { current: TabName; hidden?: boolean; slide?: Animated.Value; away?: boolean }) {
  const theme = useTheme();
  const t = useT();
  // Malayalam, Tamil and Hindi letters read small at 12: their labels are a point larger.
  const labelSize = languageScript(useDisplaySettings()?.language ?? 'en') ? 13 : 12;
  const insets = useSafeAreaInsets();
  const windowHeight = useWindowDimensions().height;
  const short = windowHeight < SHORT_SCREEN;
  const shown = useRef(new Animated.Value(hidden ? 0 : 1)).current;
  useEffect(() => {
    // Height cannot use the native driver; the list above resizes with it.
    Animated.timing(shown, { toValue: hidden ? 0 : 1, duration: 180, useNativeDriver: false }).start();
  }, [hidden, shown]);
  const height = shown.interpolate({ inputRange: [0, 1], outputRange: [0, tabBarHeight(windowHeight)] });
  const total = tabBarHeight(windowHeight) + insets.bottom + 2;
  const floating = slide
    ? [styles.floating, { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [total, 0] }) }] }]
    : null;
  return (
    <Animated.View
      style={[{ paddingBottom: insets.bottom, backgroundColor: theme.bg }, floating]}
      pointerEvents={away ? 'none' : 'auto'}
      accessibilityElementsHidden={away}
      importantForAccessibility={away ? 'no-hide-descendants' : 'auto'}
    >
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
                  style={[styles.label, { fontSize: labelSize, color: selected ? theme.accent : theme.muted, fontWeight: selected ? '700' : '500' }]}
                >
                  {label}
                </Text>
              )}
            </Pressable>
          );
        })}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { overflow: 'hidden', borderTopWidth: StyleSheet.hairlineWidth },
  floating: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  tabs: { flex: 1, flexDirection: 'row', width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  indicator: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12 },
});
