import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '../components/Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { Icon, IconButton } from '../components/Icon';
import { SectionLabel } from '../components/SectionLabel';
import { renderingsLabel, shortName, useT } from '../i18n';
import { VerseListItem } from '../components/VerseListItem';
import { getVerses, searchLexicon, searchText } from '../queries';
import { parseReference } from '../refs';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, bookName, formatCount } from '../text';
import { useTheme } from '../theme';
import { newTestamentFirst, refInScope, scopeCounts } from '../searchScope';
import type { Scope } from '../searchScope';
import { shortBookName } from '../shortNames';
import type { Book, LexiconHit, Ref, VerseRow, WordPick } from '../types';

interface Props {
  books: Book[];
  onOpenRef: (ref: Ref) => void;
  onWord: (pick: WordPick) => void;
  onBack: () => void;
}

/** Verses read and shown at a time; "Show more" adds the next lot. */
const PAGE = 100;


// Shown under an empty search box: a reference, a word and a Strong's number.
const ENGLISH_EXAMPLES = ['John 3:16', 'Psalm 23', 'love', 'G26'];
const MALAYALAM_EXAMPLES = ['യോഹന്നാൻ 3:16', 'സങ്കീർത്തനം 23', 'സ്നേഹം', 'H430'];
const TAMIL_EXAMPLES = ['யோவான் 3:16', 'சங்கீதம் 23', 'அன்பு', 'H430'];

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
  // Every matching verse, New Testament first; the list shows a page of them at a time.
  const [matches, setMatches] = useState<Ref[] | null>(null);
  const [scope, setScope] = useState<Scope>('all');
  const [results, setResults] = useState<VerseRow[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
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
      setMatches(null);
      setResults(null);
      setEntries([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    setFailed(false);
    const timer = setTimeout(async () => {
      try {
        const [refs, hits] = await Promise.all([searchText(db, translation, q, () => latest.current !== id), searchLexicon(db, q, 8)]);
        if (latest.current !== id) return;
        const ordered = newTestamentFirst(refs, testament);
        const rows = await getVerses(db, translation, ordered.slice(0, PAGE));
        if (latest.current !== id) return;
        setMatches(ordered);
        setScope('all');
        setResults(rows);
        setEntries(hits);
      } catch {
        if (latest.current !== id) return;
        setMatches(null);
        setResults(null);
        setEntries([]);
        setFailed(true);
      }
      setBusy(false);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, translation, query, strongsId, goTo?.book, goTo?.chapter, goTo?.verse]);

  const testament = useMemo(() => new Map(books.map((b) => [b.id, b.testament])), [books]);
  const inScope = useCallback((r: Ref, sc: Scope) => refInScope(r, sc, testament), [testament]);
  const scoped = useMemo(() => (matches ?? []).filter((r) => inScope(r, scope)), [matches, scope, inScope]);
  // The chips above the list: all, each Testament, and the books with most matches.
  const chips = useMemo(() => {
    const label = (sc: Scope) =>
      sc === 'all' ? t('allResults') : sc === 'NT' ? t('newTestament') : sc === 'OT' ? t('oldTestament') : shortBookName(sc, translation) || bookName(books, sc, translation);
    return scopeCounts(matches ?? [], testament).map((c) => ({ ...c, label: label(c.scope) }));
  }, [matches, testament, books, translation, t]);
  const chooseScope = async (next: Scope) => {
    if (!matches || next === scope) return;
    const id = latest.current;
    setScope(next);
    setLoadingMore(true);
    try {
      const rows = await getVerses(db, translation, matches.filter((r) => inScope(r, next)).slice(0, PAGE));
      if (latest.current === id) setResults(rows);
    } catch {
      if (latest.current === id) setFailed(true);
    }
    setLoadingMore(false);
  };
  const showMore = async () => {
    if (!results || loadingMore) return;
    const id = latest.current;
    setLoadingMore(true);
    try {
      const rows = await getVerses(db, translation, scoped.slice(results.length, results.length + PAGE));
      if (latest.current === id) setResults((prev) => [...(prev ?? []), ...rows]);
    } catch {
      if (latest.current === id) setFailed(true);
    }
    setLoadingMore(false);
  };
  const more = !!results && results.length < scoped.length;

  const listFont = Math.min(settings.fontSize, 18);
  // Stable list props: the rows redraw for a new query (its words are highlighted), not
  // when the spinner or the dictionary matches change.
  const renderResult = useCallback(
    ({ item }: { item: VerseRow }) => <VerseListItem verse={item} books={books} fontSize={listFont} onOpen={onOpenRef} onWord={onWord} highlightText={query} />,
    [books, listFont, onOpenRef, onWord, query],
  );
  const listStyle = useMemo(() => [styles.list, { paddingBottom: insets.bottom + 24 }], [insets.bottom]);

  // The examples, the jump and dictionary rows, the count and the filters scroll with
  // the verses, so a short screen still has room for the list.
  const listHeader = (
    <View style={styles.column}>
      {!query.trim() ? (
        <View style={styles.examples}>
          <Text style={[styles.examplesLabel, { color: theme.muted }]}>{t('searchExamples')}</Text>
          <View style={styles.exampleRow}>
            {(translation === 'MAL' ? MALAYALAM_EXAMPLES : translation === 'TAM' ? TAMIL_EXAMPLES : ENGLISH_EXAMPLES).map((example) => (
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
          <Text style={[styles.strongsSub, { color: theme.muted }]}>{t('openIn', { translation: shortName(translation), in: renderingsLabel(settings.language, translation) })}</Text>
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
      {matches && !busy ? (
        <Text style={[styles.count, { color: theme.muted }]}>
          {matches.length === 0 ? t('noVerses') : matches.length === 1 ? t('oneVerse') : t('nVerses', { n: formatCount(matches.length) })}
        </Text>
      ) : null}
      {chips.length > 0 && !busy ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
          {chips.map((c) => {
            const active = c.scope === scope;
            return (
              <Pressable
                key={String(c.scope)}
                onPress={() => chooseScope(c.scope)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                android_ripple={{ color: theme.accentSoft }}
                style={[styles.chip, { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accentSoft : 'transparent' }]}
              >
                <Text style={[styles.chipText, { color: active ? theme.accent : theme.text }]}>
                  {c.label} <Text style={{ color: theme.muted }}>{formatCount(c.n)}</Text>
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={t('searchTitle', { name: shortName(translation), in: renderingsLabel(settings.language, translation) })} onBack={onBack} />
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
          // Longer than any reference or phrase; a pasted page would only slow every keystroke.
          maxLength={200}
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
      <FlatList
        data={results ?? []}
        keyExtractor={verseKey}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={listStyle}
        renderItem={renderResult}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          more ? (
            <Pressable
              onPress={showMore}
              disabled={loadingMore}
              accessibilityRole="button"
              android_ripple={{ color: theme.accentSoft }}
              style={[styles.moreButton, { borderColor: theme.border }]}
            >
              {loadingMore ? (
                <ActivityIndicator color={theme.accent} />
              ) : (
                <Text style={[styles.moreText, { color: theme.accent }]}>{t('showMore', { n: formatCount(scoped.length - (results?.length ?? 0)) })}</Text>
              )}
            </Pressable>
          ) : (
            LIST_FOOTER
          )
        }
      />
    </View>
  );
}

const verseKey = (v: VerseRow) => `${v.book}:${v.chapter}:${v.verse}`;
const LIST_FOOTER = <View style={{ height: 40 }} />;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  column: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
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
  chips: { gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, justifyContent: 'center', overflow: 'hidden' },
  chipText: { fontSize: 14 },
  moreButton: { margin: 16, marginBottom: 48, minHeight: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  moreText: { fontSize: 15, fontWeight: '600' },
});
