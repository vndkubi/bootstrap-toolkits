---
name: run-local-stack
description: "Detect and start the local dev stack (devcontainer > docker-compose > make dev > native), then run a healthcheck. Halts with quickstart-healthcheck-failed gate on failure. Used by autorun Phase 2 to prove the stack boots before tests run."
---

# Run Local Stack

Confirms the target repo can boot its local stack and respond to a healthcheck before Phase 3 authors tests.

## When to Use

- `prompts/autorun.prompt.md` Phase 2, unless `--skip-quickstart` is passed.
- Any plan-implementation flow that promises runnable contract tests.

## Detection Order (first match wins)

1. **Devcontainer**: `.devcontainer/devcontainer.json` exists → `devcontainer up --workspace-folder .`
2. **Docker Compose**: `docker-compose.yml` or `docker-compose.dev.yml` or `compose.yml` exists → `docker compose -f <file> up -d`
3. **Makefile target `dev`**: `make -n dev` exits 0 → `make dev`
4. **Native**: repo-level script such as `./scripts/dev.sh`, `./run.ps1`, `npm run dev`, `mvn spring-boot:run`, `dotnet run`, `fastapi dev`. Pick the first one found; prefer ones documented in `README.md`.

Record the chosen strategy in trace.

## Healthcheck

After the stack is up:

1. Look for a healthcheck URL. Sources (in order):
   - `autorun.config.json.quickstart.healthcheckUrl` (future extension).
   - `README.md` grep for `localhost:\d+/(health|healthz|status|ping)`.
   - Default per taxonomy: REST → `http://localhost:8080/health`; GraphQL → POST `query{__typename}`; event-driven → broker admin port.
2. Curl with 30s timeout, 5 retries, 2s delay.
3. Pass criterion: HTTP 200 or custom matcher configured in spec's quickstart.md.

On failure → emit gate `quickstart-healthcheck-failed` (category `config`, blocking).

## Teardown

After Phase 7 (or on `--abort`), run the inverse:

- devcontainer: leave running (user owns it).
- docker compose: `docker compose down` only if autorun started it (track in trace).
- make / native: `make dev-down` if present, else leave running with a trace note.

## Authz (CLI harness)

Both startup and teardown commands must match an entry in `.github/autorun.allowlist` under ids `start-stack` / `stop-stack`. Missing → gate `authz-no-allowlist` (exit 30).

## Outputs

- `{strategy, healthcheckUrl, bootMs, healthcheckMs, containers?: string[]}`.
- One trace event per step (detect, start, healthcheck, teardown).

## Failure Modes

| Condition | Gate id | Notes |
|---|---|---|
| No strategy detected | `quickstart-unknown` | suggest adding devcontainer |
| Boot timed out (>5 min) | `quickstart-boot-timeout` | |
| Healthcheck failed | `quickstart-healthcheck-failed` | include last N log lines in `evidence` (redacted) |
| Port already in use | `quickstart-port-collision` | suggest `docker compose down` then retry |

## Verification

- Golden Java repo: `docker compose up -d` + curl health endpoint in CI smoke matrix.
- Golden .NET repo: same.
- Negative test: stop the DB container, verify `quickstart-healthcheck-failed` fires with redacted log excerpt in gate `evidence`.
