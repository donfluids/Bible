import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { Icon, IconButton } from '../components/Icon';
import { SectionLabel } from '../components/SectionLabel';
import { useT } from '../i18n';
import { VerseListItem } from '../components/VerseListItem';
import { searchLexicon, searchText } from '../queries';
import { parseReference } from '../refs';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, bookName, formatCount } from '../text';
import { useTheme } from '../theme';
import type { Book, LexiconHit, Ref, VerseRow, WordPick } from '../types';

interface Props {
  books: Book[];
  onOpenRef: (ref: Ref) => void;
  onWord: (pick: WordPick) => void;
  onBack: () => void;
}

const LIMIT = 300;

// Shown under an empty search box: a reference, a word and a Strong's number.
const ENGLISH_EXAMPLES = ['John 3:16', 'Psalm 23', 'love', 'G26'];
const MALAYALAM_EXAMPLES = ['യോഹന്നാൻ 3:16', 'സങ്കീർത്തനം 23', 'സ്നേഹം', 'H430'];

export function SearchScreen({ books, onOpenRef, onWord, onBack }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  // Lists run under the system navigation bar; the last row must clear it.
  const insets = useSafeAreaInsets();
  const t = useT();
  const { settings } = useSettings();
  const { translation } = settings;
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [results, setResults] = useState<VerseRow[] | null>(null);
  const [entries, setEntries] = useState<LexiconHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);

  // "John 3:16", "Ps 23" and the like are offered as a direct jump.
  const goTo = parseReference(query, books, translation);
  // A Strong's number such as G3056 or h430 is offered as a direct link.
  const strongsMatch = /^([hg])\s*0*(\d{1,4})$/i.exec(query.trim());
  const strongsId = strongsMatch ? strongsMatch[1].toUpperCase() + strongsMatch[2] : null;

  useEffect(() => {
    const q = query.trim();
    const id = ++latest.current;
    if (q.length < 2 || strongsId || goTo) {
      setResults(null);
      setEntries([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    setFailed(false);
    const timer = setTimeout(async () => {
      try {
        const [rows, hits] = await Promise.all([searchText(db, translation, q, LIMIT), searchLexicon(db, q, 8)]);
        if (latest.current !== id) return;
        setResults(rows);
        setEntries(hits);
      } catch {
        if (latest.current !== id) return;
        setResults(null);
        setEntries([]);
        setFailed(true);
      }
      setBusy(false);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, translation, query, strongsId, goTo?.book, goTo?.chapter, goTo?.verse]);

  const listFont = Math.min(settings.fontSize, 18);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={t('searchTitle', { translation })} onBack={onBack} />
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Icon name="search" color={theme.muted} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={theme.muted}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: theme.text }]}
        />
        {query ? (
          <IconButton
            name="close"
            onPress={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            accessibilityLabel={t('clearSearch')}
            style={styles.clear}
          />
        ) : null}
      </View>
      {!query.trim() ? (
        <View style={styles.examples}>
          <Text style={[styles.examplesLabel, { color: theme.muted }]}>{t('searchExamples')}</Text>
          <View style={styles.exampleRow}>
            {(translation === 'MAL' ? MALAYALAM_EXAMPLES : ENGLISH_EXAMPLES).map((example) => (
              <Pressable
                key={example}
                onPress={() => setQuery(example)}
                accessibilityRole="button"
                android_ripple={{ color: theme.accentSoft }}
                style={[styles.example, { borderColor: theme.border }]}
              >
                <Text style={[styles.exampleText, { color: theme.text }]}>{example}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {goTo ? (
        <Pressable
          onPress={() => onOpenRef({ book: goTo.book, chapter: goTo.chapter, verse: goTo.verse })}
          android_ripple={{ color: theme.accentSoft }}
          style={({ pressed }) => [styles.strongsRow, { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border }]}
          accessibilityRole="button"
        >
          <Text style={[styles.strongsText, { color: theme.accent }]}>
            {t('goTo', { ref: `${bookName(books, goTo.book, translation)} ${goTo.chapter}${goTo.chapterOnly ? '' : `:${goTo.verse}`}` })}
          </Text>
          <Text style={[styles.strongsSub, { color: theme.muted }]}>{t('openIn', { translation })}</Text>
        </Pressable>
      ) : null}
      {strongsId ? (
        <Pressable
          onPress={() => onWord({ strongs: strongsId })}
          android_ripple={{ color: theme.accentSoft }}
          style={({ pressed }) => [styles.strongsRow, { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border }]}
          accessibilityRole="button"
        >
          <Text style={[styles.strongsText, { color: theme.accent }]}>{t('open', { id: strongsId })}</Text>
          <Text style={[styles.strongsSub, { color: theme.muted }]}>{t('dictionaryEntry', { lang: strongsId.startsWith('H') ? t('hebrew') : t('greek') })}</Text>
        </Pressable>
      ) : null}
      {busy ? <ActivityIndicator style={styles.spinner} color={theme.accent} accessibilityLabel={t('loading')} /> : null}
      {failed && !busy ? <Text style={[styles.failed, { color: theme.muted }]}>{t('loadFailed')}</Text> : null}
      {entries.length > 0 && !busy ? (
        <View style={[styles.lexicon, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <SectionLabel text={t('dictionary')} style={styles.lexiconTitle} />
          {entries.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => onWord({ strongs: e.id })}
          android_ripple={{ color: theme.accentSoft }}
              style={({ pressed }) => [styles.entry, { borderTopColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
              accessibilityRole="button"
            >
              <Text style={[styles.entryId, { color: theme.accent }]}>{e.id}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.entryLemma, { color: theme.text }]} numberOfLines={1}>
                  {e.lemma} <Text style={{ color: theme.muted, fontSize: 14 }}>{e.translit}</Text>
                </Text>
                <Text style={[styles.entryGloss, { color: theme.muted }]} numberOfLines={1}>
                  {e.kjv_usage || e.definition || ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      {results && !busy ? (
        <Text style={[styles.count, { color: theme.muted }]}>
          {results.length === 0
            ? t('noVerses')
            : results.length >= LIMIT
              ? t('firstN', { n: formatCount(LIMIT) })
              : results.length === 1
                ? t('oneVerse')
                : t('nVerses', { n: formatCount(results.length) })}
        </Text>
      ) : null}
      <FlatList
        data={results ?? []}
        keyExtractor={(v) => `${v.book}:${v.chapter}:${v.verse}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        renderItem={({ item }) => (
          <VerseListItem verse={item} books={books} fontSize={listFont} onOpen={onOpenRef} onWord={onWord} highlightText={query} />
        )}
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  inputBox: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH - 28,
    margin: 14,
    marginTop: 4,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 4,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 17, paddingVertical: 12 },
  clear: { width: 44, height: 44 },
  examples: { paddingHorizontal: 18, paddingTop: 4 },
  examplesLabel: { fontSize: 13, marginBottom: 8 },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  example: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, justifyContent: 'center', overflow: 'hidden' },
  exampleText: { fontSize: 15 },
  spinner: { marginVertical: 12 },
  failed: { fontSize: 15, paddingHorizontal: 18, paddingVertical: 12 },
  lexicon: { marginHorizontal: 14, marginBottom: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  lexiconTitle: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  entryId: { fontSize: 13, fontWeight: '700', width: 56, fontVariant: ['tabular-nums'] },
  entryLemma: { fontSize: 17 },
  entryGloss: { fontSize: 13, marginTop: 1 },
  strongsRow: { marginHorizontal: 14, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  strongsText: { fontSize: 17, fontWeight: '600' },
  strongsSub: { fontSize: 13, marginTop: 2 },
  count: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 13 },
});
