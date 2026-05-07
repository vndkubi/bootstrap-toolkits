#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  selectSkillsByTier,
  validateCatalog
} = require(path.join('..', '.github', 'scripts', 'sync-skill-metadata.js'));

const ROOT = path.resolve(__dirname, '..');
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, '.github', 'skills', 'INDEX.json'), 'utf8'));

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

console.log('=== Skill Selection Tests ===\n');

test('Tier selection returns only foundational skills for foundational tier', () => {
  const selected = selectSkillsByTier(CATALOG, 'foundational');
  assert(Object.keys(selected).length > 0, 'expected at least one foundational skill');
  for (const manifest of Object.values(selected)) {
    assert(manifest.tier === 'foundational', `unexpected tier in foundational selection: ${manifest.id} -> ${manifest.tier}`);
  }
});

test('Domain tier includes foundational and domain skills only', () => {
  const selected = selectSkillsByTier(CATALOG, 'domain');
  let sawDomain = false;
  for (const manifest of Object.values(selected)) {
    assert(manifest.tier === 'foundational' || manifest.tier === 'domain', `unexpected tier in domain selection: ${manifest.id} -> ${manifest.tier}`);
    if (manifest.tier === 'domain') {
      sawDomain = true;
    }
  }
  assert(sawDomain, 'expected at least one domain skill in domain selection');
});

test('Full catalog validation passes for generated catalog', () => {
  const issues = validateCatalog(CATALOG);
  assert(issues.length === 0, `unexpected validation issues: ${JSON.stringify(issues)}`);
});

test('Validation flags missing skill dependencies in selected subsets', () => {
  const syntheticCatalog = {
    skills: {
      alpha: {
        id: 'alpha',
        tier: 'foundational',
        requires: { skills: ['beta'], mcp: [], tools: [] },
        mcp_tools_used: []
      },
      beta: {
        id: 'beta',
        tier: 'domain',
        requires: { skills: [], mcp: [], tools: [] },
        mcp_tools_used: []
      }
    }
  };
  const selected = { alpha: syntheticCatalog.skills.alpha };
  const issues = validateCatalog(syntheticCatalog, selected);
  assert(issues.some((issue) => issue.type === 'selection_missing_skill_dependency' && issue.dependency === 'beta'), 'expected missing dependency issue for beta');
});

test('Validation flags MCP dependency gaps', () => {
  const syntheticCatalog = {
    skills: {
      gamma: {
        id: 'gamma',
        tier: 'foundational',
        requires: { skills: [], mcp: [], tools: [] },
        mcp_tools_used: ['audit_discoverability']
      }
    }
  };
  const issues = validateCatalog(syntheticCatalog);
  assert(issues.some((issue) => issue.type === 'mcp_dependency_gap' && issue.dependency === 'audit_discoverability'), 'expected MCP dependency gap');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);