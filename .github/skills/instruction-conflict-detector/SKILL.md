---
name: instruction-conflict-detector
description: "Scan all .instructions.md files in .github/instructions/, build a glob overlap matrix, and detect contradicting rules across files. Flags overlapping instruction scopes as Warning (overlap only) or Error (overlap plus contradicting keywords). Use after bootstrap or when adding new instruction files. Keywords: instruction conflict, applyTo overlap, rule contradiction, instruction audit."
---

# Instruction Conflict Detector

Scan all instruction files, build an overlap matrix of `applyTo` patterns, and flag contradictions.

## When to Use

- After generating or modifying `.instructions.md` files
- After bootstrap pipeline generates domain instructions
- When agent behavior seems inconsistent across file types
- As part of `validate-bootstrap-output` Tier 3
- Keywords: instruction conflict, overlap, contradiction, applyTo audit

---

## Step 1: Collect All Instruction Files

List all files matching `.github/instructions/*.instructions.md`.

For each file, read:
1. Frontmatter `applyTo` value
2. Full body content

Parse `applyTo`:
- Single glob: `'**/*.java'` → `["**/*.java"]`
- Comma-separated: `"**/*.cs, **/*.csproj"` → `["**/*.cs", "**/*.csproj"]`

---

## Step 2: Build Overlap Matrix

For each pair of instruction files (A, B):

Determine if any glob in A's `applyTo` overlaps with any glob in B's `applyTo`.

**Overlap heuristic** (no tokenizer needed):

| A glob | B glob | Overlap? |
|--------|--------|---------|
| `**/*.java` | `**/*.java` | Yes — exact match |
| `**/*.java` | `**/*` | Yes — B is superset |
| `**/*.java` | `**/src/main/**` | Likely — path prefix overlap |
| `**/*.java` | `**/*.kt` | No — different extension |
| `**/*.java` | `**/*Test*.java` | Yes — A is superset |

Rule: two globs overlap if one is a subset of the other or they share the same extension pattern on non-exclusive paths.

Output overlap matrix:

```markdown
## Overlap Matrix

| File A | File B | Overlap Scope |
|--------|--------|---------------|
| java.instructions.md | jakartaee.instructions.md | **/*.java |
| dotnet.instructions.md | testing.instructions.md | **/*Test*.cs |
```

---

## Step 3: Detect Rule Contradictions

For each overlapping pair (A, B), scan both file bodies for contradiction keyword patterns.

**Error-level contradiction pairs:**

| Pattern in File A | Contradicting Pattern in File B |
|-------------------|---------------------------------|
| `use X` | `avoid X` / `don't use X` / `do not use X` |
| `always X` | `never X` |
| `must X` | `must not X` |
| `prefer X` | `avoid X` / `use Y instead` (where Y ≠ X) |
| `do X` | `do not X` / `don't X` |
| `enable X` | `disable X` |

If a pair matches an Error pattern: classify as **Error**.  
If pair has overlap but no contradiction pattern found: classify as **Warning**.

---

## Step 4: Output Report

```markdown
## Instruction Conflict Report
_Scanned: <N> instruction files_

### Summary
- ❌ Errors (explicit contradictions): N
- ⚠️ Warnings (scope overlap, no contradiction detected): N
- ✅ Clean pairs: N

---

### ❌ Error: java.instructions.md × security.instructions.md
**Overlap scope**: `**/*.java`

| File | Line | Rule |
|------|------|------|
| java.instructions.md | L42 | "Use field injection with @Inject" |
| security.instructions.md | L18 | "Avoid field injection; use constructor injection" |

**Suggested fix**: Merge into one rule in `java.instructions.md`. Remove from `security.instructions.md` or narrow its scope to `**/*Security*.java`.

---

### ⚠️ Warning: java.instructions.md × jakartaee.instructions.md
**Overlap scope**: `**/*.java`

Both files apply to `**/*.java`. No direct contradiction detected, but review for duplicate guidance.

**Suggested fix**: Check if jakartaee rules should narrow to `**/jakarta/**` or `**/ejb/**`.

---

### ✅ No conflicts detected in remaining pairs
```

---

## Step 5: Suggested Fixes Reference

| Issue | Fix Options |
|-------|-------------|
| Two files have same rule | Keep in the more specific file; remove from the broader one |
| Contradicting rules | Decide the authoritative rule; update the other file to defer |
| Broad overlap with no contradiction | Narrow one file's `applyTo` glob to reduce co-loading cost |
| Superset overlap (e.g., `**/*` catches `**/*.java`) | Refactor `**/*` file to exclude already-covered types |

---

## Verification

After running:
- At minimum, `java.instructions.md` and `jakartaee.instructions.md` should show Warning (both cover `**/*.java`) on a standard bootstrapped kit
- Zero false Errors expected on a clean freshly-generated kit
