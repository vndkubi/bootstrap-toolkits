---
name: review-code-changes
description: 'Detailed code review workflow for PRs and branch comparisons. Analyzes each changed file for business logic correctness, code quality, maintainability, performance, security, and test coverage. Produces a structured markdown report with per-file tables showing severity-rated comments, code snippets with suggestions, missing test coverage, and an overall approval recommendation. Use when asked to review code, check a PR, or analyze changes in a branch.'
---

# Review Code Changes

Perform a thorough code review and produce a structured markdown report.

## When to Use

- Reviewing a pull request
- Analyzing changes in a feature branch
- Pre-merge quality check
- Learning from code changes

## Workflow

### Step 1: Get Changed Files

Identify all files that were changed:
- From a PR: get the diff between base and head
- From a branch: `git diff main..feature-branch --name-only`
- From working directory: `git diff --name-only`

### Step 2: Understand Context

- Read PR description or commit messages
- Identify the PBI/issue being addressed
- Check if an investigation report exists

### Step 3: Review Each File

For each changed file, analyze:

| Aspect | Check |
|--------|-------|
| Business Logic | Does it correctly implement the requirement? |
| Code Quality | Readable? Meaningful names? Small methods? |
| Maintainability | Future-proof? Loosely coupled? Testable? |
| Performance | N+1 queries? Large collections? Missing indexes? |
| Security | Input validation? SQL injection? Auth checks? |
| Testing | New branches covered? Mocks minimal? |

### Step 4: Produce Report

Generate a markdown file with:

1. **Summary**: PR reference, author, overall assessment, risk level
2. **Per-file sections** with:
   - Change type (New/Modified/Deleted)
   - Lines changed count
   - Issues table: `#/Line/Severity/Category/Comment`
   - Detailed comments with code snippets and suggestions
3. **Missing tests** list
4. **Overall checklist**

Severity levels:
- 🔴 **Critical** — Must fix (bugs, security, data loss)
- 🟡 **Warning** — Should fix (performance, maintainability)
- 🔵 **Suggestion** — Nice to have (improvements)
- 🟢 **Praise** — Well done (positive feedback)

### Step 5: Overall Assessment

- ✅ **Approve** — No critical/warning issues
- ⚠️ **Approve with Comments** — Minor suggestions only
- ❌ **Request Changes** — Critical issues must be fixed

## Validation

- [ ] Every changed file was reviewed
- [ ] Business logic matches requirements
- [ ] Critical issues are clearly marked
- [ ] Suggestions include code examples
- [ ] Positive patterns are acknowledged
