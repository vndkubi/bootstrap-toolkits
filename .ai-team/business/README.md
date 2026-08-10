# Business Knowledge Layer

This directory is the project’s evidence-backed business brain. It describes what the system must do and why; the codebase describes how it currently does it.

Create artifacts with `python scripts/ai_team.py new-artifact` and the governed templates rather than inventing one-off formats.

## Recommended structure

```text
.ai-team/business/
|-- capabilities/         # Domain map and linked knowledge
|-- state-matrices/       # Allowed and forbidden transitions
|-- decision-matrices/    # Conditions -> expected actions
|-- invariants/           # Conditions that must always hold
|-- patterns/             # Repeated business behavior patterns
|-- scenarios/            # Happy, edge, failure, recovery, ops, security
`-- sources/              # References to specs, PBIs, and incidents
```

Directories are created when their first artifact is generated.

## Provenance levels

| Level | Meaning | Can establish an authoritative rule? |
| --- | --- | --- |
| `L0_UNKNOWN` | No reliable source | No |
| `L1_CODE_OBSERVED` | Current code behavior | No; the code may be wrong |
| `L2_HISTORICAL` | Prior PBI, incident, or decision record | Only after applicability is confirmed |
| `L3_HUMAN_CONFIRMED` | Named domain owner confirmation | Yes within the confirmed scope |
| `L4_OFFICIAL_SPEC` | Approved specification or policy | Yes within its version and scope |
| `L5_REGULATORY` | Applicable authoritative requirement | Yes, subject to formal applicability assessment |

Every rule must name its source, owner, status, validity window, and last review. Conflicts remain explicit; an agent must never promote an observation into business truth by itself.

## Retrieval rule

Do not load the whole knowledge base into a model. Detect the affected capability, then retrieve only the capability, relevant matrices, invariants, matching patterns, top scenarios/incidents, and applicable security/compliance rules. Five to ten high-quality artifacts are a better starting packet than an unbounded documentation dump.
