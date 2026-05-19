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

test('Bootstrap routing layers agree on summary-first phase handoffs', () => {
  assert(prompt.includes('summary-first'), 'Prompt should require summary-first phase handoffs');
  assert(prompt.includes('bootstrap-phase-state.schema.json'), 'Prompt should reference the bootstrap phase state schema');
  assert(conductor.includes('summary-first'), 'Conductor should require summary-first phase handoffs');
  assert(bootstrapSkill.includes('summary-first'), 'Bootstrap skill should define summary-first phase handoffs');
  assert(bootstrapSkill.includes('bootstrap-phase-state.schema.json'), 'Bootstrap skill should reference the bootstrap phase state schema');
});

test('Bootstrap scan starts from deterministic repo index when available', () => {
  const scanPhase = read('.github/skills/bootstrap-phase-scan/SKILL.md');
  assert(fs.existsSync(path.join(ROOT, '.github', 'scripts', 'repo-index.js')), 'repo-index script should exist in the portable bundle');
  assert(prompt.includes('deterministic repo index'), 'Prompt should include deterministic repo index in expected outputs');
  assert(bootstrapSkill.includes('node .github/scripts/repo-index.js'), 'Bootstrap skill should run repo-index before broad scan');
  assert(bootstrapSkill.includes('docs/ai/00-repo-index.md'), 'Bootstrap skill should name repo index markdown output');
  assert(scanPhase.includes('node .github/scripts/repo-index.js'), 'Phase scan skill should run repo-index first');
});

test('Generated repo memory supports Copilot and future Codex usage', () => {
  const promptContext = read('.github/docs/prompt-and-context.md');
  assert(promptContext.includes('Codex'), 'Prompt/context guide should name Codex compatibility');
  assert(promptContext.includes('docs/ai/00-repo-index.md'), 'Prompt/context guide should route agents to repo index');
  assert(runtimeOverview.includes('Codex'), 'Runtime overview should describe tool-neutral Codex-compatible artifacts');
  assert(bootstrapSkill.includes('root `AGENTS.md`'), 'Bootstrap skill should support root AGENTS.md for non-Copilot agents');
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

test('Bootstrap contract requires manifest fidelity validation before completion', () => {
  const validateBootstrapOutput = read('.github/skills/validate-bootstrap-output/SKILL.md');
  assert(bootstrapSkill.includes('validate-manifest-fidelity.js'), 'Bootstrap skill should require validate-manifest-fidelity.js');
  assert(validateBootstrapOutput.includes('validate-manifest-fidelity.js'), 'validate-bootstrap-output should run validate-manifest-fidelity.js');
  assert(fs.existsSync(path.join(ROOT, '.github', 'scripts', 'validate-manifest-fidelity.js')), 'manifest fidelity validator script should exist');
});

test('Optional workflow artifacts stay optional', () => {
  assert(prompt.includes('Do not assume they exist'), 'Prompt should explicitly state that external delivery artifacts are optional');
  assert(runtimeOverview.includes('optional context'), 'Runtime overview should describe delivery artifacts as optional context');
  assert(userPlaybook.includes('Do not assume they exist'), 'User playbook should explicitly state that external delivery artifacts are optional');
});

test('Post-edit test helper stays opt-in instead of auto-registered', () => {
  assert(!fs.existsSync(path.join(ROOT, '.github', 'hooks', 'post-edit-run-tests.json')), 'Default bundle should not auto-register post-edit-run-tests hook');
  assert(fs.existsSync(path.join(ROOT, '.github', 'scripts', 'post-edit-run-tests.js')), 'Default bundle should retain post-edit-run-tests helper script');
});

test('Bundle docs distinguish full output from .github-only review captures', () => {
  const bundleReadme = read('.github/README.md');
  assert(bundleReadme.includes('partial artifact'), 'Bundle README should describe partial review artifacts');
  assert(runtimeOverview.includes('partial artifact'), 'Runtime overview should distinguish partial captures from full output');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
