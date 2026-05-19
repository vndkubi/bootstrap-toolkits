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

test('Bootstrap phase state schema exists and declares summary-first handoff keys', () => {
  const schemaPath = path.join(ROOT, '.github', 'schemas', 'bootstrap-phase-state.schema.json');
  assert(fs.existsSync(schemaPath), 'missing bootstrap-phase-state schema');

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const required = schema.required || [];
  assert(required.includes('summary'), 'schema should require summary');
  assert(required.includes('detailsPath'), 'schema should require detailsPath');
  assert(required.includes('nextPhaseInputs'), 'schema should require nextPhaseInputs');
  assert(required.includes('evidencePaths'), 'schema should require evidencePaths');
});

test('generate-copilot-config references the phase-skill layer', () => {
  const content = fs.readFileSync(path.join(ROOT, '.github', 'skills', 'generate-copilot-config', 'SKILL.md'), 'utf8');
  assert(content.includes('bootstrap-phase-scan'), 'missing bootstrap-phase-scan reference');
  assert(content.includes('bootstrap-phase-cleanup-summary'), 'missing bootstrap-phase-cleanup-summary reference');
  assert(content.includes('summary-first'), 'missing summary-first phase handoff guidance');
  assert(content.includes('bootstrap-phase-state.schema.json'), 'missing bootstrap phase state schema reference');
});

test('Phase 1 scan skill preserves deterministic repo index guardrail', () => {
  const scanPath = path.join(ROOT, '.github', 'skills', 'bootstrap-phase-scan', 'SKILL.md');
  const content = fs.readFileSync(scanPath, 'utf8');
  assert(content.includes('node .github/scripts/repo-index.js'), 'scan phase should run repo-index first');
  assert(content.includes('docs/ai/00-repo-index.md'), 'scan phase should reference repo-index markdown');
  assert(content.includes('Do not inspect the whole repository'), 'scan phase should include large-repo guardrail');
});

test('Each scaffolded phase skill references the shared summary-first handoff contract', () => {
  for (const phase of PHASES) {
    const skillPath = path.join(ROOT, '.github', 'skills', phase.id, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf8');
    assert(content.includes('.github/.bootstrap-state.json'), `${phase.id} should reference bootstrap state`);
    assert(content.includes('summary-first'), `${phase.id} should declare summary-first handoff`);
    assert(content.includes('nextPhaseInputs'), `${phase.id} should mention nextPhaseInputs`);
    assert(content.includes('bootstrap-phase-state.schema.json'), `${phase.id} should reference the shared phase schema`);
  }
});

test('Phase-skill eval fixtures exist for representative phases', () => {
  assert(fs.existsSync(path.join(ROOT, 'tests', 'skills', 'bootstrap-phase-scan', 'eval.json')), 'missing scan eval');
  assert(fs.existsSync(path.join(ROOT, 'tests', 'skills', 'bootstrap-phase-validate', 'eval.json')), 'missing validate eval');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
