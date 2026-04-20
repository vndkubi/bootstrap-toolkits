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

// Extract additionalContext from inject.js JSON output
function extractInjectContext(stdout) {
  try {
    const json = JSON.parse(stdout.trim());
    return (json.hookSpecificOutput && json.hookSpecificOutput.additionalContext) || '';
  } catch (_e) {
    return stdout; // fallback to raw output for debugging
  }
}

function testHookFiles() {
  console.log('--- Hook JSON file validation ---\n');

  const hookFiles = [
    { file: 'memory-capture.json', event: 'PostToolUse', timeout: 5 },
    { file: 'memory-prompt.json', event: 'UserPromptSubmit', timeout: 3 },
    { file: 'memory-inject.json', event: 'SessionStart', timeout: 10 },
    { file: 'memory-summary.json', event: 'Stop', timeout: 10 },
    { file: 'memory-checkpoint.json', event: 'PreCompact', timeout: 10 }
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

    assert(hook.hooks && hook.hooks[event], `${file} uses ${event} event`);

    const entry = hook.hooks[event][0];
    assert(entry.type === 'command', `${file} has type command`);
    assert(typeof entry.command === 'string', `${file} has command field`);
    assert(entry.command.includes('.github/scripts/'), `${file} command references scripts dir`);
    assert(entry.timeout <= timeout, `${file} timeout is at most ${timeout}s`);
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
    assert(lastLine.version === 2, 'Observation has version 2');
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
  const richContext = extractInjectContext(richResult.stdout);
  assert(richContext.includes('Last Checkpoint'), 'Inject output includes checkpoint section');
  assert(richContext.includes('Recent Session Summaries'), 'Inject output includes summaries section');
  assert(richContext.includes('Recent Observations'), 'Inject output includes observations section');
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
  const contextContent = extractInjectContext(contextResult.stdout);
  assert(contextContent.includes('Recent Observations'), 'Relevance: observations section present');

  // Count how many matching observations appear in output
  const orderMatches = (contextContent.match(/OrderService/g) || []).length;
  assert(orderMatches >= 4, `Relevance: at least 4 of 5 matching observations included (found ${orderMatches})`);

  // Test recency fallback (no context)
  const fallbackResult = runScript('memory-inject.js', '');
  assert(fallbackResult.exitCode === 0, 'Fallback: exits 0 without context');
  const fallbackContent = extractInjectContext(fallbackResult.stdout);
  assert(fallbackContent.includes('Recent Observations'), 'Fallback: observations section present');
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

function testSemanticCaptureFields() {
  console.log('\n--- memory-capture.js semantic field capture ---\n');
  setup();

  const longResponse = `Authorization: Bearer super-secret-token ${'A'.repeat(700)}`;
  const fixture = JSON.stringify({
    hook_event_name: 'PostToolUse',
    session_id: 'semantic-1',
    tool_name: 'read_file',
    tool_use_id: 'tool-123',
    transcript_path: '/tmp/transcript.json',
    tool_input: {
      filePath: 'src/main.ts',
      content: 'x'.repeat(900)
    },
    tool_response: longResponse,
    future_field: 'ignored'
  });

  const result = runScript('memory-capture.js', fixture);
  assert(result.exitCode === 0, 'Semantic: exits 0 on enhanced payload');

  const obsFile = readTestMemoryFile('observations.jsonl');
  if (!fs.existsSync(obsFile)) {
    assert(false, 'Semantic: observations.jsonl created');
    return;
  }

  const lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
  const obs = JSON.parse(lines[lines.length - 1]);

  assert(obs.version === 2, 'Semantic: version bumped to 2');
  assert(obs.toolUseId === 'tool-123', 'Semantic: toolUseId captured');
  assert(obs.transcriptPath === '/tmp/transcript.json', 'Semantic: transcriptPath captured');
  assert(typeof obs.toolInput === 'string', 'Semantic: toolInput captured as bounded string');
  assert(obs.toolInput.length <= 500, 'Semantic: toolInput is truncated to 500 chars');
  assert(typeof obs.toolResponse === 'string', 'Semantic: toolResponse captured');
  assert(obs.toolResponse.length <= 500, 'Semantic: toolResponse is truncated to 500 chars');
  assert(obs.toolResponse.includes('[REDACTED]'), 'Semantic: toolResponse redacts sensitive token values');
  assert(!obs.toolResponse.includes('super-secret-token'), 'Semantic: raw token is not persisted');
  assert(!Object.prototype.hasOwnProperty.call(obs, 'future_field'), 'Semantic: unknown payload fields are ignored');

  // Missing optional fields should not break capture.
  setup();
  const minimal = runScript('memory-capture.js', JSON.stringify({
    hook_event_name: 'PostToolUse',
    session_id: 'semantic-2',
    tool_name: 'grep_search'
  }));
  assert(minimal.exitCode === 0, 'Semantic: exits 0 when optional fields are absent');
}

function testPromptCapture() {
  console.log('\n--- memory-capture.js prompt capture ---\n');
  setup();

  const promptFixture = JSON.stringify({
    hookEventName: 'UserPromptSubmit',
    sessionId: 'prompt-1',
    prompt: 'Help me improve memory capture for semantic context',
    transcript_path: '/tmp/prompt-transcript.json'
  });

  const result = runScript('memory-capture.js', promptFixture);
  assert(result.exitCode === 0, 'Prompt: exits 0 on UserPromptSubmit payload');

  const obsFile = readTestMemoryFile('observations.jsonl');
  if (!fs.existsSync(obsFile)) {
    assert(false, 'Prompt: observations.jsonl created');
    return;
  }

  let lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
  let obs = JSON.parse(lines[lines.length - 1]);
  assert(obs.type === 'prompt', 'Prompt: observation type is prompt');
  assert(obs.actor === 'user', 'Prompt: actor is user');
  assert(obs.sourceEvent === 'userPromptSubmit', 'Prompt: sourceEvent normalized to userPromptSubmit');
  assert(typeof obs.prompt === 'string' && obs.prompt.includes('semantic context'), 'Prompt: prompt text captured');
  assert(typeof obs.summary === 'string' && obs.summary.startsWith('User prompt:'), 'Prompt: summary generated');
  assert(obs.transcriptPath === '/tmp/prompt-transcript.json', 'Prompt: transcriptPath captured');

  // Empty prompt should not write observation
  setup();
  const emptyResult = runScript('memory-capture.js', JSON.stringify({
    hookEventName: 'UserPromptSubmit',
    sessionId: 'prompt-2',
    prompt: ''
  }));
  assert(emptyResult.exitCode === 0, 'Prompt: empty prompt exits 0');
  assert(!fs.existsSync(obsFile), 'Prompt: empty prompt does not create observations file');

  // Long prompt should be bounded.
  setup();
  const longPrompt = 'x'.repeat(1500);
  const longResult = runScript('memory-capture.js', JSON.stringify({
    hookEventName: 'UserPromptSubmit',
    sessionId: 'prompt-3',
    prompt: longPrompt
  }));
  assert(longResult.exitCode === 0, 'Prompt: long prompt exits 0');
  if (fs.existsSync(obsFile)) {
    lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
    obs = JSON.parse(lines[lines.length - 1]);
    assert(obs.prompt.length <= 1000, 'Prompt: long prompt truncated to 1000 chars');
  } else {
    assert(false, 'Prompt: long prompt creates observation');
  }
}

function testInjectSemanticContext() {
  console.log('\n--- memory-inject.js semantic context ---\n');
  setup();

  fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });
  const obsFile = readTestMemoryFile('observations.jsonl');
  const now = Date.now();

  const observations = [
    {
      version: 2,
      type: 'prompt',
      actor: 'user',
      summary: 'User prompt: Improve memory hook quality',
      prompt: 'Improve memory hook quality',
      timestamp: new Date(now - 2000).toISOString()
    },
    {
      version: 2,
      type: 'observation',
      actor: 'agent',
      summary: 'replace_string_in_file on src/main.ts',
      toolResponse: 'File edited successfully and verified',
      files: ['src/main.ts'],
      timestamp: new Date(now - 1000).toISOString()
    }
  ];

  fs.writeFileSync(obsFile, observations.map((item) => JSON.stringify(item)).join('\n') + '\n', 'utf8');

  const result = runScript('memory-inject.js', JSON.stringify({
    activeFile: 'src/main.ts'
  }));
  assert(result.exitCode === 0, 'Inject semantic: exits 0');

  const context = extractInjectContext(result.stdout);
  assert(context.includes('User Intent'), 'Inject semantic: includes User Intent section');
  assert(context.includes('Improve memory hook quality'), 'Inject semantic: includes prompt summary');
  assert(context.includes('replace_string_in_file on src/main.ts -> "File edited successfully'),
    'Inject semantic: includes toolResponse snippet in observation line');
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
  const warningContent = extractInjectContext(warningResult.stdout);
  assert(warningContent.includes('Known Patterns'), 'Warnings: section present');
  assert(warningContent.includes('Avoid Optional'), 'Warnings: relevant pattern shown');
  assert(warningContent.includes('record DTOs'), 'Warnings: second relevant pattern shown');
  assert(!warningContent.includes('already promoted'), 'Warnings: promoted pattern excluded');
  assert(!warningContent.includes('only happened once'), 'Warnings: one-off excluded (occurrenceCount < 2)');

  // Test: no warnings for unrelated context
  const noWarningResult = runScript('memory-inject.js', JSON.stringify({
    activeFile: 'src/config/AppConfig.java'
  }));
  assert(noWarningResult.exitCode === 0, 'No warnings: exits 0');
  const noWarningContent = extractInjectContext(noWarningResult.stdout);
  assert(!noWarningContent.includes('Known Patterns'), 'No warnings: no section for unrelated file');

  // Test: no crash when correction-patterns.json missing
  setup();
  fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });
  fs.writeFileSync(obsFile, JSON.stringify({ summary: 'test obs' }) + '\n', 'utf8');

  const noPatternsResult = runScript('memory-inject.js', JSON.stringify({
    activeFile: 'src/services/OrderService.java'
  }));
  assert(noPatternsResult.exitCode === 0, 'No patterns file: exits 0 gracefully');
  const noPatternsContent = extractInjectContext(noPatternsResult.stdout);
  assert(!noPatternsContent.includes('Known Patterns'), 'No patterns file: no warnings section');

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
  const agentWarningContent = extractInjectContext(agentWarningResult.stdout);
  assert(agentWarningContent.includes('Agent-specific warning'), 'Agent warnings: agent-specific pattern shown');
}

function testSmokeTest() {
  console.log('\n--- Hook smoke test (Step 5 validation) ---\n');

  // 5a: Structural validation — all hook files
  const hookDir = path.join('.github', 'hooks');
  const hookFiles = fs.readdirSync(hookDir).filter((f) => f.startsWith('memory-') && f.endsWith('.json'));
  const validEvents = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PreCompact', 'SubagentStart', 'SubagentStop', 'Stop'];

  hookFiles.forEach((file) => {
    const content = JSON.parse(fs.readFileSync(path.join(hookDir, file), 'utf8'));
    assert(typeof content.hooks === 'object', `5a: ${file} has hooks object`);
    Object.keys(content.hooks).forEach((event) => {
      assert(validEvents.includes(event), `5a: ${file} event '${event}' is PascalCase`);
      content.hooks[event].forEach((entry) => {
        assert(entry.type === 'command', `5a: ${file} entry type is command`);
        const hasCmd = entry.command || entry.windows || entry.linux || entry.osx;
        assert(hasCmd, `5a: ${file} entry has at least one command field`);
      });
    });
  });

  // 5b: Script availability — syntax check
  const scripts = ['memory-capture.js', 'memory-inject.js', 'memory-summary.js', 'memory-checkpoint.js'];
  scripts.forEach((script) => {
    const scriptPath = path.join(SCRIPTS_DIR, script);
    try {
      execSync(`node -c "${scriptPath}"`, { encoding: 'utf8', timeout: 5000 });
      assert(true, `5b: ${script} passes syntax check`);
    } catch (e) {
      assert(false, `5b: ${script} passes syntax check: ${e.message}`);
    }
  });

  // 5c: Dry-run — all scripts exit 0 with empty input
  setup();
  scripts.forEach((script) => {
    const result = runScript(script, '{}');
    assert(result.exitCode === 0, `5c: ${script} dry-run exits 0`);
  });

  // 5c-extra: SessionStart hook returns valid JSON with hookSpecificOutput
  fs.mkdirSync(readTestMemoryFile('summaries'), { recursive: true });
  fs.writeFileSync(readTestMemoryFile('observations.jsonl'), JSON.stringify({ summary: 'smoke test' }) + '\n', 'utf8');
  const injectResult = runScript('memory-inject.js', '{}');
  assert(injectResult.exitCode === 0, '5c: inject dry-run with data exits 0');
  let injectJson;
  try {
    injectJson = JSON.parse(injectResult.stdout.trim());
    assert(true, '5c: inject stdout is valid JSON');
  } catch (_e) {
    assert(false, '5c: inject stdout is valid JSON');
    injectJson = null;
  }
  if (injectJson) {
    assert(injectJson.hookSpecificOutput && typeof injectJson.hookSpecificOutput.additionalContext === 'string',
      '5c: inject output has hookSpecificOutput.additionalContext');
    assert(injectJson.hookSpecificOutput.hookEventName === 'SessionStart',
      '5c: inject output hookEventName is SessionStart');
  }

  teardown();
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
  testSemanticCaptureFields();
  testPromptCapture();
  testInjectSemanticContext();
  testProactiveWarnings();
  testSmokeTest();

  teardown();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
