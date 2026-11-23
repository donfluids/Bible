import React, { useEffect, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '../components/Pressable';
import { Header, HeaderIconButton } from '../components/Header';
import { Icon } from '../components/Icon';
import { SheetAction, SimpleSheet } from '../components/SimpleSheet';
import type { Paper, Stroke } from '../ink';
import { PAGE_WIDTH, emptyInk, inkKey, parseInk, pathOf } from '../ink';
import { loadEntry } from '../persist';
import { useEdition } from '../edition';
import { BackupSheet } from '../components/BackupSheet';
import { TabBar } from '../components/TabBar';
import { scriptOf, scriptureFont } from '../fonts';
import { useT } from '../i18n';
import { pageName, useNotebook } from '../notebook';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH } from '../text';
import { useTheme } from '../theme';

interface Props {
  onOpenPage: (id: string, isNew?: boolean, handwritten?: boolean) => void;
}

/** The notebook's pages, the most recently edited first. A new page is typed or handwritten. */

export function NotebookScreen({ onOpenPage }: Props) {
  const theme = useTheme();
  const t = useT();
  const { settings } = useSettings();
  const { pages, create } = useNotebook();
  const edition = useEdition();
  const [backupSheet, setBackupSheet] = useState(false);
  // A search over titles and writing (a handwritten page by its title only).
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const found = q ? pages.filter((p) => p.title.toLowerCase().includes(q) || (!p.ink && p.body.toLowerCase().includes(q))) : pages;
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const newPage = () => setChoosing(true);
  const start = (paper?: Paper) => {
    setChoosing(false);
    onOpenPage(create('', paper), true, !!paper);
  };
  const font = (text: string, bold = false) => scriptureFont(scriptOf(text), false, bold);
  // When a page was last changed: the time today, "yesterday", else the date (the year only
  // when it is not this year).
  const locale = settings.language === 'ml' ? 'ml-IN' : settings.language === 'ta' ? 'ta-IN' : settings.language === 'hi' ? 'hi-IN' : 'en-GB';
  const edited = (updated: number) => {
    const when = new Date(updated);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(when);
    day.setHours(0, 0, 0, 0);
    const daysAgo = Math.round((today.getTime() - day.getTime()) / 86400000);
    if (daysAgo === 0) return t('editedToday', { time: when.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) });
    if (daysAgo === 1) return t('editedYesterday');
    const sameYear = when.getFullYear() === today.getFullYear();
    return t('pageEdited', { date: when.toLocaleDateString(locale, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }) });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header
        title={t('notebook')}
        right={
          <>
            {busy ? (
              <View style={styles.busy} accessible accessibilityLabel={t('backupRestore')} accessibilityState={{ busy: true }}>
                <ActivityIndicator color={theme.accent} />
              </View>
            ) : (
              <HeaderIconButton icon="backup" onPress={() => setBackupSheet(true)} accessibilityLabel={t('backupRestore')} />
            )}
            <HeaderIconButton icon="note_add" onPress={newPage} accessibilityLabel={t('newPage')} />
          </>
        }
      />
      {pages.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
            <Icon name="note_stack" size={36} color={theme.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('notebookEmptyTitle')}</Text>
          <Text style={[styles.empty, { color: theme.muted }]}>{t('notebookEmpty')}</Text>
          <Pressable onPress={newPage} accessibilityRole="button" style={[styles.newButton, { backgroundColor: theme.accent }]}>
            <Icon name="add" size={20} color={theme.onAccent} />
            <Text style={[styles.newButtonText, { color: theme.onAccent }]}>{t('newPage')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.listBox}>
          <FlatList
            data={found}
            keyExtractor={(p) => p.id}
            // Room under the last page for the round New page button.
            contentContainerStyle={[styles.list, { paddingBottom: 96 }]}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              pages.length > 2 ? (
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('searchPages')}
                  placeholderTextColor={theme.muted}
                  accessibilityLabel={t('searchPages')}
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                  style={[styles.search, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                />
              ) : null
            }
            ListEmptyComponent={<Text style={[styles.noMatch, { color: theme.muted }]}>{t('noPagesFound')}</Text>}
            renderItem={({ item }) => {
              const name = pageName(item, item.ink ? t('handwritten') : t('untitled'));
              // The first lines after the one used as the name; for a handwritten page, that it is one.
              const rest = item.title.trim() ? item.body : item.body.split('\n').slice(1).join('\n');
              // Lines kept apart by a dot, so a list reads as one ("Family · Church · Neighbours").
              const preview = item.ink
                ? item.title.trim()
                  ? t('handwritten')
                  : ''
                : rest
                    .split('\n')
                    .map((line) => line.replace(/\s+/g, ' ').trim())
                    .filter(Boolean)
                    .join(' · ');
              return (
                <Pressable
                  onPress={() => onOpenPage(item.id)}
                  android_ripple={{ color: theme.accentSoft }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.row, item.ink && styles.inkRow, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
                >
                  {item.ink ? <InkThumb edition={edition.id} pageId={item.id} updated={item.updated} count={item.ink.strokes} ink={theme.text} border={theme.border} paper={theme.card} /> : null}
                  <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.nameRow}>
                    {item.ink ? <Icon name="draw" size={18} color={theme.muted} /> : null}
                    <Text style={[styles.name, { color: theme.text, fontFamily: font(name, true), fontWeight: scriptOf(name) ? 'normal' : '600' }]} numberOfLines={1}>
                      {name}
                    </Text>
                  </View>
                  {preview ? (
                    <Text style={[styles.preview, { color: theme.muted, fontFamily: font(preview) }]} numberOfLines={2}>
                      {preview}
                    </Text>
                  ) : null}
                  <Text style={[styles.date, { color: theme.muted }]}>{edited(item.updated)}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
          {/* New page, where a thumb reaches it. */}
          <Pressable
            onPress={newPage}
            accessibilityRole="button"
            accessibilityLabel={t('newPage')}
            style={({ pressed }) => [styles.fab, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
          >
            <Icon name="add" size={30} color={theme.onAccent} />
          </Pressable>
        </View>
      )}
      <SimpleSheet visible={choosing} title={t('newPage')} onClose={() => setChoosing(false)}>
        <SheetAction icon="edit_note" label={t('pageTyped')} detail={t('pageTypedDetail')} onPress={() => start()} detailLines={0} />
        <SheetAction icon="draw" label={t('pageHandLined')} detail={t('pageHandDetail')} onPress={() => start('lined')} detailLines={0} />
        <SheetAction icon="gesture" label={t('pageHandPlain')} detail={t('pageHandDetail')} onPress={() => start('plain')} detailLines={0} />
      </SimpleSheet>
      <BackupSheet visible={backupSheet} onClose={() => setBackupSheet(false)} onBusy={setBusy} />
      <TabBar current="Notebook" />
    </View>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, marginHorizontal: 18, marginTop: 4, marginBottom: 8 },
  listBox: { flex: 1 },
  fab: { position: 'absolute', right: 18, bottom: 18, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  noMatch: { fontSize: 15, textAlign: 'center', marginTop: 24 },
  busy: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
  list: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  row: { paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 3 },
  inkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 84, height: 60, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 17, flexShrink: 1 },
  preview: { fontSize: 15, lineHeight: 22 },
  date: { fontSize: 12, marginTop: 2 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingBottom: 96 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
  empty: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 340 },
  newButton: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, paddingRight: 20, minHeight: 48, borderRadius: 22 },
  newButtonText: { fontSize: 16, fontWeight: '600' },
});

/** The top of a handwritten page, small, so pages can be told apart in the list. */
const THUMB_STROKES = 400;
const THUMB_HEIGHT = (PAGE_WIDTH * 60) / 84;
function InkThumb({ edition, pageId, updated, count, ink, border, paper }: { edition: string; pageId: string; updated: number; count: number; ink: string; border: string; paper: string }) {
  // Read after the row is on screen (the page just left writes its last strokes out as it
  // goes, after this row is first drawn), and again when the page has been edited.
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  useEffect(() => {
    // The page just left may still be writing: a few tries, until something is there.
    const delays = [50, 600, 2000, 4000];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const read = (i: number) => {
      const found = loadEntry(inkKey(edition, pageId), parseInk, emptyInk()).value.strokes;
      setStrokes(found.slice(0, THUMB_STROKES));
      if (found.length === 0 && count > 0 && i + 1 < delays.length) timer = setTimeout(() => read(i + 1), delays[i + 1]);
    };
    timer = setTimeout(() => read(0), delays[0]);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [edition, pageId, updated, count]);
  return (
    <View style={[styles.thumb, { borderColor: border, backgroundColor: paper }]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={84} height={60} viewBox={`0 0 ${PAGE_WIDTH} ${THUMB_HEIGHT}`}>
        {strokes.map((s, i) => (
          <Path key={i} d={pathOf(s)} stroke={s.c < 0 ? '#E8C400' : ink} strokeOpacity={s.c < 0 ? 0.5 : 1} strokeWidth={Math.max(s.w, 7)} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ))}
      </Svg>
    </View>
  );
}
