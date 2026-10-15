import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, parseSave, getSeasonReport, CREATIVE_ROLES, CREATIVE_CANDIDATES, MEMBER_ROLES, hireCreative } from './simulation';
import { parseCosmetics } from './cosmetics-state';
import { createBackup, serializeBackup, parseBackup, backupFilename, MAX_BACKUP_BYTES } from './backup';

const when = new Date('2026-10-15T12:34:56.000Z');
const sample = () => createBackup(createGame(41), parseCosmetics(null), when);

test('backups preserve a campaign and personalized appearances without retaining mutable references', () => {
  const state = createGame(41), cosmetics = parseCosmetics(null);
  cosmetics.members[state.members[0].id] = {...cosmetics.shared, heightScale: .93, outfitId: 'outfit-long-coat'};
  const backup = createBackup(state, cosmetics, when), raw = serializeBackup(backup), restored = parseBackup(raw);
  assert.deepEqual(restored, backup);
  assert.deepEqual(restored.campaign, state);
  assert.deepEqual(restored.cosmetics, cosmetics);
  assert.deepEqual(parseSave(JSON.stringify(restored.campaign)), state);
  backup.campaign.members[0].name = 'Otra persona'; backup.cosmetics.shared.heightScale = 1.1;
  assert.notEqual(state.members[0].name, 'Otra persona'); assert.equal(cosmetics.shared.heightScale, 1);
  assert.notEqual(restored.campaign.members[0].name, 'Otra persona');
  assert.equal(backupFilename(restored), 'director-de-murga-temporada-1-2026-10-15T12-34-56-000Z.json');
  const publicReport = JSON.stringify(getSeasonReport(restored.campaign));
  assert.doesNotMatch(publicReport, /"(?:voice|skill|charisma|projectedScore)"/);
});

test('backup metadata, future versions, campaign corruption and prototype keys are rejected', () => {
  const backup = sample(), raw = serializeBackup(backup);
  for (const broken of ['', 'broken', 'null', '[]', '{}']) assert.throws(() => parseBackup(broken), Error);
  for (const field of ['format', 'version', 'exportedAt', 'campaign', 'cosmetics']) {
    const value = JSON.parse(raw); delete value[field]; assert.throws(() => parseBackup(JSON.stringify(value)), Error);
  }
  for (const patch of [{version: 2}, {format: 'otro-juego'}, {exportedAt: '2026-02-30T00:00:00.000Z'}, {exportedAt: 'ayer'}, {exportedAt: null}])
    assert.throws(() => parseBackup(JSON.stringify({...backup, ...patch})), Error);
  for (const campaign of [{...backup.campaign, version: 100}, {...backup.campaign, money: -1}, {...backup.campaign, day: 99}])
    assert.throws(() => parseBackup(JSON.stringify({...backup, campaign})), /campaña/);
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const unsafe = raw.replace('"campaign":{', `"campaign":{"${key}":{},`);
    assert.throws(() => parseBackup(unsafe), /claves no permitidas/);
  }
  assert.throws(() => createBackup(backup.campaign, backup.cosmetics, new Date(NaN)), /fecha/);
});

test('invalid cosmetic structures are refused rather than silently replacing looks with defaults', () => {
  const backup = sample();
  for (const cosmetics of [null, {}, {...backup.cosmetics, version: 2}, {...backup.cosmetics, members: []},
    {...backup.cosmetics, shared: {...backup.cosmetics.shared, faceId: 'unknown'}},
    {...backup.cosmetics, shared: {...backup.cosmetics.shared, heightScale: 9}},
    {...backup.cosmetics, shared: {...backup.cosmetics.shared, heightScale: '1'}},
    {...backup.cosmetics, members: {'id con espacios': backup.cosmetics.shared}},
    {...backup.cosmetics, members: {valid: {}}}])
    assert.throws(() => parseBackup(JSON.stringify({...backup, cosmetics})), /vestuario/);
  const incomplete = {...backup.cosmetics.shared} as Record<string, unknown>; delete incomplete.hairColorId;
  assert.throws(() => parseBackup(JSON.stringify({...backup, cosmetics: {...backup.cosmetics, shared: incomplete}})), /vestuario/);
});

test('the upload limit is UTF-8 bytes, not JavaScript character count', () => {
  const unicode = '😀'.repeat(Math.floor(MAX_BACKUP_BYTES / 4) + 1);
  assert.ok(unicode.length < MAX_BACKUP_BYTES);
  assert.throws(() => parseBackup(unicode), /5 MiB/);
  assert.throws(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1)), /5 MiB/);
});

test('supported old campaign formats migrate through the existing save validator with no extra economy changes', () => {
  const backup = sample();
  // v8 adds only the v9 circuit baseline; restoring the same backup twice does not multiply it.
  const {circuit, ...v8} = backup.campaign;
  const imported = parseBackup(JSON.stringify({...backup, campaign: {...v8, version: 8}}));
  assert.equal(imported.campaign.version, 9);
  assert.deepEqual(imported.campaign, parseSave(JSON.stringify({...v8, version: 8})));
  assert.equal(imported.campaign.money, backup.campaign.money);
  assert.deepEqual(parseBackup(serializeBackup(imported)), imported);
  for (const version of [4, 5, 6, 7]) {
    const old = JSON.parse(JSON.stringify(backup.campaign)); old.version = version;
    delete old.circuit; delete old.pendingRenewals;
    if (version < 7) delete old.show;
    if (version < 6) { delete old.identity; delete old.history; delete old.career; }
    if (version < 5) {
      for (const key of ['contactsToday', 'fundraisersUsed', 'pendingDecision', 'resolvedDecisions', 'decisionHistory']) delete old[key];
      delete old.accounts.communityIncome; delete old.accounts.communityCosts;
      for (const member of [...old.members, ...old.candidates]) { delete member.morale; delete member.rapport; delete member.lastContactDay; }
    }
    const expected = parseSave(JSON.stringify(old)); assert.ok(expected, `valid legacy v${version}`);
    const migrated = parseBackup(JSON.stringify({...backup, campaign: old}));
    assert.deepEqual(migrated.campaign, expected); assert.equal(migrated.campaign.money, backup.campaign.money);
  }
  // Legacy v3 remains governed by the same established migration, rather than a second importer.
  let setup = createGame(41);
  for (const role of CREATIVE_ROLES) setup = hireCreative(setup, CREATIVE_CANDIDATES.find(candidate => candidate.role === role && candidate.level === 'Barrial')!.id);
  const old = JSON.parse(JSON.stringify(setup)); old.version = 3; old.money = 2300;
  old.candidates = MEMBER_ROLES.map(role => old.candidates.find((candidate: {role: string}) => candidate.role === role));
  for (const member of [...old.members, ...old.candidates]) {
    member.cost = 100;
    for (const key of ['fame', 'experience', 'seasons', 'age', 'loyalty', 'minReputation', 'scouting', 'participation']) delete member[key];
  }
  for (const key of ['reputation', 'creativeFees', 'costumeProposalId', 'accounts']) delete old[key];
  const expected = parseSave(JSON.stringify(old));
  assert.ok(expected, 'valid legacy v3');
  assert.deepEqual(parseBackup(JSON.stringify({...backup, campaign: old})).campaign, expected);
});
