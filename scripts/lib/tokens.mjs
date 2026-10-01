// Shared by scripts/align-malayalam.mjs and scripts/build-db.mjs so both slice a
// verse into the same tokens and agree on character offsets.
import { createHash } from 'node:crypto';

/** Whitespace-separated tokens of a verse's text, with character offsets. */
export function tokenize(text) {
  const out = [];
  const re = /[^\s ]+/gu;
  let m;
  while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  return out;
}

const EDGE = /^[\s"'“”‘’(),.;:!?\-—…\[\]{}«»]+|[\s"'“”‘’(),.;:!?\-—…\[\]{}«»]+$/gu;

/** The part of a token that is the word itself, without surrounding punctuation. */
export function wordSpan(token) {
  const lead = /^[\s"'“”‘’(),.;:!?\-—…\[\]{}«»]*/u.exec(token.text)[0].length;
  const trail = /[\s"'“”‘’(),.;:!?\-—…\[\]{}«»]*$/u.exec(token.text)[0].length;
  const start = token.start + lead;
  const end = token.end - trail;
  return end > start ? { start, end } : null;
}

export function trimEdge(text) {
  return text.replace(EDGE, '');
}

/** Short fingerprint of a verse's text, so stale alignments are never applied. */
export function textHash(text) {
  return createHash('sha1').update(text).digest('hex').slice(0, 12);
}
