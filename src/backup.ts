import { parseSave, type State } from './simulation';
import { parseCosmetics, type CosmeticsState } from './cosmetics-state';
import { sanitizeCharacterSelection, type CharacterSelection } from './character-system';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export interface Backup {
  format: 'director-de-murga-backup';
  version: 1;
  exportedAt: string;
  campaign: State;
  cosmetics: CosmeticsState;
}

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const selectionKeys = ['bodyId', 'faceId', 'hairId', 'outfitId', 'hatId', 'makeupId', 'paletteId', 'heightScale', 'skinToneId', 'hairColorId'] as const;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

function selectionValid(value: unknown): value is CharacterSelection {
  if (!record(value) || !exactKeys(value, selectionKeys)) return false;
  const normalized = sanitizeCharacterSelection(value);
  return selectionKeys.every(key => value[key] === normalized[key]);
}

function cosmeticsValid(value: unknown): value is CosmeticsState {
  if (!record(value) || !exactKeys(value, ['version', 'shared', 'members']) || value.version !== 1 || !selectionValid(value.shared) || !record(value.members)) return false;
  const members = Object.entries(value.members);
  return members.length <= 256 && members.every(([id, selection]) => /^[a-zA-Z0-9_-]{1,100}$/.test(id) && !forbiddenKeys.has(id) && selectionValid(selection));
}

/** Imports are deliberately stricter than normal cosmetic preferences: damaged looks never silently become defaults. */
export function parseBackup(raw: string): Backup {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES)
    throw new Error('El respaldo supera el límite de 5 MiB.');
  let value: unknown;
  try {
    value = JSON.parse(raw, (key, entry: unknown) => {
      if (forbiddenKeys.has(key)) throw new Error('Clave no permitida');
      return entry;
    });
  } catch { throw new Error('El archivo no contiene un JSON de respaldo válido o contiene claves no permitidas.'); }
  if (!record(value) || !exactKeys(value, ['format', 'version', 'exportedAt', 'campaign', 'cosmetics']) || value.format !== 'director-de-murga-backup')
    throw new Error('Faltan los datos obligatorios del respaldo de Director de Murga.');
  if (value.version !== 1) throw new Error('Esta versión del respaldo no es compatible con el juego.');
  if (typeof value.exportedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.exportedAt)
    || !Number.isFinite(Date.parse(value.exportedAt)) || new Date(value.exportedAt).toISOString() !== value.exportedAt)
    throw new Error('La fecha del respaldo está incompleta o no es válida.');
  let campaign: State | null = null;
  try { campaign = parseSave(JSON.stringify(value.campaign)); } catch { /* Invalid or excessively nested data is rejected. */ }
  if (!campaign) throw new Error('La campaña del respaldo está dañada o usa una versión no compatible.');
  if (!cosmeticsValid(value.cosmetics)) throw new Error('El vestuario del respaldo está incompleto o contiene opciones no válidas.');
  return { format: 'director-de-murga-backup', version: 1, exportedAt: value.exportedAt, campaign, cosmetics: parseCosmetics(JSON.stringify(value.cosmetics)) };
}

export function createBackup(state: State, cosmetics: CosmeticsState, now = new Date()): Backup {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('No se pudo determinar una fecha válida para el respaldo.');
  return parseBackup(JSON.stringify({ format: 'director-de-murga-backup', version: 1, exportedAt: now.toISOString(), campaign: state, cosmetics }));
}

export function serializeBackup(backup: Backup): string {
  // Revalidate callers too, and serialize migrated data rather than an unchecked reference.
  try { return JSON.stringify(parseBackup(JSON.stringify(backup))); }
  catch (error) { if (error instanceof Error && !(error instanceof TypeError) && !(error instanceof RangeError)) throw error; throw new Error('No se pudo crear un archivo de respaldo válido.'); }
}

export function backupFilename(backup: Backup): string {
  const safe = parseBackup(serializeBackup(backup));
  const date = safe.exportedAt.replace(/[:.]/g, '-');
  return `director-de-murga-temporada-${safe.campaign.season}-${date}.json`;
}
