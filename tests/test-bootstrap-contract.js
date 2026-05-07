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

function includesAll(content, snippets) {
  return snippets.every((snippet) => content.includes(snippet));
}

console.log('=== Bootstrap Contract Tests ===\n');

const prompt = read('.github/prompts/bootstrap-copilot.prompt.md');
const conductor = read('.github/agents/conductor.agent.md');
const runtimeOverview = read('.github/docs/runtime-overview.md');
const userPlaybook = read('.github/docs/user-playbook.md');
const bootstrapSkill = read('.github/skills/generate-copilot-config/SKILL.md');
const postEditHook = JSON.parse(read('.github/hooks/post-edit-run-tests.json'));

test('Prompt declares the canonical bootstrap handoff', () => {
  assert(
    includesAll(prompt, ['/bootstrap-copilot', '@conductor', 'generate-copilot-config']),
    'Prompt should include the canonical /bootstrap-copilot -> @conductor -> generate-copilot-config chain'
  );
});

test('Conductor declares the same canonical bootstrap handoff', () => {
  assert(
    includesAll(conductor, ['/bootstrap-copilot', '@conductor', 'generate-copilot-config']),
    'Conductor should include the canonical bootstrap handoff'
  );
});

test('Runtime docs keep bootstrap summary in the output contract', () => {
  assert(prompt.includes('.github/.bootstrap-summary.md'), 'Prompt should require .github/.bootstrap-summary.md in expected outputs');
  assert(conductor.includes('.github/.bootstrap-summary.md'), 'Conductor should expect .github/.bootstrap-summary.md in successful bootstrap output');
  assert(runtimeOverview.includes('.github/.bootstrap-summary.md'), 'Runtime overview should describe .github/.bootstrap-summary.md as part of bootstrap output');
});

test('Bootstrap skill and operator guidance both recognize the summary artifact', () => {
  assert(bootstrapSkill.includes('.github/.bootstrap-summary.md'), 'Bootstrap skill should mention .github/.bootstrap-summary.md');
  assert(userPlaybook.includes('.github/.bootstrap-summary.md'), 'User playbook should mention .github/.bootstrap-summary.md');
});

test('Optional workflow artifacts stay optional', () => {
  assert(prompt.includes('Do not assume they exist'), 'Prompt should explicitly state that external delivery artifacts are optional');
  assert(runtimeOverview.includes('optional context'), 'Runtime overview should describe delivery artifacts as optional context');
  assert(userPlaybook.includes('Do not assume they exist'), 'User playbook should explicitly state that external delivery artifacts are optional');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);