---
name: review-effectiveness
description: 'Feedback loop skill that reviews the effectiveness of generated Copilot configurations after a period of use. Analyzes which agents, skills, and instructions are actually being used, identifies gaps, collects user feedback, and recommends adjustments. Closes the bidirectional feedback loop between generated config and real-world usage.'
---

# Review Effectiveness

Closes the bidirectional feedback loop by reviewing how well the generated Copilot configuration is working in practice.

## When to Use

- After 1-2 sprints of using a generated Copilot configuration
- User reports that certain agents or skills aren't helpful
- User asks "how is the config working?", "what should we adjust?", "review effectiveness"
- Periodic health check on Copilot configuration quality
- After onboarding new team members to evaluate discoverability

## Workflow

### Step 1: Gather Usage Signals

Collect evidence of what's being used and what's not:

1. **Chat history patterns** (if available):
   - Which agents are invoked most/least?
   - Which skills are referenced in workflows?
   - What questions do users ask that aren't covered by existing agents?

2. **Codebase signals**:
   - `git log` — recent commit patterns, which areas of code changed most
   - File change frequency — do instruction files cover the hot spots?
   - New files/modules added — are there instructions for them?
   - Tech stack changes — new dependencies, frameworks, or tools added

3. **Configuration gap analysis**:
   - Instructions with `applyTo` patterns that match no current files
   - Agents for tech stacks not present in the project
   - Skills referencing tools or frameworks not in use
   - Missing instructions for frequently changed file types

### Step 2: User Feedback Collection

Ask the user structured questions:

1. **What works well?**
   - "Which agents do you use most? Which are most helpful?"
   - "Any skills that saved significant time?"

2. **What doesn't work?**
   - "Any agents you never use or find unhelpful?"
   - "Any skills that produce output you always have to fix?"
   - "Are there tasks where you bypass Copilot entirely?"

3. **What's missing?**
   - "Any common tasks not covered by existing agents/skills?"
   - "Any coding patterns where instructions don't match your team's conventions?"
   - "Any new team members who found the setup confusing?"

### Step 3: Constitutional Compliance Review

Check if the generated config aligns with the [Project Constitution](../../constitution.md):

- [ ] Do implementor agents include Phase -1 gates?
- [ ] Do investigation skills enforce `[NEEDS CLARIFICATION]` markers?
- [ ] Are core principles referenced consistently across agents?
- [ ] Is the Spec → Plan → Tasks pipeline available and working?

### Step 4: Generate Effectiveness Report

```markdown
## Copilot Configuration Effectiveness Report

### Date: [YYYY-MM-DD]
### Review Period: [sprint/date range]

### Usage Summary
| Category | Total | Active | Unused | Coverage |
|----------|-------|--------|--------|----------|
| Agents | [N] | [N] | [N] | [%] |
| Skills | [N] | [N] | [N] | [%] |
| Instructions | [N] | [N] | [N] | [%] |

### What's Working Well
| Item | Type | Evidence | Recommendation |
|------|------|----------|---------------|
| [name] | Agent/Skill/Instruction | [usage signal] | Keep as-is |

### What Needs Adjustment
| Item | Type | Issue | Recommendation | Priority |
|------|------|-------|---------------|----------|
| [name] | Agent/Skill/Instruction | [problem] | [fix] | High/Med/Low |

### Gaps Identified
| Gap | Impact | Recommendation | Effort |
|-----|--------|---------------|--------|
| [missing coverage] | [who is affected] | [add/modify what] | Low/Med/High |

### Configuration Drift
| Area | Expected | Actual | Action |
|------|----------|--------|--------|
| [tech stack change] | [what config expects] | [what codebase shows] | [update needed] |

### Constitutional Compliance
- [ ] Phase -1 gates in all implementors: [✅/❌]
- [ ] [NEEDS CLARIFICATION] markers in investigation: [✅/❌]
- [ ] Core principles referenced: [✅/❌]
- [ ] Spec → Plan → Tasks pipeline: [✅/❌]

### Recommended Actions (Prioritized)
1. **[High]** [action] — [why, expected impact]
2. **[Med]** [action] — [why, expected impact]
3. **[Low]** [action] — [why, expected impact]
```

### Step 5: Execute Adjustments

Based on user approval:
- Update or remove unused agents/skills/instructions
- Create new agents/skills for identified gaps
- Update `applyTo` patterns for drifted instructions
- Update `copilot-instructions.md` if project context changed
- Run `validate-bootstrap-output` skill to verify changes

## Feedback Loop Integration

This skill feeds back into the bootstrap pipeline:

```
Bootstrap (generate) → Use (1-2 sprints) → Review Effectiveness → Adjust → Use → Review...
```

Adjustments from this skill should be:
- **Incremental** — don't regenerate everything, patch what needs fixing
- **Documented** — log what changed and why in a changelog
- **Validated** — run context budget check after changes

## Validation

- [ ] Usage signals gathered from at least 2 sources (git + user feedback)
- [ ] User feedback collected with structured questions
- [ ] Constitutional compliance checked
- [ ] Effectiveness report generated with prioritized recommendations
- [ ] Adjustments are incremental, not full regeneration
- [ ] Context budget verified after any changes
