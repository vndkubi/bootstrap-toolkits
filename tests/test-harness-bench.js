#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateSchema } = require('./helpers/mini-json-schema');
const {
  DEFAULT_MODEL,
  buildScorecard,
  compareScorecards,
  importTraceRun,
  median
} = require('./harness-bench/bench.js');
const {
  extractReferencedRepoDocs,
  probeBootstrapOutput
} = require('./harness-bench/probe-bootstrap-output.js');

const ROOT = path.resolve(__dirname, '..');
const NODE = process.execPath;
const SCHEMA_PATH = path.join(ROOT, 'specs', '010-harness-benchmarking', 'contracts', 'scorecard.schema.json');
const BASELINE_RUN = path.join(ROOT, 'tests', 'harness-bench', 'sample-runs', 'agent-only.synthetic.json');
const CANDIDATE_RUN = path.join(ROOT, 'tests', 'harness-bench', 'sample-runs', 'bootstrap-router.synthetic.json');

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runJson(args) {
  const stdout = execFileSync(NODE, [path.join(ROOT, 'tests', 'harness-bench', 'bench.js'), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      BENCH_GENERATED_AT: '2026-05-22T00:00:00.000Z'
    }
  });
  return JSON.parse(stdout);
}

function writeCompleteBootstrapProbeFixture(tempDir, options = {}) {
  const referencedDoc = options.referencedDoc || 'docs/ai/01-business-glossary.md';
  const files = [
    '.github/copilot-instructions.md',
    '.github/.bootstrap-summary.md',
    '.github/.bootstrap-manifest.json',
    '.github/.bootstrap-state.json',
    '.github/.runtime-fidelity.json',
    '.github/.context-packets.json',
    'docs/ai/00-repo-index.md',
    'docs/ai/00-repo-index.json',
    referencedDoc
  ];
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(tempDir, file)), { recursive: true });
  }
  fs.writeFileSync(path.join(tempDir, '.github', 'copilot-instructions.md'), `Use ${referencedDoc}.\n`);
  fs.writeFileSync(path.join(tempDir, '.github', '.bootstrap-summary.md'), 'Summary.\n');
  fs.writeFileSync(path.join(tempDir, '.github', '.context-packets.json'), '{"version":1,"packets":[]}\n');
  fs.writeFileSync(path.join(tempDir, '.github', '.runtime-fidelity.json'), '{"schemaVersion":1,"artifacts":[]}\n');
  fs.writeFileSync(path.join(tempDir, 'docs', 'ai', '00-repo-index.md'), '# Repo Index\n');
  fs.writeFileSync(path.join(tempDir, 'docs', 'ai', '00-repo-index.json'), '{"schemaVersion":1}\n');
  fs.writeFileSync(path.join(tempDir, referencedDoc), '# Referenced Doc\n');
  fs.writeFileSync(path.join(tempDir, '.github', '.bootstrap-state.json'), `${JSON.stringify({
    phases: {
      '1-scan': 'completed',
      '2-classify': 'completed',
      '3-domain': 'completed',
      '12-runtime-compilation': 'completed',
      '13-validate': 'completed',
      '15-manifest-snapshot': 'completed'
    }
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(tempDir, '.github', '.bootstrap-manifest.json'), `${JSON.stringify({
    generatedFiles: files.filter((file) => file !== '.github/.bootstrap-manifest.json'),
    keep: {
      files
    }
  }, null, 2)}\n`);
}

console.log('=== Harness Bench Tests ===\n');

test('scorecard schema exists and parses', () => {
  const schema = readJson(SCHEMA_PATH);
  assert(schema.title === 'Harness benchmark scorecard', 'unexpected schema title');
  assert(schema.properties.summary, 'schema should define summary');
  assert(schema.properties.tasks, 'schema should define task rows');
});

test('median handles odd, even, and empty inputs', () => {
  assert(median([3, 1, 2]) === 2, 'odd median failed');
  assert(median([10, 2]) === 6, 'even median failed');
  assert(median([]) === 0, 'empty median failed');
});

test('buildScorecard computes core metrics from a run fixture', () => {
  const scorecard = buildScorecard(readJson(BASELINE_RUN), {
    generatedAt: '2026-05-22T00:00:00.000Z',
    sourcePath: BASELINE_RUN
  });
  assert(scorecard.summary.totalTasks === 4, 'expected 4 tasks');
  assert(scorecard.summary.passedTasks === 2, 'expected 2 passed tasks');
  assert(scorecard.summary.passRate === 0.5, `unexpected pass rate ${scorecard.summary.passRate}`);
  assert(scorecard.summary.acceptedUsefulChanges === 2, 'expected 2 accepted changes');
  assert(scorecard.summary.medianRepairLoops === 2.5, `unexpected median loops ${scorecard.summary.medianRepairLoops}`);
  assert(scorecard.byStack.length === 4, 'expected one row per stack');
});

test('scorecard output validates against the scorecard schema subset', () => {
  const schema = readJson(SCHEMA_PATH);
  const scorecard = buildScorecard(readJson(CANDIDATE_RUN), {
    generatedAt: '2026-05-22T00:00:00.000Z',
    sourcePath: CANDIDATE_RUN
  });
  const result = validateSchema(schema, scorecard);
  assert(result.valid, `scorecard invalid: ${result.errors.join('; ')}`);
});

test('buildScorecard defaults CLI benchmark model to gpt 5.3 codex spark', () => {
  const scorecard = buildScorecard({
    runId: 'default-model',
    source: { kind: 'manual-import', path: 'inline' },
    variant: { id: 'local', label: 'Local' },
    tasks: [
      {
        pbiId: 'PBI-DEFAULT',
        stack: 'node',
        difficulty: 'small',
        passed: true,
        accepted: true
      }
    ]
  }, { generatedAt: '2026-05-22T00:00:00.000Z' });
  assert(scorecard.variant.model === DEFAULT_MODEL, `unexpected default model ${scorecard.variant.model}`);
});

test('CLI score command allows explicit model override', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-model-'));
  try {
    const runPath = path.join(tempDir, 'run.json');
    fs.writeFileSync(runPath, `${JSON.stringify({
      runId: 'override-model',
      source: { kind: 'manual-import', path: 'inline' },
      variant: { id: 'local', label: 'Local' },
      tasks: [
        { pbiId: 'PBI-OVERRIDE', stack: 'node', difficulty: 'small', passed: true, accepted: true }
      ]
    })}\n`);
    const scorecard = runJson(['score', '--run', runPath, '--model', 'explicit-model']);
    assert(scorecard.variant.model === 'explicit-model', `unexpected override model ${scorecard.variant.model}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('compareScorecards reports candidate improvement without making real-world claims', () => {
  const baseline = buildScorecard(readJson(BASELINE_RUN), { generatedAt: '2026-05-22T00:00:00.000Z' });
  const candidate = buildScorecard(readJson(CANDIDATE_RUN), { generatedAt: '2026-05-22T00:00:00.000Z' });
  const diff = compareScorecards(baseline, candidate);
  assert(diff.verdict === 'pass', `expected pass, got ${diff.verdict}`);
  assert(diff.claim === 'candidate-better', `expected candidate-better, got ${diff.claim}`);
  assert(diff.deltas.passRateDeltaPp === 50, `unexpected pass delta ${diff.deltas.passRateDeltaPp}`);
  assert(diff.deltas.medianTokensDeltaPct < 0, 'expected lower median tokens');
  assert(diff.deltas.medianRepairLoopsDelta < 0, 'expected lower median repair loops');
});

test('compareScorecards fails regression gates', () => {
  const baseline = buildScorecard(readJson(CANDIDATE_RUN), { generatedAt: '2026-05-22T00:00:00.000Z' });
  const candidate = buildScorecard(readJson(BASELINE_RUN), { generatedAt: '2026-05-22T00:00:00.000Z' });
  const diff = compareScorecards(baseline, candidate);
  assert(diff.verdict === 'fail', `expected fail, got ${diff.verdict}`);
  assert(diff.claim === 'regression', `expected regression, got ${diff.claim}`);
  assert(diff.failures.length > 0, 'expected failure reasons');
});

test('compareScorecards fails model mismatches unless explicitly allowed', () => {
  const baseline = buildScorecard(readJson(BASELINE_RUN), { generatedAt: '2026-05-22T00:00:00.000Z' });
  const candidate = buildScorecard({
    ...readJson(CANDIDATE_RUN),
    variant: {
      id: 'candidate-mismatch',
      label: 'Candidate mismatch',
      model: DEFAULT_MODEL,
      traceModel: 'different-model',
      modelMismatch: true
    }
  }, { generatedAt: '2026-05-22T00:00:00.000Z' });
  const blocked = compareScorecards(baseline, candidate);
  assert(blocked.verdict === 'fail', 'expected model mismatch to fail');
  assert(blocked.failures.some((failure) => failure.includes('model')), 'expected model failure reason');
  const allowed = compareScorecards(baseline, candidate, { allowModelMismatch: true });
  assert(allowed.failures.every((failure) => !failure.includes('model')), 'expected model mismatch to be allowed');
});

test('CLI score command writes an optional scorecard file', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-bench-'));
  try {
    const outPath = path.join(tempDir, 'scorecard.json');
    const scorecard = runJson(['score', '--run', BASELINE_RUN, '--out', outPath]);
    assert(fs.existsSync(outPath), 'expected scorecard output file');
    const written = readJson(outPath);
    assert(written.runId === scorecard.runId, 'stdout and written scorecards should match');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('CLI compare command accepts raw run files', () => {
  const diff = runJson(['compare', '--baseline', BASELINE_RUN, '--candidate', CANDIDATE_RUN]);
  assert(diff.verdict === 'pass', 'expected candidate fixture to pass gates');
  assert(diff.deltas.acceptedUsefulChangesDelta === 2, 'expected +2 accepted useful changes');
});

test('CLI local-run reads local repo config without exposing absolute path', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-local-'));
  try {
    const configPath = path.join(tempDir, 'local-repos.json');
    fs.writeFileSync(configPath, `${JSON.stringify({
      repos: [
        { id: 'fixture', path: ROOT, stack: 'bootstrap' }
      ]
    })}\n`);
    const scorecard = runJson(['local-run', '--config', configPath]);
    assert(scorecard.variant.model === DEFAULT_MODEL, 'expected default model on local-run');
    assert(scorecard.tasks.some((task) => task.pbiId === 'fixture:exists' && task.passed), 'expected exists probe');
    const task = scorecard.tasks.find((item) => item.pbiId === 'fixture:exists');
    assert(task.repoPathHash && !JSON.stringify(task).includes(ROOT), 'expected hashed repo path only');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('importTraceRun marks model mismatch from trace metadata', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-trace-'));
  try {
    const tracePath = path.join(tempDir, 'autorun-test.jsonl');
    fs.writeFileSync(tracePath, [
      JSON.stringify({ kind: 'meta', schemaVersion: '1', pbi: 'PBI-TRACE', slug: 'pbi-trace', harness: 'cli', toolkitVersion: '0.1.0', startedAt: '2026-05-22T00:00:00.000Z', model: 'different-model' }),
      JSON.stringify({ kind: 'event', schemaVersion: '1', phase: 1, agent: 'tester', action: 'scan', durationMs: 10, tokenCost: 25 }),
      ''
    ].join('\n'));
    const run = importTraceRun(tracePath, { model: DEFAULT_MODEL });
    assert(run.variant.modelMismatch === true, 'expected trace model mismatch');
    assert(run.tasks[0].tokens === 25, 'expected token cost import');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('CLI import-trace writes run JSON with model mismatch metadata', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-trace-cli-'));
  try {
    const tracePath = path.join(tempDir, 'autorun-test.jsonl');
    const outPath = path.join(tempDir, 'run.json');
    fs.writeFileSync(tracePath, [
      JSON.stringify({ kind: 'meta', schemaVersion: '1', pbi: 'PBI-TRACE-CLI', slug: 'pbi-trace-cli', harness: 'cli', toolkitVersion: '0.1.0', startedAt: '2026-05-22T00:00:00.000Z', model: 'different-model' }),
      JSON.stringify({ kind: 'event', schemaVersion: '1', phase: 1, agent: 'tester', action: 'scan', durationMs: 10, tokenCost: 25 }),
      ''
    ].join('\n'));
    const run = runJson(['import-trace', '--trace', tracePath, '--out', outPath]);
    assert(fs.existsSync(outPath), 'expected written run file');
    assert(run.variant.model === DEFAULT_MODEL, 'expected default model in imported run');
    assert(run.variant.modelMismatch === true, 'expected model mismatch metadata');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('CLI compare blocks model mismatch unless allowed', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-compare-cli-'));
  try {
    const baselinePath = path.join(tempDir, 'baseline.json');
    const candidatePath = path.join(tempDir, 'candidate.json');
    const baseline = buildScorecard(readJson(BASELINE_RUN), { generatedAt: '2026-05-22T00:00:00.000Z' });
    const candidate = buildScorecard({
      ...readJson(CANDIDATE_RUN),
      variant: { id: 'candidate', label: 'Candidate', model: DEFAULT_MODEL, traceModel: 'different-model', modelMismatch: true }
    }, { generatedAt: '2026-05-22T00:00:00.000Z' });
    fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
    fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
    const blocked = runJson(['compare', '--baseline', baselinePath, '--candidate', candidatePath]);
    assert(blocked.verdict === 'fail', 'expected mismatch compare failure');
    const allowed = runJson(['compare', '--baseline', baselinePath, '--candidate', candidatePath, '--allow-model-mismatch']);
    assert(allowed.verdict === 'pass', 'expected allowed model mismatch to pass');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('CLI report command writes markdown report', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-report-'));
  try {
    const scorecardPath = path.join(tempDir, 'scorecard.json');
    const reportPath = path.join(tempDir, 'report.md');
    const scorecard = buildScorecard(readJson(BASELINE_RUN), { generatedAt: '2026-05-22T00:00:00.000Z' });
    fs.writeFileSync(scorecardPath, `\uFEFF${JSON.stringify(scorecard, null, 2)}\n`);
    execFileSync(NODE, [path.join(ROOT, 'tests', 'harness-bench', 'bench.js'), 'report', '--scorecard', scorecardPath, '--out', reportPath], {
      cwd: ROOT,
      encoding: 'utf8'
    });
    const report = fs.readFileSync(reportPath, 'utf8');
    assert(report.includes('# Harness Benchmark Report'), 'expected report heading');
    assert(report.includes('Median tokens'), 'expected metric section');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('extractReferencedRepoDocs finds docs/ai markdown references', () => {
  const refs = extractReferencedRepoDocs('See docs/ai/01-business-glossary.md and docs/ai/03-verification-runbook.md.');
  assert(refs.length === 2, `expected 2 refs, got ${refs.length}`);
  assert(refs.includes('docs/ai/01-business-glossary.md'), 'missing glossary ref');
});

test('probeBootstrapOutput passes for a complete minimal repo', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-probe-pass-'));
  try {
    writeCompleteBootstrapProbeFixture(tempDir);

    const scorecard = probeBootstrapOutput(tempDir, { generatedAt: '2026-05-22T00:00:00.000Z' });
    assert(scorecard.summary.passRate === 1, `expected pass rate 1, got ${scorecard.summary.passRate}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('probeBootstrapOutput fails when referenced docs are missing', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-probe-fail-'));
  try {
    writeCompleteBootstrapProbeFixture(tempDir, { referencedDoc: 'docs/ai/03-verification-runbook.md' });
    fs.rmSync(path.join(tempDir, 'docs', 'ai', '03-verification-runbook.md'));

    const scorecard = probeBootstrapOutput(tempDir, { generatedAt: '2026-05-22T00:00:00.000Z' });
    assert(scorecard.summary.passRate < 1, 'expected failed probe');
    assert(
      scorecard.tasks.some((task) => task.pbiId === 'file:docs/ai/03-verification-runbook.md' && !task.passed),
      'expected missing verification runbook task'
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('probeBootstrapOutput fails when manifest is stale and does not declare required outputs', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-probe-stale-'));
  try {
    writeCompleteBootstrapProbeFixture(tempDir);
    fs.writeFileSync(path.join(tempDir, '.github', '.bootstrap-manifest.json'), '{"generatedFiles":[],"keep":{"files":[]}}\n');

    const scorecard = probeBootstrapOutput(tempDir, { generatedAt: '2026-05-22T00:00:00.000Z' });
    assert(scorecard.summary.passRate < 1, 'expected failed probe for stale manifest');
    assert(
      scorecard.tasks.some((task) => task.pbiId === 'manifest:includes:docs/ai/00-repo-index.md' && !task.passed),
      'expected missing repo index declaration task'
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
