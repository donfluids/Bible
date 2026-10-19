// Reading a chapter aloud with the phone's own voice: verse by verse, so the reader can
// mark the verse being read, step back and forth, and go on into the next chapter.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { LANGUAGE } from './speech';
import type { VoiceLanguage } from './speech';
import { flattenVerse } from './text';
import type { TranslationId, VerseRow } from './types';

export const READ_SPEEDS = [0.75, 1, 1.25];

export function voiceFor(translation: TranslationId): VoiceLanguage {
  return translation === 'MAL' ? 'malayalam' : translation === 'TAM' ? 'tamil' : 'english';
}

/** What is said for a verse: its text only, without the KJV's paragraph marks. */
export function spokenText(verse: VerseRow): string {
  return flattenVerse(verse.text).replace(/¶\s*/g, '').trim();
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
  /** Turns to the next chapter; false at the end of the Bible. */
  nextChapter: () => boolean;
}

// The pause between the end of one chapter and the start of the next.
const CHAPTER_PAUSE = 900;

export function useReadAloud({ chapterKey, verses, translation, rate, nextChapter }: Options): ReadAloud {
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(false);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  // Each utterance carries the token it was started with; a stop or a new start makes the
  // callbacks of the old one do nothing.
  const token = useRef(0);
  const live = useRef({ verses, translation, rate, nextChapter, chapterKey, index });
  live.current = { verses, translation, rate, nextChapter, chapterKey, index };
  // Set while waiting for the next chapter's verses after turning to it.
  const continuing = useRef<string | null>(null);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const halt = useCallback(() => {
    token.current++;
    continuing.current = null;
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = null;
    Speech.stop();
  }, []);

  const speakAt = useCallback(
    (i: number) => {
      halt();
      const { verses: list, translation: tr, rate: r, nextChapter: next, chapterKey: key } = live.current;
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
      Speech.speak(spokenText(list[i]), {
        language: LANGUAGE[voiceFor(tr)],
        rate: r,
        onDone: () => {
          if (token.current === mine) speakAt(i + 1);
        },
        // Stopped from elsewhere (a word said in the word sheet): paused at this verse.
        onStopped: () => {
          if (token.current === mine) setPlaying(false);
        },
        onError: () => {
          if (token.current !== mine) return;
          setIndex(null);
          setPlaying(false);
          setActive(false);
        },
      });
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
  }, [speakAt]);
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
  const lastRate = useRef(rate);
  useEffect(() => {
    if (lastRate.current === rate) return;
    lastRate.current = rate;
    const i = live.current.index;
    if (i !== null && playingRef.current) speakAt(i);
  }, [rate, speakAt]);

  const verse = index !== null && verses && verses[index] ? verses[index].verse : null;
  return { active, verse, playing, start, pause, resume, step, stop };
}
