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
  /** The accent's region from the voice's language tag (IN, US, GB), or null. */
  region: string | null;
}

/** The voices of one accent, in the order offered, numbered from one. */
export interface VoiceGroup {
  region: string | null;
  voices: VoiceOption[];
}

const GOOGLE = /^([a-z]{2,3})[-_]([a-z]{2,3})[-_]x[-_]([a-z0-9]+)[-_](local|network)$/i;

export function describeVoice(v: VoiceInfo): VoiceOption {
  const id = v.identifier;
  const m = GOOGLE.exec(id);
  const online = m ? m[4].toLowerCase() === 'network' : /network/i.test(id);
  const coded = !v.name || v.name === id || /^[a-z]{2,3}[-_][a-z]{2,3}([-_]|$)/i.test(v.name);
  const tag = v.language.split(/[-_]/);
  return {
    identifier: id,
    friendly: coded ? null : v.name,
    code: m ? m[3].toLowerCase() : null,
    enhanced: /enhanced|premium/i.test(v.quality) || /premium|enhanced/i.test(id),
    online,
    region: tag[1] && /^[A-Za-z]{2}$/.test(tag[1]) ? tag[1].toUpperCase() : null,
  };
}

/**
 * The voices of a language by accent: India first, then the other regions by name, with
 * the phone's own voices before online ones and enhanced before standard in each. A
 * reader sees "India · Voice 1" rather than a code.
 */
export function groupVoices(list: VoiceOption[]): VoiceGroup[] {
  const groups = new Map<string | null, VoiceOption[]>();
  for (const v of list) {
    const g = groups.get(v.region) ?? [];
    g.push(v);
    groups.set(v.region, g);
  }
  const order = (r: string | null) => (r === 'IN' ? '0' : r === null ? '2' : `1${r}`);
  return [...groups.entries()]
    .sort(([a], [b]) => order(a).localeCompare(order(b)))
    .map(([region, voices]) => ({
      region,
      voices: [...voices].sort((a, b) => Number(a.online) - Number(b.online) || Number(b.enhanced) - Number(a.enhanced) || a.identifier.localeCompare(b.identifier)),
    }));
}

/** The voices for a language, the phone's own first, then online ones, enhanced before standard. */
export function voicesFor(list: VoiceInfo[], codes: string[]): VoiceOption[] {
  return list
    .filter((v) => codes.includes(v.language.toLowerCase().split(/[-_]/)[0]))
    .map(describeVoice)
    .sort((a, b) => Number(a.online) - Number(b.online) || Number(b.enhanced) - Number(a.enhanced) || a.identifier.localeCompare(b.identifier));
}
