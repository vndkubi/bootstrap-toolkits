#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const NODE = process.execPath;

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

function runJson(scriptRelativePath, args) {
  const stdout = execFileSync(NODE, [path.join(ROOT, scriptRelativePath), ...args], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  return JSON.parse(stdout);
}

console.log('=== Skill Authoring Tests ===\n');

test('author-skill draft returns ready package for a valid brief', () => {
  const result = runJson('.github/skills/author-skill/scripts/draft-skill.js', [
    path.join(ROOT, 'tests', 'skills', 'author-skill', 'input.json')
  ]);
  assert(result.status === 'ready', `unexpected status: ${result.status}`);
  assert(result.files['.github/skills/finance-briefing-skill/SKILL.md'], 'expected draft SKILL.md');
  assert(result.files['tests/skills/finance-briefing-skill/eval.json'], 'expected eval scaffold');
});

test('author-skill asks for missing required fields instead of guessing', () => {
  const tempPath = path.join(os.tmpdir(), `author-skill-missing-${Date.now()}.json`);
  fs.writeFileSync(tempPath, JSON.stringify({ displayName: 'Broken Skill' }, null, 2));
  const result = runJson('.github/skills/author-skill/scripts/draft-skill.js', [tempPath]);
  assert(result.status === 'needs_input', `unexpected status: ${result.status}`);
  assert(result.missing.includes('description'), 'expected missing description');
  assert(result.missing.includes('goal'), 'expected missing goal');
});

test('evaluate-skill passes for author-skill fixture', () => {
  const result = runJson('.github/skills/evaluate-skill/scripts/evaluate-skill.js', ['author-skill']);
  assert(result.failed === 0, `expected 0 failures, got ${result.failed}`);
  assert(result.score === 1, `expected score 1, got ${result.score}`);
});

test('skill-pack-export emits lineage metadata and hashes', () => {
  const result = runJson('.github/skills/skill-pack-export/scripts/export-pack.js', [
    path.join(ROOT, 'tests', 'skills', 'skill-pack-export', 'input.json')
  ]);
  assert(result.packId === 'bootstrap-authoring-pack', 'unexpected pack id');
  assert(Array.isArray(result.skills) && result.skills.length === 2, 'expected 2 exported skills');
  assert(result.skills.every((skill) => typeof skill.manifestHash === 'string' && skill.manifestHash.length === 64), 'expected manifest hashes');
  assert(result.lineage && result.lineage.toolkitVersion, 'expected lineage metadata');
});

test('upgrade-skill-pack diff reports changed skills', () => {
  const oldPackPath = path.join(os.tmpdir(), `pack-old-${Date.now()}.json`);
  const newPackPath = path.join(os.tmpdir(), `pack-new-${Date.now()}.json`);
  fs.writeFileSync(oldPackPath, JSON.stringify({
    packId: 'demo-pack',
    skills: [
      { name: 'author-skill', version: '0.6.0', manifestHash: 'a'.repeat(64) }
    ]
  }, null, 2));
  fs.writeFileSync(newPackPath, JSON.stringify({
    packId: 'demo-pack',
    skills: [
      { name: 'author-skill', version: '0.6.1', manifestHash: 'b'.repeat(64) },
      { name: 'evaluate-skill', version: '0.6.0', manifestHash: 'c'.repeat(64) }
    ]
  }, null, 2));
  const result = runJson('.github/skills/upgrade-skill-pack/scripts/diff-pack.js', [oldPackPath, newPackPath]);
  assert(result.added.includes('evaluate-skill'), 'expected added skill');
  assert(result.changed.some((entry) => entry.name === 'author-skill'), 'expected changed author-skill');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);