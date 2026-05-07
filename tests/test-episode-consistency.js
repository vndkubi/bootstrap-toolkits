#!/usr/bin/env node
'use strict';

/**
 * Follow-up tests addressing code-review findings on Stage S1 of spec 009.
 *
 *   Finding #1 (MAJOR): fixture `outcome_score` must match I-1 applied to
 *   `score_components` (minus any regression decay).
 *
 *   Finding #2 (MINOR): runtime schema under .github/schemas/episode.schema.json
 *   must stay structurally identical to the contract copy under
 *   specs/009-episodic-memory-trace-replay/contracts/episode.schema.json,
 *   modulo $id and top-level description.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const {
  computeOutcomeScore,
  recalcAfterRegression
} = require(path.join(ROOT, '.github', 'skills', 'trace-replay', 'score.js'));

const FIX_DIR = path.join(ROOT, 'specs', '009-episodic-memory-trace-replay', 'fixtures');
const EPS = 1e-9;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); passed++; }
  catch (e) { console.log(`  FAIL: ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

console.log('Fixture ↔ score consistency:');

for (const name of ['success.json', 'failed.json', 'aborted.json', 'bad-tag.json']) {
  test(`${name}: outcome_score === I-1(score_components)`, () => {
    const fx = loadJson(path.join(FIX_DIR, name));
    const expected = computeOutcomeScore(fx.score_components);
    assert(Math.abs(fx.outcome_score - expected) < EPS,
      `got ${fx.outcome_score}, expected ${expected}`);
  });
}

test('with-regression.json: base score decayed once per regression_event', () => {
  const fx = loadJson(path.join(FIX_DIR, 'with-regression.json'));
  let s = computeOutcomeScore(fx.score_components);
  for (let i = 0; i < fx.regression_events.length; i++) {
    s = recalcAfterRegression(s, i);
  }
  assert(Math.abs(fx.outcome_score - s) < EPS,
    `got ${fx.outcome_score}, expected ${s}`);
});

console.log('\nSchema parity (runtime ↔ contract):');

function normalize(schema) {
  const copy = JSON.parse(JSON.stringify(schema));
  delete copy.$id;
  delete copy.description;
  return copy;
}

test('runtime schema is structurally identical to contract schema (modulo $id + description)', () => {
  const runtime = loadJson(path.join(ROOT, '.github', 'schemas', 'episode.schema.json'));
  const contract = loadJson(path.join(
    ROOT, 'specs', '009-episodic-memory-trace-replay', 'contracts', 'episode.schema.json'
  ));
  const a = JSON.stringify(normalize(runtime));
  const b = JSON.stringify(normalize(contract));
  if (a !== b) {
    // Provide a hint at the first diverging path if possible.
    assert(false, 'schemas diverge; run `diff` after stripping $id and top-level description');
  }
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
