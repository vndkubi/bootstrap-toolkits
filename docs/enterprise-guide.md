# Enterprise Bootstrap Guide

Guide for bootstrapping GitHub Copilot configuration in large enterprise projects (10+ domains, 100+ modules).

## Enterprise Strategy

### 1. Domain-Scoped Instructions

For projects with 5+ business domains, create per-domain instruction files instead of one large file:

```
.github/instructions/
├── java.instructions.md              # Language conventions (all Java files)
├── java-order-domain.instructions.md # Order domain rules (applyTo: **/order/**)
├── java-payment-domain.instructions.md
├── java-customer-domain.instructions.md
└── module-boundaries.instructions.md # Cross-module rules (applyTo: **/pom.xml)
```

Each domain file contains:
- Business rules specific to that domain
- Entity relationships within the domain
- Domain-specific patterns and conventions
- Domain glossary (abbreviations, business terms)

### 2. Domain Registry

For 10+ domains, create a centralized registry:

```
.github/domains/domain-registry.json
```

Use the `domain-registry` skill to auto-generate this from codebase analysis.

### 3. Monorepo Support

For monorepos with multiple applications:

```
.github/
├── copilot-instructions.md          # Global (≤ 2 KB)
├── instructions/
│   ├── java.instructions.md         # Shared language conventions
│   ├── java-order.instructions.md   # Domain-specific (narrow applyTo)
│   └── module-boundaries.instructions.md
├── agents/                          # Shared agents
└── skills/                          # Shared skills
```

Key principle: `copilot-instructions.md` stays as a **pure index card** (≤ 4 KB). All detail goes into domain-scoped instructions that only load when editing relevant files.

### 4. Context Budget for Enterprise

| Scenario | Budget | Files Loaded |
|----------|--------|-------------|
| General chat | ≤ 4 KB | copilot-instructions.md only |
| Edit domain file | ≤ 20 KB | copilot-instructions + language + domain instructions |
| With agent | ≤ 30 KB | Above + agent |
| With agent + skill | ≤ 45 KB | Above + skill |

### 5. Enterprise Agents

Additional agents for enterprise workflows:

| Agent | Use When |
|-------|----------|
| `@dependency-analyzer` | Assessing cross-module impact before changes |
| `@database-specialist` | Multi-schema migrations, query optimization |
| `@sprint-planner` | PBI decomposition with codebase-calibrated estimates |

### 6. Impact Analysis Workflow

Before changing shared code in enterprise projects:

1. Use `@dependency-analyzer` to map blast radius
2. Use `impact-analysis` skill to classify impact per consumer
3. Generate migration guide for breaking changes
4. Recommend deployment order

## Bootstrap Pipeline for Enterprise

The standard pipeline adds enterprise-specific phases:

```
Phase 1:  Analyze codebase
Phase 2:  Project Size Classification → triggers enterprise mode
Phase 3:  Business Domain Deep Analysis
Phase 4:  Generate copilot-instructions.md (≤ 4 KB index card)
Phase 5:  Generate domain-scoped .instructions.md per domain  ← ENTERPRISE
Phase 6:  Generate language instructions
Phase 7:  Generate agents (≤ 10 KB each)
Phase 8:  Generate skills (≤ 15 KB each)
Phase 9:  Generate prompts (≤ 3 KB each)
Phase 10: Generate hooks
Phase 11: Generate workflows
Phase 12: Context Budget Validation  ← ENTERPRISE
Phase 13: DevContainer Setup
Phase 14: Cleanup
```

## Checklist

- [ ] `copilot-instructions.md` ≤ 4 KB
- [ ] Each domain has its own `.instructions.md` with narrow `applyTo`
- [ ] No instruction file > 6 KB
- [ ] No agent file > 10 KB
- [ ] Domain registry created for 10+ domains
- [ ] Module boundary conventions documented
- [ ] Context budget validated (run `context-budget-check` skill)
