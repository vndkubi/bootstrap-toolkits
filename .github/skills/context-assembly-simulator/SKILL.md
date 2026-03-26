---
name: context-assembly-simulator
description: "Simulate which .github/ files will be loaded into context for a given agent and file path. Outputs an ordered context list with KB sizes, budget calculation, and flags for overbudget or conflicting instructions. Use before debugging why an agent behaves unexpectedly, or to validate context efficiency. Keywords: context simulation, context loading, budget check, what is loaded, context debugging."
---

# Context Assembly Simulator

Simulate the `.github/` layer of context that will be loaded for a specific agent + file combination.

> **Scope disclaimer**: This simulates the `.github/` contribution to context only. Runtime context (conversation history, hook injections, tool results, workspace facts) is excluded. Treat output as an approximation — use it for debugging and planning, not as a guarantee.

## When to Use

- Debugging why an agent is behaving unexpectedly
- Validating context efficiency before pushing config
- Checking if total `.github/` budget is within limits for a scenario
- After adding or modifying instruction files or agents
- Keywords: what gets loaded, context simulation, context budget, debug agent behavior

---

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Agent name | Optional | e.g. `dev-orchestrator`, `implementor`. If omitted, show all agents. |
| File path being edited | Optional | e.g. `src/main/java/OrderService.java`. If omitted, show instruction-only load. |

---

## Step 1: Load SOURCE-OF-TRUTH.md (if present)

Check for `.github/SOURCE-OF-TRUTH.md`. If present, use it as a navigation aid to identify canonical files per domain.  
If absent, proceed with direct directory scan.

---

## Step 2: Load Always-On Files

These files are included in every request regardless of agent or file:

1. Read `.github/copilot-instructions.md`
   - Record filename + size in KB

---

## Step 3: Load Agent File (if agent specified)

Read `.github/agents/<agent-name>.agent.md`.  
Record filename + size in KB.

If agent not found, report "Agent file not found" and list available agents.

---

## Step 4: Match Instruction Files

Scan all files in `.github/instructions/*.instructions.md`.

For each file:
1. Read `applyTo` from frontmatter
2. Parse comma-separated globs → list of patterns
3. If **file path was provided**: check if the input file path matches any pattern using glob semantics
4. If **no file path**: list all instruction files and note their scope

Glob matching rules (approximate, no tokenizer):

| Input file | Pattern | Match? |
|--|--|--|
| `src/Foo.java` | `**/*.java` | ✅ |
| `src/FooTest.java` | `**/*Test*.java` | ✅ |
| `src/Foo.ts` | `**/*.java` | ❌ |
| `pom.xml` | `**/pom.xml` | ✅ |
| `src/Foo.cs` | `**/*.cs, **/*.csproj` | ✅ (first pattern) |

Include matched instruction file + size in KB.

---

## Step 5: Calculate Budget

Sum all loaded files. Compare against targets from `context-budget-check`:

| File Type | Target | Maximum |
|-----------|--------|---------|
| `copilot-instructions.md` | 2-3 KB | 4 KB |
| `.instructions.md` (each) | 2-4 KB | 6 KB |
| `.agent.md` | 4-8 KB | 10 KB |

| Budget threshold | Rule |
|-----------------|------|
| ≤ 30 KB total `.github/` load | ✅ Healthy |
| 30–40 KB | ⚠️ Getting heavy — review instruction count |
| > 40 KB | ❌ Overbudget — reduce or split instructions |

---

## Step 6: Output Report

```markdown
## Context Assembly Simulation

**Agent**: dev-orchestrator
**File**: src/main/java/com/example/OrderService.java
**Simulated layer**: `.github/` instructions + agent file only

---

### Loaded Files (in priority order)

| # | File | Type | Size | Status |
|---|------|------|------|--------|
| 1 | copilot-instructions.md | Global | 2.8 KB | ✅ |
| 2 | agents/dev-orchestrator.agent.md | Agent | 6.1 KB | ✅ |
| 3 | instructions/java.instructions.md | Instruction | 3.2 KB | ✅ |
| 4 | instructions/jakartaee.instructions.md | Instruction | 2.9 KB | ✅ |
| 5 | instructions/error-handling.instructions.md | Instruction | 2.4 KB | ✅ |
| 6 | instructions/security.instructions.md | Instruction | 3.1 KB | ✅ |
| 7 | instructions/logging.instructions.md | Instruction | 2.2 KB | ✅ |

---

### Budget Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total .github/ load | 22.7 KB | ✅ Healthy |
| Largest single file | dev-orchestrator.agent.md (6.1 KB) | ✅ Within max |
| Instruction files loaded | 5 | ✅ |

---

### Flags

✅ No overbudget files detected.
⚠️ `java.instructions.md` and `jakartaee.instructions.md` both apply to `**/*.java` — consider running `instruction-conflict-detector` to verify no contradictions.

---

### Not Loaded (non-matching instructions)

| File | applyTo | Reason |
|------|---------|--------|
| instructions/dotnet.instructions.md | **/*.cs | File is .java — no match |
| instructions/react.instructions.md | **/*.tsx | File is .java — no match |

---

> Runtime context excluded: conversation history, hook injections, tool results, workspace environment facts.
```

---

## All-Agent Mode (no agent specified)

If no agent is given, produce a summary table for all agents:

```markdown
## All-Agent Context Summary

| Agent | Agent File Size | Instructions Loaded for *.java | Total .github/ Load |
|-------|----------------|-------------------------------|---------------------|
| dev-orchestrator | 6.1 KB | 5 files / 13.8 KB | 22.7 KB ✅ |
| implementor | 5.4 KB | 5 files / 13.8 KB | 21.9 KB ✅ |
| ...   | ...   | ...               | ...      |
```

---

## Verification

After running on the kit's own `.github/`:
- `@dev-orchestrator + *.java` should load ≥ 5 instruction files
- Total should be < 35 KB on a standard bootstrap kit
- Any file exceeding its type maximum should be flagged
