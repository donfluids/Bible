// Writing to us from the app: the mail link, and when the reader is invited to. No runtime
// imports, so scripts/test-logic.mts can check it.

/** Where a note from a reader goes. Shown only if the phone has no mail app to open. */
export const FEEDBACK_ADDRESS = 'dond@riversresearch.org';

const DAY = 24 * 60 * 60 * 1000;
/** The reader is first invited to write after this long with the app. */
export const FEEDBACK_FIRST_DAYS = 14;
/** "Not now" puts the invitation off for this long. */
export const FEEDBACK_LATER_DAYS = 60;
/** The invitation is never shown again. */
export const FEEDBACK_NEVER = -1;

/** A mailto link the phone's mail app opens with the address, subject and body filled in. */
export function mailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** The phone, for a report: "Android 14, Samsung SM-S911B", "iOS 18.1", or the platform's name. */
export function deviceLine(os: string, constants: Record<string, unknown> | undefined): string {
  const text = (key: string) => (typeof constants?.[key] === 'string' ? (constants[key] as string).trim() : '');
  if (os === 'android') {
    const model = [text('Brand'), text('Model')].filter(Boolean).join(' ');
    return ['Android ' + text('Release'), model].filter((s) => s.trim() !== 'Android').join(', ').trim() || 'Android';
  }
  if (os === 'ios') return `${text('systemName') || 'iOS'} ${text('osVersion')}`.trim();
  return os;
}

/** When the invitation is due, given the stored time: unset (0) becomes FEEDBACK_FIRST_DAYS from now. */
export function feedbackDueFrom(stored: number, now: number): number {
  return stored === 0 ? now + FEEDBACK_FIRST_DAYS * DAY : stored;
}

/** Whether the invitation card is shown now. */
export function feedbackCardDue(due: number, now: number): boolean {
  return due > 0 && now >= due;
}

/** The stored time after "Not now". */
export function feedbackLater(now: number): number {
  return now + FEEDBACK_LATER_DAYS * DAY;
}
