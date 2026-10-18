// Readers for the two SWORD module formats this project uses (CrossWire, crosswire.org):
// zText, a compressed Bible text, and zLD, a compressed dictionary. Only what the build
// needs: every entry, in order. See https://wiki.crosswire.org/File_Formats.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/**
 * The entries of one testament of a zText module (`base` is e.g. ".../ztext/bsb/nt"), in
 * the module's index order: module heading, testament heading, then for each book its
 * heading, and for each chapter its heading followed by its verses.
 */
export function readZText(base) {
  const bzs = readFileSync(base + '.bzs');
  const bzv = readFileSync(base + '.bzv');
  const bzz = readFileSync(base + '.bzz');
  const blocks = new Map();
  const block = (n) => {
    if (!blocks.has(n)) {
      const off = bzs.readUInt32LE(n * 12);
      const size = bzs.readUInt32LE(n * 12 + 4);
      blocks.set(n, inflateSync(bzz.subarray(off, off + size)));
    }
    return blocks.get(n);
  };
  const entries = [];
  for (let i = 0; i < bzv.length; i += 10) {
    const size = bzv.readUInt16LE(i + 8);
    if (!size) { entries.push(''); continue; }
    const off = bzv.readUInt32LE(i + 4);
    entries.push(block(bzv.readUInt32LE(i)).subarray(off, off + size).toString('utf8'));
  }
  return entries;
}

/** A zLD dictionary (`base` is e.g. ".../zld/dodson/dodson") as a Map from key to entry. */
export function readZLD(base) {
  const idx = readFileSync(base + '.idx');
  const dat = readFileSync(base + '.dat');
  const zdx = readFileSync(base + '.zdx');
  const zdt = readFileSync(base + '.zdt');
  const blocks = new Map();
  const block = (n) => {
    if (!blocks.has(n)) {
      const off = zdx.readUInt32LE(n * 8);
      const size = zdx.readUInt32LE(n * 8 + 4);
      blocks.set(n, inflateSync(zdt.subarray(off, off + size)));
    }
    return blocks.get(n);
  };
  const out = new Map();
  for (let i = 0; i < idx.length; i += 8) {
    const rec = dat.subarray(idx.readUInt32LE(i), idx.readUInt32LE(i) + idx.readUInt32LE(i + 4));
    const nl = rec.indexOf(10);
    const key = rec.subarray(0, nl).toString('utf8').replace(/\r$/, '');
    const b = block(rec.readUInt32LE(nl + 1));
    const entry = rec.readUInt32LE(nl + 5);
    const eoff = b.readUInt32LE(4 + entry * 8);
    const esize = b.readUInt32LE(8 + entry * 8);
    out.set(key, b.subarray(eoff, eoff + esize).toString('utf8').replace(/\0+$/, ''));
  }
  return out;
}
