import { createGame, parseSave, type State } from './simulation';
import { parseCosmetics, type CosmeticsState } from './cosmetics-state';
import { BACKUP_STORAGE_KEYS, type BackupStore } from './backup-storage';

const LEGACY_KEYS = [8, 7, 6, 5, 4, 3, 2, 1].map(version => `director-de-murga-v${version}`);
export interface LoadedCampaign {state: State; cosmetics: CosmeticsState; notice: string;}

async function read(store: BackupStore, key: string): Promise<string | null> {
  try {
    const result = await store.get({key});
    if (!result || (result.value !== null && typeof result.value !== 'string')) throw new Error('Respuesta incompleta');
    return result.value;
  } catch { throw new Error('No se pudo leer la partida o su apariencia. Reintentá la carga antes de guardar cambios.'); }
}

async function persist(store: BackupStore, key: string, value: string): Promise<void> {
  try {
    await store.set({key, value});
    if (await read(store, key) !== value) throw new Error('Escritura no confirmada');
  } catch { throw new Error('No se pudo conservar o actualizar el guardado. Reintentá la carga antes de continuar.'); }
}

/** Run only after recoverPendingRestore has succeeded. A failed read is never evidence of an absent save. */
export async function loadCampaignStorage(store: BackupStore): Promise<LoadedCampaign> {
  const [campaignRead, cosmeticsRead] = await Promise.allSettled([
    read(store, BACKUP_STORAGE_KEYS.campaign), read(store, BACKUP_STORAGE_KEYS.cosmetics),
  ]);
  if (campaignRead.status === 'rejected') throw campaignRead.reason;
  if (cosmeticsRead.status === 'rejected') throw cosmeticsRead.reason;
  const current = campaignRead.value, cosmetics = parseCosmetics(cosmeticsRead.value);
  const saved = parseSave(current);
  if (saved) return {state: saved, cosmetics, notice: ''};

  let migrated: State | null = null;
  for (const key of LEGACY_KEYS) {
    migrated = parseSave(await read(store, key));
    if (migrated) break;
  }

  // Finish all source reads before even writing a recovery copy. Never replace an unreadable legacy save.
  if (current !== null) {
    const base = `${BACKUP_STORAGE_KEYS.campaign}-recovery-${Date.now()}`;
    let recoveryKey = base, suffix = 0, existing = await read(store, recoveryKey);
    while (existing !== null && existing !== current) {
      recoveryKey = `${base}-${++suffix}`;
      existing = await read(store, recoveryKey);
    }
    if (existing === null) await persist(store, recoveryKey, current);
  }
  if (migrated) {
    await persist(store, BACKUP_STORAGE_KEYS.campaign, JSON.stringify(migrated));
    return {state: migrated, cosmetics, notice: 'Partida actualizada: conservamos el elenco y el progreso. El guardado anterior sigue respaldado.'};
  }
  return {state: createGame(), cosmetics, notice: current !== null
    ? 'No se pudo recuperar el guardado actual. Conservamos una copia para recuperación en este dispositivo.' : ''};
}
