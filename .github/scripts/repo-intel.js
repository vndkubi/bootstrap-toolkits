#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { collectRepoFiles } = require('./repo-index.js');

const LOW_SIGNAL_PATTERNS = [
  /(^|\/)(dist|build|coverage|target|vendor|node_modules|generated|snapshots?)\//,
  /\.min\.js$/,
  /\.map$/,
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock)$/
];

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index++) {
    const item = argv[index];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      const next = argv[index + 1];
      if (next == null || next.startsWith('--')) {
        args[key] = true;
      } else if (args[key] == null) {
        args[key] = next;
        index++;
      } else if (Array.isArray(args[key])) {
        args[key].push(next);
        index++;
      } else {
        args[key] = [args[key], next];
        index++;
      }
    } else {
      args._.push(item);
    }
  }
  return args;
}

function lowSignal(filePath) {
  const normalized = toPosixPath(filePath);
  return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalized));
}

function safeRead(repoRoot, relativePath) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  const root = path.resolve(repoRoot);
  if (!absolutePath.startsWith(root)) {
    throw new Error(`path escapes repo: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function lineCount(text) {
  return text.split(/\r?\n/).length;
}

function clip(text, maxChars) {
  if (text.length <= maxChars) {
    return { text, omitted: 0 };
  }
  return { text: text.slice(0, maxChars), omitted: text.length - maxChars };
}

function parseLines(lines, maxLine) {
  if (!lines) {
    return [1, maxLine];
  }
  const match = /^([0-9]+)-([0-9]+)$/.exec(String(lines));
  if (!match) {
    throw new Error('lines must match <start>-<end>');
  }
  const start = Math.max(1, Number(match[1]));
  const end = Math.min(maxLine, Math.max(start, Number(match[2])));
  return [start, end];
}

function collectFiles(repoRoot) {
  const collected = collectRepoFiles(repoRoot);
  return collected.files
    .map(toPosixPath);
}

function makeResult(file, lines, snippet, whyRelevant, confidence) {
  return {
    file: toPosixPath(file),
    lines,
    snippet,
    why_relevant: whyRelevant,
    confidence
  };
}

function resultEnvelope(results, omitted, nextAction) {
  return {
    results,
    omitted,
    next_action: nextAction
  };
}

function searchCode(repoRoot, query, options = {}) {
  const topK = Number(options.topK || 8);
  const maxChars = Number(options.maxChars || 6000);
  const needle = String(query || '').toLowerCase();
  if (needle.length < 2) {
    throw new Error('query must be at least 2 characters');
  }
  const terms = needle
    .split(/[^a-z0-9_.-]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
  const matches = [];
  let omitted = 0;
  for (const file of collectFiles(repoRoot)) {
    let text;
    try {
      text = safeRead(repoRoot, file);
    } catch {
      continue;
    }
    const lower = text.toLowerCase();
    let index = lower.indexOf(needle);
    let matchedTerm = query;
    if (index === -1) {
      for (const term of terms) {
        index = lower.indexOf(term);
        if (index !== -1) {
          matchedTerm = term;
          break;
        }
      }
    }
    if (index === -1) {
      continue;
    }
    const before = text.slice(0, index);
    const startLine = before.split(/\r?\n/).length;
    const allLines = text.split(/\r?\n/);
    const snippetStart = Math.max(1, startLine - 3);
    const snippetEnd = Math.min(allLines.length, startLine + 8);
    const rawSnippet = allLines.slice(snippetStart - 1, snippetEnd).join('\n');
    const clipped = clip(rawSnippet, maxChars);
    omitted += clipped.omitted;
    const confidence = lowSignal(file) ? 0.35 : 0.75;
    matches.push(makeResult(
      file,
      `${snippetStart}-${snippetEnd}`,
      clipped.text,
      `exact match for "${matchedTerm}"`,
      confidence
    ));
  }
  matches.sort((a, b) => b.confidence - a.confidence || a.file.localeCompare(b.file));
  const selected = matches.slice(0, topK);
  omitted += Math.max(0, matches.length - selected.length);
  return resultEnvelope(selected, omitted, selected.length > 0 ? 'call repo.get_file_slice for a selected candidate before editing' : 'refine the query or inspect repo index');
}

function getFileSlice(repoRoot, relativePath, lines, options = {}) {
  const maxChars = Number(options.maxChars || 8000);
  const text = safeRead(repoRoot, relativePath);
  const allLines = text.split(/\r?\n/);
  const [start, end] = parseLines(lines, allLines.length);
  const rawSnippet = allLines.slice(start - 1, end).join('\n');
  const clipped = clip(rawSnippet, maxChars);
  return resultEnvelope([
    makeResult(relativePath, `${start}-${end}`, clipped.text, 'requested file slice', lowSignal(relativePath) ? 0.4 : 0.9)
  ], clipped.omitted, 'use this slice only if it is an edit candidate; otherwise search related files');
}

function testCommandFor(repoRoot, testFile) {
  const ext = path.extname(testFile).toLowerCase();
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    return `node ${testFile}`;
  }
  if (ext === '.ts' || ext === '.tsx') {
    return fs.existsSync(path.join(repoRoot, 'package.json')) ? `npm test -- ${testFile}` : `npx vitest run ${testFile}`;
  }
  if (ext === '.py') {
    return `python -m pytest ${testFile}`;
  }
  if (ext === '.java') {
    return fs.existsSync(path.join(repoRoot, 'pom.xml')) ? 'mvn test' : 'gradle test';
  }
  return `run related test ${testFile}`;
}

function findRelatedTests(repoRoot, changedFilesOrSymbols, options = {}) {
  const topK = Number(options.topK || 12);
  const changed = Array.isArray(changedFilesOrSymbols) ? changedFilesOrSymbols : [changedFilesOrSymbols].filter(Boolean);
  const files = collectFiles(repoRoot);
  const testFiles = files.filter((file) => /(^|\/)(tests?|__tests__)\/|(\.|-)(test|spec)\.|Test\./.test(file));
  const results = [];
  for (const item of changed) {
    const base = path.basename(String(item)).replace(/\.(test|spec)\./, '.').replace(/\.[^.]+$/, '').toLowerCase();
    for (const testFile of testFiles) {
      const normalizedTest = testFile.toLowerCase();
      const score = normalizedTest.includes(base) ? 0.9 : (normalizedTest.includes('test') ? 0.45 : 0.25);
      if (score < 0.45) {
        continue;
      }
      results.push({
        test_id: toPosixPath(testFile),
        file: toPosixPath(testFile),
        command: testCommandFor(repoRoot, testFile),
        confidence: score
      });
    }
  }
  const seen = new Set();
  const tests = results
    .sort((a, b) => b.confidence - a.confidence || a.file.localeCompare(b.file))
    .filter((item) => {
      if (seen.has(item.file)) return false;
      seen.add(item.file);
      return true;
    })
    .slice(0, topK);
  return {
    tests,
    validation: tests.map((test) => ({
      command: test.command,
      reason: `related test candidate for ${test.file}`,
      expected_signal: 'passes or reports a focused failure'
    }))
  };
}

function estimateTokens(value) {
  return Math.ceil(String(value || '').length / 4);
}

function inferIntent(task) {
  const value = String(task || '').toLowerCase();
  if (/review/.test(value)) return 'review';
  if (/test|coverage/.test(value)) return 'test';
  if (/bug|fix|error|trace|fail/.test(value)) return 'debug';
  if (/migrate|migration/.test(value)) return 'migration';
  if (/implement|add|change|update|build/.test(value)) return 'edit';
  if (/\?$/.test(value)) return 'ask';
  return 'unknown';
}

function buildPacket(repoRoot, task, options = {}) {
  const maxTokens = Number(options.maxTokens || 30000);
  const maxCandidateFiles = Number(options.maxCandidateFiles || 8);
  const search = searchCode(repoRoot, task, { topK: maxCandidateFiles, maxChars: 6000 });
  const candidateFiles = search.results;
  const editableSnippets = candidateFiles.slice(0, Math.min(4, candidateFiles.length));
  const related = findRelatedTests(repoRoot, candidateFiles.map((candidate) => candidate.file));
  const payload = {
    task: {
      summary: String(task).slice(0, 1200),
      intent: inferIntent(task),
      assumptions: candidateFiles.length === 0 ? ['No exact match found; packet is low confidence.'] : []
    },
    budget: {
      estimated_tokens: 0,
      max_tokens: maxTokens,
      omitted_results: search.omitted
    },
    domain_rules: [],
    candidate_files: candidateFiles,
    editable_snippets: editableSnippets,
    related_contracts: [],
    related_tests: related.tests,
    validation: related.validation.length > 0 ? related.validation : [{
      command: 'run the smallest relevant project test command',
      reason: 'No related test file found by naming heuristic.',
      expected_signal: 'focused pass/fail signal'
    }],
    next_actions: [
      candidateFiles.length > 0 ? 'Open the highest-confidence slice before editing.' : 'Refine task terms or run repo-index first.',
      'Run targeted validation before broad test suites.'
    ]
  };
  payload.budget.estimated_tokens = estimateTokens(JSON.stringify(payload));
  if (payload.budget.estimated_tokens > maxTokens) {
    payload.budget.omitted_reason = 'packet estimate exceeds max_tokens; reduce max_candidate_files or use narrower task terms';
  }
  return payload;
}

function requireRepo(args) {
  if (!args.repo) {
    throw new Error('--repo is required');
  }
  return path.resolve(args.repo);
}

function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0];
  const repoRoot = args.repo ? requireRepo(args) : process.cwd();
  let output;
  if (command === 'search') {
    if (!args.query) throw new Error('search requires --query');
    output = searchCode(repoRoot, args.query, { topK: args['top-k'], maxChars: args['max-chars'] });
  } else if (command === 'slice') {
    if (!args.file) throw new Error('slice requires --file');
    output = getFileSlice(repoRoot, args.file, args.lines, { maxChars: args['max-chars'] });
  } else if (command === 'tests') {
    const changed = args.changed || args._.slice(1);
    output = findRelatedTests(repoRoot, changed, { topK: args['top-k'] });
  } else if (command === 'packet') {
    if (!args.task) throw new Error('packet requires --task');
    output = buildPacket(repoRoot, args.task, { maxTokens: args['max-tokens'], maxCandidateFiles: args['max-candidate-files'] });
  } else {
    throw new Error('Usage: node .github/scripts/repo-intel.js <search|slice|tests|packet> --repo <path> ...');
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  buildPacket,
  findRelatedTests,
  getFileSlice,
  searchCode
};
