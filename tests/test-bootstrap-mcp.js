#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
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

function startServer(options = {}) {
  const repo = options.repo || ROOT;
  const args = ['-3', CLI, '--stdio', '--repo', repo];
  if (options.allowWrite) {
    args.push('--allow-write');
  }
  const child = spawn('py', args, {
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
    assert(names.includes('generate_spec'), 'expected generate_spec tool');
    const readTool = listed.result.tools.find((tool) => tool.name === 'analyze_repo');
    const writeTool = listed.result.tools.find((tool) => tool.name === 'generate_spec');
    assert(readTool.annotations.readOnlyHint === true, 'expected analyze_repo read-only');
    assert(writeTool.annotations.readOnlyHint === false, 'expected generate_spec write-capable');
    assert(writeTool.annotations.destructiveHint === true, 'expected generate_spec destructive hint');
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

test('resources/read returns redacted resource content', async () => {
  await withServer(async (server) => {
    await server.request('initialize', {});
    const listed = await server.request('resources/list', {});
    const resource = listed.result.resources.find((item) => item.name === 'AGENTS.md');
    assert(resource, 'expected AGENTS.md resource');
    const response = await server.request('resources/read', { uri: resource.uri });
    const content = response.result.contents[0].text;
    assert(content.includes('# Agents'), 'expected AGENTS.md content');
  });
});

test('prompts/get renders a prompt message', async () => {
  await withServer(async (server) => {
    await server.request('initialize', {});
    const listed = await server.request('prompts/list', {});
    assert(listed.result.prompts.some((prompt) => prompt.name === 'bootstrap-copilot'), 'expected bootstrap-copilot prompt');
    const response = await server.request('prompts/get', {
      name: 'bootstrap-copilot',
      arguments: { input: 'scan only' }
    });
    assert(response.result.messages[0].content.text.includes('/bootstrap-copilot'), 'expected rendered prompt text');
    assert(response.result.messages[0].content.text.includes('"input": "scan only"'), 'expected rendered arguments');
  });
});

test('new read and audit tools return structured content', async () => {
  await withServer(async (server) => {
    await server.request('initialize', {});
    const skills = await server.request('tools/call', {
      name: 'list_skills',
      arguments: { path: ROOT }
    });
    assert(Array.isArray(skills.result.structuredContent.skills), 'expected skills array');

    const doctor = await server.request('tools/call', {
      name: 'doctor_client_surface',
      arguments: { path: ROOT }
    });
    assert(Array.isArray(doctor.result.structuredContent.surfaces), 'expected client surface diagnostics');

    const validation = await server.request('tools/call', {
      name: 'validate_bootstrap_output',
      arguments: { path: ROOT }
    });
    assert(['pass', 'warn', 'fail'].includes(validation.result.structuredContent.verdict), 'expected validation verdict');
  });
});

test('generate_spec refuses writes without allow-write and previews content', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-mcp-nowrite-'));
  try {
    const server = startServer({ repo: tempDir });
    try {
      await server.request('initialize', {});
      const response = await server.request('tools/call', {
        name: 'generate_spec',
        arguments: {
          path: tempDir,
          description: 'Add a local benchmark feature',
          target_path: 'specs/local/spec.md',
          write: true,
          confirm_write: true
        }
      });
      const output = response.result.structuredContent;
      assert(output.preview.target_path === 'specs/local/spec.md', 'expected preview target path');
      assert(output.hints.write_refused, 'expected write refusal hint');
      assert(!fs.existsSync(path.join(tempDir, 'specs', 'local', 'spec.md')), 'file should not be written');
    } finally {
      server.stop();
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('generate_spec requires confirm_write and writes audit log when confirmed', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-mcp-write-'));
  try {
    const server = startServer({ repo: tempDir, allowWrite: true });
    try {
      await server.request('initialize', {});
      const preview = await server.request('tools/call', {
        name: 'generate_spec',
        arguments: {
          path: tempDir,
          description: 'Add a confirmed write feature',
          target_path: 'specs/confirmed/spec.md',
          write: true
        }
      });
      assert(preview.result.structuredContent.hints.confirm_write_required === true, 'expected confirm_write hint');
      assert(!fs.existsSync(path.join(tempDir, 'specs', 'confirmed', 'spec.md')), 'preview should not write');

      const written = await server.request('tools/call', {
        name: 'generate_spec',
        arguments: {
          path: tempDir,
          description: 'Add a confirmed write feature',
          target_path: 'specs/confirmed/spec.md',
          write: true,
          confirm_write: true
        }
      });
      assert(written.result.structuredContent.written_to === 'specs/confirmed/spec.md', 'expected written path');
      assert(fs.existsSync(path.join(tempDir, 'specs', 'confirmed', 'spec.md')), 'expected spec file');
      assert(fs.existsSync(path.join(tempDir, '.bootstrap-mcp', 'audit.log')), 'expected audit log');
    } finally {
      server.stop();
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('generate_spec rejects path traversal and outside repo writes', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-mcp-path-'));
  try {
    const server = startServer({ repo: tempDir, allowWrite: true });
    try {
      await server.request('initialize', {});
      const traversal = await server.request('tools/call', {
        name: 'generate_spec',
        arguments: {
          path: tempDir,
          description: 'Reject traversal writes',
          target_path: '../outside.md',
          write: true,
          confirm_write: true
        }
      });
      assert(traversal.error && traversal.error.message.includes(".."), 'expected traversal rejection');

      const outsidePath = path.join(os.tmpdir(), `outside-${Date.now()}.md`);
      const outside = await server.request('tools/call', {
        name: 'generate_spec',
        arguments: {
          path: tempDir,
          description: 'Reject outside writes',
          target_path: outsidePath,
          write: true,
          confirm_write: true
        }
      });
      assert(outside.error && outside.error.message.includes('inside --repo'), 'expected outside repo rejection');
    } finally {
      server.stop();
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

process.on('beforeExit', () => {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed > 0 ? 1 : 0;
});
