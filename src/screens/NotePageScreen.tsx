import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, KeyboardAvoidingView, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '../components/Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Header, HeaderIconButton } from '../components/Header';
import { SheetAction, SimpleSheet } from '../components/SimpleSheet';
import { sharePdf } from '../notebookFiles';
import { afterSheet } from '../platform';
import { typedPageHtml } from '../pagePdf';
import type { TypedLine } from '../pagePdf';
import { languageScript, scriptOf, scriptureFont } from '../fonts';
import { bibleName, useT } from '../i18n';
import { useNotebook } from '../notebook';
import { getVerseCounts, getVerses } from '../queries';
import { findReferences } from '../refs';
import type { FoundRef, TextPiece, VerseCount } from '../refs';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, flattenVerse, formatRef } from '../text';
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

/** A quoted verse's number; with the chapter when the quote runs across chapters. */
const verseLabel = (v: Ref, shown: Ref[]) => (shown[0].chapter !== shown[shown.length - 1].chapter ? `${v.chapter}:${v.verse}` : `${v.verse}`);

/**
 * The verses a reference shows (the range it names, up to MAX_SHOWN, across chapters when
 * it runs on) and how many the range holds. A whole chapter shows none.
 */
function rangeOf(ref: FoundRef, count: VerseCount): { shown: Ref[]; total: number } {
  const shown: Ref[] = [];
  let total = 0;
  if (ref.chapterOnly) return { shown, total };
  for (let c = ref.chapter; c <= ref.toChapter; c++) {
    const first = c === ref.chapter ? ref.verse : 1;
    const inChapter = count(ref.book, c);
    const last = c === ref.toChapter ? Math.min(ref.toVerse, inChapter ?? ref.toVerse) : inChapter;
    if (last === undefined) break;
    total += Math.max(0, last - first + 1);
    for (let v = first; v <= last && shown.length < MAX_SHOWN; v++) shown.push({ book: ref.book, chapter: c, verse: v });
  }
  return { shown, total };
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
  const { pages, edit, remove, commit } = useNotebook();
  const page = pages.find((p) => p.id === id);
  const [shareSheet, setShareSheet] = useState(false);
  const [editing, setEditing] = useState(!!isNew || (!!page && !page.title.trim() && !page.body.trim()));
  const translation = settings.translation;
  const uiScript = languageScript(settings.language);

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
  const bodyRef = useRef<TextInput>(null);
  // Where the cursor is, for the reference strip and for lists that carry on.
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const cursor = selection?.start ?? draft.body.length;
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
  // Leaving the app keeps what was typed, written at once: Android may close the app
  // without another word, and timers do not run in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      const { page: p, draft: d, editing: e } = latest.current;
      if (p && e && (d.title !== p.title || d.body !== p.body)) commit(p.id, d);
    });
    return () => sub.remove();
  }, [commit]);
  // Leaving the page keeps what was typed; a page left with nothing written on it is not kept.
  useEffect(
    () => () => {
      // Written at once: if the whole app is being remounted after an error, the
      // notebook's own state goes with it.
      const { page: p, draft: d, editing: e } = latest.current;
      if (p && e && (d.title !== p.title || d.body !== p.body)) commit(p.id, d);
      const title = e ? d.title : p?.title ?? '';
      const body = e ? d.body : p?.body ?? '';
      if (p && !title.trim() && !body.trim()) remove(p.id);
    },
    [commit, remove],
  );

  // Verse counts let "John 2024" stay a year and ranges run on across chapters. Links
  // appear once they are read (once per translation, a few milliseconds).
  const [counts, setCounts] = useState<{ translation: string; map: Map<string, number> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getVerseCounts(db, translation)
      .then((map) => !cancelled && setCounts({ translation, map }))
      .catch(() => !cancelled && setCounts({ translation, map: new Map() }));
    return () => {
      cancelled = true;
    };
  }, [db, translation]);
  const verseCount = useMemo<VerseCount | null>(
    () => (counts && counts.translation === translation ? (book, chapter) => counts.map.get(`${book}:${chapter}`) : null),
    [counts, translation],
  );

  // Read only; while writing the page is a plain text box.
  const lines = useMemo(
    () =>
      page && !editing
        ? page.body.split('\n').map((line): TextPiece[] => (verseCount ? findReferences(line, books, translation, verseCount) : [{ text: line }]))
        : [],
    [page?.body, editing, books, translation, verseCount],
  );

  // The text of every verse the page shows, in the Bible being read.
  const [verses, setVerses] = useState<Map<string, VerseRow>>(new Map());
  useEffect(() => {
    if (!verseCount) return;
    const wanted = lines.flatMap((pieces) => pieces.flatMap((p) => (p.ref ? rangeOf(p.ref, verseCount).shown : [])));
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
  }, [db, lines, translation, verseCount]);

  // While writing, the last reference on the line being typed shows above the keyboard with
  // the verse it names; a tap puts the verse's text into the page under that line.
  const lineAt = (body: string, at: number) => {
    const start = body.lastIndexOf('\n', Math.max(0, at - 1)) + 1;
    const endIndex = body.indexOf('\n', at);
    return { start, end: endIndex < 0 ? body.length : endIndex, text: body.slice(start, endIndex < 0 ? body.length : endIndex) };
  };
  const typedRef = useMemo(() => {
    if (!editing || !verseCount) return null;
    const line = lineAt(draft.body, cursor);
    const refs = findReferences(line.text, books, translation, verseCount).filter((piece) => piece.ref);
    const last = refs[refs.length - 1];
    return last?.ref ? { ref: last.ref, lineEnd: line.end } : null;
  }, [editing, draft.body, cursor, books, translation, verseCount]);
  const [stripRows, setStripRows] = useState<{ key: string; rows: VerseRow[]; more: number } | null>(null);
  useEffect(() => {
    if (!typedRef || !verseCount) return;
    const { shown, total } = rangeOf(typedRef.ref, verseCount);
    if (shown.length === 0) return;
    const key = `${translation}:${shown.map((r) => verseKey(r.book, r.chapter, r.verse)).join(',')}`;
    let cancelled = false;
    getVerses(db, translation, shown)
      .then((rows) => !cancelled && setStripRows({ key, rows: rows.filter((v) => !v.omitted), more: total - shown.length }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [db, typedRef, translation, verseCount]);
  const strip = typedRef && verseCount && stripRows && stripRows.key === `${translation}:${rangeOf(typedRef.ref, verseCount).shown.map((r) => verseKey(r.book, r.chapter, r.verse)).join(',')}` && stripRows.rows.length > 0 ? stripRows : null;
  const insertVerse = () => {
    if (!typedRef || !strip) return;
    const shown = strip.rows;
    const text = shown.map((v) => (shown.length > 1 ? `${verseLabel(v, shown)} ${flattenVerse(v.text)}` : flattenVerse(v.text))).join(' ');
    const quote = `\n“${text}${strip.more > 0 ? ' …' : ''}”`;
    const at = typedRef.lineEnd;
    setDraft((d) => ({ ...d, body: d.body.slice(0, at) + quote + d.body.slice(at) }));
    setSelection({ start: at + quote.length, end: at + quote.length });
  };

  // A list carries on: a return after "- " or "1. " starts the next line the same way, and a
  // return on an empty item ends the list.
  const changeBody = (body: string) => {
    const before = latest.current.draft.body;
    if (body.length === before.length + 1) {
      const at = cursor;
      if (body[at] === '\n' && body.slice(0, at) === before.slice(0, at) && body.slice(at + 1) === before.slice(at)) {
        const line = lineAt(before, at);
        const m = /^(\s*)(?:([-•*])|(\d+)[.)])\s+(.*)$/.exec(line.text);
        if (m) {
          if (!m[4].trim()) {
            // An empty item: the list ends and the marker goes.
            const next = body.slice(0, line.start) + body.slice(at + 1);
            setDraft((d) => ({ ...d, body: next }));
            setSelection({ start: line.start, end: line.start });
            return;
          }
          const marker = m[2] ? `${m[1]}${m[2]} ` : `${m[1]}${Number(m[3]) + 1}. `;
          const next = body.slice(0, at + 1) + marker + body.slice(at + 1);
          setDraft((d) => ({ ...d, body: next }));
          setSelection({ start: at + 1 + marker.length, end: at + 1 + marker.length });
          return;
        }
      }
    }
    setDraft((d) => ({ ...d, body }));
  };

  if (!page) return <View style={[styles.screen, { backgroundColor: theme.bg }]}><Header title={t('notebook')} onBack={onBack} /></View>;

  // The verses quoted under a reference, without any the translation leaves out, and how
  // many more the range holds.
  const quoted = (ref: FoundRef) => {
    if (!verseCount) return { rows: [] as VerseRow[], more: 0 };
    const { shown, total } = rangeOf(ref, verseCount);
    const rows = shown.map((r) => verses.get(verseKey(r.book, r.chapter, r.verse))).filter((v): v is VerseRow => !!v && !v.omitted);
    return { rows, more: total - shown.length };
  };

  const fontSize = Math.min(settings.fontSize, 22);
  const lineHeight = Math.round(fontSize * 1.55);
  const verseSize = Math.max(14, fontSize - 2);
  const scriptFont = scriptureFont(translationInfo(translation).script, settings.serif);
  const textFont = (text: string) => scriptureFont(scriptOf(text) ?? (text.trim() ? null : uiScript), settings.serif);

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
    let anyQuoted = false;
    for (const pieces of lines) {
      out.push(pieces.map((p) => p.text).join(''));
      for (const p of pieces) {
        if (!p.ref) continue;
        const { rows: shown, more } = quoted(p.ref);
        if (shown.length === 0) continue;
        anyQuoted = true;
        const text = shown.map((v) => (shown.length > 1 ? `${verseLabel(v, shown)} ${flattenVerse(v.text)}` : flattenVerse(v.text))).join(' ');
        out.push(`“${text}${more > 0 ? ' …' : ''}”`);
      }
    }
    if (anyQuoted) out.push('', `— ${bibleName(settings.language, translation)}`);
    await Share.share({ message: out.join('\n').replace(/\n{3,}/g, '\n\n').trim() });
  };

  // The page as a PDF: the writing, references in colour and the verses quoted under them.
  const sharePagePdf = async () => {
    const typed: TypedLine[] = lines.map((pieces) => ({
      pieces: pieces.map((p) => ({ text: p.text, ref: !!p.ref })),
      quotes: pieces.flatMap((p) => {
        if (!p.ref) return [];
        const { rows: shown, more } = quoted(p.ref);
        if (shown.length === 0) return [];
        const text = shown.map((v) => (shown.length > 1 ? `${verseLabel(v, shown)} ${flattenVerse(v.text)}` : flattenVerse(v.text))).join(' ');
        return [{ text, more }];
      }),
    }));
    const anyQuoted = typed.some((l) => l.quotes.length > 0);
    const html = typedPageHtml(page.title.trim(), typed, anyQuoted ? `— ${bibleName(settings.language, translation)}` : '', (n) => t('moreVerses', { n }));
    try {
      await sharePdf(html, page.title, t('sharePage'));
    } catch {
      Alert.alert(t('pdfFailed'));
    }
  };

  const renderLine = (pieces: TextPiece[], i: number) => {
    const text = pieces.map((p) => p.text).join('');
    if (!text.trim()) return <View key={i} style={{ height: lineHeight / 2 }} />;
    // A verse the writer put in under its reference (a line in quotation marks) is not quoted again.
    const nextLine = lines[i + 1]?.map((p) => p.text).join('') ?? '';
    const refs = nextLine.trimStart().startsWith('“') ? [] : pieces.filter((p) => p.ref).map((p) => p.ref!);
    return (
      <View key={i} style={styles.line}>
        <Text selectable style={{ fontSize, lineHeight, color: theme.text, fontFamily: textFont(text) }}>
          {pieces.map((p, j) =>
            p.ref ? (
              <Text
                key={j}
                onPress={() => onOpenRef({ book: p.ref!.book, chapter: p.ref!.chapter, verse: Math.max(1, p.ref!.verse) })}
                accessibilityRole="link"
                style={{ color: theme.accent, textDecorationLine: 'underline', fontWeight: scriptOf(p.text) ? 'normal' : '600', fontFamily: scriptureFont(scriptOf(p.text), settings.serif, true) }}
              >
                {unbroken(p.text)}
              </Text>
            ) : (
              p.text
            ),
          )}
        </Text>
        {refs.map((ref, j) => {
          const { rows: shown, more } = quoted(ref);
          if (shown.length === 0) return null;
          return (
            <View key={j} style={[styles.quote, { borderLeftColor: theme.accent, backgroundColor: theme.accentSoft }]}>
              <Text style={{ fontSize: verseSize, lineHeight: Math.round(verseSize * translationInfo(translation).lineHeight), color: theme.text, fontFamily: scriptFont }}>
                {shown.map((v, k) => (
                  <Text key={k}>
                    {shown.length > 1 ? <Text style={{ color: theme.accent, fontSize: verseSize - 4 }}>{`${verseLabel(v, shown)} `}</Text> : null}
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
  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: theme.bg }]} behavior="padding">
      <Header
        title={t('notebook')}
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
              <HeaderIconButton icon="share" onPress={() => setShareSheet(true)} accessibilityLabel={t('sharePage')} />
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
            style={[styles.titleInput, { color: theme.text, borderBottomColor: theme.border, fontFamily: scriptureFont(scriptOf(draft.title) ?? uiScript, settings.serif, true), fontWeight: uiScript ? 'normal' : '600' }]}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => bodyRef.current?.focus()}
          />
          <TextInput
            ref={bodyRef}
            value={draft.body}
            onChangeText={changeBody}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            selection={selection}
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
            <Text selectable style={[styles.title, { color: theme.text, fontFamily: scriptureFont(scriptOf(titleText), settings.serif, true), fontWeight: scriptOf(titleText) ? 'normal' : '700' }]}>
              {titleText}
            </Text>
          ) : null}
          {lines.map(renderLine)}
        </ScrollView>
      )}
      {editing && typedRef && strip ? (
        <View style={[styles.strip, { borderTopColor: theme.border, backgroundColor: theme.card, paddingBottom: Math.max(8, insets.bottom) }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stripRef, { color: theme.accent }]}>{formatRef(books, { book: typedRef.ref.book, chapter: typedRef.ref.chapter, verse: Math.max(1, typedRef.ref.verse) }, translation)}</Text>
            <Text numberOfLines={2} style={[styles.stripText, { color: theme.text, fontFamily: scriptFont }]}>
              {flattenVerse(strip.rows[0].text)}
            </Text>
          </View>
          <Pressable onPress={insertVerse} accessibilityRole="button" style={[styles.stripButton, { borderColor: theme.accent }]}>
            <Text style={[styles.stripButtonText, { color: theme.accent }]}>{t('insertVerseText')}</Text>
          </Pressable>
        </View>
      ) : null}
      <SimpleSheet visible={shareSheet} title={t('sharePage')} onClose={() => setShareSheet(false)}>
        <SheetAction
          icon="share"
          label={t('shareAsText')}
          onPress={() => {
            setShareSheet(false);
            afterSheet(sharePage);
          }}
        />
        <SheetAction
          icon="picture_as_pdf"
          label={t('shareAsPdf')}
          onPress={() => {
            setShareSheet(false);
            afterSheet(sharePagePdf);
          }}
        />
      </SimpleSheet>
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
  strip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  stripRef: { fontSize: 13, fontWeight: '600' },
  stripText: { fontSize: 14, lineHeight: 20 },
  stripButton: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, justifyContent: 'center' },
  stripButtonText: { fontSize: 14, fontWeight: '600' },
});

/** A reference kept on one line: no-break spaces, a no-break hyphen, and no break at a dash. */
function unbroken(text: string): string {
  return text.replace(/ /g, '\u00A0').replace(/-/g, '\u2011').replace(/–/g, '\u2060–\u2060');
}
