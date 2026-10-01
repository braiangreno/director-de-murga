import { DEFAULT_CHARACTER_SELECTION, createEnsembleSelection, sanitizeCharacterSelection, type CharacterSelection } from './character-system';

export interface CosmeticsState {
  version: 1;
  shared: CharacterSelection;
  members: Record<string, CharacterSelection>;
}

export function parseCosmetics(value: string | null): CosmeticsState {
  const result: CosmeticsState = { version: 1, shared: { ...DEFAULT_CHARACTER_SELECTION }, members: Object.create(null) };
  try {
    const data: unknown = JSON.parse(value ?? 'null');
    if (!data || typeof data !== 'object' || (data as { version?: number }).version !== 1) return result;
    const saved = data as Partial<CosmeticsState>;
    result.shared = sanitizeCharacterSelection(saved.shared);
    if (saved.members && typeof saved.members === 'object' && !Array.isArray(saved.members)) {
      for (const [id, selection] of Object.entries(saved.members).slice(0, 256)) {
        if (/^[a-zA-Z0-9_-]{1,100}$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id)) {
          result.members[id] = sanitizeCharacterSelection(selection);
        }
      }
    }
  } catch { /* Cosmetic data has its own save and can never reset a season. */ }
  return result;
}

export function memberAppearance(state: CosmeticsState, memberId: string, index: number): CharacterSelection {
  return { ...(state.members[memberId] ?? createEnsembleSelection(state.shared, index)) };
}

export function dressEnsemble(state: CosmeticsState, members: { id: string }[], look: CharacterSelection): CosmeticsState {
  const wardrobe = { outfitId: look.outfitId, hatId: look.hatId, makeupId: look.makeupId, paletteId: look.paletteId };
  const next: CosmeticsState = { version: 1, shared: { ...state.shared, ...wardrobe }, members: { ...state.members } };
  members.forEach((member, index) => { next.members[member.id] = { ...memberAppearance(state, member.id, index), ...wardrobe }; });
  return next;
}
