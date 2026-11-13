// The voice the Malayalam app carries (Meera): reads a verse of the Malayalam Bible in a
// measured way, on the phone, with no internet. The model and the verses' speech sounds
// are in the app (assets/speech); modules/bible-voice runs the model and plays the sound.
import { Asset } from 'expo-asset';
import { requireOptionalNativeModule } from 'expo';
import { CONFIGURED_EDITION } from '../edition';
import type { TranslationId } from '../types';
import { NOISE, NOISE_W, fuller, joinPhrases, modelInput, openSpeech, paceFor, trim, wavFile } from './core';
import type { SpeechFile } from './core';

interface Native {
  read(path: string): Promise<Uint8Array>;
  load(path: string): Promise<void>;
  synthesize(ids: number[], noise: number, pace: number, noiseW: number): Promise<Uint8Array>;
  play(wav: Uint8Array): Promise<boolean>;
  stop(): Promise<void>;
  /** Gives the phone's sound back to whatever was playing before the voice (music, a podcast). */
  release(): Promise<void>;
}

const native = requireOptionalNativeModule<Native>('BibleVoice');

/** What Settings keeps for this voice, beside the phone's own voice identifiers. */
export const BUILTIN_VOICE = 'builtin:meera';
/** What Settings keeps when the phone's default voice is chosen over the app's own. */
export const PHONE_VOICE = 'phone';
export const BUILTIN_NAME = 'Meera';

let failed = false;

/** Whether this app carries a voice for the translation (and it has not failed here). */
export function hasBuiltinVoice(translation: TranslationId): boolean {
  return !!native && !failed && translation === 'MAL' && (CONFIGURED_EDITION.id === 'ml' || CONFIGURED_EDITION.id === 'all');
}

/** Whether the app's own voice reads the translation, given the voice chosen in Settings. */
export function usesBuiltinVoice(translation: TranslationId, chosen: string | undefined): boolean {
  return hasBuiltinVoice(translation) && (chosen === undefined || chosen === BUILTIN_VOICE);
}

const filePath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));

let ready: Promise<SpeechFile> | null = null;
function prepare(): Promise<SpeechFile> {
  ready ??= (async () => {
    if (!native) throw new Error('no voice module');
    const [model, sounds] = await Asset.loadAsync([require('../../assets/speech/voice.onnx'), require('../../assets/speech/voice.bin')]);
    if (!model.localUri || !sounds.localUri) throw new Error('the voice is not in the app');
    await native.load(filePath(model.localUri));
    return openSpeech(await native.read(filePath(sounds.localUri)));
  })();
  ready.catch(() => {
    ready = null;
  });
  return ready;
}

export interface VerseRef {
  book: number;
  chapter: number;
  verse: number;
}

// A verse's sound is made phrase by phrase. One verse is made at a time, the one being read
// first; a verse no longer wanted (the reader stepped past it) is given up between phrases.
interface Job {
  wav: Promise<Uint8Array>;
  wanted: boolean;
}
const jobs = new Map<string, Job>();
const KEEP = 3;
const keyOf = (ref: VerseRef, speed: number) => `${ref.book}:${ref.chapter}:${ref.verse}:${speed}`;
// The model does one thing at a time: each job waits for the one before it.
let line: Promise<unknown> = Promise.resolve();

function make(ref: VerseRef, speed: number): Promise<Uint8Array> {
  const key = keyOf(ref, speed);
  const known = jobs.get(key);
  if (known) return known.wav;
  const job: Job = { wanted: true, wav: Promise.resolve(new Uint8Array(0)) };
  const run = async () => {
    const speech = await prepare();
    const phrases = speech.chapter(ref.book, ref.chapter)?.get(ref.verse);
    if (!phrases || phrases.length === 0) throw new Error('no speech sounds for the verse');
    const parts = [];
    for (const phrase of phrases) {
      if (!job.wanted) throw new Error('not wanted');
      const bytes = await native!.synthesize(modelInput(phrase.sounds), NOISE, paceFor(speed), NOISE_W);
      // The floats are read where they lie; copied first only if they do not start on a boundary of four bytes.
      const aligned = bytes.byteOffset % 4 === 0 ? bytes : bytes.slice();
      parts.push({ samples: trim(new Float32Array(aligned.buffer, aligned.byteOffset, Math.floor(aligned.byteLength / 4))), rest: phrase.rest });
    }
    return wavFile(fuller(joinPhrases(parts)));
  };
  job.wav = line.then(run, run);
  line = job.wav.catch(() => undefined);
  jobs.set(key, job);
  job.wav.catch(() => jobs.delete(key));
  while (jobs.size > KEEP) jobs.delete(jobs.keys().next().value as string);
  return job.wav;
}

/** Gives up every verse being made but those named: the reader has moved on. */
function keepOnly(keys: string[]): void {
  for (const [key, job] of jobs) {
    if (keys.includes(key)) continue;
    job.wanted = false;
    jobs.delete(key);
  }
}

let turn = 0;
let releasing: ReturnType<typeof setTimeout> | null = null;

/**
 * Reads a verse. `onDone` runs when it has been read to its end, `onStopped` when it was
 * stopped (by the reader, a call, or the app being left), `onError` when the voice could
 * not read it (the phone's voice can then be tried). `next`, the verse after it, is made
 * once this one's sound is ready, so reading goes on without a gap.
 */
export function sayVerse(ref: VerseRef, speed: number, on: { onDone: () => void; onStopped: () => void; onError: () => void }, next?: VerseRef): void {
  const mine = ++turn;
  if (releasing) clearTimeout(releasing);
  releasing = null;
  keepOnly([keyOf(ref, speed), ...(next ? [keyOf(next, speed)] : [])]);
  (async () => {
    try {
      await native?.stop();
      const wav = await make(ref, speed);
      if (mine !== turn) return on.onStopped();
      if (next) make(next, speed).catch(() => undefined);
      const finished = await native!.play(wav);
      if (finished && mine === turn) on.onDone();
      else on.onStopped();
    } catch {
      // The voice did not load or run on this phone: not tried again until the app restarts.
      if (!ready) failed = true;
      if (mine === turn) on.onError();
      else on.onStopped();
    }
  })();
}

export function stopBuiltinVoice(): void {
  turn++;
  keepOnly([]);
  if (!native) return;
  native.stop().catch(() => {});
  // Reading has stopped, not merely moved to the next verse: a moment later the phone's
  // sound goes back to what was playing before.
  if (releasing) clearTimeout(releasing);
  releasing = setTimeout(() => {
    releasing = null;
    native.release().catch(() => {});
  }, 1500);
}
