---
name: common-doc-generator
description: Generate a structured 7-section common doc for any subsystem or .github/ component by tracing source code or skill files. Fills Purpose, Source of Truth, Request/Data Flow, Key Constraints, Verification, Common Failure Modes, and Related Files. Marks [NEEDS CONTENT] where evidence is insufficient. Chat output only — does not write files.
---

# Common Doc Generator

## When to Use

Use this skill when:
- `repo-memory-promoter` flags a subsystem as "Target layer: common doc"
- A new team member needs to understand a subsystem quickly
- An agent keeps making mistakes about how a subsystem works
- You want a doc template pre-filled with real code evidence before human editing

**Do NOT use when:**
- You want to find what needs documenting (use `repo-memory-promoter` first)
- The subsystem already has a good doc with all 7 sections
- You need architecture diagrams (use `generate-sequence-diagram` instead)

---

## Workflow

### Step 1 — Receive input

Ask: **"What subsystem or component do you want to document?"** (if not provided).

Accept: free-text name, a directory path, a skill name, or an agent name.

---

### Step 2 — Detect mode

**Kit-mode** (`.github/` component): input matches a known skill name, agent name, or mentions `.github/`. Trace SKILL.md, `.agent.md`, or related instruction files.

**Code-mode** (source subsystem): input matches a directory name, package, or domain concept. Trace source directories and entry points.

If ambiguous, ask one clarifying question:
> "Is this a `.github/` skill/agent, or a source code subsystem like a service or module?"

---

### Step 3a — Trace (Kit-mode)

1. Find the matching SKILL.md or `.agent.md` under `.github/`
2. Extract from frontmatter: `name`, `description`
3. Extract from body: when-to-use, workflow steps, output format, limitations
4. Find any related `.instructions.md` with `applyTo` matching the component
5. Find any existing doc in `docs/` for this component

**Purpose** ← from `description` + first paragraph of SKILL.md body

**Source of Truth** ← the SKILL.md or agent file path

**Data Flow** ← numbered workflow steps from skill

**Constraints** ← when-to-use (Do) + "Do NOT" section (Don't)

**Verification** ← any "verify" or "test" section in the skill

**Failure Modes** ← any warnings, limitations, or "if not found" branches in workflow

**Related Files** ← instruction files with matching `applyTo`, cross-referenced skills

---

### Step 3b — Trace (Code-mode)

1. Find directories/files matching the input name (fuzzy: split words, try subdirectories)
2. Identify entry points: controllers, handlers, facades, `index.*`, `__init__.*`, public interfaces
3. Trace 2-3 levels deep from entry points: collect services called, data stores accessed, external calls made
4. Read any existing README or doc comments in the entry files
5. Find test files for the subsystem (pattern: `*Test*`, `*Spec*`, `test_*.py`)

**Purpose** ← package-level Javadoc / docstring / README first paragraph

**Source of Truth** ← entry point file(s) + key service class(es)

**Data Flow** ← method call chain from entry point, numbered steps

**Constraints** ← validation logic, guard clauses, annotations (`@NotNull`, `@Valid`, etc.)

**Verification** ← test file paths + any `@Test` method names that describe happy path

**Failure Modes** ← `catch` blocks, error returns, validation failure branches

**Related Files** ← all files touched in trace + config/migration files

---

### Step 4 — Fill template

Fill this template with evidence gathered. For each section, use real file/line references where possible.

```markdown
# <Subsystem Name>

## Purpose
<1-2 sentences: what this does and why it exists.>

## Source of Truth
- `<path>` — <what this file owns>
- `<path>` — <what this file owns>

## Request / Data Flow
1. <step — include caller and callee>
2. <step>
3. <step>

## Key Constraints
**Do:**
- <rule derived from code or skill>

**Don't:**
- <anti-pattern found in code or explicit warning>

## Verification
- <command to run tests or check behaviour>
- <manual check: what to observe>

## Common Failure Modes
- **<symptom>** → <diagnosis and fix>

## Related Files
- `<path>` — <purpose>
```

---

### Step 5 — Mark gaps

For any section where evidence is insufficient after tracing, insert:

```
[NEEDS CONTENT: <specific instruction for what to add, e.g. "Add the test command for this module">]
```

Aim for at most 2-3 `[NEEDS CONTENT]` markers. If more than 4 sections need markers, note at the top:

```
> ⚠️ Low evidence: most sections need manual completion. Consider reading the source more deeply before generating.
```

---

### Step 6 — Output doc

Output the completed doc as a markdown code block (so user can copy easily).

---

### Step 7 — Add save hint

After the doc, append:

```
> 💡 Suggested save path: `docs/<subsystem-slug>.md`
> To save: create the file at that path and paste the content above.
```

---

## 7-Section Template Reference

| Section | Source in Kit-mode | Source in Code-mode |
|---|---|---|
| Purpose | Frontmatter description | Package docstring / README |
| Source of Truth | SKILL.md / agent file path | Entry point + key service |
| Request / Data Flow | Workflow steps | Method call chain |
| Key Constraints | Do / Don't sections | Validations + guard clauses |
| Verification | Verify section | Test file paths |
| Common Failure Modes | Limitations / warnings | Catch blocks / error returns |
| Related Files | Cross-ref skills + instructions | All traced files |

---

## Limitations

- Code-mode tracing is limited to statically readable call chains — dynamic dispatch and reflection cannot be traced
- Kit-mode cannot capture runtime agent behavior (only the static SKILL.md instructions)
- Generated doc is a starting point — always review before sharing with team
