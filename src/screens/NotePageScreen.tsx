import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Header, HeaderIconButton } from '../components/Header';
import { isMalayalam, scriptureFont } from '../fonts';
import { translationName, useT } from '../i18n';
import { pageName, useNotebook } from '../notebook';
import { getVerses } from '../queries';
import { findReferences } from '../refs';
import type { FoundRef, TextPiece } from '../refs';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, flattenVerse } from '../text';
import { useTheme } from '../theme';
import { translationInfo } from '../types';
import type { Book, Ref, VerseRow } from '../types';

interface Props {
  id: string;
  /** A page just made: it opens for writing. */
  isNew?: boolean;
  books: Book[];
  onOpenRef: (ref: Ref) => void;
  onBack: () => void;
}

/** At most this many verses of a range are shown under it; the rest are counted. */
const MAX_SHOWN = 8;

const verseKey = (book: number, chapter: number, verse: number) => `${book}:${chapter}:${verse}`;

/** The verses a reference shows: the range it names, up to MAX_SHOWN. A whole chapter shows none. */
function shownVerses(ref: FoundRef): Ref[] {
  if (ref.chapterOnly || ref.verse < 1) return [];
  const out: Ref[] = [];
  for (let v = ref.verse; v <= ref.toVerse && out.length < MAX_SHOWN; v++) out.push({ book: ref.book, chapter: ref.chapter, verse: v });
  return out;
}

/**
 * A notebook page. Read, it shows the writing with each reference as a link to the verse
 * and the verse text under the line that names it, in the Bible being read. Written, it is
 * a title and a plain text box. Changes are kept as they are typed.
 */
export function NotePageScreen({ id, isNew, books, onOpenRef, onBack }: Props) {
  const theme = useTheme();
  const t = useT();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { pages, edit, remove } = useNotebook();
  const page = pages.find((p) => p.id === id);
  const [editing, setEditing] = useState(!!isNew || (!!page && !page.title.trim() && !page.body.trim()));
  const translation = settings.translation;
  const malayalamUi = settings.language === 'ml';

  // What is typed stays here and goes to the notebook a moment after typing stops, so
  // the reader underneath is not redrawn on every key. Read, the page shows the notebook.
  const [draft, setDraft] = useState({ title: page?.title ?? '', body: page?.body ?? '' });
  // Taken from the notebook when reading, and once when the page first turns up.
  const loaded = useRef(!!page);
  useEffect(() => {
    if (!page || (editing && loaded.current)) return;
    loaded.current = true;
    setDraft({ title: page.title, body: page.body });
  }, [editing, page?.title, page?.body]);
  const latest = useRef({ page, draft, editing });
  latest.current = { page, draft, editing };
  const flush = useCallback(() => {
    const { page: p, draft: d, editing: e } = latest.current;
    if (p && e && (d.title !== p.title || d.body !== p.body)) edit(p.id, d);
  }, [edit]);
  useEffect(() => {
    if (!editing) return;
    const timer = setTimeout(flush, 400);
    return () => clearTimeout(timer);
  }, [draft, editing, flush]);
  // Leaving keeps what was typed; a page left with nothing written on it is not kept.
  useEffect(
    () => () => {
      flush();
      const { page: p, draft: d, editing: e } = latest.current;
      const title = e ? d.title : p?.title ?? '';
      const body = e ? d.body : p?.body ?? '';
      if (p && !title.trim() && !body.trim()) remove(p.id);
    },
    [flush, remove],
  );

  const lines = useMemo(() => (page ? page.body.split('\n').map((line) => findReferences(line, books, translation)) : []), [page?.body, books, translation]);

  // The text of every verse the page shows, in the Bible being read.
  const [verses, setVerses] = useState<Map<string, VerseRow>>(new Map());
  useEffect(() => {
    const wanted = lines.flatMap((pieces) => pieces.flatMap((p) => (p.ref ? shownVerses(p.ref) : [])));
    if (wanted.length === 0) return;
    let cancelled = false;
    getVerses(db, translation, wanted)
      .then((rows) => {
        if (!cancelled) setVerses(new Map(rows.map((r) => [verseKey(r.book, r.chapter, r.verse), r])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [db, lines, translation]);

  if (!page) return <View style={[styles.screen, { backgroundColor: theme.bg }]}><Header title={t('notebook')} onBack={onBack} /></View>;

  const fontSize = Math.min(settings.fontSize, 22);
  const lineHeight = Math.round(fontSize * 1.55);
  const verseSize = Math.max(14, fontSize - 2);
  const scriptFont = scriptureFont(translation === 'MAL', settings.serif);
  const textFont = (text: string) => scriptureFont(isMalayalam(text) || (malayalamUi && !text.trim()), settings.serif);

  const deletePage = () => {
    Alert.alert(t('deletePage'), t('deletePageConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          remove(page.id);
          onBack();
        },
      },
    ]);
  };

  // The page as plain text: the writing, each referenced verse quoted under its line, and
  // the Bible the quotes are from.
  const sharePage = async () => {
    const out: string[] = [];
    if (page.title.trim()) out.push(page.title.trim(), '');
    let quoted = false;
    for (const pieces of lines) {
      out.push(pieces.map((p) => p.text).join(''));
      for (const p of pieces) {
        if (!p.ref) continue;
        const shown = shownVerses(p.ref)
          .map((r) => verses.get(verseKey(r.book, r.chapter, r.verse)))
          .filter((v): v is VerseRow => !!v);
        if (shown.length === 0) continue;
        quoted = true;
        const text = shown.map((v) => (shown.length > 1 ? `${v.verse} ${flattenVerse(v.text)}` : flattenVerse(v.text))).join(' ');
        const more = p.ref.toVerse - p.ref.verse + 1 - shown.length;
        out.push(`“${text}${more > 0 ? ' …' : ''}”`);
      }
    }
    if (quoted) out.push('', `— ${translationName(settings.language, translation)}`);
    await Share.share({ message: out.join('\n').replace(/\n{3,}/g, '\n\n').trim() });
  };

  const renderLine = (pieces: TextPiece[], i: number) => {
    const text = pieces.map((p) => p.text).join('');
    if (!text.trim()) return <View key={i} style={{ height: lineHeight / 2 }} />;
    const refs = pieces.filter((p) => p.ref).map((p) => p.ref!);
    return (
      <View key={i} style={styles.line}>
        <Text selectable style={{ fontSize, lineHeight, color: theme.text, fontFamily: textFont(text) }}>
          {pieces.map((p, j) =>
            p.ref ? (
              <Text
                key={j}
                onPress={() => onOpenRef({ book: p.ref!.book, chapter: p.ref!.chapter, verse: Math.max(1, p.ref!.verse) })}
                accessibilityRole="link"
                style={{ color: theme.accent, textDecorationLine: 'underline', fontWeight: isMalayalam(p.text) ? 'normal' : '600', fontFamily: scriptureFont(isMalayalam(p.text), settings.serif, true) }}
              >
                {p.text}
              </Text>
            ) : (
              p.text
            ),
          )}
        </Text>
        {refs.map((ref, j) => {
          const shown = shownVerses(ref)
            .map((r) => verses.get(verseKey(r.book, r.chapter, r.verse)))
            .filter((v): v is VerseRow => !!v);
          if (shown.length === 0) return null;
          const more = ref.toVerse - ref.verse + 1 - shown.length;
          return (
            <View key={j} style={[styles.quote, { borderLeftColor: theme.accent, backgroundColor: theme.accentSoft }]}>
              <Text style={{ fontSize: verseSize, lineHeight: Math.round(verseSize * translationInfo(translation).lineHeight), color: theme.text, fontFamily: scriptFont }}>
                {shown.map((v, k) => (
                  <Text key={k}>
                    {shown.length > 1 ? <Text style={{ color: theme.accent, fontSize: verseSize - 4 }}>{`${v.verse} `}</Text> : null}
                    {flattenVerse(v.text)}
                    {k < shown.length - 1 ? ' ' : ''}
                  </Text>
                ))}
              </Text>
              {more > 0 ? <Text style={[styles.more, { color: theme.muted }]}>{t('moreVerses', { n: more })}</Text> : null}
            </View>
          );
        })}
      </View>
    );
  };

  const titleText = page.title.trim();
  const draftTitle = draft.title.trim();
  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: theme.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header
        title={editing ? draftTitle || t('newPage') : pageName(page, t('untitled'))}
        onBack={onBack}
        right={
          editing ? (
            <HeaderIconButton
              icon="check"
              onPress={() => {
                flush();
                setEditing(false);
              }}
              accessibilityLabel={t('donePage')}
            />
          ) : (
            <>
              <HeaderIconButton icon="share" onPress={sharePage} accessibilityLabel={t('sharePage')} />
              <HeaderIconButton icon="edit" onPress={() => setEditing(true)} accessibilityLabel={t('editPage')} />
              <HeaderIconButton icon="delete" onPress={deletePage} accessibilityLabel={t('deletePage')} />
            </>
          )
        }
      />
      {editing ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <TextInput
            value={draft.title}
            onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
            placeholder={t('pageTitle')}
            placeholderTextColor={theme.muted}
            style={[styles.titleInput, { color: theme.text, borderBottomColor: theme.border, fontFamily: scriptureFont(malayalamUi || isMalayalam(draft.title), settings.serif, true), fontWeight: malayalamUi ? 'normal' : '600' }]}
            returnKeyType="next"
          />
          <TextInput
            value={draft.body}
            onChangeText={(body) => setDraft((d) => ({ ...d, body }))}
            placeholder={t('pageBody')}
            placeholderTextColor={theme.muted}
            multiline
            autoFocus={!!isNew}
            textAlignVertical="top"
            style={[styles.bodyInput, { color: theme.text, fontSize, lineHeight, fontFamily: textFont(draft.body) }]}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
          {titleText ? (
            <Text selectable style={[styles.title, { color: theme.text, fontFamily: scriptureFont(isMalayalam(titleText), settings.serif, true), fontWeight: isMalayalam(titleText) ? 'normal' : '700' }]}>
              {titleText}
            </Text>
          ) : null}
          {lines.map(renderLine)}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: 18, paddingTop: 8 },
  title: { fontSize: 24, lineHeight: 34, marginBottom: 12 },
  line: { marginBottom: 6 },
  quote: { borderLeftWidth: 3, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, marginTop: 6, marginBottom: 4 },
  more: { fontSize: 13, marginTop: 4 },
  titleInput: { fontSize: 22, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  bodyInput: { minHeight: 320, paddingVertical: 8 },
});
