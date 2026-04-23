---
name: redact-sensitive-data
description: "Redact secrets and PII before any write to the trace file, evidence bundle, or generated fixtures. Layered defense: deny-list regex at write time + signature scan (gitleaks/detect-secrets) at commit time. Used by the autorun orchestrator and @mock-data-specialist."
---

# Redact Sensitive Data

Single source of truth for autorun's secret and PII redaction. Called by every component that writes text destined to disk or stdout.

## When to Use

- Before writing any trace event.
- Before committing fixtures, WireMock stubs, or evidence artifacts.
- Before emitting stdout JSON in CLI harness.

## Deny List (redact at write time)

Replace matches with `***REDACTED:<category>***`.

### Header / cookie names (case-insensitive)

```
^(authorization|cookie|set-cookie|x-api-key|x-auth-token|proxy-authorization)$
```

Redact the **value**, keep the header name so tests still see the shape.

### Env-var names (case-insensitive)

```
.*(_KEY|_TOKEN|_SECRET|_PASSWORD|_PWD|_CREDENTIAL|_PRIVATE_KEY)$
```

Redact the value when serializing any `{ENV_NAME: value}` dict.

### JWT payload claims

If a string matches `eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\..+`:
- Decode middle segment.
- Redact claims `email`, `sub`, `name`, `preferred_username`, `upn`.
- Re-encode or replace the whole JWT with `***REDACTED:jwt***`.

### PII regex

| Category | Pattern (simplified) |
|---|---|
| `email` | `[\w.+-]+@[\w-]+\.[\w.-]+` |
| `phone` | `\+?\d[\d \-()]{7,}\d` |
| `credit-card` | 13–19 digit run, Luhn-valid |
| `ssn-us` | `\d{3}-\d{2}-\d{4}` |

## Signature Scan (at commit time)

Configured by `autorun.config.json.secretScanner.tool`:

- `auto` → detect existing scanner in repo; default `gitleaks`.
- `gitleaks` → `gitleaks detect --no-git --redact`.
- `detect-secrets` → `detect-secrets scan --baseline .secrets.baseline`.

A non-zero exit blocks the commit and emits gate `secret-detected` (category `security`).

## Workflow

1. `redactWriteTime(text)`: run all deny-list regexes in order; return redacted text + list of categories hit.
2. `scanCommit(path)`: run the configured scanner; return pass/fail + findings.
3. Emit a trace event per operation summarizing redactions (counts only, never values).

## Outputs

- `{text: string, redactedCategories: string[]}` or `{ok: boolean, findings: []}`.

## Non-Goals

- Not a data-loss prevention system; it catches obvious leakage, not adversarial exfiltration.
- Does not detect injection — see `sanitize-untrusted-input`.

## Verification

- Fixture pack with known secrets/PII: deny-list must catch all + no false redactions in a clean text fixture.
- Scanner smoke: a fake API key committed to a scratch repo triggers gate `secret-detected`.
