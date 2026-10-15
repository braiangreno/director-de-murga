import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, setIdentity } from './simulation';
import { parseCosmetics } from './cosmetics-state';
import { createBackup, serializeBackup } from './backup';
import { applyBackup, recoverPendingRestore, getPreviousBackup, BACKUP_STORAGE_KEYS as K, type BackupStore } from './backup-storage';

type Operation = {kind: 'get' | 'set' | 'remove'; key: string; value?: string};
type Fault = 'before' | 'after' | 'silent' | undefined;
class MemoryStore implements BackupStore {
  readonly values = new Map<string, string>();
  readonly operations: Operation[] = [];
  fault: (operation: Operation) => Fault = () => undefined;
  async get({key}: {key: string}) {
    const op: Operation = {kind: 'get', key}; this.operations.push(op);
    if (this.fault(op)) throw new Error('read failed');
    return {value: this.values.get(key) ?? null};
  }
  async set({key, value}: {key: string; value: string}) {
    const op: Operation = {kind: 'set', key, value}; this.operations.push(op); const fail = this.fault(op);
    if (fail === 'before') throw new Error('write failed');
    if (fail !== 'silent') this.values.set(key, value);
    if (fail === 'after') throw new Error('response lost');
  }
  async remove({key}: {key: string}) {
    const op: Operation = {kind: 'remove', key}; this.operations.push(op); const fail = this.fault(op);
    if (fail === 'before') throw new Error('remove failed');
    if (fail !== 'silent') this.values.delete(key);
    if (fail === 'after') throw new Error('response lost');
  }
}
function fixtures() {
  const old = createBackup(createGame(1), parseCosmetics(null), new Date('2026-10-15T12:00:00.000Z'));
  const nextState = setIdentity(createGame(2), {name: 'La Otra Esquina', barrio: 'La Teja'});
  const looks = parseCosmetics(null); looks.shared.paletteId = 'turquoise';
  const next = createBackup(nextState, looks, new Date('2026-10-15T13:00:00.000Z'));
  const store = new MemoryStore();
  store.values.set(K.campaign, JSON.stringify(old.campaign)); store.values.set(K.cosmetics, JSON.stringify(old.cosmetics));
  store.values.set('director-de-murga-visual-settings-v1', '{"quality":"economy"}');
  store.values.set('director-de-murga-v8', 'legacy unchanged');
  return {old, next, store};
}
function unchangedExtras(store: MemoryStore) {
  assert.equal(store.values.get('director-de-murga-visual-settings-v1'), '{"quality":"economy"}');
  assert.equal(store.values.get('director-de-murga-v8'), 'legacy unchanged');
  assert.ok(store.operations.filter(op => op.kind !== 'get').every(op => Object.values(K).includes(op.key as typeof K[keyof typeof K])));
}

test('successful restore verifies both keys and retains the previous in-memory campaign, not a stale persisted one', async () => {
  const {old, next, store} = fixtures();
  const memory = createBackup(setIdentity(old.campaign, {name: 'Cambio sin guardar', barrio: 'Cordón'}), old.cosmetics);
  const result = await applyBackup(store, next, memory);
  assert.equal(result.status, 'applied'); if (result.status !== 'applied') return;
  assert.equal(result.cleanupPending, false); assert.deepEqual(result.backup, next);
  assert.equal(store.values.get(K.campaign), JSON.stringify(next.campaign));
  assert.equal(store.values.get(K.cosmetics), JSON.stringify(next.cosmetics));
  assert.deepEqual(await getPreviousBackup(store), memory); assert.equal(store.values.has(K.journal), false);
  const previous = await getPreviousBackup(store); assert.ok(previous);
  const undo = await applyBackup(store, previous, next); assert.equal(undo.status, 'applied');
  assert.equal(JSON.parse(store.values.get(K.campaign)!).identity.name, 'Cambio sin guardar');
  assert.deepEqual(await getPreviousBackup(store), next); unchangedExtras(store);
});

test('failure at each prepared/data/commit write restores exact originals, including a previous backup', async () => {
  for (let failAt = 1; failAt <= 5; failAt++) {
    const {old, next, store} = fixtures();
    const older = createBackup(createGame(3), old.cosmetics, new Date('2026-10-14T12:00:00.000Z'));
    store.values.set(K.previous, serializeBackup(older));
    const original = new Map(store.values); let writes = 0;
    store.fault = op => op.kind === 'set' && ++writes === failAt ? 'before' : undefined;
    const result = await applyBackup(store, next, old);
    assert.equal(result.status, 'rolled-back', `write ${failAt}`); assert.deepEqual(store.values, original);
    assert.deepEqual(await recoverPendingRestore(store), {status: 'clean'}); unchangedExtras(store);
  }
});

test('silent dropped writes are detected, and errors after persisting are resolved by readback', async () => {
  for (const mode of ['silent', 'after'] as const) {
    const {old, next, store} = fixtures(); const original = new Map(store.values); let failed = false;
    store.fault = op => { if (!failed && op.kind === 'set' && op.key === K.cosmetics) { failed = true; return mode; } };
    const result = await applyBackup(store, next, old);
    assert.equal(result.status, mode === 'silent' ? 'rolled-back' : 'applied');
    if (mode === 'silent') assert.deepEqual(store.values, original);
    else assert.equal(store.values.get(K.cosmetics), JSON.stringify(next.cosmetics));
  }
});

test('a rollback failure blocks further restoration and a later boot retries the durable originals', async () => {
  const {old, next, store} = fixtures(); const original = new Map(store.values); let failed = false;
  store.fault = op => {
    if (op.kind === 'set' && op.key === K.cosmetics) { failed = true; return 'before'; }
    if (failed && op.kind === 'set' && op.key === K.campaign) return 'before';
  };
  assert.equal((await applyBackup(store, next, old)).status, 'blocked');
  assert.equal(JSON.parse(store.values.get(K.journal)!).phase, 'prepared');
  const writes = store.operations.filter(op => op.kind !== 'get').length;
  assert.equal((await applyBackup(store, next, old)).status, 'blocked');
  assert.equal(store.operations.filter(op => op.kind !== 'get').length, writes);
  store.fault = () => undefined;
  assert.deepEqual(await recoverPendingRestore(store), {status: 'recovered', outcome: 'rolled-back'});
  assert.deepEqual(store.values, original); unchangedExtras(store);
});

test('interrupted startup recovery is repeatable and preserves originally absent keys', async () => {
  const {old, next, store} = fixtures(); store.values.delete(K.campaign); store.values.delete(K.cosmetics);
  const original = new Map(store.values); let interrupted = false;
  store.fault = op => {
    if (op.kind === 'set' && op.key === K.previous) interrupted = true;
    if (interrupted) return 'before';
  };
  assert.equal((await applyBackup(store, next, old)).status, 'blocked');
  store.fault = op => op.kind === 'remove' && op.key === K.cosmetics ? 'before' : undefined;
  assert.equal((await recoverPendingRestore(store)).status, 'blocked');
  assert.equal(store.values.has(K.journal), true);
  store.fault = () => undefined;
  assert.deepEqual(await recoverPendingRestore(store), {status: 'recovered', outcome: 'rolled-back'});
  assert.deepEqual(store.values, original);
});

test('committed cleanup never overwrites newer autosaves on the next boot', async () => {
  const {old, next, store} = fixtures();
  store.fault = op => op.kind === 'remove' && op.key === K.journal ? 'before' : undefined;
  const result = await applyBackup(store, next, old);
  assert.equal(result.status, 'applied'); if (result.status !== 'applied') return;
  assert.equal(result.cleanupPending, true); assert.equal(JSON.parse(store.values.get(K.journal)!).phase, 'committed');
  const newer = setIdentity(next.campaign, {name: 'Guardado posterior', barrio: 'Prado'});
  store.values.set(K.campaign, JSON.stringify(newer)); const committedValues = new Map(store.values);
  assert.equal((await recoverPendingRestore(store)).status, 'blocked');
  assert.deepEqual(store.values, committedValues);
  store.fault = () => undefined;
  assert.deepEqual(await recoverPendingRestore(store), {status: 'recovered', outcome: 'committed'});
  assert.equal(store.values.get(K.campaign), JSON.stringify(newer));
  assert.deepEqual(await getPreviousBackup(store), old); unchangedExtras(store);
});

test('ambiguous commit read failure resolves from the journal without undoing a committed import', async () => {
  const {old, next, store} = fixtures(); let failRead = false;
  store.fault = op => {
    if (op.kind === 'set' && op.key === K.journal && JSON.parse(op.value!).phase === 'committed') failRead = true;
    else if (failRead && op.kind === 'get' && op.key === K.journal) { failRead = false; return 'before'; }
  };
  assert.equal((await applyBackup(store, next, old)).status, 'applied');
  assert.equal(store.values.get(K.campaign), JSON.stringify(next.campaign));
  assert.deepEqual(await getPreviousBackup(store), old);
});

test('malformed journals block without guessing, invalid backups never mutate storage, previous copy validates', async () => {
  const {old, next, store} = fixtures(); store.values.set(K.journal, '{broken');
  const original = new Map(store.values);
  assert.equal((await recoverPendingRestore(store)).status, 'blocked');
  assert.equal((await applyBackup(store, next, old)).status, 'blocked');
  assert.deepEqual(store.values, original);
  store.values.delete(K.journal); const clean = new Map(store.values);
  assert.equal((await applyBackup(store, {...next, version: 2} as never, old)).status, 'rolled-back');
  assert.deepEqual(store.values, clean); assert.equal(await getPreviousBackup(store), null);
  store.values.set(K.previous, '{broken'); await assert.rejects(getPreviousBackup(store), Error);
});

test('simultaneous restoration is refused before it can create competing journals', async () => {
  const {old, next, store} = fixtures(); let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const originalSet = store.set.bind(store); let held = false;
  store.set = async options => { if (!held && options.key === K.journal) { held = true; await barrier; } await originalSet(options); };
  const first = applyBackup(store, next, old);
  assert.equal((await applyBackup(store, old, next)).status, 'blocked');
  assert.equal((await recoverPendingRestore(store)).status, 'blocked');
  release(); assert.equal((await first).status, 'applied');
});

test('unreadable storage blocks startup and restoration without attempting writes', async () => {
  const {old, next, store} = fixtures(); const original = new Map(store.values);
  store.fault = op => op.kind === 'get' ? 'before' : undefined;
  assert.equal((await recoverPendingRestore(store)).status, 'blocked');
  assert.equal((await applyBackup(store, next, old)).status, 'blocked');
  assert.ok(store.operations.every(op => op.kind === 'get')); assert.deepEqual(store.values, original);
});
