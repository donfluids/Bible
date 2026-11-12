import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from './Pressable';
import { useT } from '../i18n';
import { useTheme } from '../theme';

/** A place on the screen, in points from the top left of the view the hint covers. */
export interface Spot {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  /** What the hint points at, left lit while the rest dims; null dims everything. */
  spot: Spot | null;
  /** The size of the view the hint covers. */
  area: { width: number; height: number };
  title: string;
  text: string;
  onDone: () => void;
}

const DIM = 'rgba(31, 27, 22, 0.5)';
const BUBBLE_WIDTH = 300;

/**
 * A hint shown once over a screen: the screen dims but for the thing spoken of, and a
 * bubble under it says what it does. The lit place is left open by four dim pieces around
 * it, so nothing depends on how a phone draws shadows.
 */
export function Hint({ spot, area, title, text, onDone }: Props) {
  const theme = useTheme();
  const t = useT();
  const s = spot ? { x: Math.max(0, spot.x), y: Math.max(0, spot.y), width: Math.min(area.width, spot.width), height: spot.height } : null;
  const below = s ? s.y + s.height + 14 : area.height * 0.3;
  // Under the lit place where there is room, else above it.
  const top = s && below > area.height - 190 ? Math.max(12, s.y - 180) : below;
  const left = Math.max(12, Math.min(area.width - BUBBLE_WIDTH - 12, s ? s.x + s.width / 2 - BUBBLE_WIDTH / 2 : (area.width - BUBBLE_WIDTH) / 2));
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      {s ? (
        <>
          <View style={[styles.dim, { left: 0, right: 0, top: 0, height: s.y }]} />
          <View style={[styles.dim, { left: 0, right: 0, top: s.y + s.height, bottom: 0 }]} />
          <View style={[styles.dim, { left: 0, width: s.x, top: s.y, height: s.height }]} />
          <View style={[styles.dim, { left: s.x + s.width, right: 0, top: s.y, height: s.height }]} />
          <View pointerEvents="none" style={[styles.edge, { left: s.x, top: s.y, width: s.width, height: s.height }]} />
        </>
      ) : (
        <View style={[styles.dim, StyleSheet.absoluteFill]} />
      )}
      {/* A tap anywhere closes the hint, as its button does. */}
      <Pressable onPress={onDone} accessibilityLabel={t('gotIt')} style={StyleSheet.absoluteFill} />
      <View style={[styles.bubble, { top, left, width: Math.min(BUBBLE_WIDTH, area.width - 24), backgroundColor: theme.card }]} accessibilityLiveRegion="polite">
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[styles.text, { color: theme.text }]}>{text}</Text>
        <Pressable onPress={onDone} accessibilityRole="button" hitSlop={10} style={styles.button}>
          <Text style={[styles.buttonText, { color: theme.accent }]}>{t('gotIt')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  edge: { position: 'absolute', borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 12 },
  bubble: { position: 'absolute', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  text: { fontSize: 15, lineHeight: 22 },
  button: { alignSelf: 'flex-end', marginTop: 8, minHeight: 32, justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '600' },
});
