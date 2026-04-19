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

function testRotation() {
  console.log('\n--- memory-capture.js rotation behavior ---\n');
  setup();

  // Write 502 lines to observations.jsonl (above 500 threshold)
  fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });
  const obsFile = readTestMemoryFile('observations.jsonl');

  const lines = [];
  for (let i = 0; i < 502; i++) {
    lines.push(JSON.stringify({
      version: 1,
      sessionId: `session-${i}`,
      timestamp: new Date(Date.now() - (502 - i) * 60000).toISOString(),
      type: 'observation',
      summary: `tool-${i} invoked`,
      toolName: `tool-${i}`,
      files: [`file-${i}.js`]
    }));
  }
  fs.writeFileSync(obsFile, lines.join('\n') + '\n', 'utf8');

  // Append one more observation to trigger rotation
  const fixture = JSON.stringify({
    sessionId: 'rotation-trigger',
    toolName: 'trigger_tool',
    filePath: 'trigger.js'
  });

  const result = runScript('memory-capture.js', fixture);
  assert(result.exitCode === 0, 'Rotation: exits 0');

  // Check active file is <=500 lines
  if (fs.existsSync(obsFile)) {
    const activeLines = fs.readFileSync(obsFile, 'utf8').split('\n').filter(Boolean);
    assert(activeLines.length <= 500, `Rotation: active file has ${activeLines.length} lines (<=500)`);
  } else {
    assert(false, 'Rotation: observations.jsonl still exists');
  }

  // Check archive was created
  const archiveDir = readTestMemoryFile('archive');
  if (fs.existsSync(archiveDir)) {
    const archiveFiles = fs.readdirSync(archiveDir).filter((f) => f.endsWith('.jsonl'));
    assert(archiveFiles.length >= 1, 'Rotation: archive file created');
    assert(archiveFiles[0].match(/^observations-\d{4}-\d{2}-\d{2}\.jsonl$/), 'Rotation: archive file name format correct');

    const archiveContent = fs.readFileSync(path.join(archiveDir, archiveFiles[0]), 'utf8');
    const archiveLines = archiveContent.split('\n').filter(Boolean);
    assert(archiveLines.length >= 3, `Rotation: archive has ${archiveLines.length} lines (>=3 old lines archived)`);

    // Verify archived content is valid JSONL
    let allValid = true;
    for (const line of archiveLines) {
      try {
        JSON.parse(line);
      } catch (_e) {
        allValid = false;
        break;
      }
    }
    assert(allValid, 'Rotation: archive content is valid JSONL');
  } else {
    assert(false, 'Rotation: archive directory created');
  }

  // Test no rotation when below threshold
  setup();
  fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });
  const smallLines = [];
  for (let i = 0; i < 10; i++) {
    smallLines.push(JSON.stringify({ version: 1, summary: `small-${i}`, toolName: `tool-${i}` }));
  }
  fs.writeFileSync(obsFile, smallLines.join('\n') + '\n', 'utf8');

  const smallResult = runScript('memory-capture.js', JSON.stringify({
    sessionId: 'no-rotation',
    toolName: 'small_tool',
    filePath: 'small.js'
  }));
  assert(smallResult.exitCode === 0, 'No rotation: exits 0');

  const noArchiveDir = readTestMemoryFile('archive');
  assert(!fs.existsSync(noArchiveDir), 'No rotation: archive directory not created when below threshold');
}

function testRelevanceScoring() {
  console.log('\n--- memory-inject.js relevance scoring ---\n');
  setup();

  fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });
  const obsFile = readTestMemoryFile('observations.jsonl');

  // Create observations with different files
  const now = Date.now();
  const observations = [
    // 5 matching observations (same directory)
    ...Array.from({ length: 5 }, (_, i) => ({
      version: 1,
      summary: `edit on src/services/OrderService.java (${i})`,
      toolName: 'replace_string_in_file',
      files: ['src/services/OrderService.java'],
      timestamp: new Date(now - (5 - i) * 60000).toISOString()
    })),
    // 95 unrelated observations (older)
    ...Array.from({ length: 95 }, (_, i) => ({
      version: 1,
      summary: `edit on tests/util/Helper.java (${i})`,
      toolName: 'replace_string_in_file',
      files: ['tests/util/Helper.java'],
      timestamp: new Date(now - (100 - i) * 3600000).toISOString()
    }))
  ];

  fs.writeFileSync(
    obsFile,
    observations.map((o) => JSON.stringify(o)).join('\n') + '\n',
    'utf8'
  );

  // Test with active file context
  const contextResult = runScript('memory-inject.js', JSON.stringify({
    activeFile: 'src/services/OrderService.java'
  }));
  assert(contextResult.exitCode === 0, 'Relevance: exits 0 with context');
  assert(contextResult.stdout.includes('Recent Observations'), 'Relevance: observations section present');

  // Count how many matching observations appear in output
  const orderMatches = (contextResult.stdout.match(/OrderService/g) || []).length;
  assert(orderMatches >= 4, `Relevance: at least 4 of 5 matching observations included (found ${orderMatches})`);

  // Test recency fallback (no context)
  const fallbackResult = runScript('memory-inject.js', '');
  assert(fallbackResult.exitCode === 0, 'Fallback: exits 0 without context');
  assert(fallbackResult.stdout.includes('Recent Observations'), 'Fallback: observations section present');
}

function testAgentContext() {
  console.log('\n--- memory-capture.js agent context ---\n');
  setup();

  // Test: agentName from payload field
  const agentFixture = JSON.stringify({
    sessionId: 'agent-test-1',
    toolName: 'create_file',
    filePath: 'test.ts',
    agentName: 'implementor'
  });

  const result = runScript('memory-capture.js', agentFixture);
  assert(result.exitCode === 0, 'Agent context: exits 0');

  const obsFile = readTestMemoryFile('observations.jsonl');
  if (fs.existsSync(obsFile)) {
    const lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
    const obs = JSON.parse(lines[lines.length - 1]);
    assert(obs.agentName === 'implementor', 'Agent context: agentName captured from payload');
  } else {
    assert(false, 'Agent context: observations.jsonl exists');
  }

  // Test: agent_name field (snake_case)
  setup();
  const snakeFixture = JSON.stringify({
    sessionId: 'agent-test-2',
    tool_name: 'read_file',
    agent_name: 'test-specialist',
    tool_input: { filePath: 'test.ts' }
  });

  const snakeResult = runScript('memory-capture.js', snakeFixture);
  assert(snakeResult.exitCode === 0, 'Agent snake_case: exits 0');

  if (fs.existsSync(obsFile)) {
    const lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
    const obs = JSON.parse(lines[lines.length - 1]);
    assert(obs.agentName === 'test-specialist', 'Agent snake_case: agent_name captured');
  }

  // Test: no agent context → agentName absent
  setup();
  const noAgentFixture = JSON.stringify({
    sessionId: 'agent-test-3',
    toolName: 'grep_search',
    filePath: 'test.ts'
  });

  const noAgentResult = runScript('memory-capture.js', noAgentFixture);
  assert(noAgentResult.exitCode === 0, 'No agent: exits 0');

  if (fs.existsSync(obsFile)) {
    const lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
    const obs = JSON.parse(lines[lines.length - 1]);
    assert(!obs.agentName, 'No agent: agentName is absent when not provided');
  }
}

function testProactiveWarnings() {
  console.log('\n--- memory-inject.js proactive warnings ---\n');
  setup();

  fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });

  // Create correction-patterns.json with test patterns
  const patterns = {
    version: 1,
    generatedAt: new Date().toISOString(),
    patterns: [
      {
        patternKey: 'avoid-optional-entity',
        summary: 'Avoid Optional<> on JPA entity fields',
        occurrenceCount: 5,
        relevantFiles: ['src/services/'],
        agentName: null,
        promoted: false
      },
      {
        patternKey: 'use-record-dto',
        summary: 'Use record DTOs instead of mutable POJOs',
        occurrenceCount: 3,
        relevantFiles: ['src/services/'],
        agentName: null,
        promoted: false
      },
      {
        patternKey: 'promoted-pattern',
        summary: 'This pattern is already promoted',
        occurrenceCount: 10,
        relevantFiles: ['src/services/'],
        agentName: null,
        promoted: true
      },
      {
        patternKey: 'one-off',
        summary: 'This only happened once',
        occurrenceCount: 1,
        relevantFiles: ['src/services/'],
        agentName: null,
        promoted: false
      },
      {
        patternKey: 'unrelated-pattern',
        summary: 'This is in a different module',
        occurrenceCount: 5,
        relevantFiles: ['src/billing/'],
        agentName: null,
        promoted: false
      },
      {
        patternKey: 'agent-specific',
        summary: 'Agent-specific warning for implementor',
        occurrenceCount: 3,
        relevantFiles: ['src/services/'],
        agentName: 'implementor',
        promoted: false
      }
    ]
  };

  const patternsFile = readTestMemoryFile('correction-patterns.json');
  fs.writeFileSync(patternsFile, JSON.stringify(patterns), 'utf8');

  // Write a minimal observation so inject has something to show
  const obsFile = readTestMemoryFile('observations.jsonl');
  fs.writeFileSync(obsFile, JSON.stringify({ summary: 'test obs' }) + '\n', 'utf8');

  // Test: warnings appear for matching context
  const warningResult = runScript('memory-inject.js', JSON.stringify({
    activeFile: 'src/services/OrderService.java'
  }));
  assert(warningResult.exitCode === 0, 'Warnings: exits 0');
  assert(warningResult.stdout.includes('Known Patterns'), 'Warnings: section present');
  assert(warningResult.stdout.includes('Avoid Optional'), 'Warnings: relevant pattern shown');
  assert(warningResult.stdout.includes('record DTOs'), 'Warnings: second relevant pattern shown');
  assert(!warningResult.stdout.includes('already promoted'), 'Warnings: promoted pattern excluded');
  assert(!warningResult.stdout.includes('only happened once'), 'Warnings: one-off excluded (occurrenceCount < 2)');

  // Test: no warnings for unrelated context
  const noWarningResult = runScript('memory-inject.js', JSON.stringify({
    activeFile: 'src/config/AppConfig.java'
  }));
  assert(noWarningResult.exitCode === 0, 'No warnings: exits 0');
  assert(!noWarningResult.stdout.includes('Known Patterns'), 'No warnings: no section for unrelated file');

  // Test: no crash when correction-patterns.json missing
  setup();
  fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });
  fs.writeFileSync(obsFile, JSON.stringify({ summary: 'test obs' }) + '\n', 'utf8');

  const noPatternsResult = runScript('memory-inject.js', JSON.stringify({
    activeFile: 'src/services/OrderService.java'
  }));
  assert(noPatternsResult.exitCode === 0, 'No patterns file: exits 0 gracefully');
  assert(!noPatternsResult.stdout.includes('Known Patterns'), 'No patterns file: no warnings section');

  // Test: agent-specific warnings preferred
  setup();
  fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });
  fs.writeFileSync(patternsFile, JSON.stringify(patterns), 'utf8');
  fs.writeFileSync(obsFile, JSON.stringify({ summary: 'test obs' }) + '\n', 'utf8');

  const agentWarningResult = runScript('memory-inject.js', JSON.stringify({
    activeFile: 'src/services/OrderService.java',
    agentName: 'implementor'
  }));
  assert(agentWarningResult.exitCode === 0, 'Agent warnings: exits 0');
  assert(agentWarningResult.stdout.includes('Agent-specific warning'), 'Agent warnings: agent-specific pattern shown');
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
  testRotation();
  testRelevanceScoring();
  testAgentContext();
  testProactiveWarnings();

  teardown();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
