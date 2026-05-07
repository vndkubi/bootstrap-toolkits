#!/usr/bin/env node
'use strict';

/**
 * T-08: Outcome score invariants (Stage S1, spec 009).
 * Verifies formula I-1 and regression decay I-2.
 */

const path = require('path');
const {
  computeOutcomeScore,
  recalcAfterRegression,
  WEIGHTS,
  REGRESSION_DECAY
} = require(path.resolve(__dirname, '..', '.github', 'skills', 'trace-replay', 'score.js'));

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); passed++; }
  catch (e) { console.log(`  FAIL: ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function approx(a, b, eps = 1e-9) { return Math.abs(a - b) < eps; }

console.log('Outcome score:');

test('all-zero components → 0', () => {
  assert(computeOutcomeScore({ tests: 0, review: 0, contract: 0, rounds: 0 }) === 0);
});

test('all-one components → 1 (within float epsilon)', () => {
  const s = computeOutcomeScore({ tests: 1, review: 1, contract: 1, rounds: 1 });
  assert(approx(s, 1.0), `got ${s}`);
});

test('clamps low components to 0', () => {
  const s = computeOutcomeScore({ tests: -0.5, review: -1, contract: 0, rounds: 0 });
  assert(s === 0, `got ${s}`);
});

test('clamps high components to 1 (within float epsilon)', () => {
  const s = computeOutcomeScore({ tests: 2, review: 2, contract: 2, rounds: 2 });
  assert(approx(s, 1.0), `got ${s}`);
});

test('tests-only (=1) yields exactly WEIGHTS.tests', () => {
  const s = computeOutcomeScore({ tests: 1, review: 0, contract: 0, rounds: 0 });
  assert(approx(s, WEIGHTS.tests), `got ${s}, expected ${WEIGHTS.tests}`);
});

test('review-only (=1) yields exactly WEIGHTS.review', () => {
  const s = computeOutcomeScore({ tests: 0, review: 1, contract: 0, rounds: 0 });
  assert(approx(s, WEIGHTS.review), `got ${s}`);
});

test('weights sum to 1.0 (formula frozen)', () => {
  const sum = WEIGHTS.tests + WEIGHTS.review + WEIGHTS.contract + WEIGHTS.rounds;
  assert(approx(sum, 1.0), `weights sum = ${sum}`);
});

test('realistic example matches formula', () => {
  const s = computeOutcomeScore({ tests: 0.8, review: 1.0, contract: 0.5, rounds: 0.6 });
  const expected = 0.4 * 0.8 + 0.3 * 1.0 + 0.2 * 0.5 + 0.1 * 0.6;
  assert(approx(s, expected), `got ${s}, expected ${expected}`);
});

test('regression decay subtracts 0.15', () => {
  const s = recalcAfterRegression(0.80, 1);
  assert(approx(s, 0.65), `got ${s}`);
  assert(REGRESSION_DECAY === 0.15, 'decay constant drifted');
});

test('regression decay floors at 0 (never negative)', () => {
  const s = recalcAfterRegression(0.10, 3);
  assert(s === 0, `got ${s}`);
});

test('regression decay ceilings at 1 via clamp on input', () => {
  const s = recalcAfterRegression(1.5, 0);
  assert(approx(s, 1 - 0.15), `got ${s}`);
});

test('rejects non-numeric component', () => {
  let threw = false;
  try { computeOutcomeScore({ tests: 'oops', review: 0, contract: 0, rounds: 0 }); }
  catch (_) { threw = true; }
  assert(threw, 'should throw on non-numeric');
});

test('rejects missing components object', () => {
  let threw = false;
  try { computeOutcomeScore(null); } catch (_) { threw = true; }
  assert(threw);
});

test('rejects negative priorEvents', () => {
  let threw = false;
  try { recalcAfterRegression(0.5, -1); } catch (_) { threw = true; }
  assert(threw);
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
