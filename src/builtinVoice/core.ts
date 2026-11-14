// The voice the Malayalam app carries (Indic Tiny TTS, its female reader; until 0.4.31,
// Meera, a Piper voice): the parts that are plain arithmetic, kept free of the phone's
// libraries so they are tested on a computer. The verses' letters come ready-made from
// scripts/build-speech.py and the model from scripts/build-tiny-voice.py; here the letters
// are laid out for the model, and what it returns is shaped into a measured reading: a
// breath after each phrase, a longer rest at a full stop, one level for the verse.

/** The model's sample rate. */
export const MODEL_RATE = 24000;
/** Played as made. (Meera was played a little slower, which deepened her voice.) */
export const PLAY_RATE = MODEL_RATE;
/**
 * The model's three settings (the voice module passes them as they are): its temperature
 * (variation in tone), its length scale (pace; 0.9895 is the female reader's own), and
 * the reader (0 female, 1 male).
 */
export const NOISE = 0.667;
export const PACE = 0.9895;
export const READER = 0;
/** Rests, in seconds of the model's time: after a phrase, after a sentence, after the verse. */
const REST = { 1: 0.32, 2: 0.55 } as const;
const VERSE_REST = 0.6;

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

/** The model's length setting for a reading speed (1 is the measured pace; 1.25 is quicker). */
export function paceFor(speed: number): number {
  return PACE / Math.max(0.5, Math.min(2, speed));
}

/** A phrase's sound without the silence the model leaves at its ends. */
export function trim(samples: Float32Array): Float32Array {
  let first = 0;
  let last = samples.length - 1;
  while (first < samples.length && Math.abs(samples[first]) <= 0.01) first++;
  while (last > first && Math.abs(samples[last]) <= 0.01) last--;
  if (first >= samples.length) return samples.subarray(0, 0);
  return samples.subarray(Math.max(0, first - 400), Math.min(samples.length, last + 400));
}

/** A verse from its phrases, with the rests between them and after the verse. */
export function joinPhrases(parts: { samples: Float32Array; rest: 1 | 2 }[]): Float32Array {
  let length = Math.round(MODEL_RATE * VERSE_REST);
  for (const p of parts) length += p.samples.length + Math.round(MODEL_RATE * REST[p.rest]);
  const out = new Float32Array(length);
  let at = 0;
  for (const p of parts) {
    out.set(p.samples, at);
    at += p.samples.length + Math.round(MODEL_RATE * REST[p.rest]);
  }
  return out;
}

// Second-order low-pass (Butterworth), the usual recipe.
function lowPass2(x: Float32Array, cutoff: number, rate: number): Float32Array {
  const w = Math.tan((Math.PI * cutoff) / rate);
  const n = 1 / (1 + Math.SQRT2 * w + w * w);
  const b0 = w * w * n;
  const b1 = 2 * b0;
  const a1 = 2 * (w * w - 1) * n;
  const a2 = (1 - Math.SQRT2 * w + w * w) * n;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

function lowPass1(x: Float32Array, cutoff: number, rate: number): Float32Array {
  const w = Math.tan((Math.PI * cutoff) / rate);
  const b = w / (1 + w);
  const a = (w - 1) / (w + 1);
  const y = new Float32Array(x.length);
  let x1 = 0, y1 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b * (x[i] + x1) - a * y1;
    x1 = x[i]; y1 = v; y[i] = v;
  }
  return y;
}

/** The verse brought to one level: its loudest sample at `level`. */
export function levelled(x: Float32Array, level = 0.92): Float32Array {
  let peak = 1e-9;
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = (x[i] / peak) * level;
  return y;
}

/**
 * Meera's tone, not used for the present voice: more body below about 220 Hz, a little less edge at the top, and the
 * quiet parts lifted towards the loud ones so the level is firm. `level` is the loudest
 * sample the result reaches; one level for a whole verse, so its phrases match.
 */
export function fuller(x: Float32Array, level = 0.92): Float32Array {
  const low = lowPass2(x, 220, MODEL_RATE);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] + 0.9 * low[i];
  const soft = lowPass1(y, 6500, MODEL_RATE);
  let peak = 1e-9;
  for (let i = 0; i < y.length; i++) {
    y[i] = 0.75 * y[i] + 0.25 * soft[i];
    const a = Math.abs(y[i]);
    if (a > peak) peak = a;
  }
  for (let i = 0; i < y.length; i++) {
    const v = y[i] / peak;
    y[i] = Math.sign(v) * Math.pow(Math.abs(v), 0.8) * level;
  }
  return y;
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
