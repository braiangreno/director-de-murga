import { parseBackup, serializeBackup, MAX_BACKUP_BYTES, type Backup } from './backup';

export interface BackupStore {
  get(options: {key: string}): Promise<{value: string | null}>;
  set(options: {key: string; value: string}): Promise<unknown>;
  remove(options: {key: string}): Promise<unknown>;
}
export const BACKUP_STORAGE_KEYS = Object.freeze({
  campaign: 'director-de-murga-v9',
  cosmetics: 'director-de-murga-character-system-v1',
  previous: 'director-de-murga-previous-backup-v1',
  journal: 'director-de-murga-restore-journal-v1',
});
export type RestoreResult =
  | {status: 'applied'; backup: Backup; cleanupPending: boolean}
  | {status: 'rolled-back'; reason: string}
  | {status: 'blocked'; reason: string};
export type RecoveryResult =
  | {status: 'clean'}
  | {status: 'recovered'; outcome: 'rolled-back' | 'committed'}
  | {status: 'blocked'; reason: string};

type OriginalValues = {campaign: string | null; cosmetics: string | null; previous: string | null};
interface Journal {
  format: 'director-de-murga-restore-journal'; version: 1; phase: 'prepared' | 'committed';
  originals: OriginalValues; next: string; previous: string;
}
const busy = new WeakSet<BackupStore>();
const recoveryReason = 'Hay una restauración pendiente de recuperar. No guardes cambios; reintentá la recuperación antes de continuar.';

function parseJournal(raw: string): Journal {
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES * 8) throw new Error('Registro demasiado grande');
  const value = JSON.parse(raw, (key, entry: unknown) => {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Clave no permitida');
    return entry;
  }) as Journal;
  if (!value || value.format !== 'director-de-murga-restore-journal' || value.version !== 1 || !['prepared', 'committed'].includes(value.phase)
    || Object.keys(value).sort().join(',') !== 'format,next,originals,phase,previous,version'
    || !value.originals || typeof value.originals !== 'object' || Array.isArray(value.originals)
    || Object.keys(value.originals).sort().join(',') !== 'campaign,cosmetics,previous'
    || Object.values(value.originals).some(entry => entry !== null && typeof entry !== 'string')
    || typeof value.next !== 'string' || typeof value.previous !== 'string') throw new Error('Registro incompleto');
  parseBackup(value.next); parseBackup(value.previous);
  return value;
}

/** Read back every write; an operation that throws after persisting is still safely recognized. */
async function writeVerified(store: BackupStore, key: string, value: string | null): Promise<void> {
  let failed = false;
  try { if (value === null) await store.remove({key}); else await store.set({key, value}); } catch { failed = true; }
  const actual = (await store.get({key})).value;
  if (actual !== value) throw new Error(failed ? 'No se pudo persistir la restauración.' : 'El almacenamiento no confirmó la escritura.');
}

async function rollback(store: BackupStore, journal: Journal): Promise<void> {
  for (const field of ['campaign', 'cosmetics', 'previous'] as const)
    await writeVerified(store, BACKUP_STORAGE_KEYS[field], journal.originals[field]);
  await writeVerified(store, BACKUP_STORAGE_KEYS.journal, null);
}

/** Must run before reading campaign/cosmetics at boot. A committed journal only needs cleanup. */
export async function recoverPendingRestore(store: BackupStore): Promise<RecoveryResult> {
  if (busy.has(store)) return {status: 'blocked', reason: 'Ya hay una restauración en curso.'};
  busy.add(store);
  try {
    const raw = (await store.get({key: BACKUP_STORAGE_KEYS.journal})).value;
    if (raw === null) return {status: 'clean'};
    const journal = parseJournal(raw);
    if (journal.phase === 'prepared') await rollback(store, journal);
    else await writeVerified(store, BACKUP_STORAGE_KEYS.journal, null);
    return {status: 'recovered', outcome: journal.phase === 'prepared' ? 'rolled-back' : 'committed'};
  } catch { return {status: 'blocked', reason: recoveryReason}; }
  finally { busy.delete(store); }
}

export async function getPreviousBackup(store: BackupStore): Promise<Backup | null> {
  const raw = (await store.get({key: BACKUP_STORAGE_KEYS.previous})).value;
  return raw === null ? null : parseBackup(raw);
}

/** Caller freezes interaction and drains ordinary save queues first; memory changes only on applied. */
export async function applyBackup(store: BackupStore, backup: Backup, previousBackup: Backup): Promise<RestoreResult> {
  if (busy.has(store)) return {status: 'blocked', reason: 'Ya hay una restauración en curso.'};
  busy.add(store);
  let journal: Journal | undefined;
  try {
    if ((await store.get({key: BACKUP_STORAGE_KEYS.journal})).value !== null) return {status: 'blocked', reason: recoveryReason};
    const next = serializeBackup(backup), previous = serializeBackup(previousBackup);
    const restored = parseBackup(next);
    const [campaignValue, cosmeticsValue, previousValue] = await Promise.all([
      store.get({key: BACKUP_STORAGE_KEYS.campaign}), store.get({key: BACKUP_STORAGE_KEYS.cosmetics}), store.get({key: BACKUP_STORAGE_KEYS.previous}),
    ]);
    journal = {format: 'director-de-murga-restore-journal', version: 1, phase: 'prepared',
      originals: {campaign: campaignValue.value, cosmetics: cosmeticsValue.value, previous: previousValue.value}, next, previous};
    const prepared = JSON.stringify(journal);
    // Never begin a transaction that this same version could not recover after a restart.
    parseJournal(prepared);
    await writeVerified(store, BACKUP_STORAGE_KEYS.journal, prepared);
    await writeVerified(store, BACKUP_STORAGE_KEYS.campaign, JSON.stringify(restored.campaign));
    await writeVerified(store, BACKUP_STORAGE_KEYS.cosmetics, JSON.stringify(restored.cosmetics));
    await writeVerified(store, BACKUP_STORAGE_KEYS.previous, previous);
    const committed = {...journal, phase: 'committed' as const};
    await writeVerified(store, BACKUP_STORAGE_KEYS.journal, JSON.stringify(committed));
    let cleanupPending = false;
    try { await writeVerified(store, BACKUP_STORAGE_KEYS.journal, null); } catch { cleanupPending = true; }
    return {status: 'applied', backup: restored, cleanupPending};
  } catch {
    // Never guess after an ambiguous storage failure: the durable phase decides which side won.
    try {
      const raw = (await store.get({key: BACKUP_STORAGE_KEYS.journal})).value;
      if (raw !== null) {
        const persisted = parseJournal(raw);
        if (!journal || persisted.next !== journal.next || persisted.previous !== journal.previous) return {status: 'blocked', reason: recoveryReason};
        if (persisted.phase === 'committed') {
          let cleanupPending = false;
          try { await writeVerified(store, BACKUP_STORAGE_KEYS.journal, null); } catch { cleanupPending = true; }
          return {status: 'applied', backup: parseBackup(persisted.next), cleanupPending};
        }
        await rollback(store, persisted);
      }
      return {status: 'rolled-back', reason: 'No se pudo restaurar el respaldo. La partida anterior se conserva.'};
    } catch { return {status: 'blocked', reason: recoveryReason}; }
  } finally { busy.delete(store); }
}
