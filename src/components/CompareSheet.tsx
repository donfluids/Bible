import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { EDITION } from '../edition';
import { translationName, useT } from '../i18n';
import { getInterlinear, getVerses } from '../queries';
import { useSettings } from '../settings';
import { formatRef } from '../text';
import { useTheme } from '../theme';
import type { Book, OriginalWord, Ref, VerseRow, WordPick } from '../types';
import { InterlinearVerse } from './InterlinearVerse';
import { SimpleSheet } from './SimpleSheet';
import { VerseText } from './VerseText';

interface Props {
  target: Ref | null;
  books: Book[];
  onClose: () => void;
  onWord: (pick: WordPick) => void;
}

/** One verse in every translation, with its Hebrew or Greek beneath. */
export function CompareSheet({ target, books, onClose, onWord }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const t = useT();
  const { settings } = useSettings();
  const [rows, setRows] = useState<{ translation: string; name: string; verse: VerseRow | null }[] | null>(null);
  const [original, setOriginal] = useState<OriginalWord[] | null>(null);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setRows(null);
    setOriginal(null);
    Promise.all([
      ...EDITION.translations.map((id) => getVerses(db, id, [target]).then((v) => ({ translation: id, name: id, verse: v[0] ?? null }))),
      getInterlinear(db, target.book, target.chapter),
    ]).then((results) => {
      if (cancelled) return;
      const words = results.pop() as Map<number, OriginalWord[]>;
      setRows(results as { translation: string; name: string; verse: VerseRow | null }[]);
      setOriginal(words.get(target.verse) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [db, target]);

  const pickWord = (p: WordPick) => {
    onClose();
    onWord(p);
  };

  const size = Math.min(settings.fontSize, 19);
  return (
    <SimpleSheet visible={!!target} title={target ? `${t('compare')} · ${formatRef(books, target, settings.translation)}` : ''} onClose={onClose}>
      {!rows ? (
        <ActivityIndicator style={styles.spinner} color={theme.accent} />
      ) : (
        <View style={styles.body}>
          {rows.map((r) => (
            <View key={r.translation} style={[styles.block, { borderBottomColor: theme.border }]}>
              <Text style={[styles.label, { color: theme.muted }]}>{translationName(settings.language, r.translation).toUpperCase()}</Text>
              {r.verse ? (
                <VerseText verse={r.verse} fontSize={size} onWord={pickWord} underline={false} showNumber={false} />
              ) : (
                <Text style={[styles.missing, { color: theme.muted }]}>{t('notInTranslation')}</Text>
              )}
            </View>
          ))}
          {original && original.length > 0 && target ? (
            <View style={styles.block}>
              <Text style={[styles.label, { color: theme.muted }]}>{(target.book <= 39 ? t('hebrew') : t('greek')).toUpperCase()}</Text>
              <InterlinearVerse
                words={original}
                hebrew={target.book <= 39}
                fontSize={size}
                onWord={pickWord}
                showTranslit={settings.showTranslit}
                hideCantillation={settings.hideCantillation}
              />
            </View>
          ) : null}
        </View>
      )}
    </SimpleSheet>
  );
}

const styles = StyleSheet.create({
  spinner: { marginVertical: 30 },
  body: { paddingBottom: 8 },
  block: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  missing: { fontSize: 15, fontStyle: 'italic' },
});
