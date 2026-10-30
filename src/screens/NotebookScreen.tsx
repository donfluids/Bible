import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '../components/Pressable';
import { Header, HeaderIconButton } from '../components/Header';
import { Icon } from '../components/Icon';
import { SheetAction, SimpleSheet } from '../components/SimpleSheet';
import type { Paper } from '../ink';
import { useEdition } from '../edition';
import { InkUnreadable, restoreBackup, saveBackup } from '../notebookFiles';
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
// The apps' names on the phone (app.config.js); the four-language app's name is not final.
const APP_NAMES: Record<string, string> = { en: 'Bible', ml: 'വേദപുസ്തകം', ta: 'வேதாகமம்', all: 'Bibles' };

export function NotebookScreen({ onOpenPage }: Props) {
  const theme = useTheme();
  const t = useT();
  const { settings } = useSettings();
  const { pages, create, replaceAll } = useNotebook();
  const edition = useEdition();
  const [backupSheet, setBackupSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const newPage = () => setChoosing(true);
  const backUp = async () => {
    setBackupSheet(false);
    if (pages.length === 0) {
      Alert.alert(t('backupEmpty'));
      return;
    }
    setBusy(true);
    try {
      await saveBackup(pages, edition.id, t('saveBackup'));
    } catch (e) {
      if (e instanceof InkUnreadable) Alert.alert(t('backupInkUnreadable', { page: pageName(e.page, t('untitled')) }));
      else Alert.alert(t('backupFailed'));
    } finally {
      setBusy(false);
    }
  };
  // A backup made in another of the apps (named as each app is named): restored only when the reader says so.
  const askOtherEdition = (from: string) =>
    new Promise<boolean>((resolve) =>
      Alert.alert(t('restoreOtherEdition', { app: APP_NAMES[from] ?? from }), undefined, [
        { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('restoreBackup'), onPress: () => resolve(true) },
      ], { cancelable: true, onDismiss: () => resolve(false) }),
    );
  const restore = async () => {
    setBackupSheet(false);
    setBusy(true);
    try {
      const outcome = await restoreBackup(pages, edition.id, (from) => askOtherEdition(from));
      if (outcome.kind === 'tooLarge') Alert.alert(t('restoreTooLarge'));
      else if (outcome.kind === 'notBackup') Alert.alert(t('restoreNotBackup'));
      else if (outcome.kind === 'failed') Alert.alert(t('restoreFailed'));
      else if (outcome.kind === 'done') {
        replaceAll(outcome.pages);
        Alert.alert(t('restoreDone', { added: outcome.added, updated: outcome.updated, kept: outcome.kept }));
      }
    } catch {
      Alert.alert(t('restoreNotBackup'));
    } finally {
      setBusy(false);
    }
  };
  const start = (paper?: Paper) => {
    setChoosing(false);
    onOpenPage(create('', paper), true, !!paper);
  };
  const font = (text: string, bold = false) => scriptureFont(scriptOf(text), false, bold);

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
              <HeaderIconButton icon="settings_backup_restore" onPress={() => setBackupSheet(true)} accessibilityLabel={t('backupRestore')} />
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
        <FlatList
          data={pages}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
          renderItem={({ item }) => {
            const name = pageName(item, item.ink ? t('handwritten') : t('untitled'));
            // The first lines after the one used as the name; for a handwritten page, that it is one.
            const rest = item.title.trim() ? item.body : item.body.split('\n').slice(1).join('\n');
            const preview = item.ink ? (item.title.trim() ? t('handwritten') : '') : rest.replace(/\s+/g, ' ').trim();
            const date = new Date(item.updated).toLocaleDateString(settings.language === 'ml' ? 'ml-IN' : settings.language === 'ta' ? 'ta-IN' : settings.language === 'hi' ? 'hi-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <Pressable
                onPress={() => onOpenPage(item.id)}
                android_ripple={{ color: theme.accentSoft }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
              >
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
                <Text style={[styles.date, { color: theme.muted }]}>{t('pageEdited', { date })}</Text>
              </Pressable>
            );
          }}
        />
      )}
      <SimpleSheet visible={choosing} title={t('newPage')} onClose={() => setChoosing(false)}>
        <SheetAction icon="edit_note" label={t('pageTyped')} detail={t('pageTypedDetail')} onPress={() => start()} detailLines={0} />
        <SheetAction icon="draw" label={t('pageHandLined')} detail={t('pageHandDetail')} onPress={() => start('lined')} detailLines={0} />
        <SheetAction icon="gesture" label={t('pageHandPlain')} detail={t('pageHandDetail')} onPress={() => start('plain')} detailLines={0} />
      </SimpleSheet>
      <SimpleSheet visible={backupSheet} title={t('backupRestore')} onClose={() => setBackupSheet(false)}>
        <SheetAction icon="backup" label={t('saveBackup')} detail={t('saveBackupDetail')} onPress={backUp} detailLines={0} />
        <SheetAction icon="history" label={t('restoreBackup')} detail={t('restoreBackupDetail')} onPress={restore} detailLines={0} />
      </SimpleSheet>
      <TabBar current="Notebook" />
    </View>
  );
}

const styles = StyleSheet.create({
  busy: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
  list: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  row: { paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 3 },
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
