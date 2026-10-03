import type { HighlightColor, TextMark, TextPoint, TranslationId } from './types';

/** Order of two places in a chapter: negative when `a` comes first. */
export function comparePoints(a: TextPoint, b: TextPoint): number {
  return a.verse - b.verse || a.offset - b.offset;
}

/** The parts of one verse that marks cover, as [start, end, colour], in the order marked. */
export function markRanges(
  marks: TextMark[],
  translation: TranslationId,
  book: number,
  chapter: number,
  verse: number,
  length: number,
): [number, number, HighlightColor][] {
  const out: [number, number, HighlightColor][] = [];
  for (const m of marks) {
    if (m.translation !== translation || m.book !== book || m.chapter !== chapter) continue;
    if (verse < m.from.verse || verse > m.to.verse) continue;
    const start = verse === m.from.verse ? m.from.offset : 0;
    const end = verse === m.to.verse ? m.to.offset : length;
    if (end > start) out.push([start, end, m.color]);
  }
  return out;
}

/** Marks of a chapter left after erasing a stretch: any mark it touches goes. */
export function eraseMarks(marks: TextMark[], translation: TranslationId, book: number, chapter: number, from: TextPoint, to: TextPoint): TextMark[] {
  return marks.filter(
    (m) =>
      m.translation !== translation ||
      m.book !== book ||
      m.chapter !== chapter ||
      comparePoints(m.to, from) <= 0 ||
      comparePoints(m.from, to) >= 0,
  );
}

/** A new mark. Marks in the same colour that it overlaps or touches are merged into it. */
export function addMark(marks: TextMark[], mark: TextMark): TextMark[] {
  let { from, to } = mark;
  const kept: TextMark[] = [];
  for (const m of marks) {
    const same = m.translation === mark.translation && m.book === mark.book && m.chapter === mark.chapter && m.color === mark.color;
    if (same && comparePoints(m.to, from) >= 0 && comparePoints(m.from, to) <= 0) {
      if (comparePoints(m.from, from) < 0) from = m.from;
      if (comparePoints(m.to, to) > 0) to = m.to;
    } else {
      kept.push(m);
    }
  }
  return [...kept, { ...mark, from, to }];
}

/** The words of a verse's text, with their offsets: what marker mode lays out and hits. */
export function wordsOf(text: string): { start: number; end: number; text: string }[] {
  const out: { start: number; end: number; text: string }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  return out;
}
