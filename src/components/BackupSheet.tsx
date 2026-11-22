import React from 'react';
import { Alert } from 'react-native';
import { useEdition } from '../edition';
import { useT } from '../i18n';
import { mergeSaved } from '../notebookBackup';
import { InkUnreadable, restoreBackup, saveBackup } from '../notebookFiles';
import { pageName, useNotebook } from '../notebook';
import { afterSheet } from '../platform';
import { useSettings } from '../settings';
import { SheetAction, SimpleSheet } from './SimpleSheet';

// The apps' names on the phone (app.config.js); the four-language app's name is not final.
const APP_NAMES: Record<string, string> = { en: 'Bible', ml: 'വേദപുസ്തകം', ta: 'வேதாகமம்', all: 'Bibles' };

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Told while a backup or restore is under way (the notebook shows a spinner). */
  onBusy?: (busy: boolean) => void;
}

/**
 * Back up or restore: the notebook's pages and the bookmarks, highlights, marked text and
 * verse notes, in one file. Opened from the notebook and from Settings.
 */
export function BackupSheet({ visible, onClose, onBusy }: Props) {
  const t = useT();
  const edition = useEdition();
  const { pages, replaceAll } = useNotebook();
  const { settings, update } = useSettings();
  const busy = (b: boolean) => onBusy?.(b);

  // The sheet is closed at once; the share sheet or file picker opens after it has gone (afterSheet).
  const backUp = async () => {
    const saved = { bookmarks: settings.bookmarks, highlights: settings.highlights, marks: settings.marks, notes: settings.notes };
    const nothing = pages.length === 0 && saved.bookmarks.length === 0 && saved.marks.length === 0 && Object.keys(saved.highlights).length === 0 && Object.keys(saved.notes).length === 0;
    if (nothing) {
      Alert.alert(t('backupEmpty'));
      return;
    }
    busy(true);
    try {
      await saveBackup(pages, edition.id, t('saveBackup'), saved);
    } catch (e) {
      if (e instanceof InkUnreadable) Alert.alert(t('backupInkUnreadable', { page: pageName(e.page, t('untitled')) }));
      else Alert.alert(t('backupFailed'));
    } finally {
      busy(false);
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
    busy(true);
    try {
      const outcome = await restoreBackup(pages, edition.id, (from) => askOtherEdition(from));
      if (outcome.kind === 'tooLarge') Alert.alert(t('restoreTooLarge'));
      else if (outcome.kind === 'notBackup') Alert.alert(t('restoreNotBackup'));
      else if (outcome.kind === 'failed') Alert.alert(t('restoreFailed'));
      else if (outcome.kind === 'done') {
        replaceAll(outcome.pages);
        let message = t('restoreDone', { added: outcome.added, updated: outcome.updated, kept: outcome.kept });
        if (outcome.saved) {
          const here = { bookmarks: settings.bookmarks, highlights: settings.highlights, marks: settings.marks, notes: settings.notes };
          const merged = mergeSaved(here, outcome.saved);
          if (merged.added > 0) {
            update(merged.saved);
            message += `\n${t('restoreSaved', { count: merged.added })}`;
          }
        }
        Alert.alert(message);
      }
    } catch {
      Alert.alert(t('restoreNotBackup'));
    } finally {
      busy(false);
    }
  };

  return (
    <SimpleSheet visible={visible} title={t('backupRestore')} onClose={onClose}>
      <SheetAction
        icon="backup"
        label={t('saveBackup')}
        detail={t('saveBackupDetail')}
        onPress={() => {
          onClose();
          afterSheet(backUp);
        }}
        detailLines={0}
      />
      <SheetAction
        icon="history"
        label={t('restoreBackup')}
        detail={t('restoreBackupDetail')}
        onPress={() => {
          onClose();
          afterSheet(restore);
        }}
        detailLines={0}
      />
    </SimpleSheet>
  );
}
