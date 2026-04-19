#!/usr/bin/env node
// memory-checkpoint.js — Preserve current task state at preCompact event.
// Uses Node stdlib only. Fails open: exits 0 on any error.
'use strict';

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.resolve(process.env.MEMORY_DIR || '.memory');
const CHECKPOINT_FILE = path.join(MEMORY_DIR, 'checkpoint.md');

function main() {
  let input = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const payload = tryParseJSON(input);

      const checkpoint = buildCheckpoint(payload);

      if (!fs.existsSync(MEMORY_DIR)) {
        fs.mkdirSync(MEMORY_DIR, { recursive: true });
      }

      fs.writeFileSync(CHECKPOINT_FILE, checkpoint, 'utf8');
    } catch (_err) {
    }
    process.exit(0);
  });

  process.stdin.on('error', () => process.exit(0));
  setTimeout(() => process.exit(0), 9500);
}

function tryParseJSON(str) {
  try { return JSON.parse(str); } catch (_e) { return null; }
}

function buildCheckpoint(payload) {
  const lines = [];
  lines.push('# Checkpoint');
  lines.push('');
  lines.push(`> Captured at: ${new Date().toISOString()}`);
  lines.push('');

  const goal = getFirstString(payload, ['goal']) || 'Not specified';
  lines.push('## Goal');
  lines.push(goal);
  lines.push('');

  lines.push('## Current State');
  const currentState = getStringList(payload, ['currentState', 'current_state']);
  if (currentState.length > 0) {
    currentState.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push('- State not captured from payload');
  }
  lines.push('');

  lines.push('## Decisions');
  const decisions = getStringList(payload, ['decisions']);
  if (decisions.length > 0) {
    decisions.forEach((decision) => lines.push(`- ${decision}`));
  } else {
    lines.push('- No decisions captured');
  }
  lines.push('');

  lines.push('## Next Verification');
  const nextVerification = getFirstString(payload, ['nextVerification', 'next_verification', 'nextStep']);
  if (nextVerification) {
    lines.push(nextVerification);
  } else {
    lines.push('Not specified');
  }
  lines.push('');

  return lines.join('\n');
}

function getFirstString(payload, keys) {
  if (!payload) {
    return '';
  }

  for (const key of keys) {
    if (typeof payload[key] === 'string' && payload[key].trim().length > 0) {
      return payload[key];
    }
  }

  return '';
}

function getStringList(payload, keys) {
  if (!payload) {
    return [];
  }

  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return [value];
    }
  }

  return [];
}

main();
