import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, parseSave, setIdentity } from './simulation';
import { parseCosmetics } from './cosmetics-state';
import { BACKUP_STORAGE_KEYS as K, type BackupStore } from './backup-storage';
import { loadCampaignStorage } from './load-campaign';

class Store implements BackupStore {
  values = new Map<string, string>();
  reads: string[] = [];
  writes: {key: string; value: string}[] = [];
  failReads = new Set<string>();
  failWrites = new Set<string>();
  async get({key}: {key: string}) {
    this.reads.push(key);
    if (this.failReads.has(key)) throw new Error('read failed');
    return {value: this.values.get(key) ?? null};
  }
  async set({key, value}: {key: string; value: string}) {
    this.writes.push({key, value});
    if (this.failWrites.has(key)) throw new Error('write failed');
    this.values.set(key, value);
  }
  async remove(): Promise<void> { throw new Error('Boot must never remove a save'); }
}
function fixture() {
  const store = new Store(), state = setIdentity(createGame(93), {name: 'Las Voces del Prado', barrio: 'Prado'});
  const cosmetics = parseCosmetics(null); cosmetics.shared.paletteId = 'turquoise';
  cosmetics.members[state.members[0].id] = {...cosmetics.shared, heightScale: .93};
  store.values.set(K.campaign, JSON.stringify(state)); store.values.set(K.cosmetics, JSON.stringify(cosmetics));
  return {store, state, cosmetics};
}

test('either current read failing rejects before any write and preserves both valid values', async () => {
  for (const failed of [K.campaign, K.cosmetics]) {
    const {store} = fixture(), before = new Map(store.values); store.failReads.add(failed);
    await assert.rejects(loadCampaignStorage(store), /No se pudo leer/);
    assert.deepEqual(store.values, before); assert.deepEqual(store.writes, []);
    assert.ok(store.reads.includes(K.campaign)); assert.ok(store.reads.includes(K.cosmetics));
  }
});

test('valid current state takes priority without reading or rewriting migrations or cosmetics', async () => {
  const {store, state, cosmetics} = fixture(); store.failReads.add('director-de-murga-v8');
  store.values.set('director-de-murga-v8', JSON.stringify(createGame(1)));
  const result = await loadCampaignStorage(store);
  assert.deepEqual(result, {state, cosmetics, notice: ''}); assert.deepEqual(store.writes, []);
  assert.deepEqual(store.reads, [K.campaign, K.cosmetics]);
});

test('real absence creates a new campaign without persisting defaults during boot', async () => {
  const store = new Store(), result = await loadCampaignStorage(store);
  assert.deepEqual(result.state, createGame()); assert.deepEqual(result.cosmetics, parseCosmetics(null));
  assert.equal(result.notice, ''); assert.equal(store.values.size, 0); assert.deepEqual(store.writes, []);
  assert.deepEqual(store.reads.slice(2), [8, 7, 6, 5, 4, 3, 2, 1].map(version => `director-de-murga-v${version}`));
});

test('legacy read errors refuse defaults and defer even the invalid-current recovery copy', async () => {
  for (const current of [null, '{damaged']) {
    const {store} = fixture();
    if (current === null) store.values.delete(K.campaign); else store.values.set(K.campaign, current);
    store.failReads.add('director-de-murga-v7');
    const before = new Map(store.values);
    await assert.rejects(loadCampaignStorage(store), /No se pudo leer/);
    assert.deepEqual(store.values, before); assert.deepEqual(store.writes, []);
    assert.equal(store.reads.includes('director-de-murga-v6'), false);
  }
});

test('migration preserves invalid current bytes and the legacy source before replacing the current key', async () => {
  const {store, state, cosmetics} = fixture();
  const {circuit, ...previous} = state, legacy = JSON.stringify({...previous, version: 8});
  const invalid = '{ original dañado y completo'; store.values.set(K.campaign, invalid);
  store.values.set('director-de-murga-v8', legacy);
  store.values.set('director-de-murga-v7', 'older untouched');
  const result = await loadCampaignStorage(store);
  assert.deepEqual(result.state, parseSave(legacy)); assert.deepEqual(result.cosmetics, cosmetics);
  assert.match(result.notice, /Partida actualizada/);
  assert.equal(store.values.get('director-de-murga-v8'), legacy); assert.equal(store.values.get('director-de-murga-v7'), 'older untouched');
  assert.equal(store.writes.length, 2); assert.match(store.writes[0].key, /^director-de-murga-v9-recovery-\d+/);
  assert.equal(store.writes[0].value, invalid); assert.equal(store.writes[1].key, K.campaign);
  assert.equal(store.values.get(K.cosmetics), JSON.stringify(cosmetics));
});

test('the newest valid legacy source wins and missing current needs no fabricated recovery copy', async () => {
  const {store, state} = fixture(); store.values.delete(K.campaign);
  store.values.set('director-de-murga-v8', 'invalid'); store.values.set('director-de-murga-v7', JSON.stringify(state));
  store.failReads.add('director-de-murga-v6');
  const result = await loadCampaignStorage(store);
  assert.deepEqual(result.state, state); assert.deepEqual(store.writes.map(entry => entry.key), [K.campaign]);
  assert.equal(store.values.get('director-de-murga-v8'), 'invalid');
});

test('unrecoverable current data, including an empty string, is copied before allowing a new campaign', async () => {
  for (const invalid of ['{damaged', '']) {
    const {store, cosmetics} = fixture(); store.values.set(K.campaign, invalid);
    const result = await loadCampaignStorage(store);
    assert.deepEqual(result.state, createGame()); assert.deepEqual(result.cosmetics, cosmetics);
    assert.match(result.notice, /Conservamos una copia/); assert.equal(store.writes.length, 1);
    assert.equal(store.writes[0].value, invalid); assert.equal(store.values.get(K.campaign), invalid);
  }
});

test('a recovery-copy collision preserves every original, and failed migration does not return a playable default', async t => {
  t.mock.method(Date, 'now', () => 1234567890);
  const {store, state} = fixture(); store.values.set(K.campaign, '{new damage');
  store.values.set(`${K.campaign}-recovery-1234567890`, '{older damage');
  store.values.set('director-de-murga-v8', JSON.stringify(state)); store.failWrites.add(K.campaign);
  await assert.rejects(loadCampaignStorage(store), /No se pudo conservar o actualizar/);
  assert.equal(store.values.get(K.campaign), '{new damage');
  assert.equal(store.values.get(`${K.campaign}-recovery-1234567890`), '{older damage');
  assert.equal(store.values.get(`${K.campaign}-recovery-1234567890-1`), '{new damage');
  assert.equal(store.values.get('director-de-murga-v8'), JSON.stringify(state));
});

test('malformed storage replies are errors, while readable damaged cosmetic preferences retain the existing sanitizer behavior', async () => {
  const {store} = fixture(); const get = store.get.bind(store);
  store.get = async options => options.key === K.cosmetics ? {value: undefined as never} : get(options);
  await assert.rejects(loadCampaignStorage(store), /No se pudo leer/); assert.deepEqual(store.writes, []);
  store.get = get; store.values.set(K.cosmetics, '{broken');
  assert.deepEqual((await loadCampaignStorage(store)).cosmetics, parseCosmetics(null));
  assert.equal(store.values.get(K.cosmetics), '{broken'); assert.deepEqual(store.writes, []);
});
