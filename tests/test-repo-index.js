#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildIndex,
  collectRepoFiles,
  renderMarkdown,
  writeIndex
} = require(path.join('..', '.github', 'scripts', 'repo-index.js'));

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_PATH = path.join(REPO_ROOT, '.github', 'scripts', 'repo-index.js');

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

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function withTempRepo(setupFn) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-index-'));
  try {
    execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
    setupFn(repoRoot);
    execFileSync('git', ['add', '-A'], { cwd: repoRoot, stdio: 'ignore' });
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
}

function withTempDir(setupFn) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-index-'));
  try {
    setupFn(repoRoot);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
}

console.log('=== Repo Index Tests ===\n');

test('buildIndex detects polyglot module markers without reading file contents', () => {
  const index = buildIndex([
    'README.md',
    'package.json',
    'pnpm-lock.yaml',
    'apps/api/Api.csproj',
    'service/src/main/webapp/WEB-INF/web.xml',
    'service/src/main/resources/META-INF/persistence.xml',
    'android/app/build.gradle.kts',
    'android/app/src/main/AndroidManifest.xml',
    'ios/App.xcodeproj/project.pbxproj',
    'src/index.ts',
    'dist/app.js.map'
  ], '2026-05-20T00:00:00.000Z');

  assert(index.totalFiles === 11, 'expected tracked file count');
  assert(index.ecosystems['web-node'] === 1, 'expected web-node detection');
  assert(index.ecosystems['enterprise-java'] === 1, 'expected enterprise-java detection');
  assert(index.ecosystems.dotnet === 1, 'expected dotnet detection');
  assert(index.ecosystems.android >= 1, 'expected android detection');
  assert(index.ecosystems['ios-xcode'] === 1, 'expected ios-xcode detection');
  assert(index.importantFiles.includes('apps/api/Api.csproj'), 'expected csproj as important file');
  assert(index.importantFiles.includes('service/src/main/webapp/WEB-INF/web.xml'), 'expected web.xml as important file');
  assert(index.exclusionCandidates.includes('dist/app.js.map'), 'expected sourcemap as exclusion candidate');
  assert(index.searchRecipes['enterprise-java'].length > 0, 'expected enterprise Java search recipe');
  assert(index.searchRecipes.dotnet.length > 0, 'expected dotnet search recipe');
  assert(index.searchRecipes['node-web-mobile'].length > 0, 'expected node search recipe');
});

test('renderMarkdown emits token guidance and module table', () => {
  const index = buildIndex([
    'package.json',
    'src/index.ts'
  ], '2026-05-20T00:00:00.000Z');
  const markdown = renderMarkdown(index);

  assert(markdown.includes('Generated deterministically from `git ls-files`'), 'expected deterministic provenance');
  assert(markdown.includes('GitHub Copilot, Copilot CLI, Codex'), 'expected shared agent compatibility note');
  assert(markdown.includes('## Token / Context Guidance'), 'expected context guidance');
  assert(markdown.includes('| `.` | `web-node` |'), 'expected root module row');
});

test('writeIndex writes markdown and json artifacts from git ls-files', () => {
  withTempRepo((repoRoot) => {
    writeFile(path.join(repoRoot, 'README.md'), '# temp\n');
    writeFile(path.join(repoRoot, 'package.json'), '{"scripts":{"test":"node test.js"}}\n');
    writeFile(path.join(repoRoot, 'apps', 'api', 'Api.csproj'), '<Project />\n');
    writeFile(path.join(repoRoot, 'generated', 'client.ts'), '// generated\n');
    execFileSync('git', ['add', '-A'], { cwd: repoRoot, stdio: 'ignore' });

    const result = writeIndex(repoRoot, path.join('docs', 'ai'), '2026-05-20T00:00:00.000Z');
    const markdown = fs.readFileSync(result.markdownPath, 'utf8');
    const json = JSON.parse(fs.readFileSync(result.jsonPath, 'utf8'));

    assert(fs.existsSync(path.join(repoRoot, 'docs', 'ai', '00-repo-index.md')), 'expected markdown output');
    assert(fs.existsSync(path.join(repoRoot, 'docs', 'ai', '00-repo-index.json')), 'expected json output');
    assert(markdown.includes('## Module Candidates'), 'expected module section');
    assert(json.ecosystems['web-node'] === 1, 'expected web-node in json output');
    assert(json.ecosystems.dotnet === 1, 'expected dotnet in json output');
    assert(json.exclusionCandidates.includes('generated/client.ts'), 'expected generated file exclusion candidate');
  });
});

test('collectRepoFiles falls back to filesystem when git has no tracked files', () => {
  withTempDir((repoRoot) => {
    execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
    writeFile(path.join(repoRoot, 'README.md'), '# temp\n');
    writeFile(path.join(repoRoot, 'package.json'), '{}\n');
    writeFile(path.join(repoRoot, '.artifacts', 'sample', 'pom.xml'), '<project />\n');
    writeFile(path.join(repoRoot, '.memory', 'local.md'), '# local memory\n');
    writeFile(path.join(repoRoot, 'build', 'generated.js'), '// generated\n');
    writeFile(path.join(repoRoot, 'results', 'run.json'), '{}\n');

    const result = collectRepoFiles(repoRoot);

    assert(result.source === 'filesystem walk', 'expected filesystem fallback source');
    assert(result.files.includes('README.md'), 'expected README from filesystem fallback');
    assert(result.files.includes('package.json'), 'expected package.json from filesystem fallback');
    assert(!result.files.includes('.artifacts/sample/pom.xml'), 'expected local artifact evidence skipped in filesystem fallback');
    assert(!result.files.includes('.memory/local.md'), 'expected local memory skipped in filesystem fallback');
    assert(!result.files.includes('build/generated.js'), 'expected generated build dir skipped in filesystem fallback');
    assert(!result.files.includes('results/run.json'), 'expected local result bundles skipped in filesystem fallback');
    assert(result.sourceWarnings.length > 0, 'expected warning explaining fallback');
  });
});

test('filesystem fallback excludes copied bootstrap bundle noise but keeps real workflows', () => {
  withTempDir((repoRoot) => {
    execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
    writeFile(path.join(repoRoot, 'README.md'), '# temp\n');
    writeFile(path.join(repoRoot, 'pom.xml'), '<project />\n');
    writeFile(path.join(repoRoot, '.github', 'prompts', 'bootstrap-copilot.prompt.md'), '# prompt\n');
    writeFile(path.join(repoRoot, '.github', 'skills', 'generate-copilot-config', 'SKILL.md'), '# skill\n');
    writeFile(path.join(repoRoot, '.github', 'instructions', 'java.instructions.md'), '# generic copied instruction\n');
    writeFile(path.join(repoRoot, '.github', '.bootstrap-state.json'), '{"phases":{}}\n');
    writeFile(path.join(repoRoot, '.github', '.bootstrap-summary.md'), '# stale summary\n');
    writeFile(path.join(repoRoot, '.github', '.runtime-fidelity.json'), '{}\n');
    writeFile(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'name: ci\n');

    const result = collectRepoFiles(repoRoot);

    assert(result.source === 'filesystem walk', 'expected filesystem fallback source');
    assert(result.files.includes('README.md'), 'expected target README');
    assert(result.files.includes('pom.xml'), 'expected target pom');
    assert(result.files.includes('.github/workflows/ci.yml'), 'expected target workflow preserved');
    assert(!result.files.includes('.github/prompts/bootstrap-copilot.prompt.md'), 'expected bootstrap prompt excluded');
    assert(!result.files.includes('.github/skills/generate-copilot-config/SKILL.md'), 'expected bootstrap skill excluded');
    assert(!result.files.includes('.github/instructions/java.instructions.md'), 'expected copied instruction excluded');
    assert(!result.files.includes('.github/.bootstrap-state.json'), 'expected stale bootstrap state excluded');
    assert(!result.files.includes('.github/.bootstrap-summary.md'), 'expected stale bootstrap summary excluded');
    assert(!result.files.includes('.github/.runtime-fidelity.json'), 'expected stale runtime fidelity excluded');
  });
});

test('stdout-json prints an index without writing docs artifacts', () => {
  withTempRepo((repoRoot) => {
    writeFile(path.join(repoRoot, 'README.md'), '# temp\n');
    writeFile(path.join(repoRoot, 'package.json'), '{}\n');
    execFileSync('git', ['add', '-A'], { cwd: repoRoot, stdio: 'ignore' });

    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, '--root', repoRoot, '--stdout-json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const index = JSON.parse(stdout);

    assert(index.totalFiles === 2, 'expected stdout index for tracked files');
    assert(!fs.existsSync(path.join(repoRoot, 'docs', 'ai', '00-repo-index.md')), 'stdout-json must not write markdown');
    assert(!fs.existsSync(path.join(repoRoot, 'docs', 'ai', '00-repo-index.json')), 'stdout-json must not write json');
  });
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
