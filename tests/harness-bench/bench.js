#!/usr/bin/env node
'use strict';

const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HARNESS_VERSION = '0.2.0';
const DEFAULT_MODEL = 'gpt 5.3 codex spark';
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_LOCAL_REPO_PATHS = {
  'copilot-bootstrap': ['.'],
  tokenopt: ['..', '..', 'tokenopt'],
  'code-graph': ['..', '..', 'code-graph']
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values) {
  const nums = values.filter((value) => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b);
  if (nums.length === 0) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
}

function rate(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator;
}

function creditUnitsFor(task) {
  if (typeof task.creditUnits === 'number' && Number.isFinite(task.creditUnits)) {
    return task.creditUnits;
  }
  return (task.tokens || 0) / 1000;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function shortHash(value) {
  return sha256(value).slice(0, 12);
}

function displayPath(filePath) {
  const resolved = path.resolve(filePath);
  const relative = path.relative(process.cwd(), resolved);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    return relative.split(path.sep).join('/');
  }
  return resolved;
}

function normalizeTask(task) {
  const required = ['pbiId', 'stack', 'difficulty'];
  for (const key of required) {
    if (!task[key]) {
      throw new Error(`task missing ${key}`);
    }
  }
  const normalized = {
    pbiId: task.pbiId,
    stack: task.stack,
    difficulty: task.difficulty,
    passed: task.passed === true,
    accepted: task.accepted === true,
    tokens: Math.max(0, Number(task.tokens || 0)),
    toolCalls: Math.max(0, Number(task.toolCalls || 0)),
    repairLoops: Math.max(0, Number(task.repairLoops || 0)),
    wallTimeMs: Math.max(0, Number(task.wallTimeMs || 0)),
    outcomeScore: typeof task.outcomeScore === 'number' ? Math.max(0, Math.min(1, task.outcomeScore)) : 0
  };
  for (const key of ['failureReason', 'repoId', 'repoPathHash', 'variantKind', 'tracePath', 'cacheState']) {
    if (task[key] != null) {
      normalized[key] = String(task[key]);
    }
  }
  return normalized;
}

function groupBy(tasks, field) {
  const groups = new Map();
  for (const task of tasks) {
    const key = task[field] || 'unknown';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(task);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function summarizeTasks(tasks) {
  const totalTasks = tasks.length;
  const passedTasks = tasks.filter((task) => task.passed).length;
  const acceptedUsefulChanges = tasks.filter((task) => task.accepted).length;
  const totalTokens = tasks.reduce((sum, task) => sum + task.tokens, 0);
  const totalCreditUnits = tasks.reduce((sum, task) => sum + creditUnitsFor(task), 0);
  return {
    totalTasks,
    passedTasks,
    passRate: round(rate(passedTasks, totalTasks)),
    acceptedUsefulChanges,
    totalTokens,
    totalCreditUnits: round(totalCreditUnits),
    creditsPerAcceptedChange: round(acceptedUsefulChanges === 0 ? totalCreditUnits : totalCreditUnits / acceptedUsefulChanges),
    medianTokens: round(median(tasks.map((task) => task.tokens))),
    medianToolCalls: round(median(tasks.map((task) => task.toolCalls))),
    medianRepairLoops: round(median(tasks.map((task) => task.repairLoops))),
    medianWallTimeMs: round(median(tasks.map((task) => task.wallTimeMs)))
  };
}

function summarizeGroup(key, tasks) {
  const summary = summarizeTasks(tasks);
  return {
    key,
    totalTasks: summary.totalTasks,
    passedTasks: summary.passedTasks,
    passRate: summary.passRate,
    acceptedUsefulChanges: summary.acceptedUsefulChanges,
    medianTokens: summary.medianTokens,
    medianRepairLoops: summary.medianRepairLoops
  };
}

function modelFromOptions(options = {}, fallback) {
  return options.model || fallback || DEFAULT_MODEL;
}

function buildScorecard(run, options = {}) {
  if (!run || typeof run !== 'object') {
    throw new Error('run object required');
  }
  if (!Array.isArray(run.tasks)) {
    throw new Error('run.tasks must be an array');
  }
  const tasks = run.tasks.map(normalizeTask);
  const variant = run.variant || {};
  const normalizedVariant = {
    id: variant.id || 'unknown',
    label: variant.label || 'Unknown variant',
    model: modelFromOptions(options, variant.model),
    gitSha: variant.gitSha || undefined
  };
  if (variant.modelMismatch === true) {
    normalizedVariant.modelMismatch = true;
  }
  if (variant.traceModel) {
    normalizedVariant.traceModel = String(variant.traceModel);
  }
  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt || new Date().toISOString(),
    runId: run.runId || `${normalizedVariant.id}-${Date.now()}`,
    harnessVersion: HARNESS_VERSION,
    source: {
      kind: run.source && run.source.kind ? run.source.kind : 'manual-import',
      path: run.source && run.source.path ? run.source.path : options.sourcePath || '',
      note: run.source && run.source.note ? run.source.note : undefined
    },
    variant: normalizedVariant,
    summary: summarizeTasks(tasks),
    byStack: groupBy(tasks, 'stack').map(([key, group]) => summarizeGroup(key, group)),
    byDifficulty: groupBy(tasks, 'difficulty').map(([key, group]) => summarizeGroup(key, group)),
    tasks
  };
}

function pctDelta(candidate, baseline) {
  if (baseline === 0) {
    return candidate === 0 ? 0 : 100;
  }
  return ((candidate - baseline) / baseline) * 100;
}

function compareScorecards(baseline, candidate, gates = {}) {
  const maxPassRateDropPp = gates.maxPassRateDropPp == null ? 5 : gates.maxPassRateDropPp;
  const maxMedianTokenRisePct = gates.maxMedianTokenRisePct == null ? 15 : gates.maxMedianTokenRisePct;
  const maxCreditRisePct = gates.maxCreditRisePct == null ? 15 : gates.maxCreditRisePct;
  const allowModelMismatch = gates.allowModelMismatch === true;
  const passRateDeltaPp = round((candidate.summary.passRate - baseline.summary.passRate) * 100, 2);
  const medianTokensDeltaPct = round(pctDelta(candidate.summary.medianTokens, baseline.summary.medianTokens), 2);
  const creditsPerAcceptedChangeDeltaPct = round(
    pctDelta(candidate.summary.creditsPerAcceptedChange, baseline.summary.creditsPerAcceptedChange),
    2
  );
  const medianRepairLoopsDelta = round(candidate.summary.medianRepairLoops - baseline.summary.medianRepairLoops, 2);

  const failures = [];
  if (!allowModelMismatch && (baseline.variant.modelMismatch === true || candidate.variant.modelMismatch === true)) {
    failures.push('model mismatch detected');
  }
  if (!allowModelMismatch && baseline.variant.model !== candidate.variant.model) {
    failures.push(`models differ: baseline=${baseline.variant.model}, candidate=${candidate.variant.model}`);
  }
  if (passRateDeltaPp < -maxPassRateDropPp) {
    failures.push(`pass rate dropped ${Math.abs(passRateDeltaPp)} pp`);
  }
  if (medianTokensDeltaPct > maxMedianTokenRisePct) {
    failures.push(`median tokens rose ${medianTokensDeltaPct}%`);
  }
  if (creditsPerAcceptedChangeDeltaPct > maxCreditRisePct) {
    failures.push(`credits per accepted change rose ${creditsPerAcceptedChangeDeltaPct}%`);
  }

  let claim = 'neutral';
  if (failures.length > 0) {
    claim = 'regression';
  } else if (
    passRateDeltaPp > 0 ||
    medianTokensDeltaPct < 0 ||
    creditsPerAcceptedChangeDeltaPct < 0 ||
    medianRepairLoopsDelta < 0
  ) {
    claim = 'candidate-better';
  }

  return {
    schemaVersion: 1,
    baseline: baseline.variant.id,
    candidate: candidate.variant.id,
    gates: {
      maxPassRateDropPp,
      maxMedianTokenRisePct,
      maxCreditRisePct,
      allowModelMismatch
    },
    deltas: {
      passRateDeltaPp,
      medianTokensDeltaPct,
      creditsPerAcceptedChangeDeltaPct,
      medianRepairLoopsDelta,
      acceptedUsefulChangesDelta: candidate.summary.acceptedUsefulChanges - baseline.summary.acceptedUsefulChanges
    },
    verdict: failures.length === 0 ? 'pass' : 'fail',
    claim,
    failures
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index++) {
    const item = argv[index];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      const next = argv[index + 1];
      if (next == null || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        index++;
      }
    } else {
      args._.push(item);
    }
  }
  return args;
}

function runGitFiles(repoPath) {
  try {
    const stdout = childProcess.execFileSync('git', ['-c', `safe.directory=${repoPath}`, '-C', repoPath, 'ls-files', '-z'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return stdout.split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

function readLocalRunConfig(configPath) {
  const config = readJson(configPath);
  if (!Array.isArray(config.repos)) {
    throw new Error('local-run config must contain repos[]');
  }
  return config;
}

function repoPathFromConfig(repo) {
  if (repo.path) {
    return repo.path;
  }
  const fallbackPath = defaultLocalRepoPath(repo.id);
  if (repo.pathEnv) {
    return process.env[repo.pathEnv] || fallbackPath;
  }
  return fallbackPath;
}

function defaultLocalRepoPath(repoId) {
  const parts = DEFAULT_LOCAL_REPO_PATHS[repoId];
  return parts ? path.resolve(REPO_ROOT, ...parts) : '';
}

function makeProbeTask(repo, suffix, passed, reason, options = {}) {
  return {
    pbiId: `${repo.id}:${suffix}`,
    stack: repo.stack || options.stack || 'local-repo',
    difficulty: 'validation',
    passed,
    accepted: passed,
    tokens: 0,
    toolCalls: 0,
    repairLoops: 0,
    wallTimeMs: 0,
    outcomeScore: passed ? 1 : 0,
    failureReason: passed ? undefined : reason,
    repoId: repo.id,
    repoPathHash: options.repoPath ? shortHash(path.resolve(options.repoPath)) : 'missing',
    variantKind: 'local-readonly-probe',
    cacheState: 'unknown'
  };
}

function buildLocalRun(configPath, options = {}) {
  const config = readLocalRunConfig(configPath);
  const tasks = [];
  for (const repo of config.repos) {
    if (!repo.id) {
      throw new Error('local-run repo entry missing id');
    }
    const repoPathInput = repoPathFromConfig(repo);
    const repoPath = repoPathInput ? path.resolve(repoPathInput) : '';
    const exists = repoPath ? fs.existsSync(repoPath) && fs.statSync(repoPath).isDirectory() : false;
    tasks.push(makeProbeTask(repo, 'exists', exists, 'repo path missing or not a directory', { repoPath }));
    if (!exists) {
      tasks.push(makeProbeTask(repo, 'git-files', false, 'repo missing, skipped git probe', { repoPath }));
      tasks.push(makeProbeTask(repo, 'readme', false, 'repo missing, skipped README probe', { repoPath }));
      continue;
    }
    const files = runGitFiles(repoPath);
    tasks.push(makeProbeTask(repo, 'git-files', files.length > 0, 'git ls-files returned no tracked files', { repoPath }));
    tasks.push(makeProbeTask(repo, 'readme', fs.existsSync(path.join(repoPath, 'README.md')), 'README.md missing', { repoPath }));
  }
  const model = modelFromOptions(options, config.model);
  return {
    runId: options.runId || `local-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    source: {
      kind: 'manual-import',
      path: displayPath(configPath),
      note: 'Read-only local real-repo benchmark probes. Local paths are represented by hashes in task metadata.'
    },
    variant: {
      id: options.variantId || config.variantId || 'local-real-repos',
      label: options.variantLabel || config.variantLabel || 'Local real repository probes',
      model,
      gitSha: options.gitSha || config.gitSha
    },
    tasks
  };
}

function parseJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`invalid JSONL at line ${index + 1}: ${error.message}`);
      }
    });
}

function readNestedModel(value) {
  if (!value || typeof value !== 'object') return '';
  return value.model ||
    (value.variant && value.variant.model) ||
    (value.provider && value.provider.model) ||
    (value.inputs && value.inputs.model) ||
    (value.outputs && value.outputs.model) ||
    '';
}

function countRepairLoops(events) {
  return events.filter((event) => /repair|retry|fix|rerun/i.test(String(event.action || ''))).length;
}

function importTraceRun(tracePath, options = {}) {
  const records = parseJsonl(tracePath);
  const meta = records.find((record) => record.kind === 'meta') || {};
  const events = records.filter((record) => record.kind === 'event');
  const traceModel = readNestedModel(meta) || events.map(readNestedModel).find(Boolean) || '';
  const model = modelFromOptions(options);
  const hasError = events.some((event) => event.error || event.gate);
  const tokenCost = events.reduce((sum, event) => sum + Math.max(0, Number(event.tokenCost || 0)), 0);
  const durationMs = events.reduce((sum, event) => sum + Math.max(0, Number(event.durationMs || 0)), 0);
  const modelMismatch = Boolean(traceModel && traceModel !== model);
  return {
    runId: options.runId || `trace-${path.basename(tracePath, path.extname(tracePath))}`,
    source: {
      kind: 'autorun-trace',
      path: displayPath(tracePath),
      note: modelMismatch ? `Trace model "${traceModel}" differs from benchmark model "${model}".` : undefined
    },
    variant: {
      id: options.variantId || 'autorun-trace',
      label: options.variantLabel || 'Imported autorun trace',
      model,
      traceModel: traceModel || undefined,
      modelMismatch,
      gitSha: options.gitSha
    },
    tasks: [
      {
        pbiId: meta.pbi || path.basename(tracePath, path.extname(tracePath)),
        stack: meta.stack || 'autorun',
        difficulty: meta.difficulty || 'trace',
        passed: !hasError,
        accepted: !hasError,
        tokens: tokenCost,
        toolCalls: events.length,
        repairLoops: countRepairLoops(events),
        wallTimeMs: durationMs,
        outcomeScore: hasError ? 0 : 1,
        failureReason: hasError ? 'trace contains gate or error event' : undefined,
        tracePath: path.basename(tracePath),
        variantKind: 'autorun-trace',
        cacheState: meta.cacheState || 'unknown'
      }
    ]
  };
}

function renderReport(scorecard) {
  const failures = scorecard.tasks.filter((task) => !task.passed);
  const lines = [
    `# Harness Benchmark Report`,
    '',
    `- Run: \`${scorecard.runId}\``,
    `- Variant: \`${scorecard.variant.id}\``,
    `- Model: \`${scorecard.variant.model}\``,
    `- Pass rate: ${Math.round(scorecard.summary.passRate * 100)}% (${scorecard.summary.passedTasks}/${scorecard.summary.totalTasks})`,
    `- Median tokens: ${scorecard.summary.medianTokens}`,
    `- Median repair loops: ${scorecard.summary.medianRepairLoops}`,
    ''
  ];
  if (scorecard.variant.modelMismatch) {
    lines.push(`> Model mismatch: trace model \`${scorecard.variant.traceModel || 'unknown'}\` differs from scorecard model.`);
    lines.push('');
  }
  lines.push('## Tasks', '');
  for (const task of scorecard.tasks) {
    lines.push(`- ${task.passed ? 'PASS' : 'FAIL'} \`${task.pbiId}\` (${task.stack}/${task.difficulty})${task.failureReason ? ` - ${task.failureReason}` : ''}`);
  }
  lines.push('', '## Top Token Tasks', '');
  for (const task of [...scorecard.tasks].sort((a, b) => b.tokens - a.tokens).slice(0, 3)) {
    lines.push(`- \`${task.pbiId}\`: ${task.tokens} tokens`);
  }
  if (failures.length > 0) {
    lines.push('', '## Failures', '');
    for (const task of failures) {
      lines.push(`- \`${task.pbiId}\`: ${task.failureReason || 'failed'}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function toScorecard(raw, sourcePath, options = {}) {
  return raw.summary ? raw : buildScorecard(raw, { sourcePath, model: options.model });
}

function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0];
  if (command === 'score') {
    if (!args.run) {
      throw new Error('Usage: node bench.js score --run <run.json> [--model <label>] [--out <scorecard.json>]');
    }
    const runPath = path.resolve(args.run);
    const scorecard = buildScorecard(readJson(runPath), {
      sourcePath: runPath,
      generatedAt: process.env.BENCH_GENERATED_AT,
      model: args.model
    });
    if (args.out) {
      writeJson(path.resolve(args.out), scorecard);
    }
    process.stdout.write(`${JSON.stringify(scorecard, null, 2)}\n`);
    return;
  }
  if (command === 'compare') {
    if (!args.baseline || !args.candidate) {
      throw new Error('Usage: node bench.js compare --baseline <run-or-scorecard.json> --candidate <run-or-scorecard.json> [--allow-model-mismatch]');
    }
    const baselinePath = path.resolve(args.baseline);
    const candidatePath = path.resolve(args.candidate);
    const baseline = toScorecard(readJson(baselinePath), baselinePath);
    const candidate = toScorecard(readJson(candidatePath), candidatePath);
    const diff = compareScorecards(baseline, candidate, { allowModelMismatch: args['allow-model-mismatch'] === true });
    process.stdout.write(`${JSON.stringify(diff, null, 2)}\n`);
    return;
  }
  if (command === 'local-run') {
    if (!args.config) {
      throw new Error('Usage: node bench.js local-run --config <local-repos.json> [--model <label>] [--out <run.json>]');
    }
    const run = buildLocalRun(path.resolve(args.config), { model: args.model });
    const scorecard = buildScorecard(run, { generatedAt: process.env.BENCH_GENERATED_AT, model: args.model });
    if (args.out) {
      writeJson(path.resolve(args.out), run);
    }
    process.stdout.write(`${JSON.stringify(scorecard, null, 2)}\n`);
    return;
  }
  if (command === 'import-trace') {
    if (!args.trace) {
      throw new Error('Usage: node bench.js import-trace --trace <trace.jsonl> [--model <label>] --out <run.json>');
    }
    const run = importTraceRun(path.resolve(args.trace), { model: args.model });
    if (args.out) {
      writeJson(path.resolve(args.out), run);
    }
    process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
    return;
  }
  if (command === 'report') {
    if (!args.scorecard || !args.out) {
      throw new Error('Usage: node bench.js report --scorecard <scorecard.json> --out <report.md>');
    }
    const scorecardPath = path.resolve(args.scorecard);
    const scorecard = toScorecard(readJson(scorecardPath), scorecardPath);
    const report = renderReport(scorecard);
    writeText(path.resolve(args.out), report);
    process.stdout.write(report);
    return;
  }
  throw new Error('Usage: node bench.js <score|compare|local-run|import-trace|report> ...');
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
  DEFAULT_MODEL,
  buildLocalRun,
  buildScorecard,
  compareScorecards,
  importTraceRun,
  median,
  renderReport,
  defaultLocalRepoPath,
  DEFAULT_LOCAL_REPO_PATHS,
  summarizeTasks
};
