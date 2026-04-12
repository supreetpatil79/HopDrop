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

The only keys you actually need to get the core flows working are `MONGO_URI`, `JWT_SECRET`, and `MMI_CLIENT_SECRET`. Everything else is optional (Sentry, PostHog, telemetry).

**2. Start everything:**
```bash
docker compose up -d --build
```

That brings up 18 containers. First boot takes a couple of minutes while images build.

**3. Open the apps:**

| App | URL |
|---|---|
| Sender Portal | http://localhost:3001 |
| Carrier Portal | http://localhost:3002 |
| Backend API | http://localhost:5001 |
| Grafana | http://localhost:3003 |
| Prometheus | http://localhost:9090 |

**4. Seed some test data:**
```bash
cd backend && npm run seed
```

---

## Running the backend tests

```bash
cd backend
npm test -- --runInBand
```

5 suites, 14 tests. They run in-band because some of them share the Mongo connection.

---

## Running the e2e tests

You need the Docker stack running first, then:

```bash
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

See `.env.example` for the full list with descriptions. The required ones:

```
MONGO_URI=
JWT_SECRET=
MMI_CLIENT_SECRET=
MMI_CLIENT_ID=
REDIS_URL=
```

The telemetry vars (`SENTRY_DSN`, `VITE_POSTHOG_KEY`, etc.) can stay blank in dev — the services handle missing values gracefully.

---

## What's been done recently

- Match read endpoints now have their own rate limit bucket, separate from write actions, so carrier match fetching doesn't starve sender tracking updates.
- The sender tracking screen and carrier active delivery screen both fail gracefully with a retry button if the fetch is slow or errors out, instead of sitting on a loading spinner forever.
- The Playwright handoff spec now waits for the real interactive state before continuing, so it doesn't flake on slower builds.

---

## Roadmap

The `docs/architecture/` folder has the full migration plan. Short version:

- **Phase 1** — finish extracting routing-search from the Node backend
- **Phase 2** — BM25 + geospatial corridor indexing for faster matching
- **Phase 3** — Kafka outbox so delivery creation doesn't block on side effects
- **Phase 4** — scale the realtime gateway independently with Redis pub/sub
- **Phase 5** — clean up frontend package duplication into shared packages
- **Phase 6** — Kubernetes + Helm, canary deploys, KEDA autoscaling on Kafka lag

---

## Author

Supreet Patil — [github.com/supreetpatil79](https://github.com/supreetpatil79)
