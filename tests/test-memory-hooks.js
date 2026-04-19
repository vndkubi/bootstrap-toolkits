#!/usr/bin/env node
// test-memory-hooks.js — Fixture-driven tests for memory hook scripts.
// Uses Node stdlib only. Tests capture, inject, summary, and checkpoint scripts.
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = path.join('.github', 'scripts');
const HOOKS_DIR = path.join('.github', 'hooks');
const TEST_MEMORY_DIR = path.join('.test-memory');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function setup() {
  if (fs.existsSync(TEST_MEMORY_DIR)) {
    fs.rmSync(TEST_MEMORY_DIR, { recursive: true });
  }
}

function teardown() {
  if (fs.existsSync(TEST_MEMORY_DIR)) {
    fs.rmSync(TEST_MEMORY_DIR, { recursive: true });
  }
}

function readTestMemoryFile(...segments) {
  return path.join(TEST_MEMORY_DIR, ...segments);
}

function runScript(scriptName, stdinData) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  try {
    const result = execSync(`node "${scriptPath}"`, {
      input: stdinData || '',
      encoding: 'utf8',
      timeout: 10000,
      env: { ...process.env, MEMORY_DIR: TEST_MEMORY_DIR }
    });
    return { exitCode: 0, stdout: result };
  } catch (e) {
    return { exitCode: e.status || 1, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

function testHookFiles() {
  console.log('--- Hook JSON file validation ---\n');

  const hookFiles = [
    { file: 'memory-capture.json', event: 'postToolUse', timeout: 5 },
    { file: 'memory-inject.json', event: 'sessionStart', timeout: 10 },
    { file: 'memory-summary.json', event: 'stop', timeout: 10 },
    { file: 'memory-checkpoint.json', event: 'preCompact', timeout: 10 }
  ];

  hookFiles.forEach(({ file, event, timeout }) => {
    const filePath = path.join(HOOKS_DIR, file);
    assert(fs.existsSync(filePath), `${file} exists`);

    let hook;
    try {
      hook = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      assert(true, `${file} is valid JSON`);
    } catch (e) {
      assert(false, `${file} is valid JSON: ${e.message}`);
      return;
    }

    assert(hook.version === 1, `${file} has version 1`);
    assert(hook.hooks && hook.hooks[event], `${file} uses ${event} event`);

    const entry = hook.hooks[event][0];
    assert(entry.type === 'command', `${file} has type command`);
    assert(typeof entry.bash === 'string', `${file} has bash command`);
    assert(typeof entry.powershell === 'string', `${file} has powershell command`);
    assert(entry.timeoutSec <= timeout, `${file} timeout is at most ${timeout}s`);
  });
}

function testScriptFiles() {
  console.log('\n--- Script file existence ---\n');

  const scripts = [
    'memory-capture.js',
    'memory-inject.js',
    'memory-summary.js',
    'memory-checkpoint.js'
  ];

  scripts.forEach((script) => {
    const scriptPath = path.join(SCRIPTS_DIR, script);
    assert(fs.existsSync(scriptPath), `${script} exists`);

    const content = fs.readFileSync(scriptPath, 'utf8');
    assert(content.includes("require('fs')") || content.includes("require(\"fs\")"),
      `${script} uses Node fs module`);
    assert(!content.includes("require('axios')") && !content.includes("require('node-fetch')"),
      `${script} uses stdlib only (no external deps)`);
    assert(content.includes('process.exit(0)'), `${script} exits cleanly`);
  });
}

function testCaptureScript() {
  console.log('\n--- memory-capture.js behavior ---\n');
  setup();

  const fixture = JSON.stringify({
    sessionId: 'test-session-1',
    toolName: 'replace_string_in_file',
    filePath: 'src/example.ts'
  });

  const result = runScript('memory-capture.js', fixture);
  assert(result.exitCode === 0, 'Exits 0 on valid input');

  const obsFile = readTestMemoryFile('observations.jsonl');
  if (fs.existsSync(obsFile)) {
    const lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
    const lastLine = JSON.parse(lines[lines.length - 1]);
    assert(lastLine.version === 1, 'Observation has version 1');
    assert(lastLine.sourceEvent === 'postToolUse', 'sourceEvent is postToolUse');
    assert(lastLine.toolName === 'replace_string_in_file', 'toolName matches input');
    assert(lastLine.sessionId === 'test-session-1', 'sessionId matches input');
    assert(typeof lastLine.timestamp === 'string', 'timestamp is present');
  } else {
    assert(false, 'observations.jsonl was created');
  }

  // Test: empty input exits cleanly
  const emptyResult = runScript('memory-capture.js', '{}');
  assert(emptyResult.exitCode === 0, 'Exits 0 on empty tool event');

  // Test: invalid JSON exits cleanly
  const badResult = runScript('memory-capture.js', 'not json');
  assert(badResult.exitCode === 0, 'Exits 0 on invalid JSON (fail-open)');

  setup();

  const runtimeFixture = JSON.stringify({
    timestamp: '2026-04-19T03:41:33.684Z',
    hook_event_name: 'PostToolUse',
    session_id: 'runtime-session-1',
    tool_name: 'create_file',
    tool_input: {
      filePath: 'specs/example/plan.md',
      content: 'fixture'
    }
  });

  const runtimeResult = runScript('memory-capture.js', runtimeFixture);
  assert(runtimeResult.exitCode === 0, 'Exits 0 on realistic runtime payload');

  if (fs.existsSync(obsFile)) {
    const lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
    const lastLine = JSON.parse(lines[lines.length - 1]);
    assert(lastLine.sessionId === 'runtime-session-1', 'Runtime payload sessionId matches');
    assert(lastLine.sourceEvent === 'postToolUse', 'Normalizes hook_event_name casing');
    assert(lastLine.files.includes('specs/example/plan.md'), 'Extracts nested tool_input filePath');
  } else {
    assert(false, 'observations.jsonl was created for runtime payload');
  }
}

function testInjectScript() {
  console.log('\n--- memory-inject.js behavior ---\n');
  setup();

  const result = runScript('memory-inject.js', '');
  assert(result.exitCode === 0, 'Exits 0 when no memory exists');

  fs.mkdirSync(readTestMemoryFile('summaries'), { recursive: true });
  fs.writeFileSync(
    readTestMemoryFile('checkpoint.md'),
    '# Checkpoint\n\n## Goal\nShip memory hooks',
    'utf8'
  );
  fs.writeFileSync(
    readTestMemoryFile('summaries', '2026-04-19T03-41-33-684Z.md'),
    '# Session Summary\n\n- **Session**: previous-session\n- **Date**: 2026-04-19T03:41:33.684Z\n- **Observations**: 1',
    'utf8'
  );
  fs.writeFileSync(
    readTestMemoryFile('observations.jsonl'),
    JSON.stringify({ summary: 'create_file on specs/example/plan.md' }) + '\n',
    'utf8'
  );

  const richResult = runScript('memory-inject.js', '');
  assert(richResult.exitCode === 0, 'Exits 0 when memory exists');
  assert(richResult.stdout.includes('Last Checkpoint'), 'Inject output includes checkpoint section');
  assert(richResult.stdout.includes('Recent Session Summaries'), 'Inject output includes summaries section');
  assert(richResult.stdout.includes('Recent Observations'), 'Inject output includes observations section');
}

function testSummaryScript() {
  console.log('\n--- memory-summary.js behavior ---\n');
  setup();

  fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });
  fs.writeFileSync(
    readTestMemoryFile('observations.jsonl'),
    JSON.stringify({
      sessionId: 'test-session-summary',
      toolName: 'create_file',
      files: ['src/example.ts'],
      type: 'observation',
      summary: 'create_file on src/example.ts'
    }) + '\n',
    'utf8'
  );

  const fixture = JSON.stringify({
    session_id: 'test-session-summary',
    nextSteps: ['Run tests']
  });

  const result = runScript('memory-summary.js', fixture);
  assert(result.exitCode === 0, 'Exits 0 on valid summary input');

  const summariesDir = readTestMemoryFile('summaries');
  if (fs.existsSync(summariesDir)) {
    const summaryFiles = fs.readdirSync(summariesDir).filter((fileName) => fileName.endsWith('.md'));
    assert(summaryFiles.length === 1, 'Creates one summary file');
    const content = fs.readFileSync(path.join(summariesDir, summaryFiles[0]), 'utf8');
    assert(content.includes('test-session-summary'), 'Summary contains session id');
    assert(content.includes('create_file'), 'Summary contains tool usage');
    assert(content.includes('src/example.ts'), 'Summary contains touched file');
    assert(content.includes('Run tests'), 'Summary contains next steps');
  } else {
    assert(false, 'summaries directory was created');
  }
}

function testCheckpointScript() {
  console.log('\n--- memory-checkpoint.js behavior ---\n');
  setup();

  const fixture = JSON.stringify({
    goal: 'Complete Phase 2 implementation',
    currentState: ['Hooks created', 'Scripts written'],
    decisions: ['Use JSONL over SQLite'],
    nextVerification: 'Run fixture tests'
  });

  const result = runScript('memory-checkpoint.js', fixture);
  assert(result.exitCode === 0, 'Exits 0 on valid checkpoint input');

  const cpFile = readTestMemoryFile('checkpoint.md');
  if (fs.existsSync(cpFile)) {
    const content = fs.readFileSync(cpFile, 'utf8');
    assert(content.includes('Complete Phase 2 implementation'), 'Checkpoint contains goal');
    assert(content.includes('Hooks created'), 'Checkpoint contains current state');
    assert(content.includes('Use JSONL over SQLite'), 'Checkpoint contains decisions');
    assert(content.includes('Run fixture tests'), 'Checkpoint contains next verification');
  } else {
    assert(false, 'checkpoint.md was created');
  }
}

function run() {
  console.log('=== Memory Hook Tests ===\n');

  setup();

  testHookFiles();
  testScriptFiles();
  testCaptureScript();
  testInjectScript();
  testSummaryScript();
  testCheckpointScript();

  teardown();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
