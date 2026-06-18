#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateSchema } = require('./helpers/mini-json-schema');
const {
  buildScorecard,
  compareScorecards,
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
