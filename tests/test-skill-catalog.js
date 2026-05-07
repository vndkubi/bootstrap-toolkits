#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { validateSchema } = require('./helpers/mini-json-schema');
const { buildCatalog } = require(path.join('..', '.github', 'scripts', 'sync-skill-metadata.js'));

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, '.github', 'schemas', 'skill-manifest.schema.json'), 'utf8'));
const CATALOG_PATH = path.join(ROOT, '.github', 'skills', 'INDEX.json');
const RUNTIME_INDEX_PATH = path.join(ROOT, '.github', '.skill-index.json');

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeGeneratedAt(value) {
  const clone = JSON.parse(JSON.stringify(value));
  if (clone.generatedAt) {
    clone.generatedAt = '<generatedAt>';
  }
  if (clone.catalog && clone.catalog.generatedAt) {
    clone.catalog.generatedAt = '<generatedAt>';
  }
  if (clone.runtimeIndex && clone.runtimeIndex.generatedAt) {
    clone.runtimeIndex.generatedAt = '<generatedAt>';
  }
  return clone;
}

console.log('=== Skill Catalog Tests ===\n');

test('Generated catalog file exists', () => {
  assert(fs.existsSync(CATALOG_PATH), '.github/skills/INDEX.json not found');
});

test('Generated runtime skill index exists', () => {
  assert(fs.existsSync(RUNTIME_INDEX_PATH), '.github/.skill-index.json not found');
});

test('Catalog matches generated metadata output', () => {
  const actualCatalog = readJson(CATALOG_PATH);
  const generated = buildCatalog(actualCatalog.generatedAt);
  assert(
    JSON.stringify(normalizeGeneratedAt(actualCatalog)) === JSON.stringify(normalizeGeneratedAt(generated.catalog)),
    'INDEX.json is not synchronized with sync-skill-metadata.js output'
  );
});

test('Runtime skill index matches generated metadata output', () => {
  const actualRuntimeIndex = readJson(RUNTIME_INDEX_PATH);
  const generated = buildCatalog(actualRuntimeIndex.generatedAt);
  assert(
    JSON.stringify(normalizeGeneratedAt(actualRuntimeIndex)) === JSON.stringify(normalizeGeneratedAt(generated.runtimeIndex)),
    '.skill-index.json is not synchronized with sync-skill-metadata.js output'
  );
});

test('Every skill has manifest and standard layout placeholders', () => {
  const catalog = readJson(CATALOG_PATH);
  for (const skillName of Object.keys(catalog.skills)) {
    const skillDir = path.join(ROOT, '.github', 'skills', skillName);
    const manifestPath = path.join(skillDir, 'skill.json');
    const scriptsMarker = path.join(skillDir, 'scripts', '.gitkeep');
    const assetsMarker = path.join(skillDir, 'assets', '.gitkeep');
    const referencesMarker = path.join(skillDir, 'references', '.gitkeep');
    assert(fs.existsSync(manifestPath), `missing manifest for ${skillName}`);
    assert(fs.existsSync(scriptsMarker), `missing scripts/.gitkeep for ${skillName}`);
    assert(fs.existsSync(assetsMarker), `missing assets/.gitkeep for ${skillName}`);
    assert(fs.existsSync(referencesMarker), `missing references/.gitkeep for ${skillName}`);
  }
});

test('Every skill manifest validates against the manifest schema', () => {
  const catalog = readJson(CATALOG_PATH);
  for (const skillName of Object.keys(catalog.skills)) {
    const manifest = readJson(path.join(ROOT, '.github', 'skills', skillName, 'skill.json'));
    const result = validateSchema(SCHEMA, manifest);
    assert(result.valid, `${skillName} manifest invalid: ${result.errors.join('; ')}`);
  }
});

test('Runtime index carries invocation mode, tier, and stability for every skill', () => {
  const runtimeIndex = readJson(RUNTIME_INDEX_PATH);
  for (const [skillName, metadata] of Object.entries(runtimeIndex.skills)) {
    assert(metadata.invocationMode, `${skillName} missing invocationMode`);
    assert(metadata.tier, `${skillName} missing tier`);
    assert(metadata.stability, `${skillName} missing stability`);
  }
});

test('Portable bundle skills do not require unshipped MCP runtime by default', () => {
  const catalog = readJson(CATALOG_PATH);
  for (const skillName of ['generate-copilot-config', 'bootstrap-phase-scan', 'bootstrap-phase-validate']) {
    const manifest = catalog.skills[skillName];
    assert(manifest, `missing manifest for ${skillName}`);
    assert(Array.isArray(manifest.requires.mcp) && manifest.requires.mcp.length === 0, `${skillName} should not require MCP runtime by default`);
    assert(Array.isArray(manifest.mcp_tools_used) && manifest.mcp_tools_used.length === 0, `${skillName} should not advertise MCP tool usage without retained runtime`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
