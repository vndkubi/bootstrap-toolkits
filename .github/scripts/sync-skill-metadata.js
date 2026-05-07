#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_DIR = path.join(ROOT, '.github', 'skills');
const AGENTS_DIR = path.join(ROOT, '.github', 'agents');
const TOOLKIT_VERSION = fs.readFileSync(path.join(ROOT, '.github', 'VERSION'), 'utf8').trim();
const OVERRIDES_PATH = path.join(SKILLS_DIR, 'catalog-overrides.json');

const PIPELINE_ONLY = new Set([
  'generate-copilot-config',
  'resume-bootstrap',
  'validate-bootstrap-output'
]);

const FOUNDATIONAL_PATTERN = /(^bootstrap-phase-|^skill-pack-|^author-skill$|^evaluate-skill$|^specify-feature$|^plan-implementation$|^generate-tasks$|^implement-feature$|^implement-mobile-feature$|^orchestrate-development$|^refine-user-input$|^conventional-commit$|^core-principles$|^skill-discoverability-audit$|^context-budget-check$|^context-inspector$|^common-doc-generator$|^analyze-codebase$|^learn-codebase$|^generate-pr-description$|^generate-agentic-workflow$)/;
const ENTERPRISE_PATTERN = /(^audit-|^validate-|^drift-|^tool-permission-|^instruction-conflict-|^repo-memory-|^review-memory-|^review-effectiveness$|^correction-ledger$|^dependency-extractor$|^domain-registry$|^context-assembly-simulator$)/;
const EXPERIMENTAL_PATTERN = /(^author-skill$|^evaluate-skill$|^skill-pack-export$|^upgrade-skill-pack$|^bootstrap-phase-|^trace-replay$|^autorun$)/;

function posixPath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const frontmatter = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (value.startsWith('[')) {
      try {
        frontmatter[key] = JSON.parse(value.replace(/'/g, '"'));
        continue;
      } catch (error) {
        // Fall back to string.
      }
    }
    frontmatter[key] = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
  return frontmatter;
}

function extractSection(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^##\\s+${escaped}\\s*\\r?\\n(?:\\s*\\r?\\n)?([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'mi'));
  return match ? match[1].trim() : '';
}

function extractKeywords(description, text, skillName) {
  const keywordLine = (description.match(/Keywords:\s*(.+)$/i) || text.match(/^Keywords:\s*(.+)$/mi));
  if (keywordLine) {
    return normalizeList(keywordLine[1].split(',').map(normalizeKeyword)).slice(0, 12);
  }

  const tokens = `${skillName.replace(/-/g, ' ')} ${description}`
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length > 2)
    .filter((token) => !STOP_WORDS.has(token));

  return normalizeList(tokens).slice(0, 12);
}

function normalizeKeyword(value) {
  return String(value || '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.;:]+$/g, '')
    .trim();
}

function normalizeList(values) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function inferTier(skillName) {
  if (ENTERPRISE_PATTERN.test(skillName)) {
    return 'enterprise';
  }
  if (FOUNDATIONAL_PATTERN.test(skillName)) {
    return 'foundational';
  }
  return 'domain';
}

function inferStability(skillName, text) {
  if (EXPERIMENTAL_PATTERN.test(skillName) || /\bStatus:\s*Stage\b/i.test(text) || /\bexperimental\b/i.test(text)) {
    return 'experimental';
  }
  if (/\bdeprecated\b/i.test(text)) {
    return 'deprecated';
  }
  return 'stable';
}

function inferOutputs(description, text) {
  const explicitOutputs = extractSection(text, 'Outputs');
  if (explicitOutputs) {
    const values = explicitOutputs
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 8);
    if (values.length > 0) {
      return normalizeList(values);
    }
  }

  const outputs = [];
  const lower = `${description} ${text}`.toLowerCase();
  if (lower.includes('report')) outputs.push('report');
  if (lower.includes('config')) outputs.push('configuration');
  if (lower.includes('diagram')) outputs.push('diagram');
  if (lower.includes('prompt')) outputs.push('prompt');
  if (lower.includes('task')) outputs.push('task list');
  if (lower.includes('test')) outputs.push('tests');
  if (lower.includes('review')) outputs.push('review findings');
  if (lower.includes('plan')) outputs.push('plan');
  if (outputs.length === 0) outputs.push('workflow output');
  return normalizeList(outputs);
}

function inferInputs(text) {
  const explicitInputs = extractSection(text, 'Inputs');
  if (explicitInputs) {
    const values = explicitInputs
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 6);
    if (values.length > 0) {
      return normalizeList(values);
    }
  }
  return ['workspace context'];
}

function inferMcpToolsUsed(skillName) {
  const mapping = {};
  return mapping[skillName] || [];
}

function parseAllowedTools(frontmatter) {
  if (!Array.isArray(frontmatter['allowed-tools'])) {
    return [];
  }
  return normalizeList(frontmatter['allowed-tools'].map(String));
}

function collectAgentReferences(skillName) {
  if (!fs.existsSync(AGENTS_DIR)) {
    return { routedBy: [], referencedByAgents: [] };
  }

  const routedBy = [];
  const referencedByAgents = [];
  for (const fileName of fs.readdirSync(AGENTS_DIR).filter((entry) => entry.endsWith('.agent.md'))) {
    const filePath = path.join(AGENTS_DIR, fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(skillName)) {
      continue;
    }
    const agentName = fileName.replace(/\.agent\.md$/, '');
    referencedByAgents.push(agentName);
    if (/\|[^\n]*\|[^\n]*`?/.test(content)) {
      routedBy.push(agentName);
    }
  }

  return {
    routedBy: normalizeList(routedBy),
    referencedByAgents: normalizeList(referencedByAgents)
  };
}

function inferInvocationMode(skillName, hasWhenToUse, referencedByAgents, keywords) {
  if (PIPELINE_ONLY.has(skillName) || skillName.startsWith('bootstrap-phase-')) {
    return 'pipeline_only';
  }
  if (referencedByAgents.length > 0) {
    return 'agent_delegated';
  }
  if (hasWhenToUse || keywords.length >= 3) {
    return 'model_routed';
  }
  return 'explicit_only';
}

function estimateTokenCost(text) {
  return Math.ceil(text.length / 4);
}

function buildManifest(skillName, overrides) {
  const skillDir = path.join(SKILLS_DIR, skillName);
  const skillPath = path.join(skillDir, 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf8');
  const frontmatter = parseFrontmatter(content);
  const description = frontmatter.description || '';
  const displayName = frontmatter.name || skillName;
  const keywords = extractKeywords(description, content, skillName);
  const { routedBy, referencedByAgents } = collectAgentReferences(skillName);
  const manifest = {
    schemaVersion: 1,
    id: skillName,
    displayName,
    description,
    version: TOOLKIT_VERSION,
    tier: inferTier(skillName),
    stability: inferStability(skillName, content),
    requires: {
      skills: [],
      mcp: [],
      tools: parseAllowedTools(frontmatter)
    },
    inputs: inferInputs(content),
    outputs: inferOutputs(description, content),
    triggers: keywords.length > 0 ? keywords : [skillName],
    mcp_tools_used: inferMcpToolsUsed(skillName),
    invocationMode: inferInvocationMode(skillName, content.includes('## When to Use'), referencedByAgents, keywords),
    paths: {
      skill: posixPath(skillPath),
      scripts: `${posixPath(skillDir)}/scripts`,
      assets: `${posixPath(skillDir)}/assets`,
      references: `${posixPath(skillDir)}/references`
    },
    keywords,
    routedBy,
    referencedByAgents
  };

  const override = overrides[skillName] || {};
  if (override.tier) {
    manifest.tier = override.tier;
  }
  if (override.stability) {
    manifest.stability = override.stability;
  }
  if (override.requires) {
    manifest.requires = {
      skills: normalizeList(override.requires.skills || manifest.requires.skills),
      mcp: normalizeList(override.requires.mcp || manifest.requires.mcp),
      tools: normalizeList(override.requires.tools || manifest.requires.tools)
    };
  } else {
    manifest.requires = {
      skills: normalizeList(manifest.requires.skills),
      mcp: normalizeList(manifest.requires.mcp),
      tools: normalizeList(manifest.requires.tools)
    };
  }
  if (override.mcp_tools_used) {
    manifest.mcp_tools_used = normalizeList(override.mcp_tools_used);
  } else {
    manifest.mcp_tools_used = normalizeList(manifest.mcp_tools_used);
  }
  if (override.invocationMode) {
    manifest.invocationMode = override.invocationMode;
  }
  if (override.inputs) {
    manifest.inputs = normalizeList(override.inputs);
  }
  if (override.outputs) {
    manifest.outputs = normalizeList(override.outputs);
  }
  if (override.triggers) {
    manifest.triggers = normalizeList(override.triggers);
  }
  return manifest;
}

function buildCatalog(now = new Date().toISOString()) {
  const overrides = readJsonIfExists(OVERRIDES_PATH) || {};
  const manifests = {};
  const runtimeSkills = {};
  const skillNames = fs.readdirSync(SKILLS_DIR)
    .filter((entry) => fs.statSync(path.join(SKILLS_DIR, entry)).isDirectory())
    .filter((entry) => fs.existsSync(path.join(SKILLS_DIR, entry, 'SKILL.md')))
    .sort();

  for (const skillName of skillNames) {
    const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf8');
    const manifest = buildManifest(skillName, overrides);
    manifests[skillName] = manifest;
    runtimeSkills[skillName] = {
      manifestPath: `${posixPath(path.join(SKILLS_DIR, skillName))}/skill.json`,
      descriptionLength: manifest.description.length,
      hasKeywordsSuffix: /Keywords:\s*/i.test(content) || /Keywords:\s*/i.test(manifest.description),
      hasWhenToUse: content.includes('## When to Use'),
      triggerKeywords: manifest.triggers,
      routedBy: manifest.routedBy,
      referencedByAgents: manifest.referencedByAgents,
      invocationMode: manifest.invocationMode,
      tier: manifest.tier,
      stability: manifest.stability,
      mcpToolsUsed: manifest.mcp_tools_used,
      estimatedTokenCost: estimateTokenCost(content)
    };
  }

  return {
    catalog: {
      schemaVersion: 1,
      toolkitVersion: TOOLKIT_VERSION,
      generatedAt: now,
      skills: manifests
    },
    runtimeIndex: {
      version: '1.0',
      generatedAt: now,
      skills: runtimeSkills
    }
  };
}

const TIER_ORDER = Object.freeze({
  foundational: 0,
  domain: 1,
  enterprise: 2
});

const VALID_STABILITY = new Set(['experimental', 'stable', 'deprecated']);
const VALID_INVOCATION_MODE = new Set(['model_routed', 'agent_delegated', 'explicit_only', 'pipeline_only']);
const REQUIRED_MANIFEST_FIELDS = [
  'schemaVersion',
  'id',
  'displayName',
  'description',
  'version',
  'tier',
  'stability',
  'requires',
  'inputs',
  'outputs',
  'triggers',
  'mcp_tools_used',
  'invocationMode',
  'paths'
];

function selectSkillsByTier(catalog, requestedTier) {
  if (!(requestedTier in TIER_ORDER)) {
    throw new Error(`unknown tier: ${requestedTier}`);
  }

  const maxTier = TIER_ORDER[requestedTier];
  const selected = {};
  for (const [skillName, manifest] of Object.entries(catalog.skills)) {
    if (TIER_ORDER[manifest.tier] <= maxTier) {
      selected[skillName] = manifest;
    }
  }
  return selected;
}

function validateManifestShape(skillName, manifest) {
  const issues = [];
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!(field in manifest)) {
      issues.push({ type: 'manifest_missing_field', skill: skillName, field });
    }
  }

  if (manifest.schemaVersion !== 1) {
    issues.push({ type: 'manifest_bad_schema_version', skill: skillName, value: manifest.schemaVersion });
  }
  if (manifest.id !== skillName) {
    issues.push({ type: 'manifest_id_mismatch', skill: skillName, value: manifest.id });
  }
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(manifest.version || '')) {
    issues.push({ type: 'manifest_bad_version', skill: skillName, value: manifest.version });
  }
  if (!(manifest.tier in TIER_ORDER)) {
    issues.push({ type: 'manifest_bad_tier', skill: skillName, value: manifest.tier });
  }
  if (!VALID_STABILITY.has(manifest.stability)) {
    issues.push({ type: 'manifest_bad_stability', skill: skillName, value: manifest.stability });
  }
  if (!VALID_INVOCATION_MODE.has(manifest.invocationMode)) {
    issues.push({ type: 'manifest_bad_invocation_mode', skill: skillName, value: manifest.invocationMode });
  }

  const arrayFields = ['inputs', 'outputs', 'triggers', 'mcp_tools_used'];
  for (const field of arrayFields) {
    if (!Array.isArray(manifest[field])) {
      issues.push({ type: 'manifest_field_not_array', skill: skillName, field });
    }
  }
  if (!Array.isArray(manifest.triggers) || manifest.triggers.length === 0) {
    issues.push({ type: 'manifest_missing_triggers', skill: skillName });
  }

  if (!manifest.requires || typeof manifest.requires !== 'object') {
    issues.push({ type: 'manifest_missing_requires', skill: skillName });
  } else {
    for (const field of ['skills', 'mcp', 'tools']) {
      if (!Array.isArray(manifest.requires[field])) {
        issues.push({ type: 'manifest_requires_field_not_array', skill: skillName, field });
      }
    }
  }

  if (!manifest.paths || typeof manifest.paths !== 'object') {
    issues.push({ type: 'manifest_missing_paths', skill: skillName });
  } else {
    for (const field of ['skill', 'scripts', 'assets', 'references']) {
      if (!manifest.paths[field]) {
        issues.push({ type: 'manifest_missing_path', skill: skillName, field });
      }
    }
  }

  return issues;
}

function validateCatalog(catalog, selectedSkills) {
  const issues = [];
  const availableSkills = new Set(Object.keys(catalog.skills));
  const activeSkills = selectedSkills ? new Set(Object.keys(selectedSkills)) : availableSkills;

  for (const [skillName, manifest] of Object.entries(catalog.skills)) {
    issues.push(...validateManifestShape(skillName, manifest));

    for (const dependency of manifest.requires.skills) {
      if (!availableSkills.has(dependency)) {
        issues.push({
          type: 'missing_skill_dependency',
          skill: skillName,
          dependency
        });
      }
      if (selectedSkills && activeSkills.has(skillName) && !activeSkills.has(dependency)) {
        issues.push({
          type: 'selection_missing_skill_dependency',
          skill: skillName,
          dependency
        });
      }
    }

    for (const mcpTool of manifest.mcp_tools_used) {
      if (!manifest.requires.mcp.includes(mcpTool)) {
        issues.push({
          type: 'mcp_dependency_gap',
          skill: skillName,
          dependency: mcpTool
        });
      }
    }
  }

  return issues;
}

function ensureDirectoryMarker(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  const markerPath = path.join(dirPath, '.gitkeep');
  if (!fs.existsSync(markerPath)) {
    fs.writeFileSync(markerPath, '');
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sync(writeMode, now) {
  const built = buildCatalog(now);
  const expectedFiles = new Map();

  for (const [skillName, manifest] of Object.entries(built.catalog.skills)) {
    const skillDir = path.join(SKILLS_DIR, skillName);
    const scriptsDir = path.join(skillDir, 'scripts');
    const assetsDir = path.join(skillDir, 'assets');
    const referencesDir = path.join(skillDir, 'references');
    if (writeMode) {
      ensureDirectoryMarker(scriptsDir);
      ensureDirectoryMarker(assetsDir);
      ensureDirectoryMarker(referencesDir);
      writeJson(path.join(skillDir, 'skill.json'), manifest);
    }
    expectedFiles.set(path.join(skillDir, 'skill.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    expectedFiles.set(path.join(scriptsDir, '.gitkeep'), '');
    expectedFiles.set(path.join(assetsDir, '.gitkeep'), '');
    expectedFiles.set(path.join(referencesDir, '.gitkeep'), '');
  }

  if (writeMode) {
    writeJson(path.join(SKILLS_DIR, 'INDEX.json'), built.catalog);
    writeJson(path.join(ROOT, '.github', '.skill-index.json'), built.runtimeIndex);
  }
  expectedFiles.set(path.join(SKILLS_DIR, 'INDEX.json'), `${JSON.stringify(built.catalog, null, 2)}\n`);
  expectedFiles.set(path.join(ROOT, '.github', '.skill-index.json'), `${JSON.stringify(built.runtimeIndex, null, 2)}\n`);

  return expectedFiles;
}

function check() {
  const existingCatalog = readJsonIfExists(path.join(SKILLS_DIR, 'INDEX.json'));
  const existingRuntimeIndex = readJsonIfExists(path.join(ROOT, '.github', '.skill-index.json'));
  const generatedAt = (existingCatalog && existingCatalog.generatedAt)
    || (existingRuntimeIndex && existingRuntimeIndex.generatedAt)
    || new Date().toISOString();
  const expectedFiles = sync(false, generatedAt);
  const mismatches = [];
  for (const [filePath, expected] of expectedFiles.entries()) {
    if (!fs.existsSync(filePath)) {
      mismatches.push(`missing: ${posixPath(filePath)}`);
      continue;
    }
    const actual = fs.readFileSync(filePath, 'utf8');
    if (actual !== expected) {
      mismatches.push(`outdated: ${posixPath(filePath)}`);
    }
  }
  return mismatches;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'when', 'into', 'your', 'use', 'using', 'after', 'before', 'against', 'into', 'their', 'these', 'those', 'where'
]);

function main(argv) {
  const args = new Set(argv);
  if (args.has('--validate')) {
    const built = buildCatalog();
    const issues = validateCatalog(built.catalog);
    if (issues.length > 0) {
      console.error(JSON.stringify(issues, null, 2));
      process.exit(1);
    }
    console.log('skill metadata dependencies are valid');
    return;
  }
  if (args.has('--check')) {
    const mismatches = check();
    if (mismatches.length > 0) {
      console.error(mismatches.join('\n'));
      process.exit(1);
    }
    console.log('skill metadata is up to date');
    return;
  }

  sync(true);
  console.log('skill metadata synchronized');
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  buildCatalog,
  check,
  selectSkillsByTier,
  validateCatalog
};
