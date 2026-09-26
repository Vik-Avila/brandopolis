import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixtureRepair } from '../scripts/demo-encoding.mjs';

const { modules } = JSON.parse(readFileSync('config/strategic-method/modules.v1.json', 'utf8'));
test('repair recognizes only the exact known corruption of the canonical module question', () => {
  for (const module of modules) {
    const corrupted = Buffer.from(module.primaryQuestion, 'utf8').toString('latin1');
    assert.equal(fixtureRepair(module.primaryDecision, corrupted, modules), module.primaryQuestion);
    assert.equal(fixtureRepair(module.primaryDecision, module.primaryQuestion, modules), null);
    assert.equal(fixtureRepair(module.primaryDecision, corrupted + ' user edit', modules), null);
  }
  assert.equal(fixtureRepair('Unknown module', 'Anything', modules), null);
  assert.equal(fixtureRepair('Primary Customer', 'Custom human question', modules), null);
});
