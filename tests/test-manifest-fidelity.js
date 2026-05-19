#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  collectRemovedSymbols,
  isRuntimeLoadedSurface,
  validateManifestFidelity
} = require(path.join('..', '.github', 'scripts', 'validate-manifest-fidelity.js'));

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
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-fidelity-'));
  try {
    setupFn(workspaceRoot);
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

console.log('=== Manifest Fidelity Tests ===\n');

test('Validator passes when removed paths are gone and keep paths exist', () => {
  withTempWorkspace((workspaceRoot) => {
    writeFile(path.join(workspaceRoot, '.github', 'copilot-instructions.md'), '# ok\n');
    writeFile(path.join(workspaceRoot, '.github', 'agents', 'dev-orchestrator.agent.md'), 'Use generate-copilot-config.\n');
    writeJson(path.join(workspaceRoot, '.github', '.bootstrap-manifest.json'), {
      keep: {
        files: [
          '.github/copilot-instructions.md',
          '.github/agents/dev-orchestrator.agent.md'
        ]
      },
      removed: {
        skills: ['common-doc-generator']
      }
    });

    const result = validateManifestFidelity(workspaceRoot);
    assert(result.issues.length === 0, `expected no issues, got ${JSON.stringify(result.issues)}`);
  });
});

test('Validator fails when manifest claims a removed skill but the folder still exists', () => {
  withTempWorkspace((workspaceRoot) => {
    writeFile(path.join(workspaceRoot, '.github', 'copilot-instructions.md'), '# ok\n');
    writeFile(path.join(workspaceRoot, '.github', 'skills', 'common-doc-generator', 'SKILL.md'), '# leftover\n');
    writeJson(path.join(workspaceRoot, '.github', '.bootstrap-manifest.json'), {
      keep: {
        files: ['.github/copilot-instructions.md']
      },
      removed: {
        skills: ['common-doc-generator']
      }
    });

    const result = validateManifestFidelity(workspaceRoot);
    assert(
      result.issues.some((issue) => issue.type === 'removed_path_still_exists' && issue.path === '.github/skills/common-doc-generator'),
      `expected removed_path_still_exists issue, got ${JSON.stringify(result.issues)}`
    );
  });
});

test('Validator fails when manifest keep set references a missing file', () => {
  withTempWorkspace((workspaceRoot) => {
    writeJson(path.join(workspaceRoot, '.github', '.bootstrap-manifest.json'), {
      keep: {
        files: ['.github/copilot-instructions.md']
      }
    });

    const result = validateManifestFidelity(workspaceRoot);
    assert(
      result.issues.some((issue) => issue.type === 'kept_path_missing' && issue.path === '.github/copilot-instructions.md'),
      `expected kept_path_missing issue, got ${JSON.stringify(result.issues)}`
    );
  });
});

test('Validator fails when runtime-loaded files still reference removed symbols', () => {
  withTempWorkspace((workspaceRoot) => {
    writeFile(
      path.join(workspaceRoot, '.github', 'agents', 'dev-orchestrator.agent.md'),
      'Do not retain common-doc-generator after cleanup.\n'
    );
    writeJson(path.join(workspaceRoot, '.github', '.bootstrap-manifest.json'), {
      keep: {
        files: ['.github/agents/dev-orchestrator.agent.md']
      },
      removed: {
        skills: ['common-doc-generator']
      }
    });

    const result = validateManifestFidelity(workspaceRoot);
    assert(
      result.issues.some(
        (issue) => issue.type === 'stale_reference_to_removed_symbol'
          && issue.path === '.github/agents/dev-orchestrator.agent.md'
          && issue.symbol === 'common-doc-generator'
      ),
      `expected stale reference issue, got ${JSON.stringify(result.issues)}`
    );
  });
});

test('Removed symbols are derived from explicit manifest paths', () => {
  const symbols = collectRemovedSymbols({
    removed: {
      skills: ['.github/skills/common-doc-generator/SKILL.md'],
      agents: ['.github/agents/conductor.agent.md'],
      prompts: ['.github/prompts/bootstrap-copilot.prompt.md'],
      instructions: ['.github/instructions/java.instructions.md']
    }
  });

  assert(symbols.includes('common-doc-generator'), `expected common-doc-generator in ${JSON.stringify(symbols)}`);
  assert(symbols.includes('conductor'), `expected conductor in ${JSON.stringify(symbols)}`);
  assert(symbols.includes('bootstrap-copilot'), `expected bootstrap-copilot in ${JSON.stringify(symbols)}`);
  assert(symbols.includes('java'), `expected java in ${JSON.stringify(symbols)}`);
});

test('Human-only summary files are excluded from stale-reference checks', () => {
  withTempWorkspace((workspaceRoot) => {
    writeFile(path.join(workspaceRoot, '.github', '.bootstrap-summary.md'), 'Removed: common-doc-generator\n');
    writeJson(path.join(workspaceRoot, '.github', '.bootstrap-manifest.json'), {
      keep: {
        files: ['.github/.bootstrap-summary.md']
      },
      removed: {
        skills: ['common-doc-generator']
      }
    });

    const result = validateManifestFidelity(workspaceRoot);
    assert(result.issues.length === 0, `expected no issues, got ${JSON.stringify(result.issues)}`);
  });
});

test('Runtime-loaded instructions remain subject to stale-reference checks', () => {
  withTempWorkspace((workspaceRoot) => {
    writeFile(
      path.join(workspaceRoot, '.github', 'instructions', 'java.instructions.md'),
      'Do not use the removed common-doc-generator flow.\n'
    );
    writeJson(path.join(workspaceRoot, '.github', '.bootstrap-manifest.json'), {
      keep: {
        files: ['.github/instructions/java.instructions.md']
      },
      removed: {
        skills: ['common-doc-generator']
      }
    });

    const result = validateManifestFidelity(workspaceRoot);
    assert(
      result.issues.some(
        (issue) => issue.type === 'stale_reference_to_removed_symbol'
          && issue.path === '.github/instructions/java.instructions.md'
      ),
      `expected stale reference issue, got ${JSON.stringify(result.issues)}`
    );
  });
});

test('Runtime-loaded surface detection matches Copilot-loaded files only', () => {
  assert(isRuntimeLoadedSurface('.github/copilot-instructions.md'), 'copilot-instructions.md is runtime-loaded');
  assert(isRuntimeLoadedSurface('.github/instructions/java.instructions.md'), '.instructions.md is runtime-loaded');
  assert(isRuntimeLoadedSurface('.github/agents/dev-orchestrator.agent.md'), '.agent.md is runtime-loaded');
  assert(isRuntimeLoadedSurface('AGENTS.md'), 'AGENTS.md is runtime-loaded');
  assert(isRuntimeLoadedSurface('.github/skills/generate-copilot-config/SKILL.md'), 'skill instructions are runtime-loaded');
  assert(!isRuntimeLoadedSurface('.github/.bootstrap-summary.md'), 'bootstrap summary is not runtime-loaded');
  assert(!isRuntimeLoadedSurface('.github/prompts/bootstrap-copilot.prompt.md'), 'prompt files are not treated as runtime-loaded by this validator');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
