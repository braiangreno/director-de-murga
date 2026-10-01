import assert from 'node:assert/strict';
import test from 'node:test';
import { dressEnsemble, memberAppearance, parseCosmetics } from './cosmetics-state';

test('damaged cosmetics recover without introducing member keys or touching season data', () => {
  assert.deepEqual(Object.keys(parseCosmetics('{broken').members), []);
  const restored = parseCosmetics('{"version":1,"members":{"__proto__":{"heightScale":9},"m-starter-0":{"heightScale":9}}}');
  assert.equal(Object.hasOwn(restored.members, '__proto__'), false);
  assert.ok(restored.members['m-starter-0'].heightScale <= 1.1);
});

test('dressing the entire ensemble preserves personal features and future recruits inherit the outfit', () => {
  const state = parseCosmetics(null), members = [{ id: 'first' }, { id: 'second' }];
  const first = memberAppearance(state, 'first', 0), second = memberAppearance(state, 'second', 1);
  state.members.first = { ...first, heightScale: .91 };
  state.members.second = { ...second, heightScale: 1.08 };
  const look = { ...first, hatId: 'hat-none', makeupId: 'none', outfitId: 'outfit-long-coat', paletteId: 'turquoise' };
  const dressed = dressEnsemble(state, members, look);
  assert.equal(dressed.members.first.heightScale, .91);
  assert.equal(dressed.members.second.heightScale, 1.08);
  for (const field of ['faceId', 'hairId', 'skinToneId', 'hairColorId'] as const) {
    assert.equal(dressed.members.second[field], second[field]);
  }
  assert.equal(dressed.members.second.hatId, 'hat-none');
  assert.equal(dressed.members.second.outfitId, 'outfit-long-coat');
  assert.equal(dressed.members.second.paletteId, 'turquoise');
  assert.equal(memberAppearance(dressed, 'new-member', 2).hatId, 'hat-none');
  assert.equal(memberAppearance(dressed, 'new-member', 2).outfitId, 'outfit-long-coat');
  assert.equal(memberAppearance(dressed, 'new-member', 2).paletteId, 'turquoise');
  assert.equal(state.shared.hatId, first.hatId);
  assert.deepEqual(parseCosmetics(JSON.stringify(dressed)).members.second, dressed.members.second);
});
