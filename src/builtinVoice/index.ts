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

// Verses made ahead of their turn, so reading goes on without a gap; a few are kept.
const made = new Map<string, Promise<Uint8Array>>();
const KEEP = 4;

function make(ref: VerseRef, speed: number): Promise<Uint8Array> {
  const key = `${ref.book}:${ref.chapter}:${ref.verse}:${speed}`;
  let wav = made.get(key);
  if (!wav) {
    wav = (async () => {
      const speech = await prepare();
      const phrases = speech.chapter(ref.book, ref.chapter)?.get(ref.verse);
      if (!phrases || phrases.length === 0) throw new Error('no speech sounds for the verse');
      const parts = [];
      for (const phrase of phrases) {
        const bytes = await native!.synthesize(modelInput(phrase.sounds), NOISE, paceFor(speed), NOISE_W);
        // A copy, so the floats start on a boundary of four bytes.
        const copy = bytes.slice();
        parts.push({ samples: trim(new Float32Array(copy.buffer, copy.byteOffset, Math.floor(copy.byteLength / 4))), rest: phrase.rest });
      }
      return wavFile(fuller(joinPhrases(parts)));
    })();
    made.set(key, wav);
    wav.catch(() => made.delete(key));
    while (made.size > KEEP) made.delete(made.keys().next().value as string);
  }
  return wav;
}

/** Makes a verse's sound ahead of its turn. */
export function prepareVerse(ref: VerseRef, speed: number): void {
  make(ref, speed).catch(() => {});
}

let turn = 0;

/**
 * Reads a verse. `onDone` runs when it has been read to its end, `onStopped` when it was
 * stopped, `onError` when the voice could not read it (the phone's voice can then be tried).
 */
export function sayVerse(ref: VerseRef, speed: number, on: { onDone: () => void; onStopped: () => void; onError: () => void }): void {
  const mine = ++turn;
  (async () => {
    try {
      await native?.stop();
      const wav = await make(ref, speed);
      if (mine !== turn) return on.onStopped();
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
  native?.stop().catch(() => {});
}
