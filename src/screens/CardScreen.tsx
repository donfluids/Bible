import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, PixelRatio, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { CARD_COLOURS, CARD_HEIGHT, CARD_PIXELS, CARD_WIDTH, DEFAULT_LOOK, DESIGNS, OCCASIONS, lookDesign } from '../cards';
import type { CardLook, CardSize, Occasion, TextPlace, VeilStrength } from '../cards';
import { photoExists, pickPhoto, useSavedLooks } from '../cardLooks';
import type { SavedLook } from '../cardLooks';
import { AppSwitch } from '../components/AppSwitch';
import { Header } from '../components/Header';
import { Icon, IconButton } from '../components/Icon';
import { Pressable } from '../components/Pressable';
import { Segmented } from '../components/Segmented';
import { VerseCard } from '../components/VerseCard';
import { useEdition } from '../edition';
import { useT } from '../i18n';
import { getVerses } from '../queries';
import { tellSaveFailed, useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, flattenVerse, formatRef } from '../text';
import { useTheme } from '../theme';
import type { Book, Ref, TranslationId, VerseRow } from '../types';

/** The most verses one card takes. */
const MAX_VERSES = 6;
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
  // The design as the sender has changed it: their photo or a colour, the text's place and face.
  const [look, setLook] = useState<CardLook>(DEFAULT_LOOK);
  const edition = useEdition();
  const { settings } = useSettings();
  const saved = useSavedLooks(edition.id, () => tellSaveFailed(settings.language));
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
  const text = shown.map((v) => flattenVerse(v.text)).join(' ');
  const first = shown[0];
  const last = shown[shown.length - 1];
  const reference = first ? (shown.length > 1 ? `${formatRef(books, first, translation)}–${last.verse}` : formatRef(books, first, translation)) : '';
  const { design, lightWords } = lookDesign(look);
  const change = (patch: Partial<CardLook>) => setLook((l) => ({ ...l, ...patch }));

  const chooseOccasion = (id: Occasion) => {
    const o = OCCASIONS.find((x) => x.id === id)!;
    setOccasion(id);
    // A photo stays; the occasion's design gives the lines and colours around it.
    setLook((l) => ({ ...l, design: o.design, colour: undefined }));
    setHeading(o.heading ? t(o.heading) : '');
  };
  // A design from the row starts afresh, keeping where the text stands and its face.
  const chooseDesign = (id: CardLook['design']) => setLook((l) => ({ ...DEFAULT_LOOK, design: id, place: l.place, plainFace: l.plainFace }));
  const choosePhoto = async () => {
    try {
      const uri = await pickPhoto(size);
      // Over a photo the design's pictures would cover it; its lines can be turned back on.
      if (uri) setLook((l) => ({ ...l, photo: uri, colour: undefined, extras: l.photo ? l.extras : false }));
    } catch {
      Alert.alert(t('cardPhotoFailed'));
    }
  };
  const applySaved = (s: SavedLook) => setLook(photoExists(s.look.photo) ? s.look : { ...s.look, photo: undefined });
  const removeSaved = (s: SavedLook) =>
    Alert.alert(t('cardRemoveLook'), undefined, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('remove'), style: 'destructive', onPress: () => saved.remove(s.id) },
    ]);
  const saveLook = () => {
    try {
      const s = saved.save(look);
      setLook(s.look);
      Alert.alert(t('cardLookSaved'));
    } catch {
      Alert.alert(t('cardFailed'));
    }
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
  const photo = look.photo ? { uri: look.photo, veil: look.veil, strength: look.strength, blur: look.blur } : undefined;
  const cardProps = { design, size, heading: heading.trim(), text, reference, message: message.trim(), photo, place: look.place, plainFace: look.plainFace, lightWords };
  // A small card for a saved look in the design row.
  const lookThumb = (l: CardLook) => {
    const shown = photoExists(l.photo) ? l : { ...l, photo: undefined };
    const d = lookDesign(shown);
    return (
      <VerseCard
        {...cardProps}
        design={d.design}
        lightWords={d.lightWords}
        photo={shown.photo ? { uri: shown.photo, veil: shown.veil, strength: shown.strength, blur: shown.blur } : undefined}
        place={shown.place}
        plainFace={shown.plainFace}
        size="square"
        width={THUMB}
      />
    );
  };
  const sameLook = (a: CardLook, b: CardLook) => JSON.stringify(a) === JSON.stringify(b);

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
          {/* The sender's own photo first, then their saved designs, then the app's. */}
          <Pressable
            onPress={choosePhoto}
            accessibilityRole="button"
            accessibilityLabel={look.photo ? t('cardChangePhoto') : t('cardPhoto')}
            style={[styles.thumb, { borderColor: look.photo && !saved.looks.some((sl) => sameLook(sl.look, look)) ? theme.accent : 'transparent' }]}
          >
            <View style={[styles.photoTile, { width: THUMB, height: THUMB, borderColor: theme.border, backgroundColor: theme.card }]}>
              <Icon name="image" size={26} color={theme.accent} />
              <Text style={[styles.photoTileText, { color: theme.accent }]} numberOfLines={2}>
                {look.photo ? t('cardChangePhoto') : t('cardPhoto')}
              </Text>
            </View>
          </Pressable>
          {saved.looks.map((sl, i) => {
            const active = sameLook(sl.look, look);
            return (
              <Pressable
                key={sl.id}
                onPress={() => applySaved(sl)}
                onLongPress={() => removeSaved(sl)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={t('cardMyDesign', { n: i + 1 })}
                accessibilityHint={t('cardRemoveLook')}
                style={[styles.thumb, { borderColor: active ? theme.accent : 'transparent' }]}
              >
                <View pointerEvents="none">{lookThumb(sl.look)}</View>
              </Pressable>
            );
          })}
          {DESIGNS.map((d, i) => {
            const active = !look.photo && !look.colour && d.id === look.design;
            return (
              <Pressable
                key={d.id}
                onPress={() => chooseDesign(d.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${t('cardDesign')} ${i + 1}`}
                style={[styles.thumb, { borderColor: active ? theme.accent : 'transparent' }]}
              >
                <View pointerEvents="none">
                  <VerseCard {...cardProps} design={d} photo={undefined} lightWords={false} size="square" width={THUMB} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {look.photo ? (
          <>
            <Text style={[styles.label, { color: theme.text }]}>{t('cardVeil')}</Text>
            <Segmented
              options={[
                ['light', t('cardVeilLight')],
                ['dark', t('cardVeilDark')],
              ]}
              value={look.veil}
              onChange={(veil) => change({ veil })}
            />
            <Segmented
              options={[
                ['1', t('cardFaint')],
                ['2', t('cardMedium')],
                ['3', t('cardStrong')],
              ]}
              value={String(look.strength) as '1' | '2' | '3'}
              onChange={(v) => change({ strength: Number(v) as VeilStrength })}
            />
            <SwitchRow label={t('cardBlur')} detail={t('cardBlurDetail')} value={look.blur} onChange={(blur) => change({ blur })} />
            <Pressable onPress={() => change({ photo: undefined })} accessibilityRole="button" style={styles.linkButton}>
              <Text style={[styles.linkText, { color: theme.accent }]}>{t('cardRemovePhoto')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: theme.text }]}>{t('cardBackground')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Pressable
                onPress={() => change({ colour: undefined })}
                accessibilityRole="radio"
                accessibilityState={{ checked: !look.colour }}
                style={[styles.chip, { borderColor: !look.colour ? theme.accent : theme.border, backgroundColor: !look.colour ? theme.accentSoft : 'transparent' }]}
              >
                <Text style={[styles.chipText, { color: !look.colour ? theme.accent : theme.text }]}>{t('cardDesignColours')}</Text>
              </Pressable>
              {CARD_COLOURS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => change({ colour: c })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: look.colour === c }}
                  accessibilityLabel={`${t('cardBackground')} ${c}`}
                  style={[styles.swatch, { backgroundColor: c, borderColor: look.colour === c ? theme.accent : theme.border, borderWidth: look.colour === c ? 3 : 1 }]}
                />
              ))}
            </ScrollView>
          </>
        )}

        <Text style={[styles.label, { color: theme.text }]}>{t('cardPlace')}</Text>
        <Segmented
          options={[
            ['top', t('cardTop')],
            ['middle', t('cardMiddle')],
            ['bottom', t('cardBottom')],
          ] as [TextPlace, string][]}
          value={look.place}
          onChange={(place) => change({ place })}
        />
        <Text style={[styles.label, { color: theme.text }]}>{t('cardFace')}</Text>
        <Segmented
          options={[
            ['book', t('cardFaceBook')],
            ['plain', t('cardFacePlain')],
          ]}
          value={look.plainFace ? 'plain' : 'book'}
          onChange={(v) => change({ plainFace: v === 'plain' })}
        />
        <SwitchRow label={t('cardExtras')} detail={t('cardExtrasDetail')} value={look.extras} onChange={(extras) => change({ extras })} />
        <Pressable
          onPress={saveLook}
          disabled={saved.looks.some((sl) => sameLook(sl.look, look))}
          accessibilityRole="button"
          style={[styles.saveLook, { borderColor: theme.accent, opacity: saved.looks.some((sl) => sameLook(sl.look, look)) ? 0.5 : 1 }]}
        >
          <Text style={[styles.saveLookText, { color: theme.accent }]}>{t('cardSaveLook')}</Text>
        </Pressable>

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

/** A setting that is on or off, with a line saying what it does. */
function SwitchRow({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={[styles.switchLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.switchDetail, { color: theme.muted }]}>{detail}</Text>
      </View>
      <AppSwitch value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
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
  photoTile: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 4, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4 },
  photoTileText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  switchText: { flex: 1 },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  switchDetail: { fontSize: 13, marginTop: 2 },
  linkButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: 4 },
  linkText: { fontSize: 15, fontWeight: '600' },
  saveLook: { marginTop: 20, minHeight: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  saveLookText: { fontSize: 16, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  shareButton: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', width: '100%', maxWidth: 480 },
  shareText: { fontSize: 17, fontWeight: '700' },
  offscreen: { position: 'absolute', left: -10000, top: 0, opacity: 1 },
});
