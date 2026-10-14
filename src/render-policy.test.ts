import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_VISUAL_SETTINGS, FrameBudget, getRenderProfile, parseVisualSettings, type GraphicsQuality } from './render-policy';

test('visual preferences preserve valid independent fields and never trust coercion or extra saved fields', () => {
  for (const raw of [null, '', 'broken', 'null', 'true', '17', '[]', '"high"'])
    assert.deepEqual(parseVisualSettings(raw), DEFAULT_VISUAL_SETTINGS);
  assert.deepEqual(parseVisualSettings('{"quality":"economy","reducedMotion":true,"fps":1000}'), { quality: 'economy', reducedMotion: true });
  assert.deepEqual(parseVisualSettings('{"quality":"ultra","reducedMotion":true}'), { quality: 'balanced', reducedMotion: true });
  assert.deepEqual(parseVisualSettings('{"quality":"high","reducedMotion":"false"}'), { quality: 'high', reducedMotion: false });
  assert.deepEqual(parseVisualSettings('{"quality":"__proto__","reducedMotion":1}'), DEFAULT_VISUAL_SETTINGS);
  const settings = parseVisualSettings(null); settings.quality = 'economy';
  assert.equal(DEFAULT_VISUAL_SETTINGS.quality, 'balanced');
  assert.equal(parseVisualSettings(null).quality, 'balanced');
});

test('render profiles cap density and specify actual scheduling limits without inventing measured FPS', () => {
  assert.deepEqual(getRenderProfile('economy', 3), { fps: 20, pixelRatio: 1, shadows: false });
  assert.deepEqual(getRenderProfile('balanced', 3), { fps: 30, pixelRatio: 1.25, shadows: true });
  assert.deepEqual(getRenderProfile('high', 3), { fps: 60, pixelRatio: 1.5, shadows: true });
  for (const quality of ['economy', 'balanced', 'high'] as const) {
    assert.equal(getRenderProfile(quality, .75).pixelRatio, .75);
    for (const invalid of [NaN, Infinity, -1, 0]) assert.equal(getRenderProfile(quality, invalid).pixelRatio, 1);
  }
  assert.deepEqual(getRenderProfile('invalid' as GraphicsQuality, 2), getRenderProfile('balanced', 2));
});

test('frame budgeting remains close to the chosen cadence on high-refresh displays and never renders twice at one timestamp', () => {
  for (const fps of [20, 30, 60]) {
    const budget = new FrameBudget(); let rendered = 0;
    for (let tick = 0; tick < 1440; tick++) {
      const time = tick * 1000 / 144;
      if (budget.shouldRender(time, fps)) rendered++;
      assert.equal(budget.shouldRender(time, fps), false);
    }
    assert.ok(Math.abs(rendered - fps * 10) <= 1, `${fps}: ${rendered} actual draws over10 seconds`);
  }
});

test('frame budgeting resets immediately after pause, handles clock changes and drops missed frames without a catch-up burst', () => {
  const budget = new FrameBudget();
  assert.equal(budget.shouldRender(0, 20), true);
  assert.equal(budget.shouldRender(49, 20), false);
  assert.equal(budget.shouldRender(50, 20), true);
  assert.equal(budget.shouldRender(10000, 20), true);
  assert.equal(budget.shouldRender(10000, 20), false);
  assert.equal(budget.shouldRender(10001, 20), false);
  budget.reset(); assert.equal(budget.shouldRender(10002, 20), true);
  assert.equal(budget.shouldRender(10003, 60), true);
  assert.equal(budget.shouldRender(4, 60), true);
  assert.equal(budget.shouldRender(4, 60), false);
  for (const [time, fps] of [[NaN, 30], [Infinity, 30], [-1, 30], [50, 0], [50, NaN]])
    assert.equal(budget.shouldRender(time, fps), false);
});
