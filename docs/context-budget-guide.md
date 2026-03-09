# Context Budget Guide

## Why Context Budget Matters

GitHub Copilot has a limited context window (~128K tokens). Every config file competes with your actual code for context space. If configs consume too much, the model has less room to understand and generate relevant code.

## Target Sizes

| File Type | Target | Max | Loaded When |
|-----------|--------|-----|-------------|
| `copilot-instructions.md` | 2-3 KB | 4 KB | **Every** request |
| `.instructions.md` | 2-4 KB | 6 KB | Matching `applyTo` pattern |
| `.agent.md` | 4-8 KB | 10 KB | Agent invoked (`@agent`) |
| `SKILL.md` | 3-8 KB | 15 KB | On-demand |
| `.prompt.md` | 1-2 KB | 3 KB | Prompt invoked |

## Worst-Case Co-Loading

When editing a Java test file, these load simultaneously:

```
copilot-instructions.md       ~3 KB  (always)
java.instructions.md          ~4 KB  (applyTo: **/*.java)
jakartaee.instructions.md     ~5 KB  (applyTo: jakartaee paths)
testing.instructions.md       ~6 KB  (applyTo: **/*Test*.java)
────────────────────────────────────
Total (no agent):             ~18 KB
+ @dev-orchestrator:          +8 KB = ~26 KB
+ skill (if loaded):          +10 KB = ~36 KB
```

**Rule of thumb**: Total config at any moment ≤ 30% of context window (~30 KB).

## When Files Are Too Large

| Problem | Solution |
|---------|----------|
| Agent > 10 KB | Move workflow to a skill, keep agent as role + routing |
| Instruction > 6 KB | Split by domain, narrow `applyTo` patterns |
| `copilot-instructions.md` > 4 KB | Move content to skills/instructions |
| Prompt > 3 KB | Keep as entry point, delegate to agent + skill |

## Tips

- Agent defines WHAT/WHO, skill defines HOW
- Use narrow `applyTo` so instructions only load for relevant files
- For 5+ domains, create domain-scoped instructions
- Run `context-budget-check` skill to validate after changes
