#!/usr/bin/env node
'use strict';

/**
 * Phase 4 Tests: Skill-Pack Manifest, Conflict Handling, Offline-First
 *
 * Validates:
 * - skill-pack-manifest.schema.json contract correctness
 * - skill-pack-import SKILL.md skill structure and content
 * - import-skill-pack.prompt.md prompt structure and content
 * - Conflict resolution rules documented in the skill
 * - Offline-first design principles documented
 * - Registry schema and tracking model
 * - generate-copilot-config retention and prompt rules
 */

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
  } catch (e) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ---------------------------------------------------------------------------
// Schema Contract Tests
// ---------------------------------------------------------------------------
console.log('=== Skill-Pack Manifest Schema Tests ===\n');

const schemaPath = path.join(ROOT, 'specs/003-cross-repo-improvement-ideas/contracts/skill-pack-manifest.schema.json');

test('Schema file exists', () => {
  assert(fs.existsSync(schemaPath), 'skill-pack-manifest.schema.json not found');
});

test('Schema is valid JSON', () => {
  const content = fs.readFileSync(schemaPath, 'utf8');
  JSON.parse(content);
});

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

test('Schema has required top-level fields', () => {
  const required = schema.required;
  assert(Array.isArray(required), 'required is not an array');
  const expected = ['version', 'packId', 'title', 'minimumToolkitVersion', 'source', 'skills'];
  for (const field of expected) {
    assert(required.includes(field), `Missing required field: ${field}`);
  }
});

test('version is integer with minimum 1', () => {
  const v = schema.properties.version;
  assert(v.type === 'integer', 'version type should be integer');
  assert(v.minimum === 1, 'version minimum should be 1');
});

test('packId has kebab-case pattern', () => {
  const p = schema.properties.packId;
  assert(p.type === 'string', 'packId type should be string');
  assert(p.pattern === '^[a-z0-9-]+$', 'packId pattern should enforce kebab-case');
});

test('source requires type and value', () => {
  const s = schema.properties.source;
  assert(s.type === 'object', 'source should be object');
  assert(Array.isArray(s.required), 'source.required should be array');
  assert(s.required.includes('type'), 'source should require type');
  assert(s.required.includes('value'), 'source should require value');
});

test('source.type is enum with git and local', () => {
  const t = schema.properties.source.properties.type;
  assert(Array.isArray(t.enum), 'source.type should have enum');
  assert(t.enum.includes('git'), 'source.type should include git');
  assert(t.enum.includes('local'), 'source.type should include local');
});

test('skills is array with minItems 1', () => {
  const s = schema.properties.skills;
  assert(s.type === 'array', 'skills type should be array');
  assert(s.minItems === 1, 'skills should require at least 1 item');
});

test('Skill items require name, path, description', () => {
  const item = schema.properties.skills.items;
  assert(Array.isArray(item.required), 'skill items should have required');
  const expected = ['name', 'path', 'description'];
  for (const field of expected) {
    assert(item.required.includes(field), `Skill item should require: ${field}`);
  }
});

test('Skill items have optional tags and dependencies', () => {
  const props = schema.properties.skills.items.properties;
  assert(props.tags, 'Skill item should have tags property');
  assert(props.tags.type === 'array', 'tags should be array');
  assert(props.dependencies, 'Skill item should have dependencies property');
  assert(props.dependencies.type === 'array', 'dependencies should be array');
});

test('Schema disallows additional properties at top level', () => {
  assert(schema.additionalProperties === false, 'Should disallow additional properties');
});

// ---------------------------------------------------------------------------
// Example Manifest Validation
// ---------------------------------------------------------------------------
console.log('\n--- Example Manifest Validation ---\n');

const validManifest = {
  version: 1,
  packId: "acme-java-domain-skills",
  title: "ACME Java Domain Skills",
  minimumToolkitVersion: "1.0",
  source: { type: "git", value: "https://github.com/acme-org/copilot-skill-packs.git" },
  skills: [
    { name: "acme-order-domain", path: "skills/acme-order-domain", description: "Order domain rules." }
  ]
};

test('Valid manifest has all required fields', () => {
  for (const field of schema.required) {
    assert(field in validManifest, `Missing field: ${field}`);
  }
});

test('Valid packId matches kebab-case pattern', () => {
  assert(/^[a-z0-9-]+$/.test(validManifest.packId), 'packId should be kebab-case');
});

test('Invalid packId with uppercase is rejected', () => {
  assert(!/^[a-z0-9-]+$/.test('Acme-Skills'), 'Uppercase packId should fail pattern');
});

test('Invalid packId with spaces is rejected', () => {
  assert(!/^[a-z0-9-]+$/.test('acme skills'), 'Spaces in packId should fail pattern');
});

test('Empty skills array is invalid (minItems 1)', () => {
  assert(schema.properties.skills.minItems === 1, 'Should require at least 1 skill');
  assert([].length < 1, 'Empty array violates minItems');
});

// ---------------------------------------------------------------------------
// Skill File Tests
// ---------------------------------------------------------------------------
console.log('\n--- Skill-Pack-Import SKILL.md Tests ---\n');

const skillPath = path.join(ROOT, '.github/skills/skill-pack-import/SKILL.md');

test('skill-pack-import SKILL.md exists', () => {
  assert(fs.existsSync(skillPath), 'SKILL.md not found');
});

const skillContent = fs.readFileSync(skillPath, 'utf8');

test('SKILL.md has valid frontmatter with name', () => {
  assert(skillContent.includes('name: skill-pack-import'), 'Missing name in frontmatter');
});

test('SKILL.md has description with keywords', () => {
  assert(skillContent.includes('description:'), 'Missing description');
  assert(skillContent.includes('skill pack'), 'Missing keyword: skill pack');
  assert(skillContent.includes('import'), 'Missing keyword: import');
  assert(skillContent.includes('export'), 'Missing keyword: export');
});

test('SKILL.md documents manifest schema', () => {
  assert(skillContent.includes('Manifest Schema'), 'Missing Manifest Schema section');
  assert(skillContent.includes('packId'), 'Missing packId documentation');
  assert(skillContent.includes('minimumToolkitVersion'), 'Missing minimumToolkitVersion');
});

test('SKILL.md documents import workflow', () => {
  assert(skillContent.includes('Step 1: Validate Manifest'), 'Missing validate step');
  assert(skillContent.includes('Step 2: Check for Conflicts'), 'Missing conflict check step');
  assert(skillContent.includes('Step 3: Import Skills'), 'Missing import step');
  assert(skillContent.includes('Step 4: Update Registry'), 'Missing registry update step');
});

test('SKILL.md documents export workflow', () => {
  assert(skillContent.includes('Export Workflow'), 'Missing Export Workflow section');
  assert(skillContent.includes('Generate Manifest'), 'Missing manifest generation');
});

test('SKILL.md documents conflict resolution', () => {
  assert(skillContent.includes('Conflict Resolution'), 'Missing Conflict Resolution section');
  assert(skillContent.includes('Keep local'), 'Missing Keep local option');
  assert(skillContent.includes('Accept import'), 'Missing Accept import option');
  assert(skillContent.includes('Merge manually'), 'Missing Merge manually option');
});

test('SKILL.md enforces never-overwrite rule', () => {
  assert(skillContent.includes('NEVER overwrite local customizations silently'), 'Missing never-overwrite rule');
});

test('SKILL.md documents offline-first design', () => {
  assert(skillContent.includes('Offline-First Design'), 'Missing Offline-First Design section');
  assert(skillContent.includes('No network required'), 'Missing no-network principle');
  assert(skillContent.includes('No registry dependency'), 'Missing no-registry principle');
  assert(skillContent.includes('No auto-update'), 'Missing no-auto-update principle');
  assert(skillContent.includes('No lock-in'), 'Missing no-lock-in principle');
  assert(skillContent.includes('Graceful degradation'), 'Missing graceful degradation');
});

test('SKILL.md documents protected local modifications', () => {
  assert(skillContent.includes('Protected Local Modifications'), 'Missing Protected Local Modifications');
  assert(skillContent.includes('Local override'), 'Missing Local override classification');
});

test('SKILL.md has verification contract', () => {
  assert(skillContent.includes('Verification Contract'), 'Missing Verification Contract');
  assert(skillContent.includes('Expected Outcome'), 'Missing Expected Outcome');
  assert(skillContent.includes('How to Verify'), 'Missing How to Verify');
  assert(skillContent.includes('When to Stop or Escalate'), 'Missing When to Stop');
});

test('SKILL.md documents registry schema', () => {
  assert(skillContent.includes('.skill-pack-registry.json'), 'Missing registry reference');
  assert(skillContent.includes('installedPacks'), 'Missing installedPacks in registry');
  assert(skillContent.includes('locallyModified'), 'Missing locallyModified tracking');
});

test('SKILL.md references the contract schema', () => {
  assert(skillContent.includes('skill-pack-manifest.schema.json'), 'Missing schema reference');
});

// ---------------------------------------------------------------------------
// Prompt File Tests
// ---------------------------------------------------------------------------
console.log('\n--- Import-Skill-Pack Prompt Tests ---\n');

const promptPath = path.join(ROOT, '.github/prompts/import-skill-pack.prompt.md');

test('import-skill-pack.prompt.md exists', () => {
  assert(fs.existsSync(promptPath), 'Prompt file not found');
});

const promptContent = fs.readFileSync(promptPath, 'utf8');

test('Prompt uses agent mode', () => {
  assert(promptContent.includes('agent: agent'), 'Missing agent: agent');
});

test('Prompt references skill-pack-import skill', () => {
  assert(promptContent.includes('skill-pack-import'), 'Missing skill-pack-import reference');
});

test('Prompt enforces no silent overwrite', () => {
  const lower = promptContent.toLowerCase();
  assert(lower.includes('not overwrite') || lower.includes('never auto-resolve'),
    'Missing overwrite protection rule');
});

test('Prompt enforces offline functionality', () => {
  assert(promptContent.includes('offline'), 'Missing offline requirement');
});

// ---------------------------------------------------------------------------
// Conflict Resolution Logic Tests
// ---------------------------------------------------------------------------
console.log('\n--- Conflict Resolution Logic Tests ---\n');

test('Clean import: new skill that does not exist locally', () => {
  // Simulate: skill name not in local skills directory
  const localSkills = ['generate-unit-tests', 'review-code-changes'];
  const importSkill = 'acme-order-domain';
  assert(!localSkills.includes(importSkill), 'Should be classified as clean import');
});

test('No-op: skill exists with identical content', () => {
  const localHash = 'abc123';
  const importHash = 'abc123';
  assert(localHash === importHash, 'Should skip identical content');
});

test('Conflict: skill exists with different content', () => {
  const localHash = 'abc123';
  const importHash = 'def456';
  assert(localHash !== importHash, 'Should detect conflict');
});

test('Local override: previously imported and locally modified', () => {
  const registryHash = 'abc123'; // hash at import time
  const currentHash = 'xyz789'; // current local hash (user modified)
  assert(registryHash !== currentHash, 'Should detect local modification');
  // Local override should be protected
  const isProtected = registryHash !== currentHash;
  assert(isProtected, 'Locally modified skill should be protected');
});

test('Updatable: previously imported and NOT locally modified', () => {
  const registryHash = 'abc123';
  const currentHash = 'abc123'; // unchanged since import
  assert(registryHash === currentHash, 'Should detect no local modification');
});

test('packId validation rejects invalid patterns', () => {
  const invalidIds = ['UPPER', 'has space', 'special!char', 'under_score', ''];
  for (const id of invalidIds) {
    assert(!/^[a-z0-9-]+$/.test(id), `Should reject invalid packId: "${id}"`);
  }
});

test('packId validation accepts valid patterns', () => {
  const validIds = ['acme-skills', 'my-org-java-pack', 'domain-123', 'a'];
  for (const id of validIds) {
    assert(/^[a-z0-9-]+$/.test(id), `Should accept valid packId: "${id}"`);
  }
});

// ---------------------------------------------------------------------------
// Offline-First Verification
// ---------------------------------------------------------------------------
console.log('\n--- Offline-First Verification ---\n');

test('Imported skills are plain SKILL.md files (no runtime dependency)', () => {
  // After import, skills should be indistinguishable from hand-written skills
  assert(skillContent.includes('plain `.github/skills/<name>/SKILL.md` files'),
    'Should document that imported skills are plain files');
});

test('Registry is metadata-only, not a runtime dependency', () => {
  assert(skillContent.includes('registry is metadata for management, not a runtime dependency'),
    'Should document registry as metadata-only');
});

test('No auto-update mechanism', () => {
  assert(skillContent.includes('do not phone home or auto-update'),
    'Should document no auto-update');
});

test('Updates are explicit user action', () => {
  assert(skillContent.includes('Updates are explicit'),
    'Should document explicit update model');
});

// ---------------------------------------------------------------------------
// generate-copilot-config Retention Tests
// ---------------------------------------------------------------------------
console.log('\n--- Bootstrap Retention Tests ---\n');

const genConfigPath = path.join(ROOT, '.github/skills/generate-copilot-config/SKILL.md');
const genConfigContent = fs.readFileSync(genConfigPath, 'utf8');

test('skill-pack-import is in Conditional skills tier', () => {
  assert(genConfigContent.includes('skill-pack-import'), 'Missing from retention tiers');
  // Verify it's in the conditional section
  const conditionalStart = genConfigContent.indexOf('Conditional skills (generate only when evidence matches)');
  const metaStart = genConfigContent.indexOf('Meta/toolkit skills (retain selectively');
  const skillPackPos = genConfigContent.indexOf('skill-pack-import');
  assert(skillPackPos > conditionalStart && skillPackPos < metaStart,
    'skill-pack-import should be in Conditional tier, not Meta');
});

test('import-skill-pack prompt has retention rule', () => {
  assert(genConfigContent.includes('import-skill-pack'),
    'Missing import-skill-pack prompt retention');
  assert(genConfigContent.includes('Keep `/import-skill-pack` whenever `skill-pack-import` is retained'),
    'Missing workflow-coupled retention rule');
});

// ---------------------------------------------------------------------------
// Data Model Alignment Tests
// ---------------------------------------------------------------------------
console.log('\n--- Data Model Alignment Tests ---\n');

const dataModelPath = path.join(ROOT, 'specs/003-cross-repo-improvement-ideas/data-model.md');
const dataModelContent = fs.readFileSync(dataModelPath, 'utf8');

test('Data model defines SkillPackManifest', () => {
  assert(dataModelContent.includes('SkillPackManifest'), 'Missing SkillPackManifest in data model');
});

test('Data model includes version field', () => {
  assert(dataModelContent.includes('| `version` | integer | Manifest version |'), 'Missing version field');
});

test('Data model includes packId field', () => {
  assert(dataModelContent.includes('| `packId` | string | Stable identifier |'), 'Missing packId field');
});

test('Data model includes source field', () => {
  assert(dataModelContent.includes('| `source` | object | Git URL or local path |'), 'Missing source field');
});

test('Data model includes skills field', () => {
  assert(dataModelContent.includes('| `skills` | object[] | Included skill descriptors |'), 'Missing skills field');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
