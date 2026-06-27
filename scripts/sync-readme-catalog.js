#!/usr/bin/env node
'use strict';

// Renders the README catalog tables (agents, skills, instructions, prompts)
// from the real .github/ sources so they cannot drift from the shipped bundle.
//
// Usage:
//   node scripts/sync-readme-catalog.js            # rewrite README marker blocks
//   node scripts/sync-readme-catalog.js --check     # exit 1 if README is stale
//
// Each managed block in README.md is delimited by:
//   <!-- BEGIN:<key> --> ... <!-- END:<key> -->
// Everything between the markers is generated; everything else is hand-written.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT, 'README.md');
const GITHUB_DIR = path.join(ROOT, '.github');
const AGENTS_DIR = path.join(GITHUB_DIR, 'agents');
const INSTRUCTIONS_DIR = path.join(GITHUB_DIR, 'instructions');
const PROMPTS_DIR = path.join(GITHUB_DIR, 'prompts');

const { buildCatalog } = require(path.join(GITHUB_DIR, 'scripts', 'sync-skill-metadata.js'));

const TIER_LABEL = Object.freeze({
  foundational: 'Foundational',
  domain: 'Domain',
  enterprise: 'Enterprise'
});
const TIER_ORDER = Object.freeze({ foundational: 0, domain: 1, enterprise: 2 });
const MODE_LABEL = Object.freeze({
  model_routed: 'model-routed',
  agent_delegated: 'agent-delegated',
  explicit_only: 'explicit',
  pipeline_only: 'pipeline'
});

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }
  const frontmatter = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    // Only capture the simple single-line scalars we need.
    if (key !== 'name' && key !== 'description' && key !== 'applyTo') {
      continue;
    }
    const value = line.slice(separatorIndex + 1).trim();
    if (!value) {
      continue;
    }
    frontmatter[key] = value.replace(/^["']|["']$/g, '');
  }
  return frontmatter;
}

function cleanCell(value, maxLength) {
  let text = String(value || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
  if (maxLength && text.length > maxLength) {
    text = `${text.slice(0, maxLength - 1).trimEnd()}…`;
  }
  return text;
}

function shortDescription(value, maxLength) {
  // Drop any trailing "Keywords: ..." tail, then keep the first sentence.
  let text = String(value || '').replace(/\s*Keywords:.*$/is, '').trim();
  const sentenceEnd = text.search(/\.\s/);
  if (sentenceEnd !== -1 && sentenceEnd < (maxLength || Infinity)) {
    text = text.slice(0, sentenceEnd + 1);
  }
  return cleanCell(text, maxLength);
}

function listFrontmatterEntries(dir, suffix) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir)
    .filter((entry) => entry.endsWith(suffix))
    .sort()
    .map((fileName) => {
      const id = fileName.slice(0, -suffix.length);
      const frontmatter = parseFrontmatter(fs.readFileSync(path.join(dir, fileName), 'utf8'));
      return { id, fileName, frontmatter };
    });
}

function renderAgents() {
  const rows = listFrontmatterEntries(AGENTS_DIR, '.agent.md').map(({ id, frontmatter }) => {
    return `| \`@${id}\` | ${shortDescription(frontmatter.description, 160)} |`;
  });
  return [
    `_${rows.length} agents. Auto-generated from \`.github/agents/*.agent.md\`._`,
    '',
    '| Agent | Description |',
    '|-------|-------------|',
    ...rows
  ].join('\n');
}

function renderSkills() {
  const { catalog } = buildCatalog('1970-01-01T00:00:00.000Z');
  const skills = Object.values(catalog.skills);
  const userFacing = skills
    .filter((skill) => skill.invocationMode !== 'pipeline_only')
    .sort((a, b) => (TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) || a.id.localeCompare(b.id));
  const pipeline = skills
    .filter((skill) => skill.invocationMode === 'pipeline_only')
    .sort((a, b) => a.id.localeCompare(b.id));

  const userRows = userFacing.map((skill) => {
    return `| \`${skill.id}\` | ${TIER_LABEL[skill.tier] || skill.tier} | ${MODE_LABEL[skill.invocationMode] || skill.invocationMode} | ${shortDescription(skill.description, 150)} |`;
  });
  const pipelineRows = pipeline.map((skill) => {
    return `| \`${skill.id}\` | ${shortDescription(skill.description, 150)} |`;
  });

  return [
    `_${skills.length} skills total (${userFacing.length} user-facing, ${pipeline.length} internal pipeline phases). Auto-generated from skill manifests; run \`node .github/scripts/sync-skill-metadata.js\` then \`node scripts/sync-readme-catalog.js\`._`,
    '',
    '### User-Facing Skills',
    '',
    '| Skill | Tier | Invocation | Description |',
    '|-------|------|-----------|-------------|',
    ...userRows,
    '',
    '### Internal Pipeline-Phase Skills',
    '',
    '_Loaded by the bootstrap pipeline, not invoked directly._',
    '',
    '| Skill | Description |',
    '|-------|-------------|',
    ...pipelineRows
  ].join('\n');
}

function renderInstructions() {
  const rows = listFrontmatterEntries(INSTRUCTIONS_DIR, '.instructions.md').map(({ fileName, frontmatter }) => {
    const applyTo = frontmatter.applyTo ? `\`${cleanCell(frontmatter.applyTo)}\`` : '—';
    return `| \`${fileName}\` | ${applyTo} | ${shortDescription(frontmatter.description, 140)} |`;
  });
  return [
    `_${rows.length} instruction files. Auto-generated from \`.github/instructions/*.instructions.md\`._`,
    '',
    '| File | applyTo | Contents |',
    '|------|---------|----------|',
    ...rows
  ].join('\n');
}

function renderPrompts() {
  const rows = listFrontmatterEntries(PROMPTS_DIR, '.prompt.md').map(({ id, frontmatter }) => {
    return `| \`/${id}\` | ${shortDescription(frontmatter.description, 160)} |`;
  });
  return [
    `_${rows.length} prompts. Triggered via \`/prompt-name\`. Auto-generated from \`.github/prompts/*.prompt.md\`._`,
    '',
    '| Prompt | Description |',
    '|--------|-------------|',
    ...rows
  ].join('\n');
}

const BLOCKS = Object.freeze({
  agents: renderAgents,
  skills: renderSkills,
  instructions: renderInstructions,
  prompts: renderPrompts
});

function applyBlocks(source) {
  let output = source;
  const missing = [];
  for (const [key, render] of Object.entries(BLOCKS)) {
    const begin = `<!-- BEGIN:${key} -->`;
    const end = `<!-- END:${key} -->`;
    const pattern = new RegExp(`${begin}[\\s\\S]*?${end}`);
    if (!pattern.test(output)) {
      missing.push(key);
      continue;
    }
    const body = render();
    output = output.replace(pattern, `${begin}\n${body}\n${end}`);
  }
  return { output, missing };
}

function main(argv) {
  const checkMode = argv.includes('--check');
  const source = fs.readFileSync(README_PATH, 'utf8');
  const { output, missing } = applyBlocks(source);

  if (missing.length > 0) {
    console.error(`README.md is missing catalog markers for: ${missing.join(', ')}`);
    console.error('Expected <!-- BEGIN:<key> --> / <!-- END:<key> --> pairs.');
    process.exit(1);
  }

  if (checkMode) {
    if (output !== source) {
      console.error('README catalog is out of date. Run: node scripts/sync-readme-catalog.js');
      process.exit(1);
    }
    console.log('README catalog is up to date');
    return;
  }

  fs.writeFileSync(README_PATH, output);
  console.log('README catalog synchronized');
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { applyBlocks, renderAgents, renderSkills, renderInstructions, renderPrompts };
