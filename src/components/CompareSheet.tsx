import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useEdition } from '../edition';
import { translationName, useT } from '../i18n';
import { getInterlinear, getVerses, mapRef } from '../queries';
import { useSettings } from '../settings';
import { formatRef } from '../text';
import { useTheme } from '../theme';
import type { Book, OriginalWord, Ref, TranslationId, VerseRow, WordPick } from '../types';
import { InterlinearVerse } from './InterlinearVerse';
import { SectionLabel } from './SectionLabel';
import { SimpleSheet } from './SimpleSheet';
import { VerseText } from './VerseText';

interface Props {
  /** The verse, numbered as in `translation`. */
  target: Ref | null;
  translation: TranslationId;
  books: Book[];
  onClose: () => void;
  onWord: (pick: WordPick) => void;
}

interface Row {
  translation: TranslationId;
  /** Where the verse is in this translation, when its number differs. */
  ref: Ref | null;
  verse: VerseRow | null;
}

/**
 * One verse in every translation, with its Hebrew or Greek beneath. Translations that
 * number the verse differently (the Malayalam in a few chapters) show their own verse.
 */
export function CompareSheet({ target, translation, books, onClose, onWord }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const t = useT();
  const edition = useEdition();
  const { settings } = useSettings();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [original, setOriginal] = useState<OriginalWord[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setRows(null);
    setOriginal(null);
    setFailed(false);
    const loadRow = async (id: TranslationId): Promise<Row> => {
      const ref = await mapRef(db, translation, id, target);
      const verse = ref ? ((await getVerses(db, id, [ref]))[0] ?? null) : null;
      const moved = ref && (ref.book !== target.book || ref.chapter !== target.chapter || ref.verse !== target.verse);
      return { translation: id, ref: moved ? ref : null, verse };
    };
    Promise.all([Promise.all(edition.translations.map(loadRow)), getInterlinear(db, target.book, target.chapter, translation)])
      .then(([loaded, words]) => {
        if (cancelled) return;
        setRows(loaded);
        setOriginal(words.get(target.verse) ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [db, target, translation, edition.translations]);

  const pickWord = (p: WordPick) => {
    onClose();
    onWord(p);
  };

  const size = Math.min(settings.fontSize, 19);
  return (
    <SimpleSheet visible={!!target} title={target ? `${t('compare')} · ${formatRef(books, target, settings.translation)}` : ''} onClose={onClose}>
      {failed ? (
        <Text style={[styles.missing, { color: theme.muted }]}>{t('loadFailed')}</Text>
      ) : !rows ? (
        <ActivityIndicator style={styles.spinner} color={theme.accent} />
      ) : (
        <View style={styles.body}>
          {rows.map((r) => (
            <View key={r.translation} style={[styles.block, { borderBottomColor: theme.border }]}>
              <SectionLabel text={translationName(settings.language, r.translation) + (r.ref ? ` · ${formatRef(books, r.ref, r.translation)}` : '')} style={styles.label} />
              {r.verse ? (
                <VerseText verse={r.verse} fontSize={size} onWord={pickWord} underline={false} showNumber={false} />
              ) : (
                <Text style={[styles.missing, { color: theme.muted }]}>{t('notInTranslation')}</Text>
              )}
            </View>
          ))}
          {original && original.length > 0 && target ? (
            <View style={styles.block}>
              <SectionLabel text={target.book <= 39 ? t('hebrew') : t('greek')} style={styles.label} />
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
  label: { marginBottom: 6 },
  missing: { fontSize: 15, fontStyle: 'italic' },
});
