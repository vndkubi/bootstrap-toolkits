# Bootstrap Copilot Bundle

This `.github/` folder is a bootstrap bundle copied into the current repository so `/bootstrap-copilot` can analyze the real codebase and replace these templates with project-specific output.

Until bootstrap rewrites this file, treat it as temporary operator guidance, not as final repo memory.

## Read This Repo In Layers

- Root `README.md`, build files, source code, tests, and existing docs: primary evidence for what this repository actually is
- `.github/README.md`: bootstrap bundle overview and lifecycle
- `.github/prompts/bootstrap-copilot.prompt.md`: entry point for generation
- `.github/skills/generate-copilot-config/SKILL.md`: canonical pipeline and cleanup rules
- `.github/agents/conductor.agent.md`: orchestration behavior
- `.github/docs/*.md`: runtime, context, prompting, and operating-model guidance for the copied bundle
- `.github/constitution.md`: governance that generated agents and skills should inherit

## Identity Guardrail

- Do not assume the current repository is the `copilot-bootstrap` source repo just because this copied bundle mentions toolkit assets.
- Infer repo identity from files outside the copied bootstrap bundle whenever possible.
- Treat copied agents, skills, prompts, instructions, and templates as bootstrap inputs first, not as proof that they belong in the final generated `.github/`.
- Only conclude that the current repository is the toolkit source repository when root-level evidence outside the copied bundle clearly proves it.

## Working Rules During Bootstrap

- Scan the target repo before trusting any template wording.
- Rewrite this file with project-specific purpose, stack, verification, and source-of-truth guidance during Phase 4.
- Generate only the docs, agents, skills, prompts, instructions, hooks, and templates justified by the detected repo.
- After validation, remove copied bootstrap files that are not listed in the manifest keep set.
- If business context is weak, mark assumptions explicitly instead of filling gaps with toolkit defaults.

## Expected Before Generation

- Many copied files are still generic templates.
- Generated artifacts such as `.github/.bootstrap-manifest.json`, `.github/.bootstrap-state.json`, `.github/.phase3-checkpoint.md`, hooks, domains, and repo-memory docs may not exist yet.
- That pre-generation state is normal and should not be mistaken for the final project configuration.
