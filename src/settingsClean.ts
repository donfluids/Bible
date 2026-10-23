// Reading stored settings back, kept apart so it can be tested without a phone
// (scripts/test-logic.mts). No runtime imports.

/**
 * The stored settings over the defaults. A value of the wrong kind (from a damaged or
 * altered file) gives way to the default, and the text size and reading speed stay
 * within what the screen and the voice can do.
 */
export function cleanSettings<T extends { fontSize: number; readSpeed: number }>(parsed: Partial<T>, defaults: T, fontSizes: number[]): T {
  const kept = Object.fromEntries(
    Object.entries(parsed).filter(([k, v]) => {
      const d = (defaults as Record<string, unknown>)[k];
      return d === undefined || (v !== null && typeof v === typeof d && Array.isArray(v) === Array.isArray(d));
    }),
  ) as Partial<T>;
  const merged = { ...defaults, ...kept };
  merged.fontSize = Math.min(fontSizes[fontSizes.length - 1], Math.max(fontSizes[0], merged.fontSize || defaults.fontSize));
  merged.readSpeed = Math.min(2, Math.max(0.5, merged.readSpeed || 1));
  return merged;
}
