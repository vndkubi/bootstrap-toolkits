# Technical Core Review Checklist

Use this pack during Technical Review when no narrower stack- or subsystem-specific checklist exists yet.

## Apply When

- API contracts changed
- migrations or data access changed
- shared modules, DTOs, base classes, filters, or interceptors changed
- external calls, security, or performance-sensitive paths changed

## Core Questions

- Is the change backward-compatible for known consumers?
- Are migrations safe for production-sized data and rollback-aware?
- Did the change cross a domain or service boundary incorrectly?
- Are timeouts, retries, logging, and error handling still production-safe?
- Did the change introduce duplicated validation or misplaced responsibilities?
- Are there obvious scale risks: N+1, full scans, large in-memory loads, missing pagination?

## Blocker Patterns

- breaking API contract with no coordination or versioning plan
- unsafe migration on a hot or large table
- direct entity or table reach-through across service boundaries
- missing timeout or auth check on a new external or public path
- string-built SQL or other direct injection surface
