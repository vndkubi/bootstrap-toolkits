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

console.log('=== Goal TDD Engineer Loop Tests ===\n');

const skill = read('.github/skills/goal-tdd-engineer-loop/SKILL.md');
const prompt = read('.github/prompts/goal-tdd-engineer-loop.prompt.md');
const doc = read('.github/docs/goal-tdd-engineer-loop.md');
const orchestrator = read('.github/agents/dev-orchestrator.agent.md');
const lane = read('.github/docs/implementation-lane.md');

test('Goal TDD skill composes the existing TDD loop from an active goal', () => {
  assert(skill.includes('/goal'), 'skill should explicitly support active /goal input');
  assert(skill.includes('tdd-implement-loop'), 'skill should invoke the existing TDD implementation loop');
  assert(skill.includes('acceptance criteria'), 'skill should derive acceptance criteria before implementation');
  assert(skill.includes('Do not edit production code before RED evidence exists'), 'skill should require red evidence before production edits');
});

test('Goal TDD skill captures trace, feedback, evals, and Codex handoff artifacts', () => {
  for (const required of [
    'goal-trace.jsonl',
    'goal-feedback.md',
    'goal-eval-plan.md',
    'codex_handoff.md',
    'traces -> feedback -> evals -> ranked harness changes -> Codex handoff'
  ]) {
    assert(skill.includes(required), `skill should mention ${required}`);
  }
});

test('Goal TDD skill has token-saving and stop-rule contracts', () => {
  assert(skill.includes('Build `context-packet.md` before broad reading'), 'skill should require context packet first');
  assert(skill.includes('no more than 8 search/read commands and 2 full-file reads'), 'skill should bound discovery before edits');
  assert(skill.includes('context-cap-exceeded'), 'skill should stop on context budget overflow');
  assert(skill.includes('red-evidence-missing'), 'skill should stop when red evidence is missing');
  assert(skill.includes('tdd-test-skipped'), 'skill should stop on skipped tests');
});

test('Goal TDD skill enforces trunk base, small commits, and coverage evidence', () => {
  assert(skill.includes('## Trunk And Commit Discipline'), 'skill should define trunk and commit discipline');
  assert(skill.includes('Start from the repo trunk branch'), 'skill should require trunk base before task branch');
  assert(skill.includes('one reviewable commit'), 'skill should keep task slices commit-sized');
  assert(skill.includes('Record coverage evidence in `test-coverage.md`'), 'skill should require coverage evidence');
  assert(prompt.includes('intended small commit boundary'), 'prompt should ask for the small commit boundary');
  assert(doc.includes('Trunk branch, task branch, and intended small commit boundary'), 'doc should document branch and commit evidence');
  assert(lane.includes('Start implementation work from trunk'), 'implementation lane should enforce trunk-based implementation');
});

test('Prompt routes to the goal TDD skill and preserves loop order', () => {
  assert(prompt.includes('Invoke the `goal-tdd-engineer-loop` skill'), 'prompt should invoke the skill');
  assert(prompt.includes('Build the smallest useful `context-packet.md`'), 'prompt should require bounded context');
  assert(prompt.includes('Use `tdd-implement-loop` for production-code edits only'), 'prompt should preserve TDD invariant');
  assert(prompt.includes('write `codex_handoff.md`'), 'prompt should end with handoff');
});

test('Docs and orchestrator expose the goal loop as a route', () => {
  assert(doc.includes('Goal TDD Engineer Loop'), 'doc should exist and name the loop');
  assert(doc.includes('Cap the first context packet at 40 KB'), 'doc should document context budget');
  assert(orchestrator.includes('goal-tdd-engineer-loop'), 'orchestrator should route goal TDD requests');
  assert(lane.includes('/goal-tdd-engineer-loop'), 'implementation lane should mention the prompt');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
