#!/usr/bin/env node
// test-context-packets.js — Validate .context-packets.json against contract schema.
// Uses Node stdlib only (no Ajv — structural checks).
'use strict';

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join('.github', '.context-packets.json');
const VALID_TIERS = ['global', 'workflow', 'task', 'diagnostic'];
const VALID_LOAD = ['always', 'summary-first', 'anchor-first', 'on-demand'];

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

function run() {
  console.log('=== Context Packet Manifest Tests ===\n');

  // Test 1: File exists
  assert(fs.existsSync(MANIFEST_PATH), 'Manifest file exists');

  // Test 2: Valid JSON
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    assert(true, 'Manifest is valid JSON');
  } catch (e) {
    assert(false, `Manifest is valid JSON: ${e.message}`);
    return reportAndExit();
  }

  // Test 3: Has version
  assert(typeof manifest.version === 'number' && manifest.version >= 1, 'version is a positive integer');

  // Test 4: Has packets array
  assert(Array.isArray(manifest.packets), 'packets is an array');

  // Test 5: At least one packet
  assert(manifest.packets.length > 0, 'At least one packet exists');

  // Test 6-N: Each packet has required fields
  manifest.packets.forEach((pkt, i) => {
    const label = pkt.path || `packet[${i}]`;
    assert(typeof pkt.path === 'string' && pkt.path.length > 0, `${label}: path is non-empty string`);
    assert(VALID_TIERS.includes(pkt.tier), `${label}: tier is valid (${pkt.tier})`);
    assert(VALID_LOAD.includes(pkt.whenToLoad), `${label}: whenToLoad is valid (${pkt.whenToLoad})`);
    assert(typeof pkt.tinySummary === 'string' && pkt.tinySummary.length > 0, `${label}: tinySummary is non-empty`);
    assert(pkt.tinySummary.length <= 240, `${label}: tinySummary within 240 chars (${pkt.tinySummary.length})`);
    assert(Array.isArray(pkt.keyAnchors) && pkt.keyAnchors.length > 0, `${label}: keyAnchors is non-empty array`);
    assert(typeof pkt.owner === 'string' && pkt.owner.length > 0, `${label}: owner is non-empty string`);
  });

  reportAndExit();
}

function reportAndExit() {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
