#!/usr/bin/env node
'use strict';

/**
 * T-06: Episode schema validation (Stage S1, spec 009).
 * Validates the 5 fixture episodes against .github/schemas/episode.schema.json
 * and a handful of negative cases.
 */

const fs = require('fs');
const path = require('path');
const { validateSchema } = require('./helpers/mini-json-schema');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = JSON.parse(fs.readFileSync(
  path.join(ROOT, '.github', 'schemas', 'episode.schema.json'), 'utf8'
));
const FIX_DIR = path.join(ROOT, 'specs', '009-episodic-memory-trace-replay', 'fixtures');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); passed++; }
  catch (e) { console.log(`  FAIL: ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIX_DIR, name), 'utf8'));
}

console.log('Episode schema validation:');

test('success fixture validates', () => {
  const res = validateSchema(SCHEMA, loadFixture('success.json'));
  assert(res.valid, `errors: ${res.errors.join('; ')}`);
});

test('failed fixture validates', () => {
  const res = validateSchema(SCHEMA, loadFixture('failed.json'));
  assert(res.valid, `errors: ${res.errors.join('; ')}`);
});

test('aborted fixture validates', () => {
  const res = validateSchema(SCHEMA, loadFixture('aborted.json'));
  assert(res.valid, `errors: ${res.errors.join('; ')}`);
});

test('with-regression fixture validates', () => {
  const res = validateSchema(SCHEMA, loadFixture('with-regression.json'));
  assert(res.valid, `errors: ${res.errors.join('; ')}`);
});

test('bad-tag fixture validates and carries !bad tag', () => {
  const fx = loadFixture('bad-tag.json');
  const res = validateSchema(SCHEMA, fx);
  assert(res.valid, `errors: ${res.errors.join('; ')}`);
  assert(fx.tags.includes('!bad'), '!bad tag required for US-3 AC-4 coverage');
});

test('rejects missing required field (outcome)', () => {
  const fx = loadFixture('success.json');
  delete fx.outcome;
  const res = validateSchema(SCHEMA, fx);
  assert(!res.valid, 'should reject missing outcome');
});

test('rejects invalid episode_id pattern', () => {
  const fx = loadFixture('success.json');
  fx.episode_id = 'BadID';
  const res = validateSchema(SCHEMA, fx);
  assert(!res.valid, 'should reject bad episode_id');
});

test('rejects outcome_score > 1', () => {
  const fx = loadFixture('success.json');
  fx.outcome_score = 1.5;
  const res = validateSchema(SCHEMA, fx);
  assert(!res.valid, 'should reject score > 1');
});

test('rejects additional property at root', () => {
  const fx = loadFixture('success.json');
  fx.unexpected_field = 'x';
  const res = validateSchema(SCHEMA, fx);
  assert(!res.valid, 'should reject additionalProperties');
});

test('rejects wrong schemaVersion const', () => {
  const fx = loadFixture('success.json');
  fx.schemaVersion = '2.0';
  const res = validateSchema(SCHEMA, fx);
  assert(!res.valid, 'should reject non-1.0 schemaVersion');
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
