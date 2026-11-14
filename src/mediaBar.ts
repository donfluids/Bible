// The play bar outside the app while a chapter is read aloud: Android's media
// notification and the iPhone's lock screen and Control Center (modules/bible-media).
// One reader at a time holds it (a reader opened from Saved or Search can read too);
// the bar's buttons go to that reader.
import { requireOptionalNativeModule } from 'expo';

interface Native {
  show(title: string, text: string, playing: boolean, labels: Record<string, string>): void;
  hide(): void;
  addListener(event: 'onCommand', listener: (e: { command: string }) => void): { remove: () => void };
}

export interface BarControls {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  stop: () => void;
}

export interface BarLabels {
  /** The name of Android's notification channel ("Read aloud"). */
  channel: string;
  previous: string;
  play: string;
  pause: string;
  next: string;
}

const native = requireOptionalNativeModule<Native>('BibleMedia');

let owner: symbol | null = null;
let controls: BarControls | null = null;
let playing = false;

native?.addListener('onCommand', ({ command }) => {
  const c = controls;
  if (!c) return;
  if (command === 'play') c.play();
  else if (command === 'pause') c.pause();
  else if (command === 'toggle') (playing ? c.pause : c.play)();
  else if (command === 'next') c.next();
  else if (command === 'previous') c.previous();
  else if (command === 'stop') c.stop();
});

/** Shows the bar for the verse being read; the reader `key` holds it until it lets go. */
export function showBar(key: symbol, title: string, text: string, isPlaying: boolean, labels: BarLabels, reader: BarControls): void {
  owner = key;
  controls = reader;
  playing = isPlaying;
  native?.show(title, text, isPlaying, { ...labels });
}

/** Takes the bar away, if this reader holds it. */
export function hideBar(key: symbol): void {
  if (owner !== key) return;
  owner = null;
  controls = null;
  playing = false;
  native?.hide();
}
