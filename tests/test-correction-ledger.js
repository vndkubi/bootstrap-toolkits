#!/usr/bin/env node
// test-correction-ledger.js — Validate correction-ledger skill logic:
// trusted signal filtering, promotion thresholds, and auditability.
// Uses Node stdlib only.
'use strict';

const fs = require('fs');
const path = require('path');

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

// --- Signal Classification Logic (mirrors SKILL.md rules) ---

function classifySignal(signal) {
  const trusted =
    signal.source === 'user_redirect' ||
    signal.source === 'accepted_fix' ||
    signal.source === 'review_finding';
  const countTowardsPromotion = signal.source !== 'retry' || trusted;
  return { ...signal, trusted, countTowardsPromotion };
}

function aggregateSignals(signals) {
  const groups = {};
  for (const sig of signals) {
    const key = sig.patternKey || sig.summary.toLowerCase().trim();
    if (!groups[key]) {
      groups[key] = { patternKey: key, signals: [], occurrenceCount: 0, trustedCount: 0 };
    }
    groups[key].signals.push(sig.signalId);
    groups[key].occurrenceCount++;
    if (sig.trusted) groups[key].trustedCount++;
  }

  for (const agg of Object.values(groups)) {
    if (agg.trustedCount >= 1) {
      agg.status = 'candidate';
    } else if (agg.occurrenceCount >= 3) {
      agg.status = 'candidate'; // recurrence-based
    } else {
      agg.status = 'noise';
    }
  }
  return Object.values(groups);
}

// --- Fixture Data ---

const FIXTURES = {
  // Scenario A: Single accepted fix = trusted, becomes candidate
  acceptedFix: {
    signalId: 'sig-001',
    source: 'accepted_fix',
    summary: 'Use record DTOs instead of Optional for JPA entities',
    evidenceRefs: ['docs/reviews/review-2026-04-15.md']
  },

  // Scenario B: Single user redirect = trusted, becomes candidate
  userRedirect: {
    signalId: 'sig-002',
    source: 'user_redirect',
    summary: 'Use record DTOs instead of Optional for JPA entities',
    evidenceRefs: ['docs/reviews/review-001.md:42']
  },

  // Scenario C: Single retry = untrusted, remains noise
  singleRetry: {
    signalId: 'sig-003',
    source: 'retry',
    summary: 'Use record DTOs instead of Optional for JPA entities',
    evidenceRefs: ['docs/reviews/review-002.md:50']
  },

  // Scenario D: Three retries = recurrence threshold met, becomes candidate
  retryBatch: [
    { signalId: 'sig-r1', source: 'retry', summary: 'always run mvn verify not mvn test', evidenceRefs: [] },
    { signalId: 'sig-r2', source: 'retry', summary: 'always run mvn verify not mvn test', evidenceRefs: [] },
    { signalId: 'sig-r3', source: 'retry', summary: 'always run mvn verify not mvn test', evidenceRefs: [] }
  ],

  // Scenario E: Review finding = trusted
  reviewFinding: {
    signalId: 'sig-004',
    source: 'review_finding',
    summary: 'Missing null check in payment flow',
    evidenceRefs: ['docs/reviews/review-2026-04-16.md']
  },

  // Scenario F: Two retries = below threshold, noise
  twoRetries: [
    { signalId: 'sig-t1', source: 'retry', summary: 'prefer flatMap over nested map', evidenceRefs: [] },
    { signalId: 'sig-t2', source: 'retry', summary: 'prefer flatMap over nested map', evidenceRefs: [] }
  ]
};

// --- Tests ---

function testSignalClassification() {
  console.log('--- Signal Classification ---\n');

  const accepted = classifySignal(FIXTURES.acceptedFix);
  assert(accepted.trusted === true, 'accepted_fix is trusted');
  assert(accepted.countTowardsPromotion === true, 'accepted_fix counts towards promotion');

  const redirect = classifySignal(FIXTURES.userRedirect);
  assert(redirect.trusted === true, 'user_redirect is trusted');
  assert(redirect.countTowardsPromotion === true, 'user_redirect counts towards promotion');

  const finding = classifySignal(FIXTURES.reviewFinding);
  assert(finding.trusted === true, 'review_finding is trusted');
  assert(finding.countTowardsPromotion === true, 'review_finding counts towards promotion');

  const retry = classifySignal(FIXTURES.singleRetry);
  assert(retry.trusted === false, 'retry is NOT trusted');
  assert(retry.countTowardsPromotion === false, 'retry alone does NOT count towards promotion');
}

function testSingleTrustedSignalBecomesCandidate() {
  console.log('\n--- Single Trusted Signal → Candidate ---\n');

  const signals = [classifySignal(FIXTURES.acceptedFix)];
  const aggregates = aggregateSignals(signals);

  assert(aggregates.length === 1, 'One aggregate produced');
  assert(aggregates[0].status === 'candidate', 'Single accepted_fix qualifies as candidate');
  assert(aggregates[0].trustedCount === 1, 'trustedCount is 1');
}

function testSingleRetryRemainsNoise() {
  console.log('\n--- Single Retry → Noise ---\n');

  const signals = [classifySignal(FIXTURES.singleRetry)];
  const aggregates = aggregateSignals(signals);

  assert(aggregates.length === 1, 'One aggregate produced');
  assert(aggregates[0].status === 'noise', 'Single retry is noise');
  assert(aggregates[0].trustedCount === 0, 'trustedCount is 0');
}

function testTwoRetriesStillNoise() {
  console.log('\n--- Two Retries → Still Noise ---\n');

  const signals = FIXTURES.twoRetries.map(classifySignal);
  const aggregates = aggregateSignals(signals);

  assert(aggregates.length === 1, 'One aggregate produced');
  assert(aggregates[0].status === 'noise', 'Two retries below threshold = noise');
  assert(aggregates[0].occurrenceCount === 2, 'occurrenceCount is 2');
  assert(aggregates[0].trustedCount === 0, 'trustedCount is 0');
}

function testThreeRetriesBecomeCandidateByRecurrence() {
  console.log('\n--- Three Retries → Candidate (recurrence) ---\n');

  const signals = FIXTURES.retryBatch.map(classifySignal);
  const aggregates = aggregateSignals(signals);

  assert(aggregates.length === 1, 'One aggregate produced');
  assert(aggregates[0].status === 'candidate', 'Three retries meet recurrence threshold');
  assert(aggregates[0].occurrenceCount === 3, 'occurrenceCount is 3');
  assert(aggregates[0].trustedCount === 0, 'trustedCount is 0 (recurrence-based)');
}

function testMixedSignalsAggregate() {
  console.log('\n--- Mixed Signals Aggregate Correctly ---\n');

  const signals = [
    classifySignal(FIXTURES.acceptedFix),
    classifySignal(FIXTURES.userRedirect),
    classifySignal(FIXTURES.singleRetry),
    ...FIXTURES.retryBatch.map(classifySignal),
    classifySignal(FIXTURES.reviewFinding),
    ...FIXTURES.twoRetries.map(classifySignal)
  ];

  const aggregates = aggregateSignals(signals);

  // Should have 3 groups: record DTOs (3 signals), mvn verify (3 retries), null check (1), flatMap (2)
  assert(aggregates.length === 4, 'Four distinct pattern groups');

  const dtoGroup = aggregates.find((a) => a.patternKey.includes('record dto'));
  assert(dtoGroup !== undefined, 'Record DTO pattern group exists');
  assert(dtoGroup.status === 'candidate', 'Record DTO group is candidate (has trusted signals)');
  assert(dtoGroup.occurrenceCount === 3, 'Record DTO group has 3 occurrences');
  assert(dtoGroup.trustedCount === 2, 'Record DTO group has 2 trusted signals');

  const mvnGroup = aggregates.find((a) => a.patternKey.includes('mvn verify'));
  assert(mvnGroup !== undefined, 'Maven verify pattern group exists');
  assert(mvnGroup.status === 'candidate', 'Maven verify group is candidate (3 retries = recurrence)');

  const nullGroup = aggregates.find((a) => a.patternKey.includes('null check'));
  assert(nullGroup !== undefined, 'Null check pattern group exists');
  assert(nullGroup.status === 'candidate', 'Null check group is candidate (1 trusted signal)');

  const flatMapGroup = aggregates.find((a) => a.patternKey.includes('flatmap'));
  assert(flatMapGroup !== undefined, 'FlatMap pattern group exists');
  assert(flatMapGroup.status === 'noise', 'FlatMap group is noise (2 retries, no trusted)');
}

function testAuditability() {
  console.log('\n--- Auditability ---\n');

  const signals = [
    classifySignal(FIXTURES.acceptedFix),
    classifySignal(FIXTURES.userRedirect)
  ];
  const aggregates = aggregateSignals(signals);

  const group = aggregates[0];
  assert(Array.isArray(group.signals), 'Aggregate tracks contributing signal IDs');
  assert(group.signals.length === 2, 'Aggregate has 2 contributing signals');
  assert(group.signals.includes('sig-001'), 'Signal sig-001 is traceable');
  assert(group.signals.includes('sig-002'), 'Signal sig-002 is traceable');
}

function testSkillFileExists() {
  console.log('\n--- Skill File Validation ---\n');

  const skillPath = path.join('.github', 'skills', 'correction-ledger', 'SKILL.md');
  assert(fs.existsSync(skillPath), 'correction-ledger SKILL.md exists');

  const content = fs.readFileSync(skillPath, 'utf8');
  assert(content.includes('Promotion Thresholds'), 'SKILL.md documents promotion thresholds');
  assert(content.includes('trusted'), 'SKILL.md references trusted signals');
  assert(content.includes('noise'), 'SKILL.md references noise filtering');
  assert(content.includes('review-memory-promotion'), 'SKILL.md routes to review-memory-promotion');
  assert(content.includes('Verification Contract'), 'SKILL.md has a verification contract');
  assert(content.includes('Never auto-apply') || content.includes('never self-promote') || content.includes('candidates only'),
    'SKILL.md enforces approval gate');
}

function testPromptFileExists() {
  console.log('\n--- Prompt File Validation ---\n');

  const promptPath = path.join('.github', 'prompts', 'promote-learning.prompt.md');
  assert(fs.existsSync(promptPath), 'promote-learning.prompt.md exists');

  const content = fs.readFileSync(promptPath, 'utf8');
  assert(content.includes('correction-ledger'), 'Prompt references correction-ledger skill');
  assert(content.includes('review-memory-promotion'), 'Prompt routes to review-memory-promotion');
  assert(content.includes('NOT') || content.includes('not apply') || content.includes('not proceed'),
    'Prompt enforces human approval before edits');
}

function testReviewMemoryPromotionAcceptsLedger() {
  console.log('\n--- review-memory-promotion accepts ledger ---\n');

  const skillPath = path.join('.github', 'skills', 'review-memory-promotion', 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf8');

  assert(content.includes('correction-ledger'), 'review-memory-promotion references correction-ledger');
  assert(content.includes('correction-ledger report'), 'review-memory-promotion accepts ledger reports as source');
}

function testReviewEffectivenessHasMetrics() {
  console.log('\n--- review-effectiveness has learning loop metrics ---\n');

  const skillPath = path.join('.github', 'skills', 'review-effectiveness', 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf8');

  assert(content.includes('Learning Loop Metrics'), 'review-effectiveness has Learning Loop Metrics section');
  assert(content.includes('Noise rate'), 'review-effectiveness tracks noise rate');
  assert(content.includes('Approval rate'), 'review-effectiveness tracks approval rate');
  assert(content.includes('Repeat-issue rate') || content.includes('Repeat issues'),
    'review-effectiveness tracks repeat-issue rate');
  assert(content.includes('Adoption'), 'review-effectiveness tracks adoption');
}

function run() {
  console.log('=== Correction Ledger Tests ===\n');

  testSignalClassification();
  testSingleTrustedSignalBecomesCandidate();
  testSingleRetryRemainsNoise();
  testTwoRetriesStillNoise();
  testThreeRetriesBecomeCandidateByRecurrence();
  testMixedSignalsAggregate();
  testAuditability();
  testSkillFileExists();
  testPromptFileExists();
  testReviewMemoryPromotionAcceptsLedger();
  testReviewEffectivenessHasMetrics();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
