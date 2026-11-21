// The voice the Malayalam app carries (Indic Tiny TTS, its male reader; until 0.4.31,
// Meera, a Piper voice): the parts that are plain arithmetic, kept free of the phone's
// libraries so they are tested on a computer. The verses' letters come ready-made from
// scripts/build-speech.py and the model from scripts/build-tiny-voice.py; here the letters
// are laid out for the model, and its phrases are played as it makes them, one after
// another, with a short gap after the verse.

/** The model's sample rate. */
export const MODEL_RATE = 24000;
/** Played as made. (Meera was played a little slower, which deepened her voice.) */
export const PLAY_RATE = MODEL_RATE;
/**
 * The model's three settings (the voice module passes them as they are): its temperature
 * (variation in tone), its length scale (pace; 0.9336 is the male reader's own, 0.9895 the
 * female's), and the reader (1 male, 0 female).
 */
export const NOISE = 0.667;
export const PACE = 0.9336;
export const READER = 1;
/** The gap after a verse, in seconds; within the verse the model's own pauses are kept. */
const VERSE_GAP = 0.25;

export interface Phrase {
  /** 1: a breath follows (comma, semicolon); 2: a longer rest (full stop). */
  rest: 1 | 2;
  /** What the model reads: the phrase's letters (Meera's file held speech sounds). */
  sounds: Uint8Array;
}

export interface SpeechFile {
  /** A chapter's verses and their phrases; null when the file has no such chapter. */
  chapter: (book: number, chapter: number) => Map<number, Phrase[]> | null;
}

/** Reads the file of speech sounds (the layout is described in scripts/build-speech.py). */
export function openSpeech(bytes: Uint8Array): SpeechFile {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 8 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'BSP1') throw new Error('not a speech file');
  const count = view.getUint32(4, true);
  const starts = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const at = 8 + i * 6;
    starts.set(bytes[at] * 256 + bytes[at + 1], view.getUint32(at + 2, true));
  }
  return {
    chapter(book, chapter) {
      let at = starts.get(book * 256 + chapter);
      if (at === undefined) return null;
      const verses = new Map<number, Phrase[]>();
      const n = bytes[at++];
      for (let v = 0; v < n; v++) {
        const verse = bytes[at++];
        const phrases: Phrase[] = [];
        const m = bytes[at++];
        for (let p = 0; p < m; p++) {
          const rest = bytes[at] === 2 ? 2 : 1;
          const length = view.getUint16(at + 1, true);
          at += 3;
          if (at + length > bytes.length) throw new Error('speech file cut short');
          phrases.push({ rest, sounds: bytes.subarray(at, at + length) });
          at += length;
        }
        verses.set(verse, phrases);
      }
      return verses;
    },
  };
}

/** A phrase as the model takes it: its letters, with a blank (0) between and around them. */
export function modelInput(letters: Uint8Array): number[] {
  const ids = [0];
  for (const s of letters) ids.push(s, 0);
  return ids;
}

/** The model's length setting for a reading speed (1 is the voice's own pace; 1.25 is quicker). */
export function paceFor(speed: number): number {
  return PACE / Math.max(0.5, Math.min(2, speed));
}

/** A verse from its phrases as the model made them, each with its own silence, and a short gap after it. */
export function joinPhrases(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0) + Math.round(MODEL_RATE * VERSE_GAP));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** A WAV file (16-bit, one channel) of the samples, at the rate it is to be played. */
export function wavFile(samples: Float32Array, rate = PLAY_RATE): Uint8Array {
  const out = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(out.buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) out[at + i] = s.charCodeAt(i);
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  return out;
}

/** How long the samples play, in milliseconds. */
export function playTime(samples: number, rate = PLAY_RATE): number {
  return Math.round((samples / rate) * 1000);
}
