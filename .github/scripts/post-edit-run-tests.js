#!/usr/bin/env node
// post-edit-run-tests.js — Safe opt-in postToolUse runner for autorun branches.
// Uses Node stdlib only. Fails open unless the hook is explicitly enabled.
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DEFAULT_CONFIG_FILES = [
  '.github/autorun.config.json',
  '.github/autorun.config.example.json'
];
const DEFAULT_TRACE_ROOT = path.join('.github', '.traces');
const DEFAULT_TOKEN_CAP = 200000;
const DEFAULT_WARN_AT_PERCENT = 90;
const BRANCH_PATTERN = /^autorun\//;

function main() {
  let input = '';
  let handled = false;

  function finish(exitCode) {
    if (handled) {
      return;
    }
    handled = true;
    process.exit(exitCode);
  }

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      finish(run(input));
    } catch (_err) {
      finish(0);
    }
  });

  process.stdin.on('error', () => process.exit(0));
  setTimeout(() => finish(process.exitCode || 0), 115000);
}

function run(rawInput) {
  const _payload = tryParseJSON(rawInput) || {};
  const config = loadConfig();

  if (!isHookEnabled(config)) {
    return 0;
  }

  const branch = getCurrentBranch();
  if (!BRANCH_PATTERN.test(branch)) {
    return 0;
  }

  if (isAtBudgetLimit(config)) {
    return 0;
  }

  const command = resolveTestCommand();
  if (!command) {
    return 0;
  }

  return execute(command);
}

function tryParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

function loadConfig() {
  const explicitPath = process.env.AUTORUN_CONFIG_PATH;
  if (explicitPath) {
    return readJsonFile(path.resolve(ROOT, explicitPath)) || {};
  }

  for (const relativePath of DEFAULT_CONFIG_FILES) {
    const filePath = path.join(ROOT, relativePath);
    const parsed = readJsonFile(filePath);
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

function isHookEnabled(config) {
  return Boolean(config && config.hooks && config.hooks.postEditRunTests === true);
}

function getCurrentBranch() {
  const overriddenBranch = process.env.AUTORUN_POST_EDIT_BRANCH;
  if (typeof overriddenBranch === 'string' && overriddenBranch.trim().length > 0) {
    return overriddenBranch.trim();
  }

  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000
    }).trim();
  } catch (_err) {
    return '';
  }
}

function isAtBudgetLimit(config) {
  const tokenCap = readNumber(config, ['cost', 'tokenCap'], DEFAULT_TOKEN_CAP);
  const warnAtPercent = readNumber(config, ['cost', 'warnAtPercent'], DEFAULT_WARN_AT_PERCENT);
  const traceRoot = resolveTraceRoot(config);

  if (!traceRoot || !fs.existsSync(traceRoot) || !fs.statSync(traceRoot).isDirectory()) {
    return false;
  }

  const traceFiles = fs.readdirSync(traceRoot)
    .filter((fileName) => fileName.endsWith('.jsonl'))
    .map((fileName) => path.join(traceRoot, fileName));

  if (traceFiles.length === 0) {
    return false;
  }

  traceFiles.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  const latestTraceFile = traceFiles[0];
  const usedTokens = sumTokenCost(latestTraceFile);
  return usedTokens >= tokenCap * (warnAtPercent / 100);
}

function resolveTraceRoot(config) {
  const override = process.env.AUTORUN_POST_EDIT_TRACE_ROOT;
  if (typeof override === 'string' && override.trim().length > 0) {
    return path.resolve(ROOT, override);
  }

  const configuredRoot = readString(config, ['artifacts', 'traceRoot'], DEFAULT_TRACE_ROOT);
  return path.resolve(ROOT, configuredRoot);
}

function sumTokenCost(traceFile) {
  try {
    const raw = fs.readFileSync(traceFile, 'utf8');
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .reduce((total, line) => {
        const parsed = tryParseJSON(line);
        if (!parsed || typeof parsed !== 'object') {
          return total;
        }

        const direct = readNumber(parsed, ['tokenCost'], null);
        if (direct !== null) {
          return total + direct;
        }

        const snakeCase = readNumber(parsed, ['token_cost'], null);
        if (snakeCase !== null) {
          return total + snakeCase;
        }

        return total;
      }, 0);
  } catch (_err) {
    return 0;
  }
}

function readNumber(source, segments, fallback) {
  let value = source;
  for (const segment of segments) {
    if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, segment)) {
      return fallback;
    }
    value = value[segment];
  }

  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readString(source, segments, fallback) {
  let value = source;
  for (const segment of segments) {
    if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, segment)) {
      return fallback;
    }
    value = value[segment];
  }

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function resolveTestCommand() {
  const explicitCommand = process.env.AUTORUN_POST_EDIT_TEST_COMMAND;
  if (typeof explicitCommand === 'string' && explicitCommand.trim().length > 0) {
    return explicitCommand.trim();
  }

  const packageJson = path.join(ROOT, 'package.json');
  if (fs.existsSync(packageJson)) {
    if (fs.existsSync(path.join(ROOT, 'pnpm-lock.yaml'))) {
      return 'pnpm test';
    }
    if (fs.existsSync(path.join(ROOT, 'yarn.lock'))) {
      return 'yarn test';
    }
    return 'npm test';
  }

  if (fs.existsSync(path.join(ROOT, 'pom.xml'))) {
    return 'mvn -q test';
  }

  if (fs.existsSync(path.join(ROOT, 'gradlew.bat'))) {
    return 'gradlew.bat test';
  }

  if (fs.existsSync(path.join(ROOT, 'gradlew'))) {
    return './gradlew test';
  }

  if (hasTopLevelFile((fileName) => fileName.endsWith('.sln') || fileName.endsWith('.csproj'))) {
    return 'dotnet test --nologo';
  }

  if (
    fs.existsSync(path.join(ROOT, 'pyproject.toml'))
    || fs.existsSync(path.join(ROOT, 'pytest.ini'))
    || hasTopLevelFile((fileName) => /^requirements.*\.txt$/i.test(fileName))
  ) {
    return 'pytest';
  }

  const testsDir = path.join(ROOT, 'tests');
  if (fs.existsSync(testsDir) && fs.statSync(testsDir).isDirectory()) {
    const nodeScripts = fs.readdirSync(testsDir)
      .filter((fileName) => /^test-.*\.js$/i.test(fileName))
      .sort();

    if (nodeScripts.length > 0) {
      return nodeScripts.map((fileName) => `node "${path.join('tests', fileName)}"`).join(' && ');
    }
  }

  return '';
}

function hasTopLevelFile(predicate) {
  try {
    return fs.readdirSync(ROOT).some((entry) => predicate(entry));
  } catch (_err) {
    return false;
  }
}

function execute(command) {
  try {
    execSync(command, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
      timeout: 110000
    });
    return 0;
  } catch (error) {
    if (typeof error.status === 'number' && error.status >= 0 && error.status <= 255) {
      return error.status;
    }
    return 1;
  }
}

main();