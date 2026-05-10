#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  validateManifestFidelity
} = require(path.join(__dirname, 'validate-manifest-fidelity.js'));

function formatIssue(issue) {
  switch (issue.type) {
    case 'removed_path_still_exists':
      return `removed path still exists: ${issue.path}`;
    case 'kept_path_missing':
      return `kept path missing: ${issue.path}`;
    case 'keep_pattern_unmatched':
      return `keep pattern matched no files: ${issue.pattern}`;
    case 'stale_reference_to_removed_symbol':
      return `runtime-loaded file still references removed symbol "${issue.symbol}" in ${issue.path}`;
    case 'missing_manifest':
      return `missing manifest: ${issue.path}`;
    default:
      return JSON.stringify(issue);
  }
}

function writeDecision(decision, reason) {
  const payload = { decision };
  if (reason) {
    payload.reason = reason;
  }
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function main() {
  const workspaceRoot = process.cwd();
  const manifestPath = path.join(workspaceRoot, '.github', '.bootstrap-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    writeDecision('allow');
    return;
  }

  const result = validateManifestFidelity(workspaceRoot);
  if (result.issues.length === 0) {
    writeDecision('allow');
    return;
  }

  const summary = result.issues.slice(0, 5).map(formatIssue).join('\n');
  const suffix = result.issues.length > 5
    ? `\n...and ${result.issues.length - 5} more issue(s).`
    : '';
  writeDecision(
    'block',
    `Manifest fidelity check failed. Fix the retained/removed surface before ending this turn.\n${summary}${suffix}\nRun: node .github/scripts/validate-manifest-fidelity.js --json`
  );
}

main();
