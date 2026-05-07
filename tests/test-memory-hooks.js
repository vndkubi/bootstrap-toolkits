#!/usr/bin/env node
// test-memory-hooks.js — Validate the retained post-edit helper contract.
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

function testPath(...segments) {
  return path.join(TEST_MEMORY_DIR, ...segments);
}

function runScript(stdinData, extraEnv) {
  const scriptPath = path.join(SCRIPTS_DIR, 'post-edit-run-tests.js');
  try {
    const result = execSync(`node "${scriptPath}"`, {
      input: stdinData || '',
      encoding: 'utf8',
      timeout: 10000,
      env: { ...process.env, MEMORY_DIR: TEST_MEMORY_DIR, ...(extraEnv || {}) }
    });
    return { exitCode: 0, stdout: result };
  } catch (e) {
    return { exitCode: e.status || 1, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

function testNoDefaultHookRegistration() {
  console.log('--- Post-edit hook registration ---\n');

  const filePath = path.join(HOOKS_DIR, 'post-edit-run-tests.json');
  assert(!fs.existsSync(filePath), 'post-edit-run-tests.json is not retained by default');
}

function testScriptFile() {
  console.log('\n--- Post-edit Script validation ---\n');

  const scriptPath = path.join(SCRIPTS_DIR, 'post-edit-run-tests.js');
  assert(fs.existsSync(scriptPath), 'post-edit-run-tests.js exists');

  const content = fs.readFileSync(scriptPath, 'utf8');
  assert(content.includes("require('fs')") || content.includes('require("fs")'), 'post-edit-run-tests.js uses Node fs module');
  assert(!content.includes("require('axios')") && !content.includes("require('node-fetch')"), 'post-edit-run-tests.js uses stdlib only');
  assert(content.includes('process.exit(0)'), 'post-edit-run-tests.js exits cleanly');

  try {
    execSync(`node -c "${scriptPath}"`, { encoding: 'utf8', timeout: 5000 });
    assert(true, 'post-edit-run-tests.js passes syntax check');
  } catch (e) {
    assert(false, `post-edit-run-tests.js passes syntax check: ${e.message}`);
  }
}

function testPostEditBehavior() {
  console.log('\n--- post-edit-run-tests.js behavior ---\n');
  setup();

  const disabledResult = runScript('{}');
  assert(disabledResult.exitCode === 0, 'Post-edit: exits 0 when hook config is absent/disabled');

  fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });
  const enabledConfigPath = testPath('autorun.config.json');
  fs.writeFileSync(
    enabledConfigPath,
    JSON.stringify({
      hooks: { postEditRunTests: true },
      cost: { tokenCap: 200000, warnAtPercent: 90 }
    }),
    'utf8'
  );

  const branchSkipResult = runScript(
    '{}',
    {
      AUTORUN_CONFIG_PATH: enabledConfigPath,
      AUTORUN_POST_EDIT_BRANCH: 'feature/not-autorun',
      AUTORUN_POST_EDIT_TEST_COMMAND: 'node -e "process.exit(23)"'
    }
  );
  assert(branchSkipResult.exitCode === 0, 'Post-edit: skips outside autorun/* branches');

  const enabledResult = runScript(
    JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'create_file' }),
    {
      AUTORUN_CONFIG_PATH: enabledConfigPath,
      AUTORUN_POST_EDIT_BRANCH: 'autorun/test-run',
      AUTORUN_POST_EDIT_TEST_COMMAND: 'node -e "process.exit(0)"'
    }
  );
  assert(enabledResult.exitCode === 0, 'Post-edit: runs configured test command on autorun/* branch');

  const tracesDir = testPath('traces');
  fs.mkdirSync(tracesDir, { recursive: true });
  fs.writeFileSync(
    path.join(tracesDir, 'autorun-budget.jsonl'),
    JSON.stringify({ tokenCost: 190000 }) + '\n',
    'utf8'
  );

  const budgetConfigPath = testPath('autorun-budget.config.json');
  fs.writeFileSync(
    budgetConfigPath,
    JSON.stringify({
      hooks: { postEditRunTests: true },
      cost: { tokenCap: 200000, warnAtPercent: 90 },
      artifacts: { traceRoot: tracesDir }
    }),
    'utf8'
  );

  const budgetSkipResult = runScript(
    '{}',
    {
      AUTORUN_CONFIG_PATH: budgetConfigPath,
      AUTORUN_POST_EDIT_BRANCH: 'autorun/budgeted',
      AUTORUN_POST_EDIT_TEST_COMMAND: 'node -e "process.exit(29)"'
    }
  );
  assert(budgetSkipResult.exitCode === 0, 'Post-edit: skips once latest trace reaches warning budget');
}

function run() {
  console.log('=== Post-edit Helper Tests ===\n');
  testNoDefaultHookRegistration();
  testScriptFile();
  testPostEditBehavior();
  teardown();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
