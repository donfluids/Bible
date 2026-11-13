import { Platform } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { emptyInk, encodeInk, inkKey, parseInk } from './ink';
import type { Ink } from './ink';
import type { NotePage } from './notebook';
import { MAX_BACKUP_BYTES, makeBackup, mergePages, readBackup } from './notebookBackup';
import type { MergeResult } from './notebookBackup';

/**
 * The notebook to and from files: a backup of every page, a restore that merges one in,
 * and a page as a PDF. On a phone a file goes out through the share sheet (to Drive, Files,
 * a chat) and comes in through the system file picker; the app asks for no storage permission.
 */

/** A handwritten page's strokes from its own store entry; an unreadable entry gives an empty page. */
async function readInk(edition: string, id: string): Promise<Ink> {
  try {
    const raw = await Storage.getItem(inkKey(edition, id));
    return raw ? parseInk(raw) : emptyInk();
  } catch {
    return emptyInk();
  }
}

/** A page whose strokes could not be read for a backup: the backup is not made. */
export class InkUnreadable extends Error {
  constructor(readonly page: NotePage) {
    super('handwriting unreadable');
  }
}

/**
 * A handwritten page's strokes for a backup: its entry, or the entry's safety copy when the
 * entry cannot be read (as the page itself does when it opens). A page the notebook counts
 * strokes on, but whose strokes cannot be read from either, stops the backup rather than
 * going into it empty.
 */
async function inkForBackup(edition: string, page: NotePage): Promise<Ink> {
  const key = inkKey(edition, page.id);
  for (const k of [key, `${key}.bak`]) {
    try {
      const raw = await Storage.getItem(k);
      if (raw) return parseInk(raw);
    } catch {
      // Try the safety copy.
    }
  }
  if ((page.ink?.strokes ?? 0) > 0) throw new InkUnreadable(page);
  return emptyInk();
}

/**
 * Files handed to the share sheet go in a folder of their own in the cache, emptied before
 * each new one, so backups and PDFs (the whole notebook, in plain text) do not pile up.
 */
function sharedFolder(): Directory {
  const folder = new Directory(Paths.cache, 'shared');
  try {
    if (folder.exists) folder.delete();
    folder.create();
  } catch {
    // An old file left behind is no reason to stop the share.
  }
  return folder;
}

/** Empties the folder of shared files: at the app's start, so the last share's file is not kept. */
export function clearShared(): void {
  if (Platform.OS === 'web') return;
  try {
    const folder = new Directory(Paths.cache, 'shared');
    if (folder.exists) folder.delete();
  } catch {
    // Left for the next share to clear.
  }
}

/**
 * Moves a picture made for sharing (a card, a handwritten page) into the shared folder,
 * so it is cleared with the rest and not left in the cache; its new address, or the old
 * one if it could not be moved.
 */
export function stageShared(uri: string, name: string): string {
  if (Platform.OS === 'web') return uri;
  try {
    const staged = new File(sharedFolder(), name);
    new File(uri).move(staged);
    return staged.uri;
  } catch {
    return uri;
  }
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Hands a file the app wrote to the share sheet (on the web, downloads it). */
async function sendFile(name: string, content: string, mimeType: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(sharedFolder(), name);
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

/** Writes every page to one backup file and offers it to the share sheet. */
export async function saveBackup(pages: NotePage[], edition: string, dialogTitle: string): Promise<void> {
  const ink = new Map<string, Ink>();
  for (const p of pages) if (p.ink) ink.set(p.id, await inkForBackup(edition, p));
  const content = makeBackup(pages, (id) => ink.get(id) ?? null, edition);
  await sendFile(`notebook-backup-${today()}.json`, content, 'application/json', dialogTitle);
}

export type RestoreOutcome =
  | { kind: 'cancelled' }
  | { kind: 'tooLarge' }
  | { kind: 'notBackup' }
  | { kind: 'failed' }
  | ({ kind: 'done' } & MergeResult);

/**
 * Lets the reader pick a backup file and merges it into `pages`: the result's pages are the
 * notebook to keep; the strokes of the handwritten pages taken from the file are written
 * to their store entries here.
 */
export async function restoreBackup(pages: NotePage[], edition: string, otherEdition: (from: string) => Promise<boolean>): Promise<RestoreOutcome> {
  const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false });
  if (picked.canceled || !picked.assets?.[0]) return { kind: 'cancelled' };
  const asset = picked.assets[0];
  // The picker's copy in the cache (a whole notebook, in plain text) is removed once read.
  const copy = Platform.OS === 'web' ? null : new File(asset.uri);
  const forget = () => {
    try {
      if (copy?.exists) copy.delete();
    } catch {
      // The cache is the phone's to clear.
    }
  };
  // The copy's own size, where the picker did not say: nothing too large is read into memory.
  let size = asset.size ?? 0;
  try {
    size = Math.max(size, copy?.size ?? 0);
  } catch {
    // The picker's figure stands.
  }
  if (size > MAX_BACKUP_BYTES) {
    forget();
    return { kind: 'tooLarge' };
  }
  let text: string;
  try {
    text = copy ? await copy.text() : await (await fetch(asset.uri)).text();
  } catch {
    return { kind: 'notBackup' };
  } finally {
    forget();
  }
  if (text.length > MAX_BACKUP_BYTES) return { kind: 'tooLarge' };
  let backup;
  try {
    backup = readBackup(text);
  } catch {
    return { kind: 'notBackup' };
  }
  // A notebook from another of the apps (its verses are in another Bible's words) is
  // restored only when the reader says so.
  if (backup.edition && backup.edition !== edition && !(await otherEdition(backup.edition))) return { kind: 'cancelled' };
  const merged = mergePages(pages, backup.pages);
  // The strokes of the pages taken are written first; if one cannot be, those already
  // written are put back as they were and the notebook is left unchanged.
  const before: [string, string | null][] = [];
  try {
    for (const id of merged.taken) {
      const ink = backup.ink.get(id);
      if (!ink) continue;
      const key = inkKey(edition, id);
      before.push([key, await Storage.getItem(key)]);
      await Storage.setItem(key, JSON.stringify(encodeInk(ink)));
    }
  } catch {
    for (const [key, value] of before.reverse()) {
      try {
        if (value === null) await Storage.removeItem(key);
        else await Storage.setItem(key, value);
      } catch {
        // Nothing more can be done for this entry.
      }
    }
    return { kind: 'failed' };
  }
  return { kind: 'done', ...merged };
}

/** Prints HTML to a PDF and offers it to the share sheet (on the web, opens the print dialog). */
export async function sharePdf(html: string, title: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  // A file name from the page's title, so the PDF is recognised where it lands.
  const name = `${(title.trim() || 'notebook-page').replace(/[\\/:*?"<>|\n]+/g, ' ').slice(0, 60).trim()}.pdf`;
  const printed = new File(uri);
  let shared = printed;
  try {
    const named = new File(sharedFolder(), name);
    printed.move(named);
    shared = named;
  } catch {
    // Shared under the printer's own name instead.
  }
  await Sharing.shareAsync(shared.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
}

export { readInk };
