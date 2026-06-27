#!/usr/bin/env node
'use strict';

const path = require('path');
const { audit } = require(path.join('..', 'scripts', 'audit-refs.js'));

// Skills that are intentionally not yet referenced by any routing surface.
// Each entry MUST carry a reason so the allowlist does not silently rot.
const ALLOWED_ORPHANS = {
  'trace-replay': 'Stage S1 only; feature-flagged off, Phase-1/Phase-7 call sites not wired yet (specs/009-episodic-memory-trace-replay).'
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('=== Orphan Skill Tests ===\n');

const result = audit();

test('No unexpected orphan skills (0 inbound routing references)', () => {
  const unexpected = result.orphans.filter((skill) => !(skill in ALLOWED_ORPHANS));
  assert(
    unexpected.length === 0,
    `Unreferenced skills found: ${unexpected.join(', ')}. ` +
      'Reference them from an agent, prompt, doc, or other skill, or add to ALLOWED_ORPHANS with a reason.'
  );
});

test('Allowlisted orphans are still actually orphans (prune stale entries)', () => {
  const stale = Object.keys(ALLOWED_ORPHANS).filter((skill) => !result.orphans.includes(skill));
  assert(
    stale.length === 0,
    `These skills are now referenced and should be removed from ALLOWED_ORPHANS: ${stale.join(', ')}`
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
