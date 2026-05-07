#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function hashSkill(skillId) {
  const skillDir = path.join(ROOT, '.github', 'skills', skillId);
  const skillPath = path.join(skillDir, 'SKILL.md');
  const manifestPath = path.join(skillDir, 'skill.json');
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(skillPath, 'utf8'));
  hash.update(fs.readFileSync(manifestPath, 'utf8'));
  return hash.digest('hex');
}

function exportPack(input) {
  const required = ['packId', 'title', 'skillIds', 'source'];
  for (const field of required) {
    if (!(field in input)) {
      throw new Error(`missing required field: ${field}`);
    }
  }

  const skills = input.skillIds.map((skillId) => {
    const manifest = readJson(path.join(ROOT, '.github', 'skills', skillId, 'skill.json'));
    return {
      name: skillId,
      version: manifest.version,
      tier: manifest.tier,
      stability: manifest.stability,
      description: manifest.description,
      manifestPath: `.github/skills/${skillId}/skill.json`,
      skillPath: `.github/skills/${skillId}/SKILL.md`,
      manifestHash: hashSkill(skillId)
    };
  });

  return {
    version: 1,
    packId: input.packId,
    title: input.title,
    generatedAt: new Date().toISOString(),
    source: input.source,
    lineage: {
      toolkitVersion: fs.readFileSync(path.join(ROOT, '.github', 'VERSION'), 'utf8').trim(),
      repoRoot: path.basename(ROOT)
    },
    skills
  };
}

function main(argv) {
  if (argv.length !== 1) {
    console.error('Usage: node export-pack.js <input.json>');
    process.exit(1);
  }
  const input = readJson(path.resolve(argv[0]));
  const output = exportPack(input);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  exportPack
};