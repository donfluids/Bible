import { Platform } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
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
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

/** Writes every page to one backup file and offers it to the share sheet. */
export async function saveBackup(pages: NotePage[], edition: string, dialogTitle: string): Promise<void> {
  const ink = new Map<string, Ink>();
  for (const p of pages) if (p.ink) ink.set(p.id, await readInk(edition, p.id));
  const content = makeBackup(pages, (id) => ink.get(id) ?? null, edition);
  await sendFile(`notebook-backup-${today()}.json`, content, 'application/json', dialogTitle);
}

export type RestoreOutcome = { kind: 'cancelled' } | { kind: 'tooLarge' } | { kind: 'notBackup' } | ({ kind: 'done' } & MergeResult);

/**
 * Lets the reader pick a backup file and merges it into `pages`: the result's pages are the
 * notebook to keep; the strokes of the handwritten pages taken from the file are written
 * to their store entries here.
 */
export async function restoreBackup(pages: NotePage[], edition: string): Promise<RestoreOutcome> {
  const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false });
  if (picked.canceled || !picked.assets?.[0]) return { kind: 'cancelled' };
  const asset = picked.assets[0];
  if ((asset.size ?? 0) > MAX_BACKUP_BYTES) return { kind: 'tooLarge' };
  let text: string;
  try {
    text = Platform.OS === 'web' ? await (await fetch(asset.uri)).text() : await new File(asset.uri).text();
  } catch {
    return { kind: 'notBackup' };
  }
  if (text.length > MAX_BACKUP_BYTES) return { kind: 'tooLarge' };
  let backup;
  try {
    backup = readBackup(text);
  } catch {
    return { kind: 'notBackup' };
  }
  const merged = mergePages(pages, backup.pages);
  for (const id of merged.taken) {
    const ink = backup.ink.get(id);
    if (ink) await Storage.setItem(inkKey(edition, id), JSON.stringify(encodeInk(ink)));
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
  const named = new File(Paths.cache, name);
  try {
    if (named.exists) named.delete();
    new File(uri).move(named);
    await Sharing.shareAsync(named.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
  } catch {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
  }
}

export { readInk };
