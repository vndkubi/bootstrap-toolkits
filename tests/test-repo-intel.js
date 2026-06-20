#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildPacket,
  findRelatedTests,
  getFileSlice,
  searchCode
} = require('../.github/scripts/repo-intel.js');

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

function writeFile(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

function withFixture(fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-intel-'));
  try {
    writeFile(tempDir, 'src/payment/refundService.js', [
      'export function alphaRefund(order) {',
      '  const trace = "alpha-marker";',
      '  return order.total;',
      '}',
      ''
    ].join('\n'));
    writeFile(tempDir, 'tests/refundService.test.js', [
      'const { alphaRefund } = require("../src/payment/refundService");',
      'test("alpha refund", () => {});',
      ''
    ].join('\n'));
    writeFile(tempDir, 'generated/refundService.generated.js', 'const trace = "alpha-marker";\n');
    writeFile(tempDir, 'package.json', '{"scripts":{"test":"node tests/refundService.test.js"}}\n');
    fn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

console.log('=== Repo Intel Tests ===\n');

test('searchCode returns line-ranged clipped results', () => {
  withFixture((repo) => {
    const result = searchCode(repo, 'alpha-marker', { topK: 5, maxChars: 20 });
    assert(Array.isArray(result.results), 'expected results array');
    assert(result.results.length >= 2, 'expected source and generated matches');
    assert(/^[0-9]+-[0-9]+$/.test(result.results[0].lines), 'expected line range');
    assert(result.omitted > 0, 'expected clipped chars to count as omitted');
    assert(result.results[0].file === 'src/payment/refundService.js', 'expected normal source before generated file');
    const generated = result.results.find((item) => item.file.includes('generated/'));
    assert(generated && generated.confidence < result.results[0].confidence, 'expected generated file penalty');
  });
});

test('getFileSlice returns a bounded exact slice', () => {
  withFixture((repo) => {
    const result = getFileSlice(repo, 'src/payment/refundService.js', '1-2', { maxChars: 1000 });
    assert(result.results.length === 1, 'expected one slice');
    assert(result.results[0].lines === '1-2', 'expected exact line range');
    assert(result.results[0].snippet.includes('alphaRefund'), 'expected function snippet');
  });
});

test('findRelatedTests finds common test naming patterns', () => {
  withFixture((repo) => {
    const result = findRelatedTests(repo, ['src/payment/refundService.js']);
    assert(result.tests.some((item) => item.file === 'tests/refundService.test.js'), 'expected related test');
    assert(result.validation.some((item) => item.command.includes('node tests/refundService.test.js')), 'expected node validation command');
  });
});

test('buildPacket returns context packet shape with token estimate', () => {
  withFixture((repo) => {
    const packet = buildPacket(repo, 'implement alpha-marker refund update', { maxTokens: 30000 });
    assert(packet.task.intent === 'edit', `unexpected intent ${packet.task.intent}`);
    assert(packet.budget.estimated_tokens > 0, 'expected token estimate');
    assert(packet.candidate_files.length > 0, 'expected candidates');
    assert(packet.editable_snippets.length > 0, 'expected editable snippets');
    assert(packet.related_tests.length > 0, 'expected related tests');
    assert(packet.validation.length > 0, 'expected validation commands');
  });
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
