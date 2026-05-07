#!/usr/bin/env node
// test-self-improving.js — Tests for semantic grouping, effectiveness tracking,
// and agent profile logic from spec-006.
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

// --- Semantic Grouping Logic (mirrors correction-ledger Step 3b) ---

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'has',
  'her', 'was', 'one', 'our', 'out', 'use', 'don', 'this', 'that', 'with',
  'from', 'have', 'will', 'avoid', 'instead', 'should', 'must', 'using'
]);

function extractKeywords(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  return text
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2)
    .filter((w) => !STOP_WORDS.has(w));
}

function jaccardCoefficient(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}

function hasSharedFileScope(scopeA, scopeB) {
  const setB = new Set(scopeB);
  return scopeA.some((s) => setB.has(s));
}

function shouldMerge(aggA, aggB) {
  const keywordOverlap = jaccardCoefficient(aggA.semanticKeywords, aggB.semanticKeywords);
  const fileOverlap = hasSharedFileScope(aggA.semanticFileScope, aggB.semanticFileScope);
  return keywordOverlap >= 0.50 && fileOverlap;
}

// --- Effectiveness Status Logic (mirrors correction-ledger Step 5b) ---

function computeEffectivenessStatus(promotion, sessionsSincePromotion) {
  if (!promotion.promotedAt) {
    return null;
  }

  if (promotion.effectivenessStatus === 'reverted') {
    return 'reverted';
  }

  if (sessionsSincePromotion < 5) {
    return 'monitoring';
  }

  return promotion.postPromotionOccurrences === 0 ? 'effective' : 'ineffective';
}

function computeSuccessRate(promotions) {
  const effective = promotions.filter((p) => p.effectivenessStatus === 'effective').length;
  const ineffective = promotions.filter((p) => p.effectivenessStatus === 'ineffective').length;
  const total = effective + ineffective;
  return total > 0 ? (effective / total) * 100 : 0;
}

// --- Correction Patterns File Logic ---

function buildCorrectionPatterns(aggregates) {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    patterns: aggregates
      .filter((a) => a.occurrenceCount >= 2)
      .map((a) => ({
        patternKey: a.patternKey,
        summary: a.summary || a.patternKey,
        occurrenceCount: a.occurrenceCount,
        relevantFiles: a.semanticFileScope || [],
        agentName: a.agentProfile || null,
        promoted: a.promotionStatus === 'promoted'
      }))
  };
}

// ===== TESTS =====

function testSemanticGrouping() {
  console.log('--- Semantic grouping tests ---\n');

  // Test: Two similar corrections should merge (high keyword overlap + shared file scope)
  const aggA = {
    patternKey: 'optional-entity-fields-bad',
    semanticKeywords: extractKeywords("Optional entity fields cause lazy loading issues in JPA"),
    semanticFileScope: ['src/main/java/entity/'],
    occurrenceCount: 3,
    contributingVariants: ['Optional entity fields cause lazy loading issues in JPA']
  };

  const aggB = {
    patternKey: 'optional-entity-jpa-problem',
    semanticKeywords: extractKeywords("Optional wrapping entity fields breaks JPA lazy loading"),
    semanticFileScope: ['src/main/java/entity/'],
    occurrenceCount: 2,
    contributingVariants: ['Optional wrapping entity fields breaks JPA lazy loading']
  };

  const overlapAB = jaccardCoefficient(aggA.semanticKeywords, aggB.semanticKeywords);
  assert(overlapAB >= 0.50, `Keyword overlap A-B: ${overlapAB.toFixed(2)} (>= 0.50 for similar text)`);
  assert(hasSharedFileScope(aggA.semanticFileScope, aggB.semanticFileScope), 'A-B share file scope');
  assert(shouldMerge(aggA, aggB), 'A-B should merge (high keyword overlap + shared file scope)');

  // Test: Two unrelated corrections should NOT merge
  const aggC = {
    patternKey: 'fix-null-check-controller',
    semanticKeywords: extractKeywords('add null check before calling service method'),
    semanticFileScope: ['src/main/java/controller/'],
    occurrenceCount: 2,
    contributingVariants: ['add null check before calling service method']
  };

  const overlapAC = jaccardCoefficient(aggA.semanticKeywords, aggC.semanticKeywords);
  assert(overlapAC < 0.50, `Keyword overlap A-C: ${overlapAC.toFixed(2)} (unrelated, should be low)`);
  assert(!hasSharedFileScope(aggA.semanticFileScope, aggC.semanticFileScope), 'A-C do NOT share file scope');
  assert(!shouldMerge(aggA, aggC), 'A-C should NOT merge (different domain)');

  // Test: Keyword overlap but no file scope → no merge
  const aggD = {
    patternKey: 'optional-entity-different-module',
    semanticKeywords: extractKeywords("Optional entity fields cause lazy loading issues in JPA"),
    semanticFileScope: ['src/main/java/billing/'],
    occurrenceCount: 1,
    contributingVariants: []
  };

  const overlapAD = jaccardCoefficient(aggA.semanticKeywords, aggD.semanticKeywords);
  assert(overlapAD >= 0.50, `Keyword overlap A-D: ${overlapAD.toFixed(2)} (same keywords)`);
  assert(!hasSharedFileScope(aggA.semanticFileScope, aggD.semanticFileScope), 'A-D do NOT share file scope');
  assert(!shouldMerge(aggA, aggD), 'A-D should NOT merge (no shared file scope despite keyword overlap)');

  // Test: File scope overlap but no keyword overlap → no merge
  const aggE = {
    patternKey: 'validation-annotation-missing',
    semanticKeywords: extractKeywords('add @NotNull validation annotation to request fields'),
    semanticFileScope: ['src/main/java/entity/'],
    occurrenceCount: 2,
    contributingVariants: []
  };

  const overlapAE = jaccardCoefficient(aggA.semanticKeywords, aggE.semanticKeywords);
  assert(!shouldMerge(aggA, aggE), 'A-E should NOT merge (shared file scope but no keyword overlap)');

  // Test: Jaccard coefficient computation
  assert(jaccardCoefficient([], []) === 0, 'Jaccard of empty sets is 0');
  assert(jaccardCoefficient(['a', 'b'], ['a', 'b']) === 1.0, 'Jaccard of identical sets is 1.0');
  assert(jaccardCoefficient(['a', 'b', 'c'], ['a']) === (1 / 3), 'Jaccard of 1/3 overlap is 0.33');
}

function testEffectivenessTracking() {
  console.log('\n--- Effectiveness tracking tests ---\n');

  // Test: Effective — no recurrence after 5+ sessions
  const effectivePromotion = {
    patternKey: 'avoid-optional',
    promotedAt: '2026-04-01T10:00:00Z',
    postPromotionOccurrences: 0,
    effectivenessStatus: 'monitoring'
  };
  assert(
    computeEffectivenessStatus(effectivePromotion, 7) === 'effective',
    'Status is effective when 0 occurrences after 5+ sessions'
  );

  // Test: Monitoring — too few sessions
  assert(
    computeEffectivenessStatus(effectivePromotion, 3) === 'monitoring',
    'Status is monitoring when fewer than 5 sessions'
  );

  // Test: Ineffective — still recurring
  const ineffectivePromotion = {
    patternKey: 'bad-pattern',
    promotedAt: '2026-03-01T10:00:00Z',
    postPromotionOccurrences: 4,
    effectivenessStatus: 'monitoring'
  };
  assert(
    computeEffectivenessStatus(ineffectivePromotion, 10) === 'ineffective',
    'Status is ineffective when still recurring after 5+ sessions'
  );

  // Test: Reverted stays reverted
  const revertedPromotion = {
    patternKey: 'reverted-pattern',
    promotedAt: '2026-02-01T10:00:00Z',
    postPromotionOccurrences: 2,
    effectivenessStatus: 'reverted'
  };
  assert(
    computeEffectivenessStatus(revertedPromotion, 20) === 'reverted',
    'Status stays reverted regardless of session count'
  );

  // Test: Not promoted → null
  assert(
    computeEffectivenessStatus({ promotedAt: null }, 10) === null,
    'Status is null when not promoted'
  );

  // Test: Success rate computation
  const promotions = [
    { effectivenessStatus: 'effective' },
    { effectivenessStatus: 'effective' },
    { effectivenessStatus: 'ineffective' },
    { effectivenessStatus: 'monitoring' }
  ];
  assert(
    computeSuccessRate(promotions) === (2 / 3) * 100,
    `Success rate is ${((2 / 3) * 100).toFixed(1)}% (2 effective / 3 resolved)`
  );

  // Test: No resolved promotions → 0%
  assert(
    computeSuccessRate([{ effectivenessStatus: 'monitoring' }]) === 0,
    'Success rate is 0% when no effective/ineffective promotions'
  );

  // Test: Promotion tracker schema
  const tracker = {
    version: 1,
    promotions: [
      {
        patternKey: 'test-pattern',
        promotedAt: '2026-04-01T10:00:00Z',
        postPromotionOccurrences: 0,
        effectivenessStatus: 'monitoring',
        lastCheckedAt: null
      }
    ]
  };
  assert(tracker.version === 1, 'Tracker has version 1');
  assert(Array.isArray(tracker.promotions), 'Tracker has promotions array');
  assert(typeof tracker.promotions[0].patternKey === 'string', 'Promotion has patternKey');
  assert(typeof tracker.promotions[0].promotedAt === 'string', 'Promotion has promotedAt');
  assert(typeof tracker.promotions[0].postPromotionOccurrences === 'number', 'Promotion has count');
  assert(['monitoring', 'effective', 'ineffective', 'reverted'].includes(tracker.promotions[0].effectivenessStatus),
    'Promotion has valid status');
}

function testCorrectionPatternsFile() {
  console.log('\n--- Correction patterns file tests ---\n');

  const aggregates = [
    {
      patternKey: 'avoid-optional',
      summary: 'Avoid Optional on entity fields',
      occurrenceCount: 5,
      semanticFileScope: ['src/entity/'],
      agentProfile: null,
      promotionStatus: 'candidate'
    },
    {
      patternKey: 'one-off',
      summary: 'One-off correction',
      occurrenceCount: 1,
      semanticFileScope: [],
      agentProfile: null,
      promotionStatus: 'noise'
    },
    {
      patternKey: 'agent-specific',
      summary: 'Implementor-specific pattern',
      occurrenceCount: 3,
      semanticFileScope: ['src/services/'],
      agentProfile: 'implementor',
      promotionStatus: 'candidate'
    },
    {
      patternKey: 'promoted-one',
      summary: 'Already promoted pattern',
      occurrenceCount: 10,
      semanticFileScope: ['src/'],
      agentProfile: null,
      promotionStatus: 'promoted'
    }
  ];

  const result = buildCorrectionPatterns(aggregates);

  assert(result.version === 1, 'Patterns file has version 1');
  assert(typeof result.generatedAt === 'string', 'Patterns file has generatedAt');
  assert(Array.isArray(result.patterns), 'Patterns file has patterns array');

  // Only patterns with occurrenceCount >= 2 should be included
  assert(result.patterns.length === 3, `Patterns file has 3 patterns (excludes one-off), got ${result.patterns.length}`);
  assert(!result.patterns.find((p) => p.patternKey === 'one-off'), 'One-off pattern excluded');

  // Agent-specific pattern preserved
  const agentPattern = result.patterns.find((p) => p.patternKey === 'agent-specific');
  assert(agentPattern && agentPattern.agentName === 'implementor', 'Agent pattern has agentName');

  // Promoted flag set correctly
  const promotedPattern = result.patterns.find((p) => p.patternKey === 'promoted-one');
  assert(promotedPattern && promotedPattern.promoted === true, 'Promoted pattern has promoted=true');

  const candidatePattern = result.patterns.find((p) => p.patternKey === 'avoid-optional');
  assert(candidatePattern && candidatePattern.promoted === false, 'Candidate pattern has promoted=false');
}

function testAgentProfiles() {
  console.log('\n--- Agent profile tests ---\n');

  // Test: observations grouped by agent
  const observations = [
    { agentName: 'implementor', summary: 'avoid optional', type: 'correction' },
    { agentName: 'implementor', summary: 'avoid optional v2', type: 'correction' },
    { agentName: 'test-specialist', summary: 'use assertj', type: 'correction' },
    { agentName: null, summary: 'general fix', type: 'correction' }
  ];

  // Group by agent name
  const byAgent = {};
  for (const obs of observations) {
    const key = obs.agentName || '__global__';
    if (!byAgent[key]) {
      byAgent[key] = [];
    }
    byAgent[key].push(obs);
  }

  assert(Object.keys(byAgent).length === 3, 'Three groups: implementor, test-specialist, global');
  assert(byAgent['implementor'].length === 2, 'Implementor has 2 observations');
  assert(byAgent['test-specialist'].length === 1, 'Test-specialist has 1 observation');
  assert(byAgent['__global__'].length === 1, 'Global has 1 observation');

  // Test: recurring pattern data with agent entries
  const agentAggregates = [
    {
      patternKey: 'avoid-optional',
      summary: 'Avoid Optional on entity fields',
      occurrenceCount: 5,
      semanticFileScope: ['src/entity/'],
      agentProfile: null,
      promotionStatus: 'candidate'
    },
    {
      patternKey: 'avoid-optional-implementor',
      summary: 'Avoid Optional (implementor-specific)',
      occurrenceCount: 3,
      semanticFileScope: ['src/entity/'],
      agentProfile: 'implementor',
      promotionStatus: 'candidate'
    }
  ];

  const patterns = buildCorrectionPatterns(agentAggregates);
  const globalP = patterns.patterns.find((p) => p.agentName === null);
  const agentP = patterns.patterns.find((p) => p.agentName === 'implementor');

  assert(globalP !== undefined, 'Global pattern present');
  assert(agentP !== undefined, 'Agent-specific pattern present');
  assert(agentP.agentName === 'implementor', 'Agent pattern has correct agentName');
}

// ===== RUN =====

function run() {
  console.log('=== Self-Improving Intelligence Tests ===\n');

  testSemanticGrouping();
  testEffectivenessTracking();
  testCorrectionPatternsFile();
  testAgentProfiles();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
