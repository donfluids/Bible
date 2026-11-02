// What to call a phone's voice in Settings. Android's Google engine names its voices by
// code (en-us-x-tpc-local, ml-in-x-mle-network): the code says nothing to a reader, so
// those are numbered, with the code kept small beside the quality; an iPhone names its
// voices (Samantha). Kept free of imports so it can be tested without a phone.

export interface VoiceInfo {
  identifier: string;
  name: string;
  /** expo-speech's quality: 'Default' or 'Enhanced'. */
  quality: string;
  language: string;
}

export interface VoiceOption {
  identifier: string;
  /** A name a person would use (Samantha), or null for a voice known only by its code. */
  friendly: string | null;
  /** The short code of a coded voice (tpc), or null. */
  code: string | null;
  enhanced: boolean;
  /** Generated online as it reads: Google's "network" voices. */
  online: boolean;
}

const GOOGLE = /^([a-z]{2,3})[-_]([a-z]{2,3})[-_]x[-_]([a-z0-9]+)[-_](local|network)$/i;

export function describeVoice(v: VoiceInfo): VoiceOption {
  const id = v.identifier;
  const m = GOOGLE.exec(id);
  const online = m ? m[4].toLowerCase() === 'network' : /network/i.test(id);
  const coded = !v.name || v.name === id || /^[a-z]{2,3}[-_][a-z]{2,3}([-_]|$)/i.test(v.name);
  return {
    identifier: id,
    friendly: coded ? null : v.name,
    code: m ? m[3].toLowerCase() : null,
    enhanced: /enhanced|premium/i.test(v.quality) || /premium|enhanced/i.test(id),
    online,
  };
}

/** The voices for a language, the phone's own first, then online ones, enhanced before standard. */
export function voicesFor(list: VoiceInfo[], codes: string[]): VoiceOption[] {
  return list
    .filter((v) => codes.includes(v.language.toLowerCase().split(/[-_]/)[0]))
    .map(describeVoice)
    .sort((a, b) => Number(a.online) - Number(b.online) || Number(b.enhanced) - Number(a.enhanced) || a.identifier.localeCompare(b.identifier));
}
