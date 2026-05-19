#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const ROOT = process.cwd();
const DEFAULT_CONFIG_FILES = [
  '.github/autorun.config.json',
  '.github/autorun.config.example.json'
];

const CODE_EXTENSIONS = new Set([
  '.c',
  '.cc',
  '.cpp',
  '.cs',
  '.css',
  '.go',
  '.h',
  '.hpp',
  '.java',
  '.js',
  '.jsx',
  '.kt',
  '.kts',
  '.php',
  '.py',
  '.rb',
  '.rs',
  '.scss',
  '.sql',
  '.swift',
  '.ts',
  '.tsx',
  '.vue'
]);

const SKIP_MARKERS = [
  /(^|[.\s])describe\.skip\s*\(/,
  /(^|[.\s])it\.skip\s*\(/,
  /(^|[.\s])test\.skip\s*\(/,
  /\bxdescribe\s*\(/,
  /\bxit\s*\(/,
  /@Disabled\b/,
  /@Ignore\b/,
  /pytest\.mark\.skip/,
  /\bskipIf\s*\(/,
  /\bAssume\.assume/
];

function main() {
  try {
    const result = run();
    writeDecision(result.decision, result.reason);
  } catch (error) {
    writeDecision('allow', `TDD evidence hook failed open: ${error.message}`);
  }
}

function run() {
  const config = loadConfig();
  if (!readBoolean(config, ['hooks', 'tddEvidenceGate'], false)) {
    return allow();
  }

  if (!isGitRepo()) {
    return allow();
  }

  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    return allow();
  }

  const productionFiles = changedFiles.filter(isProductionCodePath);
  if (productionFiles.length === 0) {
    return allow();
  }

  const testFiles = changedFiles.filter(isTestPath);
  const issues = [];

  if (testFiles.length === 0) {
    issues.push('production code changed but no test file changed');
  }

  const workspace = resolveFeatureWorkspace(changedFiles);
  const requireSpecWorkspace = readBoolean(config, ['hooks', 'tddEvidenceRequireSpecWorkspace'], false);
  if (!workspace && requireSpecWorkspace) {
    issues.push('production code changed but no specs/<feature>/ workspace was touched');
  }

  if (workspace) {
    const requiredArtifacts = [
      path.join(workspace, 'test-coverage.md'),
      path.join(workspace, 'tdd-log.md')
    ];

    for (const artifact of requiredArtifacts) {
      if (!hasContent(path.join(ROOT, artifact))) {
        issues.push(`missing or empty TDD artifact: ${artifact}`);
      }
    }
  }

  const skipFindings = findAddedSkipMarkers(testFiles);
  for (const finding of skipFindings) {
    issues.push(`new test skip marker in ${finding.file}: ${finding.marker}`);
  }

  if (issues.length === 0) {
    return allow();
  }

  const productionSummary = productionFiles.slice(0, 8).join('\n');
  const suffix = productionFiles.length > 8
    ? `\n...and ${productionFiles.length - 8} more production file(s)`
    : '';

  return {
    decision: 'block',
    reason: [
      'TDD evidence gate failed. Fix the test-first evidence before ending this turn.',
      '',
      'Issues:',
      ...issues.map((issue) => `- ${issue}`),
      '',
      'Production files detected:',
      productionSummary + suffix,
      '',
      'Expected evidence:',
      '- changed test file(s) for the behavior/regression',
      '- no newly added skip markers',
      '- specs/<feature>/test-coverage.md and specs/<feature>/tdd-log.md when using a spec workspace'
    ].join('\n')
  };
}

function allow() {
  return { decision: 'allow' };
}

function writeDecision(decision, reason) {
  const payload = { decision };
  if (reason) {
    payload.reason = reason;
  }
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function loadConfig() {
  const explicitPath = process.env.AUTORUN_CONFIG_PATH;
  if (explicitPath) {
    return readJsonFile(path.resolve(ROOT, explicitPath)) || {};
  }

  for (const relativePath of DEFAULT_CONFIG_FILES) {
    const parsed = readJsonFile(path.join(ROOT, relativePath));
    if (parsed) {
      return parsed;
    }
  }

  return {};
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_err) {
    return null;
  }
}

function readBoolean(source, segments, fallback) {
  let value = source;
  for (const segment of segments) {
    if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, segment)) {
      return fallback;
    }
    value = value[segment];
  }

  return typeof value === 'boolean' ? value : fallback;
}

function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000
    });
    return true;
  } catch (_err) {
    return false;
  }
}

function getChangedFiles() {
  const tracked = [
    ...gitLines('git diff --name-only --diff-filter=ACMRT HEAD --'),
    ...gitLines('git diff --cached --name-only --diff-filter=ACMRT HEAD --')
  ];
  const untracked = gitLines('git ls-files --others --exclude-standard');
  return unique([...tracked, ...untracked].map(normalizePath))
    .filter((filePath) => filePath.length > 0);
}

function gitLines(command) {
  try {
    return execSync(command, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (_err) {
    return [];
  }
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function unique(values) {
  return [...new Set(values)];
}

function isProductionCodePath(filePath) {
  const normalized = normalizePath(filePath);
  if (isExcludedRoot(normalized) || isTestPath(normalized)) {
    return false;
  }

  return CODE_EXTENSIONS.has(path.extname(normalized).toLowerCase());
}

function isExcludedRoot(filePath) {
  return /^(?:\.github|\.copilot|\.claude|docs|specs|node_modules|dist|build|coverage|target)\//.test(filePath)
    || /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|composer\.lock|poetry\.lock)$/.test(filePath);
}

function isTestPath(filePath) {
  const normalized = normalizePath(filePath);
  const fileName = path.basename(normalized);

  if (/^(?:test|tests|__tests__)\//.test(normalized)) {
    return true;
  }

  if (/(?:^|\/)(?:test|tests|__tests__)\//.test(normalized)) {
    return true;
  }

  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(fileName)) {
    return true;
  }

  return /(?:Test|Tests)\.(?:java|cs|kt|kts)$/.test(fileName)
    || /^test_.*\.py$/.test(fileName)
    || /_test\.go$/.test(fileName)
    || /Spec\.(?:php|rb)$/.test(fileName);
}

function resolveFeatureWorkspace(changedFiles) {
  const touched = unique(changedFiles
    .map((filePath) => {
      const match = normalizePath(filePath).match(/^specs\/[^/]+/);
      return match ? match[0] : '';
    })
    .filter(Boolean));

  if (touched.length > 0) {
    return touched[0];
  }

  return '';
}

function hasContent(filePath) {
  try {
    return fs.existsSync(filePath)
      && fs.statSync(filePath).isFile()
      && fs.readFileSync(filePath, 'utf8').trim().length > 0;
  } catch (_err) {
    return false;
  }
}

function findAddedSkipMarkers(testFiles) {
  const findings = [];

  for (const filePath of testFiles) {
    const lines = getAddedLines(filePath);
    for (const line of lines) {
      const marker = SKIP_MARKERS.find((regex) => regex.test(line));
      if (marker) {
        findings.push({ file: filePath, marker: line.trim().slice(0, 120) });
      }
    }
  }

  return findings;
}

function getAddedLines(filePath) {
  const fullPath = path.join(ROOT, filePath);
  if (gitFileLines(['ls-files', '--others', '--exclude-standard', '--', filePath]).length > 0) {
    try {
      return fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
    } catch (_err) {
      return [];
    }
  }

  try {
    return execFileSync('git', ['diff', '--unified=0', '--', filePath], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000
    })
      .split(/\r?\n/)
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .map((line) => line.slice(1));
  } catch (_err) {
    return [];
  }
}

function gitFileLines(args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (_err) {
    return [];
  }
}

main();
