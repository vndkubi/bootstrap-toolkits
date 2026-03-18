# Fixture: Small Project — TypeScript/Node REST API

## Classification

**Small** — ≤ 5 source files, 1 module, 1 domain

## Tech Stack

- Runtime: Node.js 20
- Language: TypeScript 5.x
- Framework: Express 4
- Database: SQLite (via better-sqlite3)
- Test framework: Vitest
- Build: tsc + esbuild

## Project Description

A minimal URL shortener service. Single module, single domain (links).

## File Structure

```
small-project/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Express app entry point
│   ├── links.router.ts   # POST /links, GET /:code routes
│   ├── links.service.ts  # Business logic: shorten, resolve, expire
│   └── links.db.ts       # SQLite operations
├── tests/
│   └── links.service.test.ts
└── README.md
```

## Entities

- **Link**: `{ id, originalUrl, shortCode, createdAt, expiresAt, clickCount }`

## Business Rules

1. Short code is 6-character alphanumeric, unique
2. Links expire after 30 days by default (configurable per link)
3. Expired links return 410 Gone
4. Click count increments on each successful resolution

## Expected Bootstrap Output

### Classification
Small → minimal config

### Expected Agents (3)
- `dev-orchestrator` — single entry, routes to implementor/test-specialist
- `implementor` — TypeScript/Express/SQLite specific
- `test-specialist` — Vitest specific

### Expected Skills (3)
- `implement-feature` — tsc + esbuild build commands
- `generate-unit-tests` — Vitest patterns
- `review-code-changes` — TypeScript/Express focus

### Expected Instructions (2)
- `typescript.instructions.md` — applyTo `**/*.ts`
- `testing.instructions.md` — Vitest patterns

### Expected Context Budget
- copilot-instructions.md: ~1.5 KB
- Total worst-case: ~18 KB (well under 45 KB)

## Validation Criteria

The bootstrap output PASSES if:
- [ ] `implementor.agent.md` mentions `better-sqlite3`, `Express`, `TypeScript 5`
- [ ] `generate-unit-tests` skill references `vitest` and `describe`/`it` pattern
- [ ] `typescript.instructions.md` `applyTo` is `**/*.ts` (not `**/*`)
- [ ] No Java, Python, or PHP content anywhere in generated files
- [ ] copilot-instructions.md ≤ 2 KB
