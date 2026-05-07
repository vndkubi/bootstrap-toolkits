#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function readInput(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function deriveKeywords(text) {
  return unique(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2)
  ).slice(0, 6);
}

function buildSkillMarkdown(spec) {
  const keywords = spec.triggers.join(', ');
  const inputs = spec.inputs.map((value) => `- ${value}`).join('\n');
  const outputs = spec.outputs.map((value) => `- ${value}`).join('\n');
  return `---\nname: ${spec.id}\ndescription: "${spec.description} Keywords: ${keywords}."\n---\n\n# ${spec.displayName}\n\n## Goal\n\n${spec.goal}\n\n## When to Use\n\n- ${spec.whenToUse.join('\n- ')}\n\n## Inputs\n\n${inputs}\n\n## Outputs\n\n${outputs}\n\n## Workflow\n\n1. Confirm the request and evidence anchor.\n2. Apply the skill's repeatable steps using the standard layout.\n3. Validate the output before proposing retention.\n\n## Verification Contract\n\n- Expected Outcome: the task completes with the intended ${spec.outputs[0] || 'output'}.\n- How to Verify: run the checks in tests/skills/${spec.id}/eval.json.\n- When to Stop or Escalate: stop when required evidence or constraints are missing.\n`;
}

function buildManifest(spec) {
  return {
    schemaVersion: 1,
    id: spec.id,
    displayName: spec.displayName,
    description: spec.description,
    version: spec.version || '0.6.0',
    tier: spec.tier || 'foundational',
    stability: spec.stability || 'experimental',
    requires: {
      skills: unique(spec.requiresSkills || []),
      mcp: unique(spec.requiresMcp || []),
      tools: unique(spec.requiresTools || [])
    },
    inputs: unique(spec.inputs || []),
    outputs: unique(spec.outputs || []),
    triggers: unique(spec.triggers || []),
    mcp_tools_used: unique(spec.mcpToolsUsed || []),
    invocationMode: spec.invocationMode || 'model_routed',
    paths: {
      skill: `.github/skills/${spec.id}/SKILL.md`,
      scripts: `.github/skills/${spec.id}/scripts`,
      assets: `.github/skills/${spec.id}/assets`,
      references: `.github/skills/${spec.id}/references`
    }
  };
}

function buildEval(spec) {
  return {
    name: spec.id,
    checks: [
      {
        type: 'file_exists',
        path: `.github/skills/${spec.id}/SKILL.md`
      },
      {
        type: 'file_exists',
        path: `.github/skills/${spec.id}/skill.json`
      },
      {
        type: 'json_field_equals',
        path: `.github/skills/${spec.id}/skill.json`,
        field: 'tier',
        value: spec.tier || 'foundational'
      },
      {
        type: 'text_includes',
        path: `.github/skills/${spec.id}/SKILL.md`,
        includes: [spec.goal, '## Verification Contract']
      }
    ]
  };
}

function buildDraft(input) {
  const displayName = input.displayName || input.title || '';
  const id = input.id || slugify(displayName || input.brief || '');
  const description = input.description || '';
  const goal = input.goal || '';
  const missing = [];
  if (!displayName) missing.push('displayName');
  if (!description) missing.push('description');
  if (!goal) missing.push('goal');

  if (missing.length > 0) {
    return {
      status: 'needs_input',
      missing,
      questions: missing.map((field) => `Provide ${field} for the skill draft.`)
    };
  }

  const triggers = unique(input.triggers || deriveKeywords(`${displayName} ${description} ${goal}`));
  const outputs = unique(input.outputs || ['workflow output']);
  const spec = {
    id,
    displayName,
    description,
    goal,
    tier: input.tier || 'foundational',
    stability: input.stability || 'experimental',
    inputs: unique(input.inputs || ['workspace context']),
    outputs,
    triggers: triggers.length > 0 ? triggers : [id],
    whenToUse: input.whenToUse || [goal],
    requiresSkills: input.requiresSkills || [],
    requiresMcp: input.requiresMcp || [],
    requiresTools: input.requiresTools || [],
    mcpToolsUsed: input.mcpToolsUsed || []
  };

  return {
    status: 'ready',
    id,
    files: {
      [`.github/skills/${id}/SKILL.md`]: buildSkillMarkdown(spec),
      [`.github/skills/${id}/skill.json`]: JSON.stringify(buildManifest(spec), null, 2),
      [`.github/skills/${id}/scripts/.gitkeep`]: '',
      [`.github/skills/${id}/assets/.gitkeep`]: '',
      [`.github/skills/${id}/references/.gitkeep`]: '',
      [`tests/skills/${id}/eval.json`]: JSON.stringify(buildEval(spec), null, 2)
    }
  };
}

function main(argv) {
  if (argv.length !== 1) {
    console.error('Usage: node draft-skill.js <input.json>');
    process.exit(1);
  }
  const input = readInput(path.resolve(argv[0]));
  const draft = buildDraft(input);
  process.stdout.write(`${JSON.stringify(draft, null, 2)}\n`);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  buildDraft
};