# HopDrop

A peer-to-peer package delivery platform that connects people who need to send something with travelers already going that direction. Senders post delivery requests, carriers browsing open trips accept matches, and both sides track the handoff in real time.

---

## What's in this repo

```
hopdrop/
├── backend/              Node + Express API — auth, trips, matches, payments
├── sender-portal/        React app for people sending packages
├── carrier-portal/       React app for travelers carrying packages
├── shared/               UI components, maps, and types shared between the portals
├── services/
│   ├── routing-search/   Python + FastAPI — address lookup and trip matching
│   ├── realtime-gateway/ WebSocket fanout for live tracking
│   ├── search-indexer/   Keeps the trip index in sync
│   ├── matching-orchestrator/  Runs match scoring jobs
│   ├── notification-consumer/ Sends push and in-app notifications
│   └── analytics-pipeline/   Event aggregation and metrics
├── e2e/                  Playwright end-to-end tests
├── docs/                 Architecture decisions and API contracts
└── docker-compose.yml    Brings the full stack up locally
```

---

## Tech stack

| Layer | What we use |
|---|---|
| Backend API | Node.js, Express 5, TypeScript, Mongoose |
| Portals | React 18, Vite, TypeScript, Zustand |
| Routing search | Python 3.11, FastAPI |
| Database | MongoDB 7 (replica set) |
| Queue | Redis + BullMQ |
| Event bus | Kafka (Redpanda) |
| Realtime | Socket.IO |
| Observability | Prometheus, Grafana, OpenTelemetry, Sentry |
| Auth | JWT + bcrypt |
| Maps | MapMyIndia SDK |
| Testing | Jest, Playwright |

---

## Running locally

You need Docker Desktop and Node 20.

**1. Copy the env file and fill in your keys:**
```bash
cp .env.example .env
```

The local defaults are wired for Docker. For a real environment, rotate the JWT secrets and set the MapMyIndia, Razorpay, and `BULL_BOARD_PASSWORD` values before exposing the stack.

The production Compose profile fails closed unless `DEMO_MODE=false`,
`INTERNAL_API_TOKEN`, and `BULL_BOARD_PASSWORD` are explicitly supplied. Do not
reuse the local `.env.example` values for a public deployment.

**2. Start everything:**
```bash
docker compose up -d --build --wait
```

That brings up the full stack and waits for the service healthchecks to go green. First boot takes a couple of minutes while images build.

**3. Open the apps:**

| App | URL |
|---|---|
| Sender Portal | http://localhost:3001 |
| Carrier Portal | http://localhost:3002 |
| Unified Nginx entrypoint | http://localhost |
| Backend API | http://localhost:5001 |
| Queue dashboard | http://localhost/admin/queues |
| Grafana | http://localhost:3003 |
| Prometheus | http://localhost:9090 |

**4. Seed some test data:**
```bash
npm run seed:docker
```

**5. Run the platform smoke check:**
```bash
npm run verify:platform
```

---

## Running the backend tests

```bash
npm run test:backend
```

## Running all app tests

```bash
npm test
```

That runs:

- backend Jest suites
- sender portal Vitest suite
- carrier portal Vitest suite

## Repo hygiene

```bash
npm run verify:repo
```

That check fails if generated artifacts like `dist/`, `__pycache__/`, or `.pyc` files are tracked in git.

---

## Running the e2e tests

You need the Docker stack running first, then:

```bash
npm run verify:platform
npm run test:e2e
```

3 Playwright flows: sender posts a request, carrier accepts a match, sender confirms the handoff.

---

## How the match flow works

1. Sender creates a delivery request with pickup and drop-off locations.
2. The routing-search service finds carrier trips whose route overlaps the delivery corridor.
3. The backend creates match candidates and notifies the carrier.
4. Carrier reviews the request and accepts.
5. Sender confirms the carrier.
6. Both sides get live location updates through the realtime gateway until handoff.

---

## Environment variables

See `.env.example` for the full list with descriptions. For any real deployment, these are the required ones:

```
MONGODB_URI=
REDIS_CACHE_URL=
REDIS_QUEUE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
INTERNAL_API_TOKEN=
MMI_CLIENT_ID=
MMI_CLIENT_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
BULL_BOARD_PASSWORD=
```

`REDIS_URL` still exists as a local and backward-compatible fallback, but the platform standard is to set `REDIS_CACHE_URL` and `REDIS_QUEUE_URL` separately so readiness, traffic isolation, and future scaling stay explicit.

The telemetry vars (`SENTRY_DSN`, `OTEL_*`, `VITE_POSTHOG_*`, etc.) can stay blank in dev. `MSG91_*`, `RAPIDO_*`, and `CLOUDINARY_*` are conditional and only required when those integrations are enabled in a real environment.

## Backend runtime standard

The backend now follows the common Express composition-root pattern, which is the industry-standard way to keep startup logic testable and predictable:

- `createApp()` is required. It builds middleware and routes only, and does not bind a network port.
- `createHttpServer(app)` is required when the process needs to accept traffic. Keeping it separate lets tests reuse the Express app without opening sockets.
- `createServerRuntime({ ... })` is required for real process startup. It owns dependency boot order, readiness gating, and graceful shutdown.
- Queue workers also follow factory methods now (`createMatchWorker()`, `createOtpCleanupWorker()`, and friends), so Redis-backed workers start only inside runtime startup instead of during module import.
- `registerOpenTelemetry()` and `initServerTelemetry()` are optional runtime integrations. They are env-gated and stay off unless observability is configured.

---

## What's been done recently

- Match read endpoints now have their own rate limit bucket, separate from write actions, so carrier match fetching doesn't starve sender tracking updates.
- The sender tracking screen and carrier active delivery screen both fail gracefully with a retry button if the fetch is slow or errors out, instead of sitting on a loading spinner forever.
- The Playwright handoff spec now waits for the real interactive state before continuing, so it doesn't flake on slower builds.
- The Dockerized portals now serve production Vite builds through Nginx instead of Vite dev servers, with immutable asset caching and SPA fallback.
- The backend now exposes a protected BullMQ queue dashboard at `/admin/queues`, starts all queue workers, and shuts HTTP, workers, Redis, MongoDB, outbox, and telemetry down cleanly on signals.
- Pricing now separates carrier payout from sender platform fees, adds package risk/urgency/reliability premiums, and exposes carrier lane guidance at `/api/v1/pricing/carrier-guidance`.
- The carrier portal has an earnings workspace with pending payouts, released payouts, escrow, best routes, and per-job payout visibility.
- The core API now uses explicit runtime factory methods for app and server composition, and `/ready` verifies MongoDB plus both Redis roles instead of only one shared Redis status.
- All sidecar service images now have first-class healthchecks and run under a non-root Node user, so `docker compose up --wait` reflects actual platform readiness.
- There is now a repo-level platform smoke check that validates nginx, both portals, and every service readiness endpoint in one command.

---

## Roadmap

The `docs/architecture/` folder has the full migration plan. Short version:

- **Phase 1** — finish extracting routing-search from the Node backend
- **Phase 2** — BM25 + geospatial corridor indexing for faster matching
- **Phase 3** — Kafka outbox so delivery creation doesn't block on side effects
- **Phase 4** — scale the realtime gateway independently with Redis pub/sub
- **Phase 5** — clean up frontend package duplication into shared packages
- **Phase 6** — Kubernetes + Helm, canary deploys, KEDA autoscaling on Kafka lag

The initial cloud-neutral Helm baseline is available at
`infra/helm/hopdrop-platform`. It deploys stateless application services with
private ClusterIP networking, TLS ingress hooks, health probes, resource
limits, HPA, PDB, and a default-deny network policy. Stateful data services and
secret management remain external by design.

---

## Author

Supreet Patil — [github.com/supreetpatil79](https://github.com/supreetpatil79)

## CI

GitHub Actions now enforces:

- tracked-artifact hygiene
- workspace builds
- backend and portal tests
- backend and portal dependency audits
- routing-search pytest
- Dockerized platform smoke checks

## Ops Docs

- [Production readiness checklist](docs/runbooks/production-readiness-checklist.md)
- [Incident response runbook](docs/runbooks/incident-response.md)
