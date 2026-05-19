#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOOK_CONFIG_PATH = path.join(ROOT, '.github', 'hooks', 'manifest-fidelity.json');
const HOOK_SCRIPT_PATH = path.join(ROOT, '.github', 'scripts', 'manifest-fidelity-hook.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function withTempWorkspace(setupFn) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-fidelity-hook-'));
  try {
    setupFn(workspaceRoot);
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

function runHook(workspaceRoot, payload) {
  const stdout = execFileSync('node', [HOOK_SCRIPT_PATH], {
    cwd: workspaceRoot,
    input: payload || '{}',
    encoding: 'utf8',
    timeout: 10000
  });
  return JSON.parse(stdout);
}

console.log('=== Manifest Fidelity Hook Tests ===\n');

test('Hook config file exists and uses official Copilot CLI command-hook fields', () => {
  assert(fs.existsSync(HOOK_CONFIG_PATH), 'manifest-fidelity hook config exists');
  const config = JSON.parse(fs.readFileSync(HOOK_CONFIG_PATH, 'utf8'));
  assert(config.version === 1, 'hook config version is 1');
  assert(Array.isArray(config.hooks.agentStop), 'agentStop hook is configured');
  const entry = config.hooks.agentStop[0];
  assert(entry.type === 'command', 'hook entry type is command');
  assert(typeof entry.bash === 'string' && entry.bash.includes('manifest-fidelity-hook.js'), 'bash command points to hook script');
  assert(typeof entry.powershell === 'string' && entry.powershell.includes('manifest-fidelity-hook.js'), 'powershell command points to hook script');
  assert(entry.timeoutSec === 15, 'hook timeout is set');
});

test('Hook allows the turn when no bootstrap manifest exists', () => {
  withTempWorkspace((workspaceRoot) => {
    const result = runHook(workspaceRoot);
    assert(result.decision === 'allow', `expected allow, got ${JSON.stringify(result)}`);
  });
});

test('Hook allows the turn when manifest fidelity passes', () => {
  withTempWorkspace((workspaceRoot) => {
    writeFile(path.join(workspaceRoot, '.github', 'copilot-instructions.md'), '# ok\n');
    writeJson(path.join(workspaceRoot, '.github', '.bootstrap-manifest.json'), {
      keep: {
        files: ['.github/copilot-instructions.md']
      }
    });

    const result = runHook(workspaceRoot);
    assert(result.decision === 'allow', `expected allow, got ${JSON.stringify(result)}`);
  });
});

test('Hook blocks the turn when manifest fidelity fails', () => {
  withTempWorkspace((workspaceRoot) => {
    writeFile(path.join(workspaceRoot, '.github', 'skills', 'common-doc-generator', 'SKILL.md'), '# leftover\n');
    writeJson(path.join(workspaceRoot, '.github', '.bootstrap-manifest.json'), {
      removed: {
        skills: ['common-doc-generator']
      }
    });

    const result = runHook(workspaceRoot);
    assert(result.decision === 'block', `expected block, got ${JSON.stringify(result)}`);
    assert(
      typeof result.reason === 'string' && result.reason.includes('removed path still exists'),
      `expected failure reason, got ${JSON.stringify(result)}`
    );
  });
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
