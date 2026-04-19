#!/usr/bin/env node
// memory-summary.js — Write a session summary Markdown at stop event.
// Uses Node stdlib only. Fails open: exits 0 on any error.
'use strict';

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.resolve(process.env.MEMORY_DIR || '.memory');
const OBS_FILE = path.join(MEMORY_DIR, 'observations.jsonl');
const SUMMARIES_DIR = path.join(MEMORY_DIR, 'summaries');

function main() {
  let input = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const payload = tryParseJSON(input);
      const sessionId = (payload && (payload.session_id || payload.sessionId)) || generateSessionId();
      const observations = loadSessionObservations(sessionId);

      const summary = buildSummary(sessionId, observations, payload);

      // Ensure summaries directory exists
      if (!fs.existsSync(SUMMARIES_DIR)) {
        fs.mkdirSync(SUMMARIES_DIR, { recursive: true });
      }

      const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
      fs.writeFileSync(
        path.join(SUMMARIES_DIR, filename),
        summary,
        'utf8'
      );
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

function generateSessionId() {
  return 'session-' + Date.now().toString(36);
}

function loadSessionObservations(sessionId) {
  if (!fs.existsSync(OBS_FILE)) return [];
  try {
    return fs.readFileSync(OBS_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => tryParseJSON(line))
      .filter((obj) => obj && obj.sessionId === sessionId);
  } catch (_e) {
    return [];
  }
}

function buildSummary(sessionId, observations, payload) {
  const lines = [];
  lines.push(`# Session Summary`);
  lines.push('');
  lines.push(`- **Session**: ${sessionId}`);
  lines.push(`- **Date**: ${new Date().toISOString()}`);
  lines.push(`- **Observations**: ${observations.length}`);
  lines.push('');

  // Highlights: unique tool names and files touched
  const tools = [...new Set(observations.map((o) => o.toolName).filter(Boolean))];
  const files = [...new Set(observations.flatMap((o) => o.files || []))];

  if (tools.length > 0) {
    lines.push('## Tools Used');
    tools.forEach((t) => lines.push(`- ${t}`));
    lines.push('');
  }

  if (files.length > 0) {
    lines.push('## Files Touched');
    files.slice(0, 20).forEach((f) => lines.push(`- ${f}`));
    if (files.length > 20) {
      lines.push(`- ... and ${files.length - 20} more`);
    }
    lines.push('');
  }

  // Decisions from observations
  const decisions = observations.filter((o) => o.type === 'decision');
  if (decisions.length > 0) {
    lines.push('## Decisions');
    decisions.forEach((d) => lines.push(`- ${d.summary}`));
    lines.push('');
  }

  const nextSteps = payload && (payload.nextSteps || payload.next_steps);
  if (nextSteps) {
    lines.push('## Next Steps');
    if (Array.isArray(nextSteps)) {
      nextSteps.forEach((step) => lines.push(`- ${step}`));
    } else {
      lines.push(`- ${nextSteps}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

main();
