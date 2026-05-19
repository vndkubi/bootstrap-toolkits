#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

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

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

console.log('=== Implementation Contract Tests ===\n');

const implementor = read('.github/agents/implementor.agent.md');
const orchestrator = read('.github/agents/dev-orchestrator.agent.md');
const implementFeatureSkill = read('.github/skills/implement-feature/SKILL.md');
const planImplementationSkill = read('.github/skills/plan-implementation/SKILL.md');
const implementFeaturePrompt = read('.github/prompts/implement-feature.prompt.md');
const planImplementationPrompt = read('.github/prompts/plan-implementation.prompt.md');

test('Implementation lane ships a concise entry doc', () => {
  assert(fs.existsSync(path.join(ROOT, '.github', 'docs', 'implementation-lane.md')), 'implementation lane doc should exist');
  const laneDoc = read('.github/docs/implementation-lane.md');
  assert(laneDoc.includes('Which Entry To Use'), 'implementation lane doc should include entry guidance');
  assert(laneDoc.includes('Direct Implementation Shape'), 'implementation lane doc should include direct implementation shape');
  assert(laneDoc.includes('Spec-Driven Implementation Shape'), 'implementation lane doc should include spec-driven implementation shape');
});

test('Implementation entrypoints reference the concise lane doc', () => {
  assert(implementor.includes('.github/docs/implementation-lane.md'), 'implementor should reference implementation lane doc');
  assert(orchestrator.includes('.github/docs/implementation-lane.md'), 'dev-orchestrator should reference implementation lane doc');
  assert(implementFeatureSkill.includes('.github/docs/implementation-lane.md'), 'implement-feature skill should reference implementation lane doc');
  assert(planImplementationSkill.includes('.github/docs/implementation-lane.md'), 'plan-implementation skill should reference implementation lane doc');
  assert(implementFeaturePrompt.includes('.github/docs/implementation-lane.md'), 'implement-feature prompt should reference implementation lane doc');
  assert(planImplementationPrompt.includes('.github/docs/implementation-lane.md'), 'plan-implementation prompt should reference implementation lane doc');
});

test('Direct implementation path still requires clear scope before coding', () => {
  assert(implementor.includes('scope is clearly local or single-module'), 'implementor should guard direct coding by scope');
  assert(implementFeaturePrompt.includes('wait for explicit user confirmation before implementation'), 'implement-feature prompt should require confirmation before coding');
  assert(implementFeatureSkill.includes('affected module boundary is known'), 'implement-feature skill should require known module boundary');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
