# Copilot Bootstrap Toolkit — Comprehensive Evaluation Report (Post-Implementation v2)

> **Perspective**: This is a **template toolkit** used to generate GitHub Copilot configurations for target projects. Every issue in the template gets multiplied across ALL generated projects.

---

## Executive Summary

| Dimension | Status | Issues |
|-----------|--------|--------|
| Pipeline SSoT Integrity | 🔴 Critical | 3-layer duplication with CONFLICTING rules |
| Phase 14 Cleanup | 🔴 Critical | 7 files missing from delete list |
| Context Budget Compliance | 🟡 Warning | 20 template files over limits |
| v2 Output Quality | 🟡 Warning | `tools:` bug in Framework output |
| Cross-reference Integrity | 🟡 Warning | CLASSIFY vs actual output mismatch |
| Agentic Implementations | 🟢 Good | S1-S10 properly integrated |

---

## Finding F1: 3-Layer Content Duplication (🔴 CRITICAL)

**Impact**: Conflicting generation rules → inconsistent output across projects.

The same generation logic exists in 3 places with DIFFERENT rules:

### Layer 1: SSoT — `generate-copilot-config/SKILL.md` (22.8 KB)
- 14-phase pipeline (SCAN → CLASSIFY → ... → CLEANUP)
- "Always generate" 4 core agents: `dev-orchestrator`, `implementor`, `test-specialist`, `code-reviewer`
- Conditional agents table: 7 conditions × specific agents
- ANTI-COPY rule, CLASSIFY phase, DOMAIN phase, CLEANUP phase

### Layer 2: `agent-generator.agent.md` (7.7 KB)
- has its OWN 7-phase pipeline (Phase 1-7 only)
- "Always generate" only 3 agents: `code-reviewer`, `test-specialist`, `implementor` — **MISSING `dev-orchestrator`**
- DIFFERENT conditional agents (e.g., `api-developer`, `devops-engineer`, `security-reviewer`, `service-architect` — none of these exist in SSoT)
- DIFFERENT skill names: `project-setup`, `code-quality-check`, `prepare-pr` (not in SSoT)
- **No CLASSIFY phase**, **No DOMAIN phase**, **No CLEANUP phase**
- Has its own Phase 4-6 for skills, instructions, hooks that diverge from SSoT

### Layer 3: Generation prompts (~12.5 KB total)
- `generate-agents.prompt.md` (3.7 KB): Own detection tables (Language + Framework) different from SSoT Phase 7
- `generate-skills.prompt.md` (4.5 KB): Own workflow detection tables different from SSoT Phase 8
- `generate-instructions.prompt.md` (4.3 KB): Own convention analysis steps different from SSoT Phase 6

### Specific Conflicts:

| Aspect | SSoT (SKILL.md) | agent-generator | generate-agents.prompt |
|--------|-----------------|-----------------|----------------------|
| Core agents | 4 (incl. dev-orchestrator) | 3 (no dev-orchestrator) | 3 (same as agent-gen) |
| Conditional: REST API | → no specific agent | → `api-developer` | → `api-specialist` |
| Conditional: CI/CD | → not listed | → `devops-engineer` | → not listed |
| Conditional: Security | → not listed | → `security-reviewer` | → not listed |
| Always-gen skills | `implement-feature`, `generate-unit-tests`, `review-code-changes` | `project-setup`, `code-quality-check`, `prepare-pr` | `implement-feature`, `generate-unit-tests`, `review-code-changes` |

### Recommendation:
- **Option A (preferred)**: Delete `agent-generator.agent.md`. Make generation prompts say "follow `generate-copilot-config` skill" (like `bootstrap-copilot.prompt.md` already does). SSoT is the only source.
- **Option B**: Convert agent-generator + prompts to thin wrappers that delegate to SSoT sections.

---

## Finding F2: Phase 14 Cleanup List Incomplete (🔴 CRITICAL)

**Impact**: Template files leak into target projects → confuse developers, consume context budget.

### 6 agents MISSING from delete list:
| Agent | Why Missing | Risk |
|-------|-------------|------|
| `business-analyst.agent.md` | Not in delete list at all | Leaks into target |
| `code-reviewer.agent.md` | "Always generate" → needs rename/replace, not delete | Template version stays if Phase 7 fails |
| `dev-orchestrator.agent.md` | "Always generate" → needs rename/replace, not delete | Same |
| `implementor.agent.md` | "Always generate" → needs rename/replace, not delete | Same |
| `investigator.agent.md` | Conditional → needs delete or replace | Same |
| `test-specialist.agent.md` | "Always generate" → needs rename/replace, not delete | Same |

### 1 skill MISSING from delete list:
| Skill | Risk |
|-------|------|
| `analyze-requirements/` | Leaks into target projects |

### The Real Problem:
The cleanup list explicitly deletes 18 agents but 24 exist. The 6 missing ones are the "always generate" + conditional agents that share names with generated agents. **The current approach assumes generated files overwrite template files**, but there's no explicit instruction saying "overwrite if exists" — if generation fails or produces different names, the template versions leak.

### Recommendation:
1. Add `business-analyst.agent.md` and `analyze-requirements/` to the explicit delete list
2. Add a catch-all rule: "After generation, verify NO template content remains. Check first 5 lines of each `.agent.md` — if it references 'bootstrap toolkit' or contains patterns not matching the target project, delete it."

---

## Finding F3: CLASSIFY vs Actual Output Mismatch (🟡 WARNING)

**Impact**: Classification description doesn't match what's actually generated.

| Classification | SSoT Description | v2 Actual Output |
|---|---|---|
| **Small** | "Minimal: merged copilot-instructions.md + 1 implementor + 1 test agent" (= 2 agents) | **5 agents**: dev-orchestrator, implementor, test-specialist, code-reviewer, investigator |
| **Framework** | "Treat as Enterprise for instruction generation" | 8 agents, 11 skills — reasonable |

The Small classification says "1 implementor + 1 test agent" but actually generates 5 agents. The description is misleading — either the description should be updated to match reality, or the generation logic should be tightened.

The v2 small output (5 agents) is actually better than the described "2 agents" — the description is too conservative.

### Recommendation:
Update Phase 2 CLASSIFY table to match actual generation behavior:
- **Small**: "Core agents (dev-orchestrator, implementor, test-specialist, code-reviewer) + conditional investigator"
- Or: Define minimum vs maximum agent counts per classification

---

## Finding F4: v2 Framework `tools:` Bug (🟡 WARNING)

**Impact**: ALL 8 agents in v2 Framework output have `tools:` field in frontmatter, violating the explicit rule.

```yaml
# Every v2 Framework agent has this:
tools: ["run_in_terminal", "semantic_search", "read_file", "replace_string_in_file", "create_file", "file_search", "grep_search", "list_dir", "get_errors"]
```

- v2 Small: 0/5 agents have `tools:` ✅
- v2 Framework: 8/8 agents have `tools:` ❌

The SSoT has the rule in TWO places:
1. Phase 7: "⚠️ Do NOT include `tools:` or `mode:` fields in generated agent frontmatter"
2. Phase 12 Tier 1: "NO `tools:` or `mode:` fields" in validation checklist

Despite being documented, the rule isn't enforced consistently. The v2 Framework was likely generated when the `agent-generator.agent.md` was driving (which has fewer guardrails) instead of the SSoT.

### Recommendation:
1. Add EXPLICIT validation step in Phase 12: "grep for 'tools:' in all generated .agent.md frontmatter sections — if found, remove them"
2. Consider making this a hook check or post-generation script

---

## Finding F5: Context Budget Violations — 20 Template Files (🟡 WARNING)

**Impact**: These are **template files**, not generated output. But they define the budget rules that all generated outputs must follow. "Do as I say, not as I do" undermines credibility.

### Agents over 10 KB limit (6 files):
| File | Size | Over By |
|------|------|---------|
| `investigator.agent.md` | 12.8 KB | +2.8 KB |
| `mobile-test-specialist.agent.md` | 12.7 KB | +2.7 KB |
| `conductor.agent.md` | 11.7 KB | +1.7 KB |
| `test-specialist.agent.md` | 11.2 KB | +1.2 KB |
| `dev-orchestrator.agent.md` | 10.5 KB | +0.5 KB |
| `implementor.agent.md` | 10.1 KB | +0.1 KB |

Note: `investigator.agent.md` (12.8 KB) and `dev-orchestrator.agent.md` (10.5 KB) were pushed over limit by our S1-S10 implementations. Before: investigator was 11.4 KB (already over), dev-orchestrator was 9.9 KB (under limit → now over).

### Instructions over 6 KB limit (9 files):
| File | Size | Over By |
|------|------|---------|
| `devcontainer.instructions.md` | 9.6 KB | +3.6 KB |
| `ios.instructions.md` | 8.8 KB | +2.8 KB |
| `php.instructions.md` | 8.6 KB | +2.6 KB |
| `dotnet.instructions.md` | 7.5 KB | +1.5 KB |
| `android.instructions.md` | 7.2 KB | +1.2 KB |
| `swift.instructions.md` | 6.9 KB | +0.9 KB |
| `kotlin.instructions.md` | 6.6 KB | +0.6 KB |
| `testing.instructions.md` | 6.3 KB | +0.3 KB |
| `gradle.instructions.md` | 6.2 KB | +0.2 KB |

### Prompts over 3 KB limit (4 files):
| File | Size | Over By |
|------|------|---------|
| `generate-skills.prompt.md` | 4.5 KB | +1.5 KB |
| `generate-instructions.prompt.md` | 4.3 KB | +1.3 KB |
| `analyze-project.prompt.md` | 4.2 KB | +1.2 KB |
| `generate-agents.prompt.md` | 3.7 KB | +0.7 KB |

### Skills over 15 KB limit (1 file):
| File | Size | Over By |
|------|------|---------|
| `generate-copilot-config/SKILL.md` | 22.8 KB | +7.8 KB |

### Mitigating Factors:
- Template files are deleted in Phase 14 → they don't end up in target projects
- Generated v2 output files are ALL within budget ✅
- `generate-copilot-config/SKILL.md` at 22.8 KB is the SSoT — splitting it would break the "single source" principle
- Budget limits exist to prevent context overloading; template files are used one-at-a-time during bootstrap, not co-loaded like target project files

### Recommendation:
- **Low priority** for template files (they're deleted after use)
- **Exception**: `generate-copilot-config/SKILL.md` should have an acknowledged exception documented (it's the SSoT, must be large)
- **If trimming needed**: Focus on the 9 oversized instructions — many have generic content that could be condensed

---

## Finding F6: Post-Implementation Impact (🟢 GOOD with caveats)

### What was implemented (Phase 4 of previous session):
| Suggestion | Files Modified | Status |
|-----------|---------------|--------|
| S1: Verify-Fix Loop | core-principles, orchestrate-dev, implement-feature | ✅ Well integrated |
| S3: Debugging Workflow | investigator, dev-orchestrator | ✅ Good, but pushed investigator to 12.8 KB |
| S4: Incremental Implementation | orchestrate-dev, implement-feature | ✅ Clean |
| S5: Terminal Execution | core-principles | ✅ Good reference table |
| S6: Context Window Mgmt | core-principles | ✅ Practical |
| S7: Multi-File Consistency | orchestrate-dev, implement-feature | ✅ Entity↔DTO↔Mapper↔Test check |
| S8: Self-Review | orchestrate-dev, dev-orchestrator | ✅ Well placed |
| S10: TDD Mode | orchestrate-dev, dev-orchestrator | ✅ Mode detection good |

### Budget impact of implementations:
| File | Before | After | Status |
|------|--------|-------|--------|
| `core-principles/SKILL.md` | 5.7 KB | 8.2 KB | ✅ Under 15 KB |
| `orchestrate-development/SKILL.md` | 6.8 KB | 8.9 KB | ✅ Under 15 KB |
| `implement-feature/SKILL.md` | 3.3 KB | 4.1 KB | ✅ Under 15 KB |
| `investigator.agent.md` | 11.4 KB | 12.8 KB | ⚠️ Was over, now more over |
| `dev-orchestrator.agent.md` | 9.9 KB | 10.5 KB | ⚠️ Pushed over 10 KB limit |
| `generate-copilot-config/SKILL.md` | 22.2 KB | 22.8 KB | ⚠️ Was over, marginal increase |

### Content propagation check:
The "Mandatory Agentic Patterns in Generated Skills" section was added to Phase 8 of the SSoT. This means generated `implement-feature` and `orchestrate-development` skills for target projects will include verify-fix loops, incremental implementation, self-review, and stack-specific commands. ✅ Good.

However, the agent-generator.agent.md was NOT updated with matching agentic patterns → if it's used instead of SSoT, generated output won't include them. This reinforces Finding F1 (content duplication).

---

## Finding F7: `conductor.agent.md` Has `tools:` Field (🟡 WARNING)

```yaml
tools: ['run_in_terminal', 'semantic_search', 'read_file', ...]
```

The conductor is a **template agent** (deleted in Phase 14), so it doesn't affect target projects. But it contradicts the rule it teaches: "Do NOT include `tools:` or `mode:` fields."

If someone uses the conductor as a reference/example for how to write agents, they'll copy the `tools:` pattern.

### Recommendation:
Remove `tools:` from `conductor.agent.md` frontmatter. Agents get all tools by default — listing them is unnecessary.

---

## Finding F8: `bootstrap-copilot.prompt.md` Is the Only Correct Delegation (🟢 GOOD)

```markdown
Use the `@conductor` agent and follow the `generate-copilot-config` skill for the complete pipeline.
```

This prompt correctly delegates to the SSoT. But the other 3 generation prompts (`generate-agents/skills/instructions.prompt.md`) contain their own standalone logic and don't reference the SSoT.

This makes the bootstrap pipeline work through TWO paths:
1. `bootstrap-copilot.prompt` → `conductor` → `generate-copilot-config` skill (SSoT) ✅
2. Individual generation prompts → standalone logic ❌ (conflicts with SSoT)

---

## Finding F9: v2 Output Quality Assessment (🟢 GOOD)

### v2 Small (Apple Wallet Identity Verification Server):
| Aspect | Quality | Notes |
|--------|---------|-------|
| Agent count | 5 ✅ | Appropriate for small project |
| All files within budget | ✅ | Largest: implement-feature/SKILL.md = 3.5 KB |
| Project-specific content | ✅ | References actual classes, patterns, business domain |
| No `tools:` bug | ✅ | Clean frontmatter |
| No template leak | ✅ | No bootstrap-specific content detected |
| copilot-instructions.md | 2.6 KB ✅ | Within 4 KB limit |

### v2 Framework (Spring Framework):
| Aspect | Quality | Notes |
|--------|---------|-------|
| Agent count | 8 ✅ | Appropriate for large framework |
| All files within budget | ✅ | All under their respective limits |
| Project-specific content | ✅ | References Spring patterns, modules |
| `tools:` bug | ❌ | ALL 8 agents have `tools:` field |
| No template leak | ✅ | No bootstrap-specific content |
| copilot-instructions.md | 3.8 KB ✅ | Within 4 KB limit |

### v1 → v2 Improvement:
| Metric | v1 Small | v2 Small | Improvement |
|--------|----------|----------|-------------|
| Agent count | 20 (leaked!) | 5 | ✅ Major fix |
| Template files leaked | Yes | No | ✅ Fixed |
| `tools:` in agents | Not checked | 0/5 | ✅ Clean |

---

## Prioritized Recommendations

### P0 — Must Fix (Template Produces Wrong Output)

| # | Finding | Action | Effort |
|---|---------|--------|--------|
| R1 | F1: 3-layer duplication | Delete `agent-generator.agent.md` or convert to thin wrapper delegating to SSoT. Update `generate-agents/skills/instructions.prompt.md` to say "follow generate-copilot-config skill Phase N" | Medium |
| R2 | F2: Phase 14 missing files | Add `business-analyst.agent.md` + `analyze-requirements/` to delete list. Add catch-all verification step. | Small |
| R3 | F4: `tools:` bug | Add explicit grep-and-remove step in Phase 12 validation. Consider post-generation script. | Small |

### P1 — Should Fix (Correctness/Consistency)

| # | Finding | Action | Effort |
|---|---------|--------|--------|
| R4 | F3: CLASSIFY mismatch | Update Phase 2 table descriptions to match actual generation counts | Small |
| R5 | F7: conductor `tools:` | Remove `tools:` from conductor.agent.md frontmatter | Trivial |
| R6 | F2: Overwrite guarantee | Add explicit "delete ALL existing .agent.md before generating new ones" step, similar to skills' ANTI-COPY rule | Small |

### P2 — Nice to Have (Template Hygiene)

| # | Finding | Action | Effort |
|---|---------|--------|--------|
| R7 | F5: 9 oversized instructions | Trim instructions to ≤ 6 KB each (especially devcontainer 9.6 KB) | Medium |
| R8 | F5: 6 oversized agents | Trim agents to ≤ 10 KB (especially investigator 12.8 KB, mobile-test-specialist 12.7 KB) | Medium |
| R9 | F5: SSoT exception | Document that `generate-copilot-config/SKILL.md` is allowed to exceed 15 KB as the SSoT | Trivial |

### P3 — Future Enhancement

| # | Finding | Action | Effort |
|---|---------|--------|--------|
| R10 | F8: Prompt delegation | Make all generation prompts delegate to SSoT instead of containing standalone logic | Medium |
| R11 | General | Add integration tests: run generate-copilot-config against sample projects, verify output meets all rules | Large |

---

## Appendix A: Complete File Inventory (81 files)

### Agents (24 files)
- Under budget (18): agent-generator, business-analyst, codebase-analyzer, code-reviewer, database-specialist, dependency-analyzer, devcontainer-reviewer, dotnet-implementor, frontend-implementor, mobile-architect, mobile-implementor, mock-data-specialist, php-implementor, pr-manager, python-implementor, refactoring-specialist, sequence-diagrammer, sprint-planner
- Over budget (6): conductor (11.7), dev-orchestrator (10.5), implementor (10.1), investigator (12.8), mobile-test-specialist (12.7), test-specialist (11.2)

### Skills (27 directories)
- Under budget (26): all except generate-copilot-config
- Over budget (1): generate-copilot-config (22.8 KB)

### Instructions (23 files)
- Under budget (14): api-design, database-migration, error-handling, jakartaee, java, logging, maven, module-boundaries, oracle-sql, python, react, security, typescript, wiremock
- Over budget (9): android (7.2), devcontainer (9.6), dotnet (7.5), gradle (6.2), ios (8.8), kotlin (6.6), php (8.6), swift (6.9), testing (6.3)

### Prompts (7 files)
- Under budget (3): bootstrap-copilot (1.7), implement-feature (1.3), learn-codebase (1.2)
- Over budget (4): analyze-project (4.2), generate-agents (3.7), generate-instructions (4.3), generate-skills (4.5)

---

## Appendix B: Phase 14 Delete List Gap Analysis

### Template files that SHOULD be deleted but are NOT in the list:

| File | Type | Risk |
|------|------|------|
| `business-analyst.agent.md` | Agent | Leaks to target |
| `analyze-requirements/SKILL.md` | Skill | Leaks to target |
| `code-reviewer.agent.md` | Agent | Template version may survive if generation doesn't overwrite |
| `dev-orchestrator.agent.md` | Agent | Same |
| `implementor.agent.md` | Agent | Same |
| `investigator.agent.md` | Agent | Same |
| `test-specialist.agent.md` | Agent | Same |

### Root cause:
The cleanup list assumes "always generate" agents will be **overwritten** by Phase 7 generation. But there's no explicit "delete first, then generate" instruction for agents (unlike skills which have the ANTI-COPY rule).

---

## Appendix C: v2 Output Comparison

| Metric | v2 Small | v2 Framework |
|--------|----------|-------------|
| Target project | Apple Wallet ID Verification | Spring Framework |
| Agents | 5 | 8 |
| Skills | 4 | 11 |
| Instructions | 6 | 4 |
| Prompts | 1 | 2 |
| Hooks | 1 | 2 |
| copilot-instructions.md | 2.6 KB ✅ | 3.8 KB ✅ |
| All within budget | ✅ | ✅ |
| No `tools:` bug | ✅ | ❌ (8/8) |
| No template leak | ✅ | ✅ |
| Project-specific content | ✅ | ✅ |
