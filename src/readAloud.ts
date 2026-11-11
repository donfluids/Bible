// Reading a chapter aloud with the phone's own voice: verse by verse, so the reader can
// mark the verse being read, step back and forth, and go on into the next chapter.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { PHONE_VOICE, prepareVerse, sayVerse, stopBuiltinVoice, usesBuiltinVoice } from './builtinVoice';
import { LANGUAGE } from './speech';
import type { SpokenLanguage } from './speech';
import { flattenVerse } from './text';
import type { TranslationId, VerseRow } from './types';

export const READ_SPEEDS = [0.75, 1, 1.25];

export function voiceFor(translation: TranslationId): SpokenLanguage {
  return translation === 'MAL' ? 'malayalam' : translation === 'TAM' ? 'tamil' : translation === 'HIN' ? 'hindi' : 'english';
}

/** What is said for a verse: its text only, without the KJV's paragraph marks. */
export function spokenText(verse: VerseRow): string {
  return flattenVerse(verse.text);
}

export interface ReadAloud {
  /** Reading, paused, or between chapters. */
  active: boolean;
  /** The verse being read (or paused at); null between chapters and when not reading. */
  verse: number | null;
  /** False while paused. */
  playing: boolean;
  start: (fromVerse?: number) => void;
  pause: () => void;
  resume: () => void;
  step: (delta: 1 | -1) => void;
  stop: () => void;
}

interface Options {
  /** The chapter on screen ("book:chapter") and its verses in order, once loaded. */
  chapterKey: string;
  verses: VerseRow[] | null;
  translation: TranslationId;
  rate: number;
  /** The chosen voice's identifier, or undefined for the phone's default. */
  voice?: string;
  /** Turns to the next chapter; false at the end of the Bible. */
  nextChapter: () => boolean;
}

// The pause between the end of one chapter and the start of the next.
const CHAPTER_PAUSE = 900;

export function useReadAloud({ chapterKey, verses, translation, rate, voice, nextChapter }: Options): ReadAloud {
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(false);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  // Each utterance carries the token it was started with; a stop or a new start makes the
  // callbacks of the old one do nothing.
  const token = useRef(0);
  const live = useRef({ verses, translation, rate, voice, nextChapter, chapterKey, index });
  live.current = { verses, translation, rate, voice, nextChapter, chapterKey, index };
  // Set while waiting for the next chapter's verses after turning to it.
  const continuing = useRef<string | null>(null);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set while this reader's own verse is being spoken. Another reader (one opened from
  // Saved or Search) stopping, or the word sheet closing, must not stop this one.
  const speaking = useRef(false);

  const halt = useCallback(() => {
    token.current++;
    continuing.current = null;
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = null;
    if (speaking.current) {
      Speech.stop();
      stopBuiltinVoice();
    }
    speaking.current = false;
  }, []);

  const speakAt = useCallback(
    (i: number) => {
      halt();
      const { verses: list, translation: tr, rate: r, voice: v, nextChapter: next, chapterKey: key } = live.current;
      if (!list) return;
      if (i >= list.length) {
        // The end of the chapter: on to the next, or stop at the end of the Bible.
        if (next()) {
          continuing.current = key;
          setIndex(null);
        } else {
          setIndex(null);
          setPlaying(false);
          setActive(false);
        }
        return;
      }
      const mine = token.current;
      setIndex(i);
      setPlaying(true);
      setActive(true);
      speaking.current = true;
      const onDone = () => {
        if (token.current === mine) speakAt(i + 1);
      };
      // Stopped from elsewhere (a word said in the word sheet): paused at this verse.
      const onStopped = () => {
        if (token.current !== mine) return;
        speaking.current = false;
        setPlaying(false);
      };
      const onError = () => {
        if (token.current !== mine) return;
        speaking.current = false;
        setIndex(null);
        setPlaying(false);
        setActive(false);
      };
      const withPhone = () =>
        Speech.speak(spokenText(list[i]), { language: LANGUAGE[voiceFor(tr)], voice: v === PHONE_VOICE || v?.startsWith('builtin:') ? undefined : v, rate: r, onDone, onStopped, onError });
      if (usesBuiltinVoice(tr, v)) {
        // The app's own voice; the verse after this one is made while this one is read.
        // Where it cannot run on a phone, the phone's voice reads instead.
        const ref = (row: VerseRow) => ({ book: row.book, chapter: row.chapter, verse: row.verse });
        sayVerse(ref(list[i]), r, {
          onDone,
          onStopped,
          onError: () => {
            if (token.current === mine) withPhone();
          },
        });
        if (i + 1 < list.length) prepareVerse(ref(list[i + 1]), r);
      } else withPhone();
    },
    [halt],
  );

  // The next chapter's verses have come in: read on from its start, after a short pause.
  useEffect(() => {
    const from = continuing.current;
    if (from === null || !verses || chapterKey === from) return;
    const first = verses[0];
    if (!first || `${first.book}:${first.chapter}` !== chapterKey) return;
    continuing.current = null;
    pauseTimer.current = setTimeout(() => speakAt(0), CHAPTER_PAUSE);
  }, [chapterKey, verses, speakAt]);

  // A chapter or translation changed by the reader, not by reading on, ends the reading.
  const shown = useRef({ chapterKey, translation });
  useEffect(() => {
    const before = shown.current;
    shown.current = { chapterKey, translation };
    if (before.chapterKey === chapterKey && before.translation === translation) return;
    if (continuing.current !== null && before.translation === translation) return;
    if (live.current.index !== null || continuing.current !== null) {
      halt();
      setIndex(null);
      setPlaying(false);
      setActive(false);
    }
  }, [chapterKey, translation, halt]);

  useEffect(() => halt, [halt]);

  const start = useCallback(
    (fromVerse?: number) => {
      const list = live.current.verses;
      if (!list || list.length === 0) return;
      // Just after a chapter turn the old chapter's verses can still be here.
      if (`${list[0].book}:${list[0].chapter}` !== live.current.chapterKey) return;
      const i = fromVerse === undefined ? 0 : list.findIndex((v) => v.verse >= fromVerse);
      speakAt(i < 0 ? 0 : i);
    },
    [speakAt],
  );
  const pause = useCallback(() => {
    // Android's voices cannot pause mid-sentence; the verse is read again from its start.
    halt();
    setPlaying(false);
  }, [halt]);
  const resume = useCallback(() => {
    const i = live.current.index;
    if (i !== null) speakAt(i);
    // Paused between chapters: read the chapter now shown from its start.
    else start();
  }, [speakAt, start]);
  // While paused, a step only moves the mark; reading resumes from there.
  const step = useCallback(
    (delta: 1 | -1) => {
      const i = live.current.index;
      const list = live.current.verses;
      if (i === null || !list) return;
      const next = Math.max(0, Math.min(list.length - 1, i + delta));
      if (playingRef.current) speakAt(next);
      else setIndex(next);
    },
    [speakAt],
  );
  const stop = useCallback(() => {
    halt();
    setIndex(null);
    setPlaying(false);
    setActive(false);
  }, [halt]);

  // A new speed applies from the next verse; the verse being read is started again with it.
  const lastRate = useRef(`${rate} ${voice ?? ''}`);
  useEffect(() => {
    const now = `${rate} ${voice ?? ''}`;
    if (lastRate.current === now) return;
    lastRate.current = now;
    const i = live.current.index;
    if (i !== null && playingRef.current) speakAt(i);
  }, [rate, voice, speakAt]);

  const verse = index !== null && verses && verses[index] ? verses[index].verse : null;
  return { active, verse, playing, start, pause, resume, step, stop };
}
