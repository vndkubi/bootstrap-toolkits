#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function toMap(pack) {
  return new Map((pack.skills || []).map((skill) => [skill.name, skill]));
}

function diffPacks(oldPack, newPack) {
  const oldMap = toMap(oldPack);
  const newMap = toMap(newPack);
  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  for (const [name, skill] of newMap.entries()) {
    if (!oldMap.has(name)) {
      added.push(name);
      continue;
    }
    const previous = oldMap.get(name);
    if (previous.version !== skill.version || previous.manifestHash !== skill.manifestHash) {
      changed.push({
        name,
        from: { version: previous.version, manifestHash: previous.manifestHash },
        to: { version: skill.version, manifestHash: skill.manifestHash }
      });
    } else {
      unchanged.push(name);
    }
  }

  for (const [name] of oldMap.entries()) {
    if (!newMap.has(name)) {
      removed.push(name);
    }
  }

  return {
    fromPack: oldPack.packId,
    toPack: newPack.packId,
    added,
    removed,
    changed,
    unchanged
  };
}

function main(argv) {
  if (argv.length !== 2) {
    console.error('Usage: node diff-pack.js <old-pack.json> <new-pack.json>');
    process.exit(1);
  }
  const diff = diffPacks(readJson(argv[0]), readJson(argv[1]));
  process.stdout.write(`${JSON.stringify(diff, null, 2)}\n`);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  diffPacks
};