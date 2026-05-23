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

console.log('=== Review Contract Tests ===\n');

const reviewPrompt = read('.github/prompts/review-code.prompt.md');
const reviewSkill = read('.github/skills/review-code-changes/SKILL.md');
const codeReviewer = read('.github/agents/code-reviewer.agent.md');
const reviewPlaybook = read('.github/docs/review-playbook.md');
const reviewLane = read('.github/docs/review-lane.md');
const prManager = read('.github/agents/pr-manager.agent.md');
const autorun = read('.github/skills/autorun/SKILL.md');

test('Review prompt routes directly to Code Reviewer', () => {
  assert(reviewPrompt.includes('agent: Code Reviewer'), 'review-code prompt should target Code Reviewer');
  assert(reviewPrompt.includes('Route this request to `@code-reviewer`'), 'review-code prompt should route to @code-reviewer');
});

test('Full review lane requires structured review-report.json output', () => {
  assert(codeReviewer.includes('review-report.json'), 'code-reviewer should mention review-report.json contract');
  assert(reviewSkill.includes('review-report.json'), 'review-code-changes should mention review-report.json contract');
  assert(prManager.includes('review-report.json'), 'pr-manager should consume review-report.json');
  assert(autorun.includes('review-report.json'), 'autorun should mention review-report.json');
  assert(fs.existsSync(path.join(ROOT, '.github', 'schemas', 'review-report.schema.json')), 'review-report schema should exist');
});

test('Review lane supports needs-clarification as a first-class verdict', () => {
  assert(codeReviewer.includes('needs-clarification'), 'code-reviewer should mention needs-clarification verdict');
  assert(reviewSkill.includes('needs-clarification'), 'review-code-changes should mention needs-clarification verdict');
  assert(prManager.includes('needs-clarification'), 'pr-manager should handle needs-clarification verdict');
});

test('Review playbook and review lane ship reusable checklist packs', () => {
  assert(reviewPlaybook.includes('docs/reviews/checklists/functional-core.md'), 'playbook should mention functional core checklist');
  assert(reviewPlaybook.includes('docs/reviews/checklists/technical-core.md'), 'playbook should mention technical core checklist');
  assert(reviewPlaybook.includes('docs/reviews/checklists/java-finance-enterprise.md'), 'playbook should mention Java finance enterprise checklist');
  assert(reviewLane.includes('docs/reviews/checklists/java-finance-enterprise.md'), 'review lane should mention Java finance enterprise checklist');
  assert(fs.existsSync(path.join(ROOT, 'docs', 'reviews', 'checklists', 'functional-core.md')), 'functional core checklist should exist');
  assert(fs.existsSync(path.join(ROOT, 'docs', 'reviews', 'checklists', 'technical-core.md')), 'technical core checklist should exist');
  assert(fs.existsSync(path.join(ROOT, 'docs', 'reviews', 'checklists', 'mobile-core.md')), 'mobile core checklist should exist');
  assert(fs.existsSync(path.join(ROOT, 'docs', 'reviews', 'checklists', 'java-finance-enterprise.md')), 'Java finance enterprise checklist should exist');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
