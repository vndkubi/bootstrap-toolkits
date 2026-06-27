#!/usr/bin/env node
'use strict';

// Cross-platform port of audit-refs.ps1. Detects "orphan" skills/agents — those
// that no routing surface (agent, prompt, other skill, doc, instructions) points
// to. README.md is excluded on purpose: its catalog is auto-generated, so a
// mention there is not evidence of real routing reachability.
//
// Usage:
//   node scripts/audit-refs.js            # human-readable report
//   node scripts/audit-refs.js --json     # machine-readable report
//
// Exit code is always 0; this is a reporting tool. The orphan gate lives in
// tests/test-no-orphan-skills.js.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GITHUB_DIR = path.join(ROOT, '.github');
const SKILLS_DIR = path.join(GITHUB_DIR, 'skills');
const AGENTS_DIR = path.join(GITHUB_DIR, 'agents');

function listSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    return [];
  }
  return fs.readdirSync(SKILLS_DIR)
    .filter((entry) => fs.existsSync(path.join(SKILLS_DIR, entry, 'SKILL.md')))
    .sort();
}

function listAgents() {
  if (!fs.existsSync(AGENTS_DIR)) {
    return [];
  }
  return fs.readdirSync(AGENTS_DIR)
    .filter((entry) => entry.endsWith('.agent.md'))
    .map((entry) => entry.replace(/\.agent\.md$/, ''))
    .sort();
}

function collectSourceFiles() {
  const files = [];
  const pushDir = (dir, filter) => {
    if (!fs.existsSync(dir)) {
      return;
    }
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) {
        continue;
      }
      if (filter(entry)) {
        files.push(full);
      }
    }
  };

  pushDir(AGENTS_DIR, (name) => name.endsWith('.agent.md'));
  pushDir(path.join(GITHUB_DIR, 'prompts'), (name) => name.endsWith('.prompt.md'));
  pushDir(path.join(GITHUB_DIR, 'instructions'), (name) => name.endsWith('.instructions.md'));
  pushDir(path.join(GITHUB_DIR, 'docs'), (name) => name.endsWith('.md'));

  for (const skill of listSkills()) {
    files.push(path.join(SKILLS_DIR, skill, 'SKILL.md'));
  }
  for (const extra of ['copilot-instructions.md', 'constitution.md']) {
    const full = path.join(GITHUB_DIR, extra);
    if (fs.existsSync(full)) {
      files.push(full);
    }
  }
  return files;
}

function wordBoundaryCount(content, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?<![a-zA-Z0-9-])${escaped}(?![a-zA-Z0-9-])`, 'g');
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function audit() {
  const skills = listSkills();
  const sourceFiles = collectSourceFiles();
  const fileContents = sourceFiles.map((file) => ({ file, content: fs.readFileSync(file, 'utf8') }));

  const skillRefs = {};
  for (const skill of skills) {
    const ownSkillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
    let count = 0;
    const referencedBy = [];
    for (const { file, content } of fileContents) {
      if (file === ownSkillPath) {
        continue; // a skill referencing its own name is not inbound routing
      }
      const hits = wordBoundaryCount(content, skill);
      if (hits > 0) {
        count += hits;
        referencedBy.push(path.relative(ROOT, file).split(path.sep).join('/'));
      }
    }
    skillRefs[skill] = { count, referencedBy };
  }

  const orphans = skills.filter((skill) => skillRefs[skill].count === 0);
  return { skills, skillRefs, orphans };
}

function main(argv) {
  const result = audit();
  if (argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Audited ${result.skills.length} skills.\n`);
  const sorted = result.skills
    .map((skill) => ({ skill, count: result.skillRefs[skill].count }))
    .sort((a, b) => a.count - b.count);
  console.log('Lowest inbound reference counts:');
  for (const { skill, count } of sorted.slice(0, 12)) {
    console.log(`  ${String(count).padStart(3)}  ${skill}`);
  }
  console.log(`\nOrphans (0 inbound references): ${result.orphans.length}`);
  for (const orphan of result.orphans) {
    console.log(`  - ${orphan}`);
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { audit };
