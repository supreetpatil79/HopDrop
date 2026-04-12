# HopDrop Operability, Analytics, And Security Blueprint

## Observability

- Structured JSON logs are the default format for `core-api` and `routing-search`.
- Every API request carries an `X-Request-Id` header so traces can be stitched across browser, Node, and FastAPI logs.
- `core-api` exposes `/health`, `/ready`, and `/metrics` for uptime, dependency readiness, and Prometheus scraping.
- `routing-search` now emits structured request logs with request IDs, optional Sentry reporting, and its own `/metrics` endpoint.
- `realtime-gateway` now runs as a dedicated service with Redis-backed event fanout, Socket.IO auth, and `/health`, `/ready`, `/metrics` endpoints.
- `search-indexer` now runs as a dedicated Kafka consumer with `/health`, `/ready`, `/metrics` so indexing fanout is observable too.
- Sentry is the error sink for browser and server exceptions.
- Prometheus scrapes `core-api`, `routing-search`, `realtime-gateway`, and `search-indexer`, and Grafana provisions a default platform dashboard at startup for local and self-hosted monitoring.

## Product Analytics

The product analytics source of truth is PostHog.

Tracked events now include:

- `page_view`, `page_leave`, `session_started`, `session_ended`
- `cta_clicked` for homepage and high-intent calls to action
- `funnel_step` for signup/login, delivery request creation, trip posting, and retention return sessions
- `client_error` and `api_rate_limited`
- Sender flow milestones:
  - OTP requested
  - signup completed
  - login completed
  - delivery request started
  - delivery request submitted
- Carrier flow milestones:
  - OTP requested
  - signup completed
  - login completed
  - trip posting started
  - trip posted

These events are enough to calculate:

- CTR on primary actions
- average time spent per session
- drop-off by step in sender and carrier funnels
- conversion from signup to first core action
- retention via return-session funnel events

## Single Dashboard Strategy

The unified operations view should live in Grafana.

Recommended data flow:

1. Prometheus feeds infrastructure and API metrics into Grafana.
2. Sentry error counts and release health feed Grafana through Sentry integrations or exported webhooks.
3. PostHog product KPIs are mirrored into Grafana through warehouse export, Grafana datasource plugins, or scheduled metric sync jobs.

Grafana dashboard sections now include:

- Service health and uptime
- API latency and 5xx rate
- routing-search latency and error rate
- realtime gateway uptime and active socket connections
- search indexer uptime and processed Kafka messages
- Redis, Kafka, and outbox health
- Sentry issue volume by app/service
- key funnel conversion rates
- CTA CTR and session duration

## Alerts

Minimum alerts to enforce:

- Core API down
- Core API 5xx rate above threshold
- Kafka relay publish failures rising
- Redis or Mongo readiness degraded
- routing-search health failure
- Sentry issue spike for sender-web or carrier-web

Prometheus alert rules now cover:

- core API down
- core API 5xx rate
- outbox publish failures
- routing-search down
- routing-search p95 latency
- routing-search 5xx rate
- realtime gateway down
- search indexer down

Production delivery can route these alerts through Grafana Alerting, PagerDuty, or Opsgenie.

## Security Baseline

- JWT remains the application auth mechanism.
- HTTPS-only transport should be enabled in non-local deployments with `REQUIRE_HTTPS=true`.
- API rate limits remain enforced on auth, user, trip, delivery, match, maps, payment, and webhook routes.
- Zod validation remains the boundary for request payloads.
- Secrets must stay in environment configuration only. No DSNs, API keys, or cloud credentials belong in source control.
- Request IDs must be returned to clients so support and debugging can correlate frontend failures with backend logs.

## Storage Policy

All storage buckets must be private by default.

Required bucket split:

- `hopdrop-logs`
- `hopdrop-user-data`
- `hopdrop-backups`

Required rules:

- no public read access
- no wildcard admin roles
- least-privilege IAM per service
- separate write roles for app uploads, logs, and backups
- server-side encryption enabled
- lifecycle retention policies for logs and backups
- backup restore tested on a schedule

## Rollout Notes

- Frontend telemetry is safe to ship dark by leaving PostHog and Sentry env vars empty.
- Backend Sentry and HTTPS enforcement are also env-gated.
- Grafana and Prometheus are scaffolded for local compose, while production deployment should wire the same configs through Helm or ArgoCD.
