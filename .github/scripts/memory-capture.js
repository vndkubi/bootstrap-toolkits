#!/usr/bin/env node
// memory-capture.js — Append one JSONL observation from a postToolUse event.
// Uses Node stdlib only. Fails open: exits 0 on any error.
'use strict';

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.resolve(process.env.MEMORY_DIR || '.memory');
const OBS_FILE = path.join(MEMORY_DIR, 'observations.jsonl');

function main() {
  let input = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const payload = tryParseJSON(input);
      if (!payload) {
        process.exit(0);
      }

      const toolName = extractToolName(payload);
      if (!toolName) {
        process.exit(0);
      }

      const observation = {
        version: 1,
        sessionId: payload.session_id || payload.sessionId || 'unknown',
        timestamp: new Date().toISOString(),
        sourceEvent: normalizeHookEventName(payload.hook_event_name || payload.hookEventName || 'postToolUse'),
        type: 'observation',
        actor: 'agent',
        summary: buildSummary(toolName, payload),
        files: extractFiles(payload),
        toolName,
        tags: [],
        trusted: false
      };

      if (!fs.existsSync(MEMORY_DIR)) {
        fs.mkdirSync(MEMORY_DIR, { recursive: true });
      }

      fs.appendFileSync(OBS_FILE, JSON.stringify(observation) + '\n', 'utf8');
    } catch (_err) {
    }
    process.exit(0);
  });

  process.stdin.on('error', () => process.exit(0));
  setTimeout(() => process.exit(0), 4500);
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (_err) {
    return null;
  }
}

function extractToolName(payload) {
  return payload.tool_name || payload.toolName || payload.tool || '';
}

function getToolInput(payload) {
  return payload.tool_input || payload.toolInput || payload.input || {};
}

function normalizeHookEventName(eventName) {
  if (!eventName || typeof eventName !== 'string') {
    return 'postToolUse';
  }

  return eventName.charAt(0).toLowerCase() + eventName.slice(1);
}

function buildSummary(toolName, payload) {
  const files = extractFiles(payload);
  if (files.length === 1) {
    return `${toolName} on ${files[0]}`;
  }
  if (files.length > 1) {
    return `${toolName} on ${files.length} files`;
  }
  return `${toolName} invoked`;
}

function extractFiles(payload) {
  const input = getToolInput(payload);
  const files = [];
  const singleCandidates = [
    input.filePath,
    input.file_path,
    input.path,
    input.old_path,
    input.new_path,
    payload.filePath,
    payload.file_path,
    payload.path
  ];

  singleCandidates
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .forEach((value) => files.push(value));

  if (Array.isArray(input.filePaths)) {
    input.filePaths
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .forEach((value) => files.push(value));
  }

  return [...new Set(files)];
}

main();
