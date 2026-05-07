#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { PHASES } = require(path.join('..', '.github', 'scripts', 'scaffold-bootstrap-phase-skills.js'));

const ROOT = path.resolve(__dirname, '..');

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

console.log('=== Bootstrap Phase Skill Tests ===\n');

test('All scaffolded bootstrap phase skills exist', () => {
  for (const phase of PHASES) {
    const skillPath = path.join(ROOT, '.github', 'skills', phase.id, 'SKILL.md');
    assert(fs.existsSync(skillPath), `missing ${phase.id}/SKILL.md`);
  }
});

test('generate-copilot-config references the phase-skill layer', () => {
  const content = fs.readFileSync(path.join(ROOT, '.github', 'skills', 'generate-copilot-config', 'SKILL.md'), 'utf8');
  assert(content.includes('bootstrap-phase-scan'), 'missing bootstrap-phase-scan reference');
  assert(content.includes('bootstrap-phase-cleanup-summary'), 'missing bootstrap-phase-cleanup-summary reference');
});

test('Phase-skill eval fixtures exist for representative phases', () => {
  assert(fs.existsSync(path.join(ROOT, 'tests', 'skills', 'bootstrap-phase-scan', 'eval.json')), 'missing scan eval');
  assert(fs.existsSync(path.join(ROOT, 'tests', 'skills', 'bootstrap-phase-validate', 'eval.json')), 'missing validate eval');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);