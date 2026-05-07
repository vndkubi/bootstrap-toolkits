'use strict';

/**
 * trace-replay/score.js — Outcome scoring (Stage S1).
 *
 * Pure functions. No I/O. See:
 *   - specs/009-episodic-memory-trace-replay/contracts/trace-replay-api.md
 *   - specs/009-episodic-memory-trace-replay/data-model.md §I-1, §I-2
 */

const WEIGHTS = Object.freeze({
  tests: 0.4,
  review: 0.3,
  contract: 0.2,
  rounds: 0.1
});

const REGRESSION_DECAY = 0.15;

function clamp01(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) {
    throw new TypeError('score component must be a finite number');
  }
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Invariant I-1. Frozen formula.
 * @param {{tests:number, review:number, contract:number, rounds:number}} c
 * @returns {number} in [0,1]
 */
function computeOutcomeScore(c) {
  if (!c || typeof c !== 'object') {
    throw new TypeError('score components object required');
  }
  const t = clamp01(c.tests);
  const r = clamp01(c.review);
  const k = clamp01(c.contract);
  const n = clamp01(c.rounds);
  const raw =
    WEIGHTS.tests * t +
    WEIGHTS.review * r +
    WEIGHTS.contract * k +
    WEIGHTS.rounds * n;
  return clamp01(raw);
}

/**
 * Invariant I-2. Regression decay. Pure; `priorEvents` accepted for signature
 * symmetry but not currently used — every regression decrements by the fixed
 * REGRESSION_DECAY constant, consistent with R-5 eviction math.
 * @param {number} current
 * @param {number} priorEvents
 * @returns {number} in [0,1]
 */
function recalcAfterRegression(current, priorEvents) {
  if (typeof priorEvents !== 'number' || !Number.isFinite(priorEvents) || priorEvents < 0) {
    throw new TypeError('priorEvents must be a non-negative number');
  }
  const next = clamp01(current) - REGRESSION_DECAY;
  return clamp01(next);
}

module.exports = {
  WEIGHTS,
  REGRESSION_DECAY,
  computeOutcomeScore,
  recalcAfterRegression
};
