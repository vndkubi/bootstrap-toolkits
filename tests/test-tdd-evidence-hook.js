#!/usr/bin/env node
// test-tdd-evidence-hook.js - Validate the TDD evidence agentStop gate.
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_PATH = path.join(REPO_ROOT, '.github', 'scripts', 'tdd-evidence-hook.js');

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

function runCommand(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function runHook(cwd) {
  const stdout = execFileSync(process.execPath, [SCRIPT_PATH], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10000
  });
  return JSON.parse(stdout.trim());
}

function writeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function setupRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tdd-evidence-'));
  runCommand('git', ['init'], root);
  runCommand('git', ['config', 'user.email', 'test@example.com'], root);
  runCommand('git', ['config', 'user.name', 'Test User'], root);

  writeFile(root, '.github/autorun.config.json', JSON.stringify({
    hooks: {
      tddEvidenceGate: true,
      tddEvidenceRequireSpecWorkspace: false
    }
  }));
  writeFile(root, 'src/app.js', 'module.exports = () => 1;\n');
  writeFile(root, 'tests/app.test.js', 'test("app", () => {});\n');

  runCommand('git', ['add', '.'], root);
  runCommand('git', ['commit', '-m', 'baseline'], root);
  return root;
}

function cleanup(root) {
  if (root && fs.existsSync(root)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testDisabledGateAllows() {
  const root = setupRepo();
  try {
    writeFile(root, '.github/autorun.config.json', JSON.stringify({
      hooks: { tddEvidenceGate: false }
    }));
    writeFile(root, 'src/app.js', 'module.exports = () => 2;\n');

    const result = runHook(root);
    assert(result.decision === 'allow', 'Disabled TDD evidence gate allows production changes');
  } finally {
    cleanup(root);
  }
}

function testProductionOnlyBlocks() {
  const root = setupRepo();
  try {
    writeFile(root, 'src/app.js', 'module.exports = () => 2;\n');

    const result = runHook(root);
    assert(result.decision === 'block', 'Production-only change is blocked');
    assert(result.reason.includes('no test file changed'), 'Block reason names missing test change');
  } finally {
    cleanup(root);
  }
}

function testProductionPlusTestAllows() {
  const root = setupRepo();
  try {
    writeFile(root, 'src/app.js', 'module.exports = () => 2;\n');
    writeFile(root, 'tests/app.test.js', 'test("app changed", () => {});\n');

    const result = runHook(root);
    assert(result.decision === 'allow', 'Production change with test change is allowed');
  } finally {
    cleanup(root);
  }
}

function testSpecWorkspaceRequiresArtifacts() {
  const root = setupRepo();
  try {
    writeFile(root, 'src/app.js', 'module.exports = () => 2;\n');
    writeFile(root, 'tests/app.test.js', 'test("app changed", () => {});\n');
    writeFile(root, 'specs/001-demo/spec.md', '# Demo\n');

    const missingArtifacts = runHook(root);
    assert(missingArtifacts.decision === 'block', 'Touched spec workspace without TDD artifacts is blocked');
    assert(missingArtifacts.reason.includes('test-coverage.md'), 'Block reason names test coverage artifact');
    assert(missingArtifacts.reason.includes('tdd-log.md'), 'Block reason names TDD log artifact');

    writeFile(root, 'specs/001-demo/test-coverage.md', '| AC | Test | Status |\n|---|---|---|\n');
    writeFile(root, 'specs/001-demo/tdd-log.md', '| Iter | Target | Result |\n|---|---|---|\n');

    const withArtifacts = runHook(root);
    assert(withArtifacts.decision === 'allow', 'Touched spec workspace with TDD artifacts is allowed');
  } finally {
    cleanup(root);
  }
}

function testSkipMarkerBlocks() {
  const root = setupRepo();
  try {
    writeFile(root, 'src/app.js', 'module.exports = () => 2;\n');
    writeFile(root, 'tests/app.test.js', 'test.skip("app changed", () => {});\n');

    const result = runHook(root);
    assert(result.decision === 'block', 'New skip marker is blocked');
    assert(result.reason.includes('new test skip marker'), 'Block reason names skip marker');
  } finally {
    cleanup(root);
  }
}

function run() {
  console.log('=== TDD Evidence Hook Tests ===\n');
  assert(fs.existsSync(SCRIPT_PATH), 'tdd-evidence-hook.js exists');
  testDisabledGateAllows();
  testProductionOnlyBlocks();
  testProductionPlusTestAllows();
  testSpecWorkspaceRequiresArtifacts();
  testSkipMarkerBlocks();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
