import { Capacitor } from '@capacitor/core';
import type { FilesystemPlugin } from '@capacitor/filesystem';

export type BackupExportMethod = 'download' | 'share';
export type BackupExportErrorCode = 'cancelled' | 'unavailable' | 'write-failed' | 'share-failed' | 'download-failed' | 'busy' | 'invalid';

export class BackupExportError extends Error {
  constructor(readonly code: BackupExportErrorCode, message: string) {
    super(message);
    this.name = 'BackupExportError';
  }
}

const CACHE_FOLDER = 'director-de-murga-backups';
const CACHE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const OWN_FILE = /^backup-(\d{13})-[a-f0-9]{16}-[a-zA-Z0-9_-]+\.json$/;
let sharing = false;

function safeFilename(filename: string): string {
  const stem = filename.normalize('NFKD').replace(/\p{M}/gu, '').replace(/\.json$/i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  return `${stem || 'director-de-murga-respaldo'}.json`;
}

/** Only prune this module's old cache files; preserve the three newest exports. */
async function cleanOldExports(filesystem: FilesystemPlugin, directory: import('@capacitor/filesystem').Directory): Promise<void> {
  try {
    const { files } = await filesystem.readdir({ path: CACHE_FOLDER, directory });
    const ownFiles = files.filter(file => file.type === 'file' && OWN_FILE.test(file.name))
      .sort((a, b) => Number(OWN_FILE.exec(b.name)![1]) - Number(OWN_FILE.exec(a.name)![1]));
    const cutoff = Date.now() - CACHE_RETENTION_MS;
    for (const file of ownFiles.slice(3)) {
      // Both timestamps must agree that the file is old. Never recurse or use a returned URI.
      if (Number(OWN_FILE.exec(file.name)![1]) >= cutoff || !Number.isFinite(file.mtime) || file.mtime <= 0 || file.mtime >= cutoff) continue;
      try { await filesystem.deleteFile({ path: `${CACHE_FOLDER}/${file.name}`, directory }); }
      catch { /* An OS-evicted cache file or a cleanup error must not prevent a new export. */ }
    }
  } catch { /* The cache folder may not exist yet. Cleanup is best effort. */ }
}

function startDownload(contents: string, filename: string): { method: 'download' } {
  let url: string | undefined;
  let anchor: HTMLAnchorElement | undefined;
  try {
    url = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }));
    anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    // Do not revoke synchronously: browsers may still be consuming the object URL.
    const downloadedUrl = url;
    window.setTimeout(() => URL.revokeObjectURL(downloadedUrl), 60_000);
    return { method: 'download' };
  } catch {
    if (url) URL.revokeObjectURL(url);
    throw new BackupExportError('download-failed', 'No se pudo iniciar la descarga. Volvé a intentarlo desde este navegador.');
  } finally { anchor?.remove(); }
}

function cancelledShare(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; message?: unknown };
  return candidate.name === 'AbortError' || (typeof candidate.message === 'string' && /^Share cancel(?:ed|led)$/i.test(candidate.message));
}

/**
 * Starts a browser download or hands a private cache file to the native share sheet.
 * Neither result confirms that the user saved the file at a destination.
 * The caller validates the backup contents and owns all game/preferences storage.
 */
export async function exportBackupFile(contents: string, filename: string): Promise<{ method: BackupExportMethod }> {
  if (typeof contents !== 'string' || !contents.trim() || typeof filename !== 'string') {
    throw new BackupExportError('invalid', 'No se pudo preparar el archivo de respaldo. Volvé a intentarlo.');
  }
  const name = safeFilename(filename);
  if (!Capacitor.isNativePlatform()) return startDownload(contents, name);
  if (sharing) throw new BackupExportError('busy', 'Ya hay un respaldo abierto para compartir. Cerrá esa ventana antes de volver a exportar.');
  sharing = true;
  try {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'), import('@capacitor/share'),
    ]).catch(() => { throw new BackupExportError('unavailable', 'Esta versión de la app no pudo abrir la exportación de archivos. Cerrá y volvé a abrir la app.'); });
    const { value: canShare } = await Share.canShare().catch(() => ({ value: false }));
    if (!canShare) throw new BackupExportError('unavailable', 'No se pudo abrir la opción de compartir archivos en este dispositivo.');

    // Cleanup happens before creating this export, never after handing it to another app.
    await cleanOldExports(Filesystem, Directory.Cache);
    let uri: string;
    try {
      const nonce = [...crypto.getRandomValues(new Uint8Array(8))].map(value => value.toString(16).padStart(2, '0')).join('');
      const path = `${CACHE_FOLDER}/backup-${Date.now()}-${nonce}-${name}`;
      ({ uri } = await Filesystem.writeFile({ path, data: contents, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true }));
      if (!uri.startsWith('file://')) throw new Error('Unexpected cache URI');
    } catch {
      throw new BackupExportError('write-failed', 'No se pudo preparar el archivo temporal. Revisá el espacio disponible y volvé a intentarlo.');
    }
    try {
      await Share.share({ title: 'Respaldo de Director de Murga', dialogTitle: 'Guardar o compartir respaldo', files: [uri] });
    } catch (error) {
      if (cancelledShare(error)) throw new BackupExportError('cancelled', 'Exportación cancelada. Tu partida no cambió.');
      throw new BackupExportError('share-failed', 'No se pudo completar la acción de compartir. Volvé a intentarlo; la partida no cambió.');
    }
    // Even cancellation/failure leaves the file intact: recipients can read asynchronously.
    return { method: 'share' };
  } finally { sharing = false; }
}
