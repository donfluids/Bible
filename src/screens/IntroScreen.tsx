import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Header } from '../components/Header';
import { SectionLabel } from '../components/SectionLabel';
import { languageScript, scriptOf, scriptureFont } from '../fonts';
import { useT } from '../i18n';
import { getIntro, getVerses, mapRef, mapRefs } from '../queries';
import type { BookIntro } from '../queries';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH, bookName, flattenVerse } from '../text';
import { useTheme } from '../theme';
import type { Book, Ref, VerseRow } from '../types';

interface Props {
  book: number;
  books: Book[];
  onBack: () => void;
  /** Opens a verse given in the Bible being read's numbering. */
  onOpenRef: (ref: Ref) => void;
}

/** "8:29" or "3:16-17" or "1:1-2:3" (KJV numbering) to its first and last verse. */
function parseRange(book: number, text: string): { start: Ref; end: Ref } | null {
  const m = /^(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/.exec(text);
  if (!m) return null;
  const start = { book, chapter: Number(m[1]), verse: Number(m[2]) };
  const end = m[4] ? { book, chapter: m[3] ? Number(m[3]) : start.chapter, verse: Number(m[4]) } : start;
  return { start, end };
}

/** "1:1–13", "1:14–8:26", "8:29": a range shown short. */
function rangeLabel(from: string, to: string): string {
  if (from === to) return from;
  const [c1] = from.split(':');
  const [c2, v2] = to.split(':');
  return c1 === c2 ? `${from}–${v2}` : `${from}–${to}`;
}

/**
 * A book's introduction, in the interface language: who wrote it, when and for whom, what
 * it is about, its themes, an outline whose sections open in the reader, and key verses
 * quoted from the Bible being read. References are in KJV numbering and are mapped to the
 * Bible being read before they open.
 */
export function IntroScreen({ book, books, onBack, onOpenRef }: Props) {
  const theme = useTheme();
  const t = useT();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const translation = settings.translation;
  const language = settings.language;
  const [intro, setIntro] = useState<BookIntro | null | undefined>(undefined);
  const [keyVerses, setKeyVerses] = useState<{ label: string; ref: Ref; verses: VerseRow[] }[]>([]);
  const font = scriptureFont(languageScript(language), settings.serif) ?? theme.font;
  const boldFont = scriptureFont(languageScript(language), settings.serif, true);
  const size = Math.min(settings.fontSize, 21);
  const name = bookName(books, book, translation);

  useEffect(() => {
    let cancelled = false;
    getIntro(db, book, language).then(async (found) => {
      if (cancelled) return;
      setIntro(found);
      if (!found) return;
      const out: { label: string; ref: Ref; verses: VerseRow[] }[] = [];
      for (const k of found.keyVerses) {
        const range = parseRange(book, k);
        if (!range) continue;
        // Up to three verses of a range within a chapter are quoted; a range into the next chapter, its first.
        const last = range.end.chapter === range.start.chapter ? Math.min(range.end.verse, range.start.verse + 2) : range.start.verse;
        const mapped: Ref[] = [];
        for (let v = range.start.verse; v <= last; v++)
          for (const m of await mapRefs(db, 'KJV', translation, { book, chapter: range.start.chapter, verse: v })) if (!mapped.some((x) => x.chapter === m.chapter && x.verse === m.verse)) mapped.push(m);
        const verses = (await getVerses(db, translation, mapped)).filter((v) => !v.omitted);
        out.push({ label: `${name} ${k.replace('-', '–')}`, ref: mapped[0] ?? range.start, verses });
      }
      if (!cancelled) setKeyVerses(out);
    }).catch(() => !cancelled && setIntro(null));
    return () => {
      cancelled = true;
    };
  }, [db, book, language, translation, name]);

  const open = async (kjv: Ref) => onOpenRef((await mapRef(db, 'KJV', translation, kjv)) ?? kjv);

  // A text with "(8:29)" references made links.
  const linked = (text: string) =>
    text.split(/(\(\d+:\d+(?:-(?:\d+:)?\d+)?\))/).map((piece, i) => {
      const range = i % 2 ? parseRange(book, piece.slice(1, -1)) : null;
      return range ? (
        <Text key={i} onPress={() => open(range.start)} accessibilityRole="link" style={{ color: theme.accent }}>
          {piece}
        </Text>
      ) : (
        piece
      );
    });

  const body = { color: theme.text, fontFamily: font, fontSize: size, lineHeight: Math.round(size * 1.6) };
  const small = { fontFamily: font, fontSize: Math.max(14, size - 3), lineHeight: Math.round(Math.max(14, size - 3) * 1.55) };
  const nameScript = scriptOf(name);
  return (
    <>
      <Header title={t('aboutBook')} onBack={onBack} />
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={[styles.title, { color: theme.text }, nameScript ? { fontFamily: scriptureFont(nameScript, settings.serif, true), fontWeight: 'normal' } : null]} accessibilityRole="header">
          {name}
        </Text>
        {intro === null ? <Text style={[body, { color: theme.muted }]}>{t('introNone')}</Text> : null}
        {intro ? (
          <>
            <View style={[styles.facts, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {(['author', 'date', 'audience'] as const).map((k) => (
                <View key={k} style={styles.fact}>
                  <Text style={[styles.factLabel, { color: theme.muted }]}>{t(k === 'author' ? 'introAuthor' : k === 'date' ? 'introDate' : 'introAudience')}</Text>
                  <Text selectable style={[small, { color: theme.text }]}>
                    {linked(intro.facts[k])}
                  </Text>
                </View>
              ))}
            </View>
            {intro.about.map((p, i) => (
              <Text key={i} selectable style={[body, styles.paragraph]}>
                {linked(p)}
              </Text>
            ))}
            <SectionLabel text={t('introThemes')} style={styles.section} />
            {intro.themes.map((th, i) => (
              <View key={i} style={styles.theme}>
                <Text style={[small, { color: theme.text, fontWeight: boldFont ? 'normal' : '700', fontFamily: boldFont ?? font }]}>{th.title}</Text>
                <Text selectable style={[small, { color: theme.text }]}>
                  {linked(th.text)}
                </Text>
              </View>
            ))}
            <SectionLabel text={t('introOutline')} style={styles.section} />
            {intro.outline.map((s, i) => {
              const range = parseRange(book, s.from);
              return (
                <Pressable
                  key={i}
                  onPress={() => range && open(range.start)}
                  android_ripple={{ color: theme.accentSoft }}
                  accessibilityRole="link"
                  style={({ pressed }) => [styles.outlineRow, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
                >
                  <Text style={[styles.outlineRef, { color: theme.accent }]}>{rangeLabel(s.from, s.to)}</Text>
                  <Text style={[small, styles.outlineTitle, { color: theme.text }]}>{s.title}</Text>
                </Pressable>
              );
            })}
            {keyVerses.length ? <SectionLabel text={t('introKeyVerses')} style={styles.section} /> : null}
            {keyVerses.map((k) => {
              const verseScript = scriptOf(k.verses.map((v) => v.text).join(' '));
              return (
                <Pressable
                  key={k.label}
                  onPress={() => onOpenRef(k.ref)}
                  android_ripple={{ color: theme.accentSoft }}
                  accessibilityRole="link"
                  style={({ pressed }) => [styles.keyVerse, { borderLeftColor: theme.accent, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
                >
                  <Text style={[styles.keyRef, { color: theme.accent }, scriptOf(k.label) ? { fontFamily: scriptureFont(scriptOf(k.label), settings.serif, true), fontWeight: 'normal' } : null]}>{k.label}</Text>
                  {k.verses.length ? (
                    <Text style={[small, { color: theme.text, fontFamily: scriptureFont(verseScript, settings.serif) ?? theme.font }]}>{k.verses.map((v) => flattenVerse(v.text)).join(' ')}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH, paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 12 },
  facts: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, gap: 10, marginBottom: 18 },
  fact: { gap: 2 },
  factLabel: { fontSize: 13, fontWeight: '600' },
  paragraph: { marginBottom: 14 },
  section: { marginTop: 14, marginBottom: 8 },
  theme: { marginBottom: 12, gap: 2 },
  outlineRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  outlineRef: { width: 92, fontSize: 14, fontWeight: '600', paddingTop: 2 },
  outlineTitle: { flex: 1 },
  keyVerse: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8, marginBottom: 10, gap: 4 },
  keyRef: { fontSize: 15, fontWeight: '600' },
});
