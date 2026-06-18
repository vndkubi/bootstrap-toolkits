#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

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

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

console.log('=== Java Testing Contract Tests ===\n');

const testSpecialist = read('.github/agents/test-specialist.agent.md');
const generateUnitTests = read('.github/skills/generate-unit-tests/SKILL.md');
const testingInstructions = read('.github/instructions/testing.instructions.md');
const implementor = read('.github/agents/implementor.agent.md');
const orchestrateDevelopment = read('.github/skills/orchestrate-development/SKILL.md');
const implementationLane = read('.github/docs/implementation-lane.md');
const javaTestArchitecture = read('.github/docs/java-test-architecture.md');

test('Java testing surfaces name the Real Core, Mock Boundaries strategy', () => {
  for (const [name, content] of [
    ['test-specialist', testSpecialist],
    ['generate-unit-tests', generateUnitTests],
    ['testing instructions', testingInstructions],
    ['implementation lane', implementationLane],
    ['java test architecture', javaTestArchitecture]
  ]) {
    assert(content.includes('Real Core, Mock Boundaries'), `${name} should name Real Core, Mock Boundaries`);
  }
});

test('Java API behavior defaults to outside-in component tests', () => {
  assert(testSpecialist.includes('HTTP request'), 'test-specialist should describe HTTP entry');
  assert(testSpecialist.includes('test HTTP client or in-memory test host'), 'test-specialist should require HTTP client or in-memory host');
  assert(generateUnitTests.includes('HTTP/in-memory host entry'), 'generate-unit-tests should classify API component tests');
  assert(testingInstructions.includes('api-component'), 'testing instructions should define api-component test level');
});

test('Owned internals stay real and mocks are boundary-only', () => {
  for (const [name, content] of [
    ['test-specialist', testSpecialist],
    ['generate-unit-tests', generateUnitTests],
    ['testing instructions', testingInstructions],
    ['implementor', implementor]
  ]) {
    assert(content.includes('mock only system boundaries') || content.includes('Mock only system boundaries') || content.includes('boundary-only mocks'), `${name} should restrict mocks to boundaries`);
    assert(content.includes('repository') && content.includes('ORM'), `${name} should keep persistence internals real`);
  }
  assert(testSpecialist.includes('Do not make a controller test that mocks the service'), 'test-specialist should reject service-mocked controller proof');
  assert(generateUnitTests.includes('Do not mock service classes'), 'generate-unit-tests should reject service mocks');
});

test('Database and direct domain unit test guidance match the requested model', () => {
  assert(testingInstructions.includes('Testcontainers'), 'testing instructions should prefer isolated DB through Testcontainers or equivalent');
  assert(generateUnitTests.includes('isolated test database'), 'generate-unit-tests should require isolated test DB for persistence');
  assert(javaTestArchitecture.includes('Direct Domain Unit Tests'), 'java test architecture should define direct domain unit tests');
  assert(orchestrateDevelopment.includes('direct domain unit tests for decision tables'), 'development skill should route combinatorial logic to direct unit tests');
});

test('Reflection is an escape hatch, not a primary strategy', () => {
  assert(testSpecialist.includes('Reflection and partial mocks are escape hatches'), 'test-specialist should demote reflection');
  assert(testingInstructions.includes('reflection or partial mock as a legacy escape hatch only'), 'testing instructions should demote reflection');
  assert(javaTestArchitecture.includes('Reflection and partial mocks are escape hatches'), 'doc should demote reflection');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

