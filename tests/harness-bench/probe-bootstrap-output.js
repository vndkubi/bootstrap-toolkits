#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildScorecard } = require('./bench.js');
const {
  validateManifestFidelity
} = require(path.join(__dirname, '..', '..', '.github', 'scripts', 'validate-manifest-fidelity.js'));

const REQUIRED_MANIFEST_PATHS = [
  '.github/copilot-instructions.md',
  '.github/.bootstrap-summary.md',
  '.github/.bootstrap-manifest.json',
  '.github/.bootstrap-state.json',
  '.github/.runtime-fidelity.json',
  'docs/ai/00-repo-index.md',
  'docs/ai/00-repo-index.json'
];

const REQUIRED_COMPLETED_PHASES = [
  '1-scan',
  '2-classify',
  '3-domain',
  '12-runtime-compilation',
  '13-validate',
  '15-manifest-snapshot'
];

function readTextIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function extractReferencedRepoDocs(content) {
  const refs = new Set();
  const pattern = /docs\/ai\/[A-Za-z0-9._/-]+\.md/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    refs.add(match[0]);
  }
  return Array.from(refs).sort();
}

function checkFile(repoRoot, relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const exists = fs.existsSync(absolutePath);
  return {
    id: `file:${toPosixPath(relativePath)}`,
    passed: exists,
    reason: exists ? 'file exists' : 'file missing'
  };
}

function checkJson(repoRoot, relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      id: `json:${toPosixPath(relativePath)}`,
      passed: false,
      reason: 'json file missing'
    };
  }
  try {
    JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    return {
      id: `json:${toPosixPath(relativePath)}`,
      passed: true,
      reason: 'valid JSON'
    };
  } catch (error) {
    return {
      id: `json:${toPosixPath(relativePath)}`,
      passed: false,
      reason: `invalid JSON: ${error.message}`
    };
  }
}

function readJsonIfExists(repoRoot, relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch {
    return null;
  }
}

function collectStringValues(value, output = []) {
  if (typeof value === 'string') {
    output.push(toPosixPath(value));
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, output);
    }
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectStringValues(item, output);
    }
  }
  return output;
}

function checkManifestIncludes(repoRoot, relativePath) {
  const manifest = readJsonIfExists(repoRoot, '.github/.bootstrap-manifest.json');
  if (!manifest) {
    return {
      id: `manifest:includes:${toPosixPath(relativePath)}`,
      passed: false,
      reason: 'manifest missing or invalid'
    };
  }
  const declared = new Set([
    ...collectStringValues(manifest.generatedFiles || []),
    ...collectStringValues(manifest.keep || {})
  ]);
  const normalizedPath = toPosixPath(relativePath);
  return {
    id: `manifest:includes:${normalizedPath}`,
    passed: declared.has(normalizedPath),
    reason: declared.has(normalizedPath) ? 'manifest declares retained output' : 'manifest does not declare retained output'
  };
}

function checkManifestFidelity(repoRoot) {
  const result = validateManifestFidelity(repoRoot);
  const passed = result.issues.length === 0;
  return {
    id: 'manifest:fidelity',
    passed,
    reason: passed ? 'manifest fidelity passed' : `manifest fidelity failed: ${result.issues.slice(0, 3).map((issue) => issue.type).join(', ')}`
  };
}

function checkBootstrapStateCompleted(repoRoot) {
  const state = readJsonIfExists(repoRoot, '.github/.bootstrap-state.json');
  if (!state || !state.phases || typeof state.phases !== 'object') {
    return {
      id: 'state:required-phases-completed',
      passed: false,
      reason: 'bootstrap state missing phases'
    };
  }
  const incomplete = REQUIRED_COMPLETED_PHASES.filter((phase) => state.phases[phase] !== 'completed');
  return {
    id: 'state:required-phases-completed',
    passed: incomplete.length === 0,
    reason: incomplete.length === 0 ? 'required phases completed' : `incomplete phases: ${incomplete.join(', ')}`
  };
}

function checksToRun(repoRoot) {
  const requiredFiles = [
    '.github/copilot-instructions.md',
    '.github/.bootstrap-summary.md',
    '.github/.bootstrap-manifest.json',
    '.github/.bootstrap-state.json',
    '.github/.runtime-fidelity.json',
    '.github/.context-packets.json',
    'docs/ai/00-repo-index.md',
    'docs/ai/00-repo-index.json'
  ];

  const checks = requiredFiles.map((relativePath) => checkFile(repoRoot, relativePath));
  checks.push(checkJson(repoRoot, '.github/.bootstrap-manifest.json'));
  checks.push(checkJson(repoRoot, '.github/.bootstrap-state.json'));
  checks.push(checkJson(repoRoot, '.github/.runtime-fidelity.json'));
  checks.push(checkJson(repoRoot, '.github/.context-packets.json'));
  checks.push(checkJson(repoRoot, 'docs/ai/00-repo-index.json'));
  checks.push(checkBootstrapStateCompleted(repoRoot));
  checks.push(checkManifestFidelity(repoRoot));

  for (const relativePath of REQUIRED_MANIFEST_PATHS) {
    checks.push(checkManifestIncludes(repoRoot, relativePath));
  }

  const summary = readTextIfExists(path.join(repoRoot, '.github', '.bootstrap-summary.md'));
  const instructions = readTextIfExists(path.join(repoRoot, '.github', 'copilot-instructions.md'));
  for (const relativePath of extractReferencedRepoDocs(`${summary}\n${instructions}`)) {
    checks.push(checkFile(repoRoot, relativePath));
  }

  return checks;
}

function probeBootstrapOutput(repoRoot, options = {}) {
  const absoluteRoot = path.resolve(repoRoot);
  const checks = checksToRun(absoluteRoot);
  const tasks = checks.map((check) => ({
    pbiId: check.id,
    stack: 'bootstrap-config',
    difficulty: 'validation',
    passed: check.passed,
    accepted: check.passed,
    tokens: 0,
    toolCalls: 0,
    repairLoops: 0,
    wallTimeMs: 0,
    outcomeScore: check.passed ? 1 : 0,
    failureReason: check.passed ? undefined : check.reason
  }));

  return buildScorecard({
    runId: options.runId || `bootstrap-probe-${path.basename(absoluteRoot)}`,
    source: {
      kind: 'manual-import',
      path: absoluteRoot,
      note: 'Read-only bootstrap output consistency probe; not an agent quality benchmark.'
    },
    variant: {
      id: options.variantId || 'bootstrap-output',
      label: options.variantLabel || 'Bootstrap output consistency',
      model: 'none',
      gitSha: options.gitSha || 'local'
    },
    tasks
  }, {
    generatedAt: options.generatedAt
  });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index++) {
    const item = argv[index];
    if (item === '--repo') {
      args.repo = argv[++index];
    } else if (item === '--out') {
      args.out = argv[++index];
    } else {
      throw new Error(`unknown argument: ${item}`);
    }
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args.repo) {
    throw new Error('Usage: node probe-bootstrap-output.js --repo <path> [--out <scorecard.json>]');
  }
  const scorecard = probeBootstrapOutput(args.repo, {
    generatedAt: process.env.BENCH_GENERATED_AT
  });
  if (args.out) {
    writeJson(path.resolve(args.out), scorecard);
  }
  process.stdout.write(`${JSON.stringify(scorecard, null, 2)}\n`);
  process.exit(scorecard.summary.passedTasks === scorecard.summary.totalTasks ? 0 : 1);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  extractReferencedRepoDocs,
  probeBootstrapOutput
};
