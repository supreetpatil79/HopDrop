# HopDrop Production Readiness Checklist

Use this checklist before creating a release candidate or merging to a protected release branch.

This is a go/no-go gate. A release is **not approved** while any required item
is unchecked. Passing local tests does not substitute for staging verification.

## 1. Repository And CI Gates

- `npm run verify:repo`
- `npm run build`
- `npm test`
- `npm run audit:backend`
- `npm run audit:portals`
- `cd services/routing-search && python -m pip install -e '.[dev]' && pytest -q`
- `cp .env.example .env`
- `docker compose up -d --build --wait`
- `npm run verify:platform`
- GitHub Actions `CI` workflow must pass on the branch.
- GitHub `dependency-review` must pass on pull requests that change dependencies.
- Mark `CI` and `dependency-review` as required checks in branch protection before production rollout.
- Run a clean checkout build from the release SHA; do not release an uncommitted working tree.
- Install and run the Python test/lint toolchain in CI (`pytest`, `ruff`) and retain the reports.
- Remediate or formally risk-accept every high/critical dependency advisory before release.

## 2. Secrets And Access

- Replace all local-development secrets with environment-specific secrets.
- Set `DEMO_MODE=false`; the production backend rejects demo mode at startup.
- Store JWT, Redis, MongoDB, Kafka, Razorpay, Sentry, and PostHog credentials in a managed secret store.
- Rotate `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_API_TOKEN`, and `BULL_BOARD_PASSWORD` before first production deploy.
- Restrict `/admin/queues` access to operator-only credentials and production network boundaries.
- Confirm service accounts and IAM roles are least-privilege.
- Never pass secrets as Docker build arguments; verify they do not appear in image history or frontend bundles.
- Confirm production Compose/Kubernetes has only the ingress publicly exposed; databases, brokers, Redis, metrics, and admin tools stay private.
- Set `REQUIRE_HTTPS=true` behind a TLS-terminating ingress before accepting customer traffic.

## 3. Release Artifacts

- Produce immutable image tags for `backend`, `routing-search`, `realtime-gateway`, `search-indexer`, `matching-orchestrator`, `notification-consumer`, `analytics-pipeline`, `sender-portal`, and `carrier-portal`.
- Run `helm lint infra/helm/hopdrop-platform` and render both staging and production values in CI.
- Deploy the chart to a staging namespace with a pre-created external secret and TLS certificate before production approval.
- Record the git SHA, image tags, and deployment timestamp in the release note.
- Keep a rollback target ready before deploy starts.
- Sign or attest release images and scan them for OS/package vulnerabilities.
- Generate an SBOM and retain it with the release record.

## 4. Data Safety

- Confirm MongoDB backup schedule, retention window, and restore ownership.
- Confirm Redis queue durability policy matches the production recovery plan.
- Verify a recent restore drill exists for MongoDB and that BullMQ queue replay expectations are documented.
- Confirm payment reconciliation operators know how to identify duplicate, missing, or delayed payout events.
- Execute a MongoDB restore drill and verify queue replay/idempotency for delivery, payment, and notification events.
- Define retention/deletion rules for identity, location, package, payment, and audit data; obtain required legal/privacy approval.

## 5. Observability And Paging

- Prometheus must scrape every service `/metrics` endpoint successfully.
- Grafana dashboards must show green health for the full stack before rollout.
- Alert routing must be wired to a paging destination, not only local Grafana.
- Validate these alerts are enabled:
  - core API down
  - core API 5xx rate
  - outbox publish failures
  - queue backlog high
  - queue job failures
  - routing-search down / high latency / high 5xx rate
  - search-indexer consumer disconnected
  - matching-orchestrator consumer disconnected
  - notification-consumer consumer disconnected
  - analytics-pipeline consumer disconnected
- Configure an external paging destination and test one alert end to end.
- Define SLOs and error budgets for API availability, latency, payment completion, and queue age.

## 6. Rollout And Rollback

- Roll out stateless services first in non-customer-impacting order when possible:
  - `routing-search`
  - sidecar consumers and gateways
  - `backend`
  - `sender-portal`
  - `carrier-portal`
- Watch `/ready`, `/metrics`, and queue depth during rollout.
- Stop and roll back if any required readiness endpoint degrades for more than 5 minutes, if queue backlog grows continuously, or if payment flows regress in smoke checks.
- Run staging load tests for peak login, search, match, websocket, and payment-webhook traffic.
- Run a threat-model review and authenticated security test covering IDOR, privilege escalation, replayed webhooks, OTP abuse, rate-limit bypass, SSRF, and file upload abuse.
- Complete a staging Playwright handoff flow with real TLS, real service dependencies, and production-like secrets.

## 7. Operator Handoff

- Share release note with:
  - git SHA
  - deployed image tags
  - changed services
  - known risks
  - rollback target
- Link the incident runbook at [incident-response.md](./incident-response.md).

## Explicit no-go conditions

- Demo mode, local/default secrets, HTTP-only public traffic, or wildcard CORS are enabled.
- High-severity dependency findings have no approved mitigation.
- Backups or restore ownership are unverified.
- Payment webhooks, refunds, escrow release, or duplicate-event handling are untested.
- Any public endpoint exposes MongoDB, Redis, Kafka, Prometheus, Grafana, Bull Board, or an internal service directly.
- No tested rollback image or no on-call owner exists.
