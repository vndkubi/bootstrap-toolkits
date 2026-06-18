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

console.log('=== Review Development Learning Loop Tests ===\n');

const learningDoc = read('.github/docs/review-development-learning-loop.md');
const reviewSkill = read('.github/skills/review-code-changes/SKILL.md');
const reviewerAgent = read('.github/agents/code-reviewer.agent.md');
const reviewLane = read('.github/docs/review-lane.md');
const reviewPlaybook = read('.github/docs/review-playbook.md');
const promotionSkill = read('.github/skills/review-memory-promotion/SKILL.md');
const schema = JSON.parse(read('.github/schemas/review-report.schema.json'));

test('Closed loop doc defines review-to-development upgrade flow', () => {
  assert(
    learningDoc.includes('development -> evidence -> code review -> accepted finding -> development learning candidate -> approved upgrade -> next development run'),
    'learning doc should describe the full closed loop'
  );
  assert(
    learningDoc.includes('Do not auto-apply durable rule changes from review output alone'),
    'learning doc should keep upgrades approval-gated'
  );
  assert(
    learningDoc.includes('Promotion reports separate development-skill upgrades from review-checklist upgrades'),
    'learning doc should separate development upgrades from checklist upgrades'
  );
});

test('Review schema supports approval-gated developmentLearning candidates', () => {
  const field = schema.properties.developmentLearning;
  assert(field, 'review schema should define developmentLearning');
  const item = field.items;
  for (const required of [
    'id',
    'sourceFindingId',
    'category',
    'targetSurface',
    'proposedChange',
    'evidence',
    'approvalRequired',
    'status'
  ]) {
    assert(item.required.includes(required), `developmentLearning should require ${required}`);
  }
  assert(item.properties.category.enum.includes('test-strategy'), 'schema should support test-strategy learning');
  assert(item.properties.category.enum.includes('tdd-discipline'), 'schema should support tdd-discipline learning');
  assert(item.properties.approvalRequired.type === 'boolean', 'approvalRequired should be boolean');
});

test('Review skill emits learning only after calibrated findings', () => {
  assert(reviewSkill.includes('## Stage 5: Development Learning Loop'), 'review skill should have Stage 5 learning loop');
  assert(reviewSkill.includes('After finding calibration'), 'learning loop should run after finding calibration');
  assert(reviewSkill.includes('developmentLearning[]'), 'review skill should mention developmentLearning[]');
  for (const target of [
    '.github/skills/orchestrate-development/SKILL.md',
    '.github/skills/tdd-implement-loop/SKILL.md',
    '.github/skills/generate-unit-tests/SKILL.md'
  ]) {
    assert(reviewSkill.includes(target), `review skill should target ${target}`);
  }
});

test('Code reviewer agent keeps development upgrades approval-gated', () => {
  assert(reviewerAgent.includes('Development Learning Extraction'), 'reviewer should extract development learning');
  assert(reviewerAgent.includes('approvalRequired: true'), 'reviewer should require approval');
  assert(reviewerAgent.includes('never auto-edit development instructions'), 'reviewer should not auto-edit development rules');
});

test('Promotion flow separates development upgrades from checklist promotions', () => {
  assert(
    promotionSkill.includes('development upgrade candidate'),
    'promotion skill should classify development upgrade candidates'
  );
  assert(
    promotionSkill.includes('## Development Upgrade Candidates'),
    'promotion report should include a development upgrade section'
  );
  assert(
    promotionSkill.includes('Development upgrade candidates remain separate from review checklist candidates'),
    'promotion validation should enforce separation from checklist candidates'
  );
  assert(
    promotionSkill.includes('.github/docs/review-development-learning-loop.md'),
    'promotion skill should link the closed-loop doc'
  );
});

test('Review lane and playbook expose the closed loop route', () => {
  assert(reviewLane.includes('Closed Learning Loop'), 'review lane should document closed loop');
  assert(reviewLane.includes('developmentLearning[]'), 'review lane should mention developmentLearning[]');
  assert(reviewPlaybook.includes('review-development-learning-loop.md'), 'playbook should list learning-loop source');
  assert(
    reviewPlaybook.includes('Do not expand review checklists when the real fix is to improve development behavior before review'),
    'playbook should route process gaps to development surfaces'
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
