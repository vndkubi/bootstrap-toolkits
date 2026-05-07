#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getFieldValue(value, field) {
  return field.split('.').reduce((current, key) => (current == null ? undefined : current[key]), value);
}

function runCheck(root, check) {
  const targetPath = path.join(root, check.path || '');
  if (check.type === 'file_exists') {
    return {
      label: `${check.type}:${check.path}`,
      passed: fs.existsSync(targetPath),
      detail: fs.existsSync(targetPath) ? 'file exists' : 'file missing'
    };
  }

  if (check.type === 'directory_exists') {
    const exists = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory();
    return {
      label: `${check.type}:${check.path}`,
      passed: exists,
      detail: exists ? 'directory exists' : 'directory missing'
    };
  }

  if (!fs.existsSync(targetPath)) {
    return {
      label: `${check.type}:${check.path}`,
      passed: false,
      detail: 'target missing'
    };
  }

  if (check.type === 'text_includes') {
    const content = fs.readFileSync(targetPath, 'utf8');
    const missing = (check.includes || []).filter((entry) => !content.includes(entry));
    return {
      label: `${check.type}:${check.path}`,
      passed: missing.length === 0,
      detail: missing.length === 0 ? 'all snippets found' : `missing: ${missing.join(', ')}`
    };
  }

  if (check.type === 'json_field_equals') {
    const value = getFieldValue(readJson(targetPath), check.field);
    return {
      label: `${check.type}:${check.path}:${check.field}`,
      passed: JSON.stringify(value) === JSON.stringify(check.value),
      detail: `actual=${JSON.stringify(value)} expected=${JSON.stringify(check.value)}`
    };
  }

  if (check.type === 'json_array_includes') {
    const value = getFieldValue(readJson(targetPath), check.field);
    const includes = Array.isArray(value) && value.includes(check.value);
    return {
      label: `${check.type}:${check.path}:${check.field}`,
      passed: includes,
      detail: includes ? 'value found' : `missing ${JSON.stringify(check.value)}`
    };
  }

  return {
    label: `${check.type}:${check.path || ''}`,
    passed: false,
    detail: 'unsupported check type'
  };
}

function evaluateSkill(skillId, root = ROOT) {
  const evalPath = path.join(root, 'tests', 'skills', skillId, 'eval.json');
  if (!fs.existsSync(evalPath)) {
    throw new Error(`missing fixture: tests/skills/${skillId}/eval.json`);
  }

  const config = readJson(evalPath);
  const results = (config.checks || []).map((check) => runCheck(root, check));
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  return {
    skillId,
    passed,
    failed,
    score: results.length === 0 ? 0 : passed / results.length,
    results
  };
}

function main(argv) {
  if (argv.length < 1 || argv.length > 2) {
    console.error('Usage: node evaluate-skill.js <skill-id> [root]');
    process.exit(1);
  }
  const result = evaluateSkill(argv[0], argv[1] ? path.resolve(argv[1]) : ROOT);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  evaluateSkill
};