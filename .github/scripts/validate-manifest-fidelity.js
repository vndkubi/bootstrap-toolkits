#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function normalizeRelativePath(rootDir, targetPath) {
  const relativePath = path.relative(rootDir, targetPath);
  return toPosixPath(relativePath).replace(/^\.\//, '');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flattenStringValues(value, results = []) {
  if (typeof value === 'string') {
    results.push(value);
    return results;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      flattenStringValues(entry, results);
    }
    return results;
  }
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) {
      flattenStringValues(entry, results);
    }
  }
  return results;
}

function asPathString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.startsWith('.')) {
    return trimmed;
  }
  return null;
}

function trimExtension(value, suffix) {
  return value.endsWith(suffix)
    ? value.slice(0, -suffix.length)
    : value;
}

function expandRemovedEntry(category, value) {
  const explicitPath = asPathString(value);
  if (explicitPath) {
    return [toPosixPath(explicitPath)];
  }

  const name = String(value || '').trim();
  if (!name) {
    return [];
  }

  switch (category) {
    case 'skills':
      return [`/.github/skills/${name}`.slice(1)];
    case 'instructions':
      return [`/.github/instructions/${name}.instructions.md`.slice(1)];
    case 'agents':
      return [`/.github/agents/${name}.agent.md`.slice(1)];
    case 'prompts':
      return [`/.github/prompts/${name}.prompt.md`.slice(1)];
    case 'hooks':
      return [`/.github/hooks/${name}.json`.slice(1)];
    case 'scripts':
      return [`/.github/scripts/${name}.js`.slice(1)];
    default:
      return [name];
  }
}

function deriveSymbolFromPath(category, value) {
  const explicitPath = asPathString(value);
  const rawValue = explicitPath || String(value || '').trim();
  if (!rawValue) {
    return null;
  }

  const normalized = toPosixPath(rawValue).replace(/\/+$/, '');
  const segments = normalized.split('/').filter(Boolean);
  const baseName = segments[segments.length - 1] || '';

  switch (category) {
    case 'skills':
      if (baseName === 'SKILL.md' && segments.length >= 2) {
        return segments[segments.length - 2];
      }
      return baseName;
    case 'instructions':
      return trimExtension(baseName, '.instructions.md');
    case 'agents':
      return trimExtension(baseName, '.agent.md');
    case 'prompts':
      return trimExtension(baseName, '.prompt.md');
    case 'hooks':
      return trimExtension(baseName, '.json');
    case 'scripts':
      return trimExtension(baseName, '.js');
    default:
      return explicitPath ? trimExtension(baseName, path.extname(baseName)) : rawValue;
  }
}

function collectRemovedPaths(manifest) {
  const removed = manifest && manifest.removed;
  const results = new Set();
  if (!removed || typeof removed !== 'object') {
    return [];
  }

  for (const [category, entries] of Object.entries(removed)) {
    for (const entry of flattenStringValues(entries)) {
      for (const expanded of expandRemovedEntry(category, entry)) {
        if (expanded) {
          results.add(toPosixPath(expanded));
        }
      }
    }
  }

  return Array.from(results).sort();
}

function collectKeepPaths(manifest) {
  const results = {
    files: new Set(),
    directories: new Set(),
    patterns: new Set()
  };

  const keep = manifest && manifest.keep;
  if (keep && typeof keep === 'object') {
    for (const entry of flattenStringValues(keep.files || [])) {
      const normalized = asPathString(entry);
      if (normalized) {
        results.files.add(toPosixPath(normalized));
      }
    }
    for (const entry of flattenStringValues(keep.directories || [])) {
      const normalized = asPathString(entry);
      if (normalized) {
        results.directories.add(toPosixPath(normalized));
      }
    }
    for (const entry of flattenStringValues(keep.patterns || [])) {
      const normalized = asPathString(entry) || String(entry || '').trim();
      if (normalized) {
        results.patterns.add(toPosixPath(normalized));
      }
    }
  }

  for (const entry of flattenStringValues(manifest && manifest.generatedFiles)) {
    const normalized = asPathString(entry);
    if (normalized) {
      results.files.add(toPosixPath(normalized));
    }
  }

  return {
    files: Array.from(results.files).sort(),
    directories: Array.from(results.directories).sort(),
    patterns: Array.from(results.patterns).sort()
  };
}

function globToRegExp(pattern) {
  let regex = '^';
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === '*') {
      const nextChar = pattern[index + 1];
      if (nextChar === '*') {
        const afterNext = pattern[index + 2];
        if (afterNext === '/') {
          regex += '(?:.*/)?';
          index += 2;
        } else {
          regex += '.*';
          index += 1;
        }
      } else {
        regex += '[^/]*';
      }
      continue;
    }
    if (char === '?') {
      regex += '.';
      continue;
    }
    if ('\\^$+?.()|{}[]'.includes(char)) {
      regex += `\\${char}`;
      continue;
    }
    regex += char;
  }
  regex += '$';
  return new RegExp(regex);
}

function walkFiles(rootDir, currentDir = rootDir, files = []) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.name === '.git') {
      continue;
    }
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(rootDir, absolutePath, files);
      continue;
    }
    files.push(normalizeRelativePath(rootDir, absolutePath));
  }
  return files;
}

function collectFilesUnderDirectory(rootDir, relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absoluteDir) || !fs.statSync(absoluteDir).isDirectory()) {
    return [];
  }
  return walkFiles(rootDir, absoluteDir, []);
}

function expandKeepPatterns(rootDir, patterns) {
  const allFiles = walkFiles(rootDir, rootDir, []);
  const expanded = new Set();
  for (const pattern of patterns) {
    const regex = globToRegExp(pattern);
    for (const filePath of allFiles) {
      if (regex.test(filePath)) {
        expanded.add(filePath);
      }
    }
  }
  return Array.from(expanded).sort();
}

function collectRetainedFiles(rootDir, manifest) {
  const keep = collectKeepPaths(manifest);
  const retained = new Set(keep.files);

  for (const directoryPath of keep.directories) {
    for (const filePath of collectFilesUnderDirectory(rootDir, directoryPath)) {
      retained.add(filePath);
    }
  }

  for (const filePath of expandKeepPatterns(rootDir, keep.patterns)) {
    retained.add(filePath);
  }

  return {
    files: Array.from(retained).sort(),
    directories: keep.directories,
    patterns: keep.patterns
  };
}

function collectRemovedSymbols(manifest) {
  const removed = manifest && manifest.removed;
  const symbols = new Set();
  if (!removed || typeof removed !== 'object') {
    return [];
  }

  for (const [category, entries] of Object.entries(removed)) {
    for (const entry of flattenStringValues(entries)) {
      const symbol = deriveSymbolFromPath(category, entry);
      if (symbol) {
        symbols.add(symbol);
      }
    }
  }

  return Array.from(symbols).sort();
}

function isRuntimeLoadedSurface(filePath) {
  const normalized = toPosixPath(filePath);
  const baseName = path.posix.basename(normalized);

  if (normalized === '.github/copilot-instructions.md') {
    return true;
  }
  if (normalized.startsWith('.github/instructions/') && normalized.endsWith('.instructions.md')) {
    return true;
  }
  if (normalized.startsWith('.github/agents/') && normalized.endsWith('.agent.md')) {
    return true;
  }
  if (baseName === 'AGENTS.md') {
    return true;
  }
  if ((baseName === 'CLAUDE.md' || baseName === 'GEMINI.md') && !normalized.includes('/')) {
    return true;
  }
  if (
    (normalized.startsWith('.github/skills/')
      || normalized.startsWith('.claude/skills/')
      || normalized.startsWith('.agents/skills/'))
    && normalized.endsWith('/SKILL.md')
  ) {
    return true;
  }

  return false;
}

function validateManifestFidelity(rootDir, options = {}) {
  const manifestPath = options.manifestPath
    ? path.resolve(rootDir, options.manifestPath)
    : path.join(rootDir, '.github', '.bootstrap-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    return {
      manifestPath,
      issues: [
        {
          type: 'missing_manifest',
          path: normalizeRelativePath(rootDir, manifestPath)
        }
      ]
    };
  }

  const manifest = readJson(manifestPath);
  const issues = [];
  const removedPaths = collectRemovedPaths(manifest);
  const kept = collectRetainedFiles(rootDir, manifest);
  const removedSymbols = collectRemovedSymbols(manifest);

  for (const relativePath of removedPaths) {
    const absolutePath = path.join(rootDir, relativePath);
    if (fs.existsSync(absolutePath)) {
      issues.push({
        type: 'removed_path_still_exists',
        path: relativePath
      });
    }
  }

  const keepExistsTargets = new Set([
    ...collectKeepPaths(manifest).files,
    ...collectKeepPaths(manifest).directories
  ]);

  for (const relativePath of keepExistsTargets) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      issues.push({
        type: 'kept_path_missing',
        path: relativePath
      });
    }
  }

  for (const pattern of kept.patterns) {
    const matches = expandKeepPatterns(rootDir, [pattern]);
    if (matches.length === 0) {
      issues.push({
        type: 'keep_pattern_unmatched',
        pattern
      });
    }
  }

  for (const filePath of kept.files.filter(isRuntimeLoadedSurface)) {
    const absolutePath = path.join(rootDir, filePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      continue;
    }
    const content = fs.readFileSync(absolutePath, 'utf8');
    for (const symbol of removedSymbols) {
      if (content.includes(symbol)) {
        issues.push({
          type: 'stale_reference_to_removed_symbol',
          path: filePath,
          symbol
        });
      }
    }
  }

  return {
    manifestPath,
    issues
  };
}

function formatIssue(issue) {
  switch (issue.type) {
    case 'missing_manifest':
      return `missing manifest: ${issue.path}`;
    case 'removed_path_still_exists':
      return `removed path still exists: ${issue.path}`;
    case 'kept_path_missing':
      return `kept path missing: ${issue.path}`;
    case 'keep_pattern_unmatched':
      return `keep pattern matched no files: ${issue.pattern}`;
    case 'stale_reference_to_removed_symbol':
      return `stale reference to removed symbol "${issue.symbol}" in ${issue.path}`;
    default:
      return JSON.stringify(issue);
  }
}

function main(argv) {
  const args = argv.slice();
  const rootArgIndex = args.indexOf('--root');
  const manifestArgIndex = args.indexOf('--manifest');
  const jsonOutput = args.includes('--json');
  const rootDir = rootArgIndex >= 0 && args[rootArgIndex + 1]
    ? path.resolve(args[rootArgIndex + 1])
    : process.cwd();
  const manifestPath = manifestArgIndex >= 0 && args[manifestArgIndex + 1]
    ? args[manifestArgIndex + 1]
    : undefined;

  const result = validateManifestFidelity(rootDir, { manifestPath });
  if (result.issues.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ ok: true, issues: [] }, null, 2));
    } else {
      console.log('manifest fidelity check passed');
    }
    return;
  }

  if (jsonOutput) {
    console.error(JSON.stringify({ ok: false, issues: result.issues }, null, 2));
  } else {
    console.error(result.issues.map(formatIssue).join('\n'));
  }
  process.exit(1);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  collectKeepPaths,
  collectRemovedPaths,
  collectRetainedFiles,
  collectRemovedSymbols,
  isRuntimeLoadedSurface,
  validateManifestFidelity
};
