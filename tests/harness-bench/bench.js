#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const HARNESS_VERSION = '0.1.0';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function normalizeTask(task) {
  const required = ['pbiId', 'stack', 'difficulty'];
  for (const key of required) {
    if (!task[key]) {
      throw new Error(`task missing ${key}`);
    }
  }
  return {
    pbiId: task.pbiId,
    stack: task.stack,
    difficulty: task.difficulty,
    passed: task.passed === true,
    accepted: task.accepted === true,
    tokens: Math.max(0, Number(task.tokens || 0)),
    toolCalls: Math.max(0, Number(task.toolCalls || 0)),
    repairLoops: Math.max(0, Number(task.repairLoops || 0)),
    wallTimeMs: Math.max(0, Number(task.wallTimeMs || 0)),
    outcomeScore: typeof task.outcomeScore === 'number' ? Math.max(0, Math.min(1, task.outcomeScore)) : 0,
    failureReason: task.failureReason
  };
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

function buildScorecard(run, options = {}) {
  if (!run || typeof run !== 'object') {
    throw new Error('run object required');
  }
  if (!Array.isArray(run.tasks)) {
    throw new Error('run.tasks must be an array');
  }
  const tasks = run.tasks.map(normalizeTask);
  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt || new Date().toISOString(),
    runId: run.runId || `${run.variant && run.variant.id ? run.variant.id : 'run'}-${Date.now()}`,
    harnessVersion: HARNESS_VERSION,
    source: {
      kind: run.source && run.source.kind ? run.source.kind : 'manual-import',
      path: run.source && run.source.path ? run.source.path : options.sourcePath || '',
      note: run.source && run.source.note ? run.source.note : undefined
    },
    variant: {
      id: run.variant && run.variant.id ? run.variant.id : 'unknown',
      label: run.variant && run.variant.label ? run.variant.label : 'Unknown variant',
      model: run.variant && run.variant.model ? run.variant.model : 'unknown',
      gitSha: run.variant && run.variant.gitSha ? run.variant.gitSha : undefined
    },
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
  const passRateDeltaPp = round((candidate.summary.passRate - baseline.summary.passRate) * 100, 2);
  const medianTokensDeltaPct = round(pctDelta(candidate.summary.medianTokens, baseline.summary.medianTokens), 2);
  const creditsPerAcceptedChangeDeltaPct = round(
    pctDelta(candidate.summary.creditsPerAcceptedChange, baseline.summary.creditsPerAcceptedChange),
    2
  );
  const medianRepairLoopsDelta = round(candidate.summary.medianRepairLoops - baseline.summary.medianRepairLoops, 2);

  const failures = [];
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
      maxCreditRisePct
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

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index++) {
    const item = argv[index];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      args[key] = argv[index + 1];
      index++;
    } else {
      args._.push(item);
    }
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0];
  if (command === 'score') {
    if (!args.run) {
      throw new Error('Usage: node bench.js score --run <run.json> [--out <scorecard.json>]');
    }
    const runPath = path.resolve(args.run);
    const scorecard = buildScorecard(readJson(runPath), {
      sourcePath: runPath,
      generatedAt: process.env.BENCH_GENERATED_AT
    });
    if (args.out) {
      writeJson(path.resolve(args.out), scorecard);
    }
    process.stdout.write(`${JSON.stringify(scorecard, null, 2)}\n`);
    return;
  }
  if (command === 'compare') {
    if (!args.baseline || !args.candidate) {
      throw new Error('Usage: node bench.js compare --baseline <run-or-scorecard.json> --candidate <run-or-scorecard.json>');
    }
    const baselineRaw = readJson(path.resolve(args.baseline));
    const candidateRaw = readJson(path.resolve(args.candidate));
    const baseline = baselineRaw.summary ? baselineRaw : buildScorecard(baselineRaw, { sourcePath: path.resolve(args.baseline) });
    const candidate = candidateRaw.summary ? candidateRaw : buildScorecard(candidateRaw, { sourcePath: path.resolve(args.candidate) });
    process.stdout.write(`${JSON.stringify(compareScorecards(baseline, candidate), null, 2)}\n`);
    return;
  }
  throw new Error('Usage: node bench.js <score|compare> ...');
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
  buildScorecard,
  compareScorecards,
  median,
  summarizeTasks
};
