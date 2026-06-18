#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'mcp', 'bootstrap_mcp', 'src', 'bootstrap_mcp', 'cli.py');

let passed = 0;
let failed = 0;

function test(name, fn) {
  fn()
    .then(() => {
      console.log(`  PASS: ${name}`);
      passed++;
    })
    .catch((error) => {
      console.log(`  FAIL: ${name}`);
      console.log(`        ${error.message}`);
      failed++;
    });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function startServer() {
  const child = spawn('py', ['-3', CLI, '--stdio', '--repo', ROOT], {
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const responses = [];
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf8');
    let newline;
    while ((newline = stdout.indexOf('\n')) !== -1) {
      const line = stdout.slice(0, newline).trim();
      stdout = stdout.slice(newline + 1);
      if (line) {
        responses.push(JSON.parse(line));
      }
    }
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
  });
  return {
    child,
    request(method, params) {
      const id = responses.length + 1;
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      return waitFor(() => responses.find((response) => response.id === id), stderr);
    },
    stop() {
      child.kill();
    }
  };
}

function waitFor(getValue, stderr) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const value = getValue();
      if (value) {
        clearInterval(timer);
        resolve(value);
        return;
      }
      if (Date.now() - started > 5000) {
        clearInterval(timer);
        reject(new Error(`timed out waiting for response; stderr=${stderr}`));
      }
    }, 25);
  });
}

async function withServer(fn) {
  const server = startServer();
  try {
    await fn(server);
  } finally {
    server.stop();
  }
}

console.log('=== Bootstrap MCP Tests ===\n');

test('stdio server initializes and lists read-only tools', async () => {
  await withServer(async (server) => {
    const initialized = await server.request('initialize', { clientInfo: { name: 'test', version: '0' } });
    assert(initialized.result.protocolVersion === '2025-06-18', 'expected protocol version');
    assert(initialized.result.capabilities.tools, 'expected tools capability');

    const listed = await server.request('tools/list', {});
    const names = listed.result.tools.map((tool) => tool.name);
    assert(names.includes('analyze_repo'), 'expected analyze_repo tool');
    assert(names.includes('audit_context'), 'expected audit_context tool');
    assert(listed.result.tools.every((tool) => tool.annotations.readOnlyHint === true), 'expected read-only tools');
  });
});

test('analyze_repo returns bounded repo analysis', async () => {
  await withServer(async (server) => {
    await server.request('initialize', {});
    const response = await server.request('tools/call', {
      name: 'analyze_repo',
      arguments: { path: ROOT }
    });
    const output = response.result.structuredContent;
    assert(Array.isArray(output.stacks), 'expected stacks array');
    assert(Array.isArray(output.modules), 'expected modules array');
    assert(output.metadata.source === 'git ls-files', `expected git ls-files source, got ${output.metadata.source}`);
    assert(output.metadata.repo_size === 'small', `expected small source repo, got ${output.metadata.repo_size}`);
  });
});

test('audit_context includes provider-neutral adapters without loading the whole bundle', async () => {
  await withServer(async (server) => {
    await server.request('initialize', {});
    const response = await server.request('tools/call', {
      name: 'audit_context',
      arguments: { path: ROOT, agent: 'Conductor', filepath: '.github/scripts/repo-index.js' }
    });
    const output = response.result.structuredContent;
    const paths = output.loaded_files.map((file) => file.path);
    assert(paths.includes('AGENTS.md'), 'expected AGENTS.md in context estimate');
    assert(paths.includes('CLAUDE.md'), 'expected CLAUDE.md in context estimate');
    assert(output.budget_ok === true, 'expected context budget to pass');
    assert(output.total_kb < 40, 'expected bounded context estimate under 40 KB');
  });
});

process.on('beforeExit', () => {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed > 0 ? 1 : 0;
});
