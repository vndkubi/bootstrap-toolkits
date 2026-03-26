---
name: tool-permission-auditor
description: "Scan all .agent.md files, classify each agent's role from its description and body, and produce an agent × tool-category permission matrix. Flags overprivileged agents (security risk) and agents with unnecessary heavy tools (cost risk). Use after bootstrap or when adding new agents. Keywords: tool permission, agent audit, overprivileged, security risk, tool matrix."
---

# Tool Permission Auditor

Scan all agent files, infer role from description and body, and flag tool access mismatches.

## When to Use

- After bootstrap generates agent files
- When adding a new agent to the kit
- When reviewing `.github/agents/` for security or cost concerns
- Keywords: tool permission, agent audit, overprivileged, security risk

---

## Step 1: Collect All Agent Files

List all files matching `.github/agents/*.agent.md`.

For each agent, read:
1. Frontmatter `name` and `description`
2. Full body (skill references, capability descriptions, constraints)

---

## Step 2: Classify Agent Role

Infer role from `description` field and body content using keyword signals:

| Role Category | Keyword Signals |
|---|---|
| **Implementor** | implement, write code, edit, fix, create, modify, generate code, production code |
| **Analyst / Investigator** | investigate, analyze, review, audit, trace, research, understand, diagnose |
| **Orchestrator** | orchestrate, route, coordinate, plan, delegate, pipeline, manage workflow |
| **Specialist** | tests, testing, database, mobile, devcontainer, PR, commit, diagram, spec, requirements |
| **Reader / Explorer** | explore, read-only, summarize, explain, search, Q&A |

If signals are mixed, use the strongest keyword cluster. If ambiguous, classify as **Orchestrator** (safest middle ground).

---

## Step 3: Build Tool Category Map

Map skill references in agent body to tool categories:

| Tool Category | Inferred From Skill References or Body Text |
|---|---|
| **Read** | read_file, list_dir, grep_search, semantic_search, file_search |
| **Search** | codebase search, workspace search, find files |
| **Edit** | replace_string_in_file, multi_replace_string_in_file, create_file, edit_notebook |
| **Terminal** | run_in_terminal, terminal execution, shell commands |
| **Subagent** | runSubagent, spawn agent, sub-agent, execution subagent |
| **Memory/Todo** | manage_todo_list, memory tool, session notes |

---

## Step 4: Apply Risk Taxonomy

For each agent, compare inferred role against detected tool categories:

### Permission Rules

| Agent Role | Read | Search | Edit | Terminal | Subagent | Memory/Todo |
|---|---|---|---|---|---|---|
| Implementor | ✅ Expected | ✅ Expected | ✅ Expected | ✅ Expected | ⚠️ Review | ✅ Expected |
| Analyst / Investigator | ✅ Expected | ✅ Expected | ❌ Flag | ❌ Flag | ⚠️ Review | ⚠️ Review |
| Orchestrator | ✅ Expected | ✅ Expected | ⚠️ Review | ⚠️ Review | ✅ Expected | ✅ Expected |
| Specialist | ✅ Expected | ✅ Expected | ⚠️ Review | ⚠️ Review | ⚠️ Review | ⚠️ Review |
| Reader / Explorer | ✅ Expected | ✅ Expected | ❌ Flag | ❌ Flag | ❌ Flag | ⚠️ Review |

### Severity Rules

| Finding | Severity | Reason |
|---|---|---|
| Analyst agent with Edit tools | ❌ Security Risk | Analysts should not modify files |
| Analyst agent with Terminal access | ❌ Security Risk | Terminal = arbitrary command execution |
| Reader agent with any write capability | ❌ Security Risk | Read-only role violated |
| Orchestrator with direct Edit (not via sub-agent) | ⚠️ Cost / Clarity Risk | Orchestrators should delegate, not edit directly |
| Lightweight agent referencing heavy execution subagent | ⚠️ Cost Risk | Adds latency and token cost unnecessarily |
| Implementor without Edit tools | ⚠️ Incomplete | May not be able to do its job |

---

## Step 5: Output Report

```markdown
## Tool Permission Audit Report
_Scanned: <N> agent files_

### Agent × Tool Matrix

| Agent | Role | Read | Search | Edit | Terminal | Subagent | Memory |
|-------|------|------|--------|------|----------|----------|--------|
| dev-orchestrator | Orchestrator | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ |
| implementor | Implementor | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| investigator | Analyst | ✅ | ✅ | ❌ | ❌ | ⚠️ | ⚠️ |
| explore | Reader | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ |

---

### ❌ Security Findings

**investigator.agent.md** — Analyst role with Terminal access
- Body references `run_in_terminal` via `implement-feature` skill
- Recommendation: Remove `implement-feature` skill reference. If terminal is needed for verification-only, add explicit constraint: "Use terminal for read-only verification commands only — do not edit files."

---

### ⚠️ Review Items

**dev-orchestrator.agent.md** — Orchestrator with direct Edit capability
- Direct edit skills found in body
- Recommendation: Confirm orchestrator only edits spec/plan artifacts, not source code. Add explicit note if intentional.

---

### ✅ Clean Agents
- mobile-implementor — role matches tool set
- explore — read-only confirmed
```

---

## Verification

After running:
- All pure analyst/reviewer agents should have Terminal = ❌
- All implementor agents should have Edit = ✅
- The `explore` agent (if present) should be fully ✅ Read / ✅ Search only
