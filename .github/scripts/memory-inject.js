#!/usr/bin/env node
// memory-inject.js — Emit bounded summary-first context block at sessionStart.
// Uses Node stdlib only. Fails open: exits 0 on any error.
'use strict';

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.resolve(process.env.MEMORY_DIR || '.memory');
const SUMMARIES_DIR = path.join(MEMORY_DIR, 'summaries');
const CHECKPOINT_FILE = path.join(MEMORY_DIR, 'checkpoint.md');
const OBS_FILE = path.join(MEMORY_DIR, 'observations.jsonl');
const MAX_OUTPUT_LINES = 60;
const MAX_SUMMARIES = 3;
const MAX_OBSERVATIONS = 10;

function main() {
  try {
    const sections = [];

    const checkpoint = readTrimmedFile(CHECKPOINT_FILE);
    if (checkpoint) {
      sections.push('## Last Checkpoint\n' + checkpoint);
    }

    const summaries = loadLatestSummaries(MAX_SUMMARIES);
    if (summaries.length > 0) {
      sections.push('## Recent Session Summaries\n' + summaries.join('\n\n'));
    }

    const observations = loadRecentObservations(MAX_OBSERVATIONS);
    if (observations.length > 0) {
      sections.push(
        '## Recent Observations\n' + observations.map((item) => `- ${item.summary}`).join('\n')
      );
    }

    if (sections.length === 0) {
      process.exit(0);
    }

    const header = '# Session Memory Context\n';
    let output = header + '\n' + sections.join('\n\n');

    const lines = output.split('\n');
    if (lines.length > MAX_OUTPUT_LINES) {
      output = lines.slice(0, MAX_OUTPUT_LINES).join('\n')
        + '\n\n> [Truncated — see .memory/ for full context]';
    }

    process.stdout.write(output + '\n');
  } catch (_err) {
  }
  process.exit(0);
}

function readTrimmedFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }

  return fs.readFileSync(filePath, 'utf8').trim();
}

function loadLatestSummaries(limit) {
  if (!fs.existsSync(SUMMARIES_DIR)) {
    return [];
  }

  return fs.readdirSync(SUMMARIES_DIR)
    .filter((fileName) => fileName.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, limit)
    .map((fileName) => {
      const content = readTrimmedFile(path.join(SUMMARIES_DIR, fileName));
      if (!content) {
        return '';
      }

      const lines = content.split('\n').filter(Boolean);
      const preview = lines[0] === '# Session Summary'
        ? lines.slice(1, 7)
        : lines.slice(0, 6);

      return `### ${fileName.replace(/\.md$/, '')}\n${preview.join('\n')}`;
    })
    .filter(Boolean);
}

function loadRecentObservations(limit) {
  if (!fs.existsSync(OBS_FILE)) {
    return [];
  }

  return fs.readFileSync(OBS_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .slice(-limit)
    .map((line) => tryParseJSON(line))
    .filter((item) => item && typeof item.summary === 'string' && item.summary.length > 0);
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (_err) {
    return null;
  }
}

main();
