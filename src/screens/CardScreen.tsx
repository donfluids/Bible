import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, PixelRatio, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { CARD_HEIGHT, CARD_PIXELS, CARD_WIDTH, DESIGNS, OCCASIONS, designById } from '../cards';
import type { CardSize, DesignId, Occasion } from '../cards';
import { Header } from '../components/Header';
import { IconButton } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { Segmented } from '../components/Segmented';
import { VerseCard } from '../components/VerseCard';
import { useT } from '../i18n';
import { getVerses } from '../queries';
import { MAX_CONTENT_WIDTH, flattenVerse, formatRef } from '../text';
import { useTheme } from '../theme';
import type { Book, Ref, TranslationId, VerseRow } from '../types';

/** The most verses one card takes. */
const MAX_VERSES = 6;
const CREDITS: Partial<Record<TranslationId, string>> = {
  MAL: 'സത്യവേദപുസ്തകം © The Free Bible Foundation · CC BY-SA 4.0',
  TAM: 'IRV © Bridge Connectivity Solutions · CC BY-SA 4.0',
};
const THUMB = 76;

interface Props {
  books: Book[];
  at: Ref;
  translation: TranslationId;
  onBack: () => void;
}

/**
 * "Share as card": the verse (and up to five after it) on a designed card, with an
 * occasion's heading and the sender's own line, shared as a picture.
 */
export function CardScreen({ books, at, translation, onBack }: Props) {
  const db = useSQLiteContext();
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [verses, setVerses] = useState<VerseRow[]>([]);
  const [count, setCount] = useState(1);
  const [size, setSize] = useState<CardSize>('square');
  const [occasion, setOccasion] = useState<Occasion>('none');
  const [designId, setDesignId] = useState<DesignId>('paper');
  const [heading, setHeading] = useState('');
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const card = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  // The text boxes are at the foot of the page: keep the one being typed in above the keyboard.
  const showInput = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 250);

  useEffect(() => {
    let cancelled = false;
    const refs = Array.from({ length: MAX_VERSES }, (_, i) => ({ book: at.book, chapter: at.chapter, verse: at.verse + i }));
    getVerses(db, translation, refs)
      .then((rows) => {
        if (cancelled) return;
        // The verse and those that follow it without a gap; a verse the translation leaves out ends the run.
        const run: VerseRow[] = [];
        for (const r of refs) {
          const row = rows.find((x) => x.verse === r.verse);
          if (!row || row.omitted) break;
          run.push(row);
        }
        setVerses(run);
      })
      .catch(() => setVerses([]));
    return () => {
      cancelled = true;
    };
  }, [db, translation, at.book, at.chapter, at.verse]);

  const shown = verses.slice(0, count);
  // The KJV's paragraph marks (¶) belong to the page, not the card.
  const text = shown.map((v) => flattenVerse(v.text).replace(/¶\s*/g, '')).join(' ');
  const first = shown[0];
  const last = shown[shown.length - 1];
  const reference = first ? (shown.length > 1 ? `${formatRef(books, first, translation)}–${last.verse}` : formatRef(books, first, translation)) : '';
  // The licences of the Malayalam and Tamil texts (CC BY-SA 4.0) ask for credit wherever
  // they are shown.
  const credit = CREDITS[translation];
  const design = designById(designId);

  const chooseOccasion = (id: Occasion) => {
    const o = OCCASIONS.find((x) => x.id === id)!;
    setOccasion(id);
    setDesignId(o.design);
    setHeading(o.heading ? t(o.heading) : '');
  };

  // On a wide screen (a tablet, or a phone on its side) the card stands on the left and
  // the choices scroll beside it; otherwise the choices come under the card.
  const wide = window.width >= 760 && window.width > window.height;
  const content = wide ? Math.min(window.width / 2, MAX_CONTENT_WIDTH) - 32 : Math.min(window.width, MAX_CONTENT_WIDTH) - 32;
  // A tall card is kept short enough to leave the choices in view (beside it: the screen's height).
  const room = wide ? window.height - 220 : window.height * 0.5;
  const previewWidth =
    size === 'square' ? Math.min(content, 420, wide ? room : Infinity) : Math.min(content, (room * CARD_WIDTH) / CARD_HEIGHT.tall);
  // The card that is captured, drawn off screen at the shared picture's size.
  const captureWidth = CARD_PIXELS / PixelRatio.get();
  const cardProps = { design, size, heading: heading.trim(), text, reference, message: message.trim(), credit };

  const share = async () => {
    if (!card.current || sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(card.current, {
        format: 'png',
        result: 'tmpfile',
        width: CARD_PIXELS,
        height: (CARD_PIXELS * CARD_HEIGHT[size]) / CARD_WIDTH,
      });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('shareAsCard') });
    } catch {
      Alert.alert(t('cardFailed'));
    } finally {
      setSharing(false);
    }
  };

  const preview = (
    <View
      testID="card-preview"
      accessible
      accessibilityRole="image"
      accessibilityLabel={[heading.trim(), text, reference, message.trim()].filter(Boolean).join('. ')}
      style={[styles.preview, { width: previewWidth, borderColor: theme.border }]}
    >
      {first ? <VerseCard {...cardProps} width={previewWidth} /> : <View style={{ width: previewWidth, height: (previewWidth * CARD_HEIGHT[size]) / CARD_WIDTH }} />}
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: theme.bg }]} behavior="padding">
      <Header title={t('shareAsCard')} onBack={onBack} />
      <View style={wide ? styles.wide : styles.screen}>
      {wide ? <View style={styles.wideCard}>{preview}</View> : null}
      <ScrollView ref={scroll} style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 24 }]} keyboardShouldPersistTaps="handled">
        {wide ? null : preview}

        <Segmented
          options={[
            ['square', t('cardSquare')],
            ['tall', t('cardTall')],
          ] as [CardSize, string][]}
          value={size}
          onChange={setSize}
        />

        {verses.length > 1 ? (
          <View style={styles.versesRow}>
            <Text style={[styles.label, styles.versesLabel, { color: theme.text }]}>{t('cardVerses')}</Text>
            <IconButton name="remove" onPress={() => setCount((n) => Math.max(1, n - 1))} disabled={count <= 1} accessibilityLabel={t('cardFewerVerses')} color={theme.accent} />
            <Text style={[styles.versesValue, { color: theme.text }]}>{first && last ? (count > 1 ? `${first.verse}–${last.verse}` : `${first.verse}`) : ''}</Text>
            <IconButton name="add" onPress={() => setCount((n) => Math.min(verses.length, n + 1))} disabled={count >= verses.length} accessibilityLabel={t('cardMoreVerses')} color={theme.accent} />
          </View>
        ) : null}

        <Text style={[styles.label, { color: theme.text }]}>{t('cardOccasion')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {OCCASIONS.map((o) => {
            const active = o.id === occasion;
            return (
              <Pressable
                key={o.id}
                onPress={() => chooseOccasion(o.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[styles.chip, { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accentSoft : 'transparent' }]}
              >
                <Text style={[styles.chipText, { color: active ? theme.accent : theme.text }]}>{t(o.label)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.label, { color: theme.text }]}>{t('cardDesign')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {DESIGNS.map((d, i) => {
            const active = d.id === designId;
            return (
              <Pressable
                key={d.id}
                onPress={() => setDesignId(d.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${t('cardDesign')} ${i + 1}`}
                style={[styles.thumb, { borderColor: active ? theme.accent : 'transparent' }]}
              >
                <View pointerEvents="none">
                  <VerseCard {...cardProps} design={d} size="square" width={THUMB} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.label, { color: theme.text }]}>{t('cardHeading')}</Text>
        <TextInput
          value={heading}
          onChangeText={setHeading}
          onFocus={showInput}
          accessibilityLabel={t('cardHeading')}
          maxLength={40}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          placeholderTextColor={theme.muted}
        />
        <Text style={[styles.label, { color: theme.text }]}>{t('cardMessage')}</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          onFocus={showInput}
          accessibilityLabel={t('cardMessage')}
          maxLength={80}
          placeholder={t('cardMessageHint')}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          placeholderTextColor={theme.muted}
        />
      </ScrollView>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: theme.border, backgroundColor: theme.bg }]}>
        <Pressable
          onPress={share}
          disabled={!first || sharing}
          accessibilityRole="button"
          style={[styles.shareButton, { backgroundColor: theme.accent, opacity: !first || sharing ? 0.6 : 1 }]}
        >
          <Text style={[styles.shareText, { color: theme.onAccent }]}>{t('cardShare')}</Text>
        </Pressable>
      </View>

      {/* Drawn at the picture's own size, out of sight, so the shared picture is sharp. */}
      {first ? (
        <View style={styles.offscreen} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <VerseCard ref={card} {...cardProps} width={captureWidth} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  wide: { flex: 1, flexDirection: 'row' },
  wideCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  preview: { alignSelf: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  label: { fontSize: 15, fontWeight: '600', marginTop: 18, marginBottom: 8 },
  versesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  versesLabel: { flex: 1, marginTop: 0, marginBottom: 0 },
  versesValue: { fontSize: 16, minWidth: 56, textAlign: 'center' },
  chips: { gap: 8, paddingRight: 16 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontSize: 15 },
  thumb: { borderWidth: 2, borderRadius: 6, padding: 2 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  shareButton: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', width: '100%', maxWidth: 480 },
  shareText: { fontSize: 17, fontWeight: '700' },
  offscreen: { position: 'absolute', left: -10000, top: 0, opacity: 1 },
});
