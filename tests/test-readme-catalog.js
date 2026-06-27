#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { applyBlocks } = require(path.join('..', 'scripts', 'sync-readme-catalog.js'));

const ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT, 'README.md');
const SKILLS_DIR = path.join(ROOT, '.github', 'skills');
const AGENTS_DIR = path.join(ROOT, '.github', 'agents');

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

console.log('=== README Catalog Tests ===\n');

const readme = fs.readFileSync(README_PATH, 'utf8');

test('README has all catalog markers', () => {
  for (const key of ['agents', 'skills', 'instructions', 'prompts']) {
    assert(readme.includes(`<!-- BEGIN:${key} -->`), `missing <!-- BEGIN:${key} -->`);
    assert(readme.includes(`<!-- END:${key} -->`), `missing <!-- END:${key} -->`);
  }
});

test('README catalog is synchronized with .github sources', () => {
  const { output, missing } = applyBlocks(readme);
  assert(missing.length === 0, `unrenderable markers: ${missing.join(', ')}`);
  assert(
    output === readme,
    'README catalog is stale. Run: node scripts/sync-readme-catalog.js'
  );
});

test('Every physical skill appears in the README skills block', () => {
  const skillBlock = readme.slice(
    readme.indexOf('<!-- BEGIN:skills -->'),
    readme.indexOf('<!-- END:skills -->')
  );
  const skillNames = fs.readdirSync(SKILLS_DIR)
    .filter((entry) => fs.existsSync(path.join(SKILLS_DIR, entry, 'SKILL.md')));
  for (const name of skillNames) {
    assert(skillBlock.includes(`\`${name}\``), `skill not documented in README: ${name}`);
  }
});

test('Every agent appears in the README agents block', () => {
  const agentBlock = readme.slice(
    readme.indexOf('<!-- BEGIN:agents -->'),
    readme.indexOf('<!-- END:agents -->')
  );
  const agentNames = fs.readdirSync(AGENTS_DIR)
    .filter((entry) => entry.endsWith('.agent.md'))
    .map((entry) => entry.replace(/\.agent\.md$/, ''));
  for (const name of agentNames) {
    assert(agentBlock.includes(`\`@${name}\``), `agent not documented in README: ${name}`);
  }
});

test('No catalog row has an empty description cell', () => {
  for (const key of ['agents', 'skills', 'instructions', 'prompts']) {
    const block = readme.slice(
      readme.indexOf(`<!-- BEGIN:${key} -->`),
      readme.indexOf(`<!-- END:${key} -->`)
    );
    const rows = block.split('\n').filter((line) => /^\| `[@/]?[a-z]/.test(line));
    for (const row of rows) {
      const cells = row.split('|').map((cell) => cell.trim());
      // cells[0] is '' (leading pipe); last meaningful cell is the description.
      const description = cells[cells.length - 2];
      assert(description && description.length > 0, `empty description in ${key} block: ${row}`);
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
