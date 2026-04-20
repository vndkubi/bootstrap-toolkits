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
const PATTERNS_FILE = path.join(MEMORY_DIR, 'correction-patterns.json');
const MAX_OUTPUT_LINES = 60;
const MAX_SUMMARIES = 3;
const MAX_OBSERVATIONS = 10;
const MAX_WARNINGS = 5;
const MAX_WARNING_LINES = 10;

// Scoring weights (TD-2)
const WEIGHT_FILE = 0.40;
const WEIGHT_RECENCY = 0.30;
const WEIGHT_KEYWORD = 0.20;
const WEIGHT_AGENT = 0.10;

function main() {
  let input = '';
  let handled = false;

  function handleInject(rawInput) {
    if (handled) {
      return;
    }
    handled = true;

    try {
      const payload = tryParseJSON(rawInput || '');
      const context = parseSessionContext(payload);

      const sections = [];

      const checkpoint = readTrimmedFile(CHECKPOINT_FILE);
      if (checkpoint) {
        sections.push('## Last Checkpoint\n' + checkpoint);
      }

      const summaries = loadLatestSummaries(MAX_SUMMARIES);
      if (summaries.length > 0) {
        sections.push('## Recent Session Summaries\n' + summaries.join('\n\n'));
      }

      const observations = loadRelevantObservations(MAX_OBSERVATIONS, context);
      if (observations.length > 0) {
        sections.push(
          '## Recent Observations\n' + observations.map((item) => `- ${item.summary}`).join('\n')
        );
      }

      const warnings = buildWarningsSection(context);
      if (warnings) {
        sections.push(warnings);
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

      // VS Code expects JSON with hookSpecificOutput.additionalContext
      const result = {
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: output
        }
      };
      process.stdout.write(JSON.stringify(result) + '\n');
    } catch (_err) {
    }
    process.exit(0);
  }

  // Read stdin with a 1-second drain timeout.
  // If VS Code pipes session context, we use it for relevance scoring.
  // If stdin is empty or slow, proceed with env vars only (no blocking session start).
  const stdinTimeout = setTimeout(() => {
    handleInject(input);
  }, 1000);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    clearTimeout(stdinTimeout);
    handleInject(input);
  });
  process.stdin.on('error', () => {
    clearTimeout(stdinTimeout);
    handleInject(input);
  });

  // Hard safety timeout — fail open
  setTimeout(() => process.exit(0), 10000);
}

function readTrimmedFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }

  return fs.readFileSync(filePath, 'utf8').trim();
}

function parseSessionContext(payload) {
  const context = {
    activeFile: null,
    activeDir: null,
    agentName: null,
    keywords: []
  };

  if (!payload || typeof payload !== 'object') {
    // Try environment variables as fallback
    context.activeFile = process.env.COPILOT_ACTIVE_FILE || null;
    context.agentName = process.env.COPILOT_AGENT || null;
  } else {
    context.activeFile = payload.activeFile || payload.active_file || process.env.COPILOT_ACTIVE_FILE || null;
    context.agentName = payload.agentName || payload.agent_name || process.env.COPILOT_AGENT || null;
  }

  if (context.activeFile) {
    context.activeDir = path.dirname(context.activeFile);
    context.keywords = extractKeywords(context.activeFile);
  }

  return context;
}

function extractKeywords(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  return text
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2)
    .filter((w) => !STOP_WORDS.has(w));
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'has',
  'her', 'was', 'one', 'our', 'out', 'src', 'main', 'java', 'test',
  'com', 'org', 'net', 'this', 'that', 'with', 'from', 'have', 'will'
]);

function loadRelevantObservations(limit, context) {
  if (!fs.existsSync(OBS_FILE)) {
    return [];
  }

  const allObs = fs.readFileSync(OBS_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => tryParseJSON(line))
    .filter((item) => item && typeof item.summary === 'string' && item.summary.length > 0);

  const hasContext = context && (context.activeFile || context.agentName);

  if (!hasContext) {
    // Recency fallback: same behavior as before
    return allObs.slice(-limit);
  }

  const now = Date.now();
  const scored = allObs.map((obs) => ({
    ...obs,
    _score: scoreObservation(obs, context, now)
  }));

  scored.sort((a, b) => b._score - a._score);

  return scored.slice(0, limit).map((obs) => {
    const result = { ...obs };
    delete result._score;
    return result;
  });
}

function scoreObservation(obs, context, now) {
  const fileScore = computeFileMatch(obs, context);
  const recencyScore = computeRecency(obs, now);
  const keywordScore = computeKeywordScore(obs, context);
  const agentScore = computeAgentMatch(obs, context);

  return (WEIGHT_FILE * fileScore)
    + (WEIGHT_RECENCY * recencyScore)
    + (WEIGHT_KEYWORD * keywordScore)
    + (WEIGHT_AGENT * agentScore);
}

function computeFileMatch(obs, context) {
  if (!context.activeFile || !Array.isArray(obs.files) || obs.files.length === 0) {
    return 0;
  }

  const activeNorm = context.activeFile.replace(/\\/g, '/').toLowerCase();
  const activeDirNorm = context.activeDir ? context.activeDir.replace(/\\/g, '/').toLowerCase() : '';

  for (const f of obs.files) {
    const fNorm = (f || '').replace(/\\/g, '/').toLowerCase();
    if (fNorm === activeNorm) {
      return 1.0;
    }
    if (activeDirNorm && fNorm.startsWith(activeDirNorm + '/')) {
      return 0.6;
    }
    if (activeDirNorm && fNorm.includes(activeDirNorm)) {
      return 0.4;
    }
  }

  return 0;
}

function computeRecency(obs, now) {
  if (!obs.timestamp) {
    return 0;
  }

  const obsTime = new Date(obs.timestamp).getTime();
  if (isNaN(obsTime)) {
    return 0;
  }

  const hoursDiff = (now - obsTime) / (1000 * 60 * 60);
  // Exponential decay: half-life of 24 hours
  return Math.exp(-0.693 * hoursDiff / 24);
}

function computeKeywordScore(obs, context) {
  if (!context.keywords || context.keywords.length === 0) {
    return 0;
  }

  const obsKeywords = extractKeywords(obs.summary || '');
  if (obsKeywords.length === 0) {
    return 0;
  }

  const contextSet = new Set(context.keywords);
  let matches = 0;
  for (const kw of obsKeywords) {
    if (contextSet.has(kw)) {
      matches++;
    }
  }

  const union = new Set([...context.keywords, ...obsKeywords]).size;
  return union > 0 ? matches / union : 0;
}

function computeAgentMatch(obs, context) {
  if (!context.agentName) {
    return 0.5; // No agent context → neutral
  }

  if (!obs.agentName) {
    return 0.5; // Global observation → neutral
  }

  return obs.agentName === context.agentName ? 1.0 : 0.0;
}

function buildWarningsSection(context) {
  try {
    if (!fs.existsSync(PATTERNS_FILE)) {
      return null;
    }

    const raw = fs.readFileSync(PATTERNS_FILE, 'utf8');
    const data = tryParseJSON(raw);
    if (!data || !Array.isArray(data.patterns)) {
      return null;
    }

    // Filter: not promoted, >=2 occurrences, relevant to context
    let relevant = data.patterns.filter((p) =>
      !p.promoted
      && p.occurrenceCount >= 2
      && isPatternRelevant(p, context)
    );

    // Prefer agent-specific first, then global
    if (context && context.agentName) {
      const agentSpecific = relevant.filter((p) => p.agentName === context.agentName);
      const global = relevant.filter((p) => !p.agentName);
      relevant = [...agentSpecific, ...global];
    }

    relevant = relevant.slice(0, MAX_WARNINGS);

    if (relevant.length === 0) {
      return null;
    }

    const lines = relevant.map((p) =>
      `- ⚠️ **${p.summary}** (seen ${p.occurrenceCount}x)`
    );

    // Bound to MAX_WARNING_LINES
    const bounded = lines.slice(0, MAX_WARNING_LINES);

    return '## ⚠️ Known Patterns\n' + bounded.join('\n');
  } catch (_err) {
    return null;
  }
}

function isPatternRelevant(pattern, context) {
  if (!context || !context.activeFile) {
    return false; // No context → no warnings
  }

  if (!Array.isArray(pattern.relevantFiles) || pattern.relevantFiles.length === 0) {
    return true; // Global pattern with no file scope → always relevant
  }

  const activeNorm = context.activeFile.replace(/\\/g, '/').toLowerCase();
  const activeDirNorm = context.activeDir
    ? context.activeDir.replace(/\\/g, '/').toLowerCase()
    : '';

  for (const f of pattern.relevantFiles) {
    const fNorm = (f || '').replace(/\\/g, '/').toLowerCase();
    if (activeNorm.includes(fNorm) || fNorm.includes(activeNorm)) {
      return true;
    }
    if (activeDirNorm && (activeDirNorm.includes(fNorm) || fNorm.includes(activeDirNorm))) {
      return true;
    }
  }

  return false;
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

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (_err) {
    return null;
  }
}

main();
