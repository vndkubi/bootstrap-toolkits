#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_DIR = path.join(ROOT, '.github', 'skills');

const PHASES = [
  {
    id: 'bootstrap-phase-scan',
    phase: 1,
    title: 'Scan',
    goal: 'Read root-level evidence from the target repo and produce stack, module, build, test, and identity findings before classification.',
    outputs: ['scan findings', 'repo identity evidence'],
    next: 'bootstrap-phase-classify'
  },
  {
    id: 'bootstrap-phase-classify',
    phase: 2,
    title: 'Classify',
    goal: 'Translate scan evidence into repo size, complexity, and retained-surface strategy before generation starts.',
    outputs: ['classification summary', 'tier recommendation'],
    next: 'bootstrap-phase-domain-repo-truth'
  },
  {
    id: 'bootstrap-phase-domain-repo-truth',
    phase: 3,
    title: 'Domain and Repo Truth Pack',
    goal: 'Build the progressive-disclosure truth pack that anchors global, module, and workflow reasoning for the target repo.',
    outputs: ['repo truth pack', 'domain map'],
    next: 'bootstrap-phase-core-instructions'
  },
  {
    id: 'bootstrap-phase-core-instructions',
    phase: 4,
    title: 'Generate Core Instructions',
    goal: 'Generate the small always-loaded instruction layer that teaches the target repo operating model and global guardrails.',
    outputs: ['core instructions'],
    next: 'bootstrap-phase-domain-instructions'
  },
  {
    id: 'bootstrap-phase-domain-instructions',
    phase: 5,
    title: 'Generate Domain Instructions',
    goal: 'Generate domain-scoped instruction files that keep business or subsystem context narrow and searchable.',
    outputs: ['domain instructions'],
    next: 'bootstrap-phase-language-framework-instructions'
  },
  {
    id: 'bootstrap-phase-language-framework-instructions',
    phase: 6,
    title: 'Generate Language and Framework Instructions',
    goal: 'Retain only the language and framework instructions justified by the detected stack and file layout.',
    outputs: ['language instructions', 'framework instructions'],
    next: 'bootstrap-phase-templates'
  },
  {
    id: 'bootstrap-phase-templates',
    phase: 7,
    title: 'Generate Templates',
    goal: 'Generate repo-specific templates for PRDs, handoffs, and other repeated writing surfaces.',
    outputs: ['templates'],
    next: 'bootstrap-phase-agents'
  },
  {
    id: 'bootstrap-phase-agents',
    phase: 8,
    title: 'Generate Agents',
    goal: 'Generate agents and routing files that reflect the target repo stack, workflow, and escalation paths.',
    outputs: ['agents', 'routing updates'],
    next: 'bootstrap-phase-skills'
  },
  {
    id: 'bootstrap-phase-skills',
    phase: 9,
    title: 'Generate Skills',
    goal: 'Generate runtime skills that map the retained workflows, validations, and repo-specialized capabilities.',
    outputs: ['runtime skills'],
    next: 'bootstrap-phase-prompts'
  },
  {
    id: 'bootstrap-phase-prompts',
    phase: 10,
    title: 'Generate Prompts',
    goal: 'Generate the user-facing prompt surface that exposes the retained workflow entry points without bootstrap residue.',
    outputs: ['prompts'],
    next: 'bootstrap-phase-hooks-workflows'
  },
  {
    id: 'bootstrap-phase-hooks-workflows',
    phase: 11,
    title: 'Hooks and Optional Workflows',
    goal: 'Generate hooks and optional workflow automation only when the target repo and capability tier justify them.',
    outputs: ['hooks', 'optional workflows'],
    next: 'bootstrap-phase-runtime-compilation'
  },
  {
    id: 'bootstrap-phase-runtime-compilation',
    phase: 12,
    title: 'Runtime Compilation',
    goal: 'Compile runtime fidelity, per-skill manifests, and discoverability indexes from the retained runtime surface.',
    outputs: ['runtime fidelity manifest', 'skill indexes'],
    next: 'bootstrap-phase-validate'
  },
  {
    id: 'bootstrap-phase-validate',
    phase: 13,
    title: 'Validate',
    goal: 'Validate structural, discoverability, dependency, and cleanup integrity before finalizing the generated output.',
    outputs: ['validation report'],
    next: 'bootstrap-phase-devcontainer'
  },
  {
    id: 'bootstrap-phase-devcontainer',
    phase: 14,
    title: 'Devcontainer',
    goal: 'Review or generate a devcontainer surface only when the target repo requires it for local workflow parity.',
    outputs: ['devcontainer guidance'],
    next: 'bootstrap-phase-cleanup-summary'
  },
  {
    id: 'bootstrap-phase-cleanup-summary',
    phase: 15,
    title: 'Manifest, Snapshot, Cleanup, and Summary',
    goal: 'Write manifest and summary artifacts, delete bootstrap-only residue, and capture the retained surface honestly.',
    outputs: ['manifest', 'summary', 'cleanup report'],
    next: null
  }
];

function renderSkill(phase) {
  const nextStep = phase.next
    ? `- Hand-off: continue with \`${phase.next}\`.`
    : '- Hand-off: none. This closes the bootstrap execution slice.';
  return `---
name: ${phase.id}
description: "Run Phase ${phase.phase} of the bootstrap pipeline: ${phase.title}. ${phase.goal} Use when orchestrating /bootstrap-copilot one phase at a time or resuming a failed phase without loading the full monolith. Keywords: bootstrap phase ${phase.phase}, ${phase.title.toLowerCase()}, bootstrap pipeline, /bootstrap-copilot."
---

# Bootstrap Phase ${phase.phase} — ${phase.title}

This phase skill is the phase-local companion to \`generate-copilot-config\`. It narrows execution to the current bootstrap slice without redefining the overall pipeline.

## When to Use

- Resuming \`/bootstrap-copilot\` at Phase ${phase.phase}
- Running a single bootstrap slice with lower context cost
- Auditing or re-validating just the ${phase.title.toLowerCase()} step

## Inputs

- Target repo root
- Existing bootstrap state when resuming
- Outputs from the previous phase

## Outputs

- ${phase.outputs.join('\n- ')}

## Phase Contract

- Goal: ${phase.goal}
${nextStep}

## Verification Contract

- Expected Outcome: Phase ${phase.phase} completes with the declared outputs and updates bootstrap state consistently.
- How to Verify: compare the retained outputs and state transition against the matching Phase ${phase.phase} section in \`.github/skills/generate-copilot-config/SKILL.md\`.
- When to Stop or Escalate: stop when the previous phase outputs are missing, contradictory, or stale.
`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, `${content.replace(/\n/g, '\r\n')}`);
}

function scaffold() {
  for (const phase of PHASES) {
    const skillDir = path.join(SKILLS_DIR, phase.id);
    ensureDir(skillDir);
    writeFile(path.join(skillDir, 'SKILL.md'), renderSkill(phase));
  }
}

if (require.main === module) {
  scaffold();
  console.log('bootstrap phase skills scaffolded');
}

module.exports = {
  PHASES,
  scaffold
};